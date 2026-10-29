const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const { resolve } = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const ts = require('../server/node_modules/typescript')
const { ListOrdersQuerySchema } = require('../server/dist/modules/orders/schema.js')

function loadModule(path, dependencies) {
  const filename = resolve(__dirname, '..', path)
  const exports = {}
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, { exports, require: dependencies || createRequire(filename) })
  return exports
}

const open = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivery_failed',
]
const statuses = [
  ...open,
  'delivered',
  'cancelled',
  'rto',
  'returned',
  'refunded',
  'lost',
  'damaged',
]
const rows = ['customer-a', 'customer-b'].flatMap((user_id) =>
  statuses.flatMap((status) =>
    ['pending', 'paid', 'failed', 'refunded'].map((payment_status) => ({
      id: `${user_id}-${status}-${payment_status}`,
      user_id,
      status,
      payment_status,
    }))
  )
)

function listService() {
  const operations = []
  const adminSupabase = {
    from() {
      let filtered = [...rows]
      let start = 0,
        end = rows.length
      const query = {
        select() {
          return query
        },
        eq(field, value) {
          operations.push(field)
          filtered = filtered.filter((row) => row[field] === value)
          return query
        },
        in(field, values) {
          operations.push(field)
          filtered = filtered.filter((row) => values.includes(row[field]))
          return query
        },
        order() {
          return query
        },
        range(from, to) {
          operations.push('range')
          start = from
          end = to
          return query
        },
        then(done) {
          return Promise.resolve({
            data: filtered.slice(start, end + 1),
            count: filtered.length,
            error: null,
          }).then(done)
        },
      }
      return query
    },
  }
  const service = loadModule('server/src/modules/orders/service.ts', (name) =>
    name === '../../lib/supabase/admin' ? { adminSupabase } : {}
  )
  return { ...service, operations }
}

test('customer order view validates current, unpaid and all and rejects unknown views', () => {
  for (const view of ['current', 'unpaid', 'all'])
    assert.equal(ListOrdersQuerySchema.parse({ view }).view, view)
  assert.equal(ListOrdersQuerySchema.safeParse({ view: 'archived' }).success, false)
  assert.equal(ListOrdersQuerySchema.parse({}).view, undefined)
})

for (const view of ['current', 'unpaid', 'all', undefined]) {
  test(`order view ${view ?? 'omitted'} filters owned rows before pagination and counts the filtered history`, async () => {
    const { listUserOrders, operations } = listService()
    const result = await listUserOrders('customer-a', { page: 2, limit: 3, view })
    const expected = rows.filter(
      (row) =>
        row.user_id === 'customer-a' &&
        (!view ||
          view === 'all' ||
          (open.includes(row.status) &&
            (view !== 'unpaid' || ['pending', 'failed'].includes(row.payment_status))))
    )
    assert.deepEqual(
      Array.from(result.orders, (row) => row.id),
      expected.slice(3, 6).map((row) => row.id)
    )
    assert.equal(result.total, expected.length)
    assert.equal(result.totalPages, Math.ceil(expected.length / 3))
    assert.equal(operations.at(-1), 'range')
  })
}

test('legacy status and payment filters intersect the requested order view', async () => {
  const { listUserOrders } = listService()
  const result = await listUserOrders('customer-a', {
    page: 1,
    limit: 20,
    view: 'unpaid',
    status: 'confirmed',
    payment_status: 'failed',
  })
  assert.deepEqual(
    Array.from(result.orders, (row) => row.id),
    ['customer-a-confirmed-failed']
  )
})

test('the list adapter exposes every item, shipping facts and existing invoice eligibility', () => {
  const { mapOrderListItem } = loadModule('client/src/lib/utils/adapters.ts')
  const raw = {
    id: 'order',
    order_number: 'MUV-1',
    payment_status: 'paid',
    shiprocket_order_id: '123',
    shipping_full_name: 'Aarohi',
    shipping_address_line1: '24 Sample Lane',
    shipping_city: 'Kolkata',
    shipping_state: 'West Bengal',
    shipping_pincode: '700039',
    shipping_country: 'India',
    order_items: [1, 2].map((i) => ({
      id: `item-${i}`,
      product_name: `Product ${i}`,
      product_image_url: `${i}.jpg`,
      quantity: i,
      unit_price_paisa: 49900,
      total_price_paisa: i * 49900,
    })),
  }
  const order = mapOrderListItem(raw)
  assert.equal(order.items.length, 2)
  assert.equal(order.items[1].unitPrice, 49900)
  assert.equal(order.items[1].quantity, 2)
  assert.equal(order.itemCount, 3)
  assert.equal(order.shippingAddress.line1, '24 Sample Lane')
  assert.equal(order.shiprocketOrderId, '123')
  assert.equal(mapOrderListItem({ ...raw, shiprocket_order_id: null }).shiprocketOrderId, null)
})

test('getOrders sends optional view and preserves the omitted-view request', async () => {
  const requests = []
  const { orderApiService } = loadModule('client/src/lib/services/order.service.ts', (name) => {
    if (name === '../api/client')
      return {
        api: {
          get: async (...args) => {
            requests.push(args)
            return { success: true, data: [], meta: { page: 2, limit: 5, total: 0, totalPages: 0 } }
          },
        },
      }
    return loadModule('client/src/lib/utils/adapters.ts')
  })
  await orderApiService.getOrders(2, 5, 'unpaid')
  await orderApiService.getOrders(1, 20)
  assert.deepEqual(requests, [
    ['/api/orders?page=2&limit=5&view=unpaid', true],
    ['/api/orders?page=1&limit=20', true],
  ])
})
