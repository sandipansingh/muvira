const assert = require('node:assert/strict')
const { test } = require('node:test')
const express = require('../server/node_modules/express')

function stubModule(path, exports) {
  const id = require.resolve(path)
  require.cache[id] = { id, filename: id, loaded: true, exports }
}
stubModule('../server/dist/lib/logger.js', { logger: { info() {}, warn() {}, error() {} } })
let stock = 3
let categoryReads = 0
const productController = new Proxy(
  {},
  {
    get: (_target, handler) => (req, res) =>
      res.json({ success: true, data: { stock, handler, params: req.params, body: req.body } }),
  }
)
stubModule('../server/dist/modules/products/controller.js', productController)
stubModule(
  '../server/dist/modules/categories/controller.js',
  new Proxy(
    {},
    {
      get: () => (_req, res) => {
        categoryReads += 1
        res.json({ success: true, data: [{ name: 'Wraps' }] })
      },
    }
  )
)

test('stock-bearing reads bypass replica-local cached data while category caching remains active', async () => {
  const { productsRouter } = require('../server/dist/modules/products/routes.js')
  const { categoriesRouter } = require('../server/dist/modules/categories/routes.js')
  const { flushCache } = require('../server/dist/config/cache.js')
  flushCache()
  const app = express()
  app.use('/api/products', productsRouter)
  app.use('/api/categories', categoriesRouter)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    for (const path of [
      '/api/products',
      '/api/products/wrap',
      '/api/products/11111111-1111-4111-8111-111111111111/related',
    ]) {
      stock = 3
      const first = await fetch(origin + path)
      assert.equal((await first.json()).data.stock, 3)
      // Represents a stock mutation served by another process without this process's invalidation.
      stock = 2
      const next = await fetch(origin + path)
      assert.equal((await next.json()).data.stock, 2)
      assert.equal(next.headers.get('cache-control'), 'no-store')
    }
    await fetch(origin + '/api/categories')
    const next = await fetch(origin + '/api/categories')
    assert.equal(categoryReads, 1)
    assert.equal(next.headers.get('x-cache'), 'HIT')
  } finally {
    await new Promise((resolve) => server.close(resolve))
    flushCache()
  }
})

test('image metadata validates alt text and keeps reorder routing separate', async () => {
  const { adminProductsRouter } = require('../server/dist/modules/products/routes.js')
  const app = express()
  app.use(express.json())
  app.use('/products', adminProductsRouter)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const product = '11111111-1111-4111-8111-111111111111'
  const image = '22222222-2222-4222-8222-222222222222'
  const patch = (path, body) =>
    fetch(origin + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  try {
    const updated = await patch(`/products/${product}/images/${image}`, {
      alt_text: 'Handwoven cotton wrap',
    })
    assert.equal(updated.status, 200)
    const body = await updated.json()
    assert.equal(body.data.handler, 'adminUpdateProductImage')
    assert.equal(body.data.params.id, product)
    assert.equal(body.data.params.imageId, image)
    assert.equal(
      (await patch(`/products/${product}/images/${image}`, { alt_text: 'x'.repeat(301) })).status,
      400
    )
    assert.equal(
      (
        await patch(`/products/${product}/images/${image}`, {
          alt_text: 'Wrap',
          url: 'https://example.com/replacement.jpg',
        })
      ).status,
      400
    )
    const ordered = await patch(`/products/${product}/images/reorder`, { imageIds: [image] })
    assert.equal(ordered.status, 200)
    assert.equal((await ordered.json()).data.handler, 'adminReorderProductImages')
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
