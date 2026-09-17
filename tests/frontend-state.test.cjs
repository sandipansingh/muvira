const assert = require('node:assert/strict')
const { join } = require('node:path')
const { after, before, test } = require('node:test')
const { pathToFileURL } = require('node:url')

const root = join(__dirname, '..')
let vite

before(async () => {
  const viteModule = await import(
    pathToFileURL(join(root, 'client/node_modules/vite/dist/node/index.js')).href
  )
  vite = await viteModule.createServer({
    root: join(root, 'client'),
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true },
  })
})

after(async () => {
  await vite?.close()
})

async function loadClientModule(modulePath) {
  return vite.ssrLoadModule(`/src/${modulePath}`, { fixStacktrace: true })
}

test('a rejected guest cart addition preserves the existing cart', async () => {
  const { addGuestCartItem } = await loadClientModule('lib/utils/cartState.ts')
  const existing = [
    {
      id: 'guest-product-1',
      productId: 'product-1',
      productName: 'Chair',
      productSlug: 'chair',
      productImage: '/chair.jpg',
      unitPrice: 10_000,
      quantity: 2,
      lineTotal: 20_000,
      inStock: true,
      availableStock: 2,
    },
  ]
  const beforeAttempt = structuredClone(existing)
  const result = addGuestCartItem(
    existing,
    {
      id: 'product-1',
      name: 'Chair',
      slug: 'chair',
      price: 10_000,
      inStock: true,
      stock: 2,
      primaryImageUrl: '/chair.jpg',
    },
    1
  )

  assert.equal(result.error, 'Only 2 units available')
  assert.equal(result.items, existing)
  assert.deepEqual(existing, beforeAttempt)
})

test('checkout totals come only from the server quote', async () => {
  const { checkoutTotals } = await loadClientModule('lib/utils/checkoutState.ts')
  const totals = checkoutTotals({
    items: [],
    subtotalPaisa: 199_800,
    discountAmountPaisa: 19_980,
    shippingAmountPaisa: 9_900,
    taxAmountPaisa: 0,
    totalAmountPaisa: 189_720,
    coupon: null,
    shippingMethod: 'express',
    shippingLabel: 'Express',
    shippingDescription: 'Fast delivery',
    shippingMethods: {},
  })

  assert.deepEqual(totals, {
    subtotalPaisa: 199_800,
    discountPaisa: 19_980,
    shippingPaisa: 9_900,
    totalPaisa: 189_720,
  })
  assert.deepEqual(checkoutTotals(null), {
    subtotalPaisa: 0,
    discountPaisa: 0,
    shippingPaisa: 0,
    totalPaisa: 0,
  })
})

test('password recovery requires the marked session and valid passwords', async () => {
  const { hasValidRecoverySession, validateNewPassword } = await loadClientModule(
    'lib/utils/recoveryState.ts'
  )

  assert.equal(hasValidRecoverySession('access-token', 'access-token'), true)
  assert.equal(hasValidRecoverySession('access-token', 'other-token'), false)
  assert.equal(hasValidRecoverySession(undefined, 'access-token'), false)
  assert.equal(
    validateNewPassword('short', 'short'),
    'Password must contain at least 8 characters.'
  )
  assert.equal(validateNewPassword('long-enough', 'different'), 'Passwords do not match.')
  assert.equal(validateNewPassword('long-enough', 'long-enough'), null)
})

test('post-auth return paths remain normalized and same-origin', async () => {
  const { safeReturnPath } = await loadClientModule('lib/authRedirect.ts')

  assert.equal(safeReturnPath('/orders?page=2'), '/orders?page=2')
  assert.equal(safeReturnPath('https://evil.example/steal'), '/profile')
  assert.equal(safeReturnPath('//evil.example/steal'), '/profile')
  assert.equal(safeReturnPath('%2F%2Fevil.example%2Fsteal'), '/profile')
  assert.equal(safeReturnPath('/safe\\evil'), '/profile')
  assert.equal(safeReturnPath('%E0%A4%A'), '/profile')
})

test('order confirmation requires an owned paid order response', async () => {
  const { orderConfirmationError } = await loadClientModule('lib/utils/orderConfirmation.ts')
  const paidOrder = { id: 'order-1', paymentStatus: 'paid' }

  assert.equal(orderConfirmationError(null, null, null), 'No order reference was provided.')
  assert.equal(orderConfirmationError('order-1', null, 'Order not found'), 'Order not found')
  assert.equal(
    orderConfirmationError('order-1', { ...paidOrder, paymentStatus: 'pending' }, null),
    'This order does not have a verified paid status.'
  )
  assert.equal(orderConfirmationError('order-1', paidOrder, null), null)
})

test('review pagination de-duplicates pages and keeps failures visible', async () => {
  const { mergeReviewPage, reviewDisplayState } = await loadClientModule('lib/utils/reviewState.ts')
  const first = [{ id: 'review-1', rating: 5 }]
  const second = [
    { id: 'review-1', rating: 5 },
    { id: 'review-2', rating: 4 },
  ]

  assert.deepEqual(
    mergeReviewPage(first, second, 2).map((review) => review.id),
    ['review-1', 'review-2']
  )
  assert.equal(reviewDisplayState([], null), 'empty')
  assert.equal(reviewDisplayState([], 'Network unavailable'), 'error')
  assert.equal(reviewDisplayState(first, 'Next page unavailable'), 'partial-error')
  assert.equal(reviewDisplayState(first, null), 'ready')
})
