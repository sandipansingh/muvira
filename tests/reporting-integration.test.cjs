require('./helpers/assert-local-test-db.cjs').assertLocalTestDb()
require('./helpers/test-env.cjs').configureTestEnvironment()
const assert = require('node:assert/strict')
const test = require('node:test')
const crypto = require('node:crypto')
const {
  serviceClient,
  createOrderFixture,
  cleanupOrderFixture,
} = require('./helpers/provider-db-fixture.cjs')
const url = process.env.SUPABASE_TEST_URL,
  key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

test(
  'dashboard aggregates more than 1000 rows and uses Kolkata date boundaries',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key)
    const fixture = await createOrderFixture(client)
    const categoryId = crypto.randomUUID(),
      prefix = crypto.randomUUID()
    t.after(async () => {
      await client.from('products').delete().eq('category_id', categoryId)
      await client.from('categories').delete().eq('id', categoryId)
      await client.from('orders').delete().eq('user_id', fixture.userId).neq('id', fixture.orderId)
      await cleanupOrderFixture(client, fixture)
    })
    assert.ifError(
      (
        await client
          .from('categories')
          .insert({ id: categoryId, name: 'Report fixture', slug: prefix })
      ).error
    )
    const template = (await client.from('orders').select('*').eq('id', fixture.orderId).single())
      .data
    const before = await client.rpc('get_dashboard_stats', {
      p_now: '2026-01-02T00:00:00Z',
      p_from_date: '2026-01-01T18:30:00Z',
      p_to_date: '2026-01-02T18:29:59Z',
    })
    assert.ifError(before.error)
    assert.ifError(
      (
        await client.from('products').insert(
          Array.from({ length: 1001 }, (_, i) => ({
            name: `Report ${i}`,
            slug: `${prefix}-${i}`,
            category_id: categoryId,
            price_paisa: 100,
            stock: 5,
            is_active: true,
          }))
        )
      ).error
    )
    assert.ifError(
      (
        await client.from('orders').insert(
          Array.from({ length: 1001 }, (_, i) => ({
            ...template,
            id: crypto.randomUUID(),
            order_number: `${prefix}-${i}`,
            subtotal_paisa: 100,
            total_amount_paisa: 100,
            created_at: '2026-01-01T18:30:00Z',
          }))
        )
      ).error
    )
    assert.ifError(
      (
        await client.from('orders').insert({
          ...template,
          id: crypto.randomUUID(),
          order_number: `${prefix}-boundary`,
          subtotal_paisa: 200,
          total_amount_paisa: 200,
          created_at: '2026-01-01T18:29:59Z',
        })
      ).error
    )
    const after = await client.rpc('get_dashboard_stats', {
      p_now: '2026-01-02T00:00:00Z',
      p_from_date: '2026-01-01T18:30:00Z',
      p_to_date: '2026-01-02T18:29:59Z',
    })
    assert.ifError(after.error)
    for (const field of [
      'total_orders',
      'orders_today',
      'total_products',
      'active_products',
      'low_stock_count',
    ])
      assert.equal(after.data[field] - before.data[field], 1001, field)
    for (const field of ['total_revenue_paisa', 'revenue_today_paisa'])
      assert.equal(after.data[field] - before.data[field], 100100, field)
    assert.ok(
      (
        await client.rpc('get_dashboard_stats', {
          p_from_date: '2026-02-01T00:00:00Z',
          p_to_date: '2026-01-01T00:00:00Z',
        })
      ).error
    )
    const anonymous = serviceClient(url, process.env.SUPABASE_TEST_ANON_KEY)
    assert.ok((await anonymous.rpc('get_dashboard_stats')).error)
  }
)

test(
  'failed notifications and commerce queues remain available past newer successes and page one',
  { skip: !url || !key },
  async (t) => {
    const client = serviceClient(url, key),
      fixture = await createOrderFixture(client)
    t.after(() => cleanupOrderFixture(client, fixture))
    const outbox = Array.from({ length: 45 }, (_, i) => ({
      id: crypto.randomUUID(),
      aggregate_type: 'order',
      aggregate_id: fixture.orderId,
      event_type: `report-${i}`,
      deduplication_key: crypto.randomUUID(),
      payload: {},
      status: i < 25 ? 'dead' : 'completed',
      created_at: new Date(Date.now() - (45 - i) * 1000).toISOString(),
    }))
    assert.ifError((await client.from('outbox_events').insert(outbox)).error)
    assert.ifError(
      (
        await client.from('notification_deliveries').insert(
          outbox.map((row, i) => ({
            outbox_event_id: row.id,
            order_id: fixture.orderId,
            user_id: fixture.userId,
            event_type: row.event_type,
            channel: 'email',
            status: i < 25 ? 'failed' : 'sent',
            created_at: row.created_at,
          }))
        )
      ).error
    )
    const service = require('../server/dist/modules/notifications/service.js')
    const first = await service.adminListNotificationLogs({
      page: 1,
      limit: 20,
      orderId: fixture.orderId,
      status: 'failures',
    })
    const second = await service.adminListNotificationLogs({
      page: 2,
      limit: 20,
      orderId: fixture.orderId,
      status: 'failures',
    })
    assert.equal(first.total, 25)
    assert.equal(first.logs.length, 20)
    assert.equal(second.logs.length, 5)
    assert.equal(new Set([...first.logs, ...second.logs].map((row) => row.id)).size, 25)
    assert.ok(first.logs.every((row) => row.sent_status === 'failed'))
    const diagnostics = require('../server/dist/modules/admin/diagnostics/service.js')
    const page = await diagnostics.getCommerceFailurePage({ kind: 'outbox', page: 2, limit: 20 })
    assert.ok(page.total >= 25)
    assert.ok(page.rows.length >= 5)
  }
)
