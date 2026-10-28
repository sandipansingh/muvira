const assert = require('node:assert/strict')
const { test, before, after } = require('node:test')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')

let vite, browser, origin
const item = {
  id: 'guest-product',
  productId: 'product',
  productName: 'Chair',
  productSlug: 'chair',
  productImage: '',
  unitPrice: 100,
  quantity: 1,
  lineTotal: 100,
  inStock: true,
  availableStock: 20,
}
const fixture = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,useLocation,useNavigate,Routes,Route} from 'react-router-dom';
import {CartProvider,useCart} from '/src/context/CartContext.tsx';
import {CheckoutPage} from '/src/pages/CheckoutPage.tsx';
import {ProductDetailPage} from '/src/pages/ProductDetailPage.tsx';
import {CartDrawer} from '/src/components/cart/CartDrawer.tsx';
import {CartPage} from '/src/pages/CartPage.tsx';
import {api} from '/src/lib/api/client.ts';
window.realApi=api;
import {guestCartStore} from '/src/lib/services/guestCart.store.ts';
window.auth??={user:null,loading:false};
window.api??={getCart:async()=>({success:true,data:{items:[]}}),mergeGuestItem:async()=>({success:true,data:{status:'applied'}})};
window.store=guestCartStore;
function Probe(){ window.navigate=useNavigate(); window.cart=useCart(); const location=useLocation(); window.locationPath=location.pathname; return React.createElement('pre',{id:'state'}, JSON.stringify({items:window.cart.items,status:window.cart.status,error:window.cart.error})); }
const root=createRoot(document.getElementById('root'));
window.render=()=>root.render(React.createElement(MemoryRouter,{initialEntries:[window.startPath??'/checkout']},React.createElement(CartProvider,{},React.createElement(Probe),React.createElement(CartDrawer),window.productMode?React.createElement(Routes,{},React.createElement(Route,{path:'/products/:slug',element:React.createElement(ProductDetailPage)})):window.checkout?React.createElement(CheckoutPage):React.createElement(CartPage))));
window.render();
`

before(async () => {
  const { createServer } = await import(
    pathToFileURL(join(__dirname, '../client/node_modules/vite/dist/node/index.js')).href
  )
  const mocks = {
    supabase:
      'export const supabase={auth:{getSession:()=>window.getSession(),signOut:async()=>{window.signOuts=(window.signOuts??0)+1}}}',
    AuthContext: 'export const useAuth=()=>window.auth',
    AuthDialogContext:
      'export const useAuthDialog=()=>({openAuth:options=>{window.authRequest=options},closeAuth:()=>{}})',
    SiteSettingsContext: `export const useSiteSettings=()=>({settings:{shippingMethods:{standard:{charge_paisa:0}},configuration:{shipping_ready:true}},error:null})`,
    ToastContext: 'const showToast=()=>{};export const useToast=()=>({showToast})',
    'cart.service':
      'export const cartApiService=new Proxy({}, {get:(_,key)=>(...args)=>window.api[key](...args)})',
    'checkout.service': `export const checkoutService={quote:async()=>({subtotalPaisa:100,discountAmountPaisa:0,shippingAmountPaisa:0,totalAmountPaisa:100,items:[]})}`,
    'product.service':
      'export const productService=new Proxy({}, {get:(_,key)=>(...args)=>window.products[key](...args)})',
    'review.service':
      'export const reviewService={getProductReviews:(...args)=>window.reviews(...args)}',
    'address.service':
      'export const addressService={getAddresses:async()=>({success:true,data:[]})}',
  }
  vite = await createServer({
    root: join(__dirname, '../client'),
    cacheDir: join(__dirname, '../client/node_modules/.vite-cart-browser-tests'),
    configFile: false,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'isolated-cart-fixture',
        enforce: 'pre',
        resolveId(source) {
          if (source === '/fixture.js') return '\0fixture'
          const key = source.replace(/.*\//, '').replace(/\.(tsx?|jsx?)$/, '')
          if (mocks[key]) return '\0mock:' + key
        },
        load(id) {
          if (id === '\0fixture') return fixture
          if (id.startsWith('\0mock:')) return mocks[id.slice(6)]
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url !== '/') return next()
            res.setHeader('content-type', 'text/html')
            res.end('<div id="root"></div><script type="module" src="/fixture.js"></script>')
          })
        },
      },
    ],
  })
  await vite.listen()
  origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
  await vite?.close()
})

async function setup() {
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('pageerror', (error) => console.error('Fixture error:', error.message))
  await page.goto(origin)
  await page.waitForFunction(() => window.cart?.status === 'ready')
  return { context, page }
}

test('last guest item removal persists across reload', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate(async (item) => {
      await window.store.edit(() => [item])
      window.cart.retry()
    }, item)
    await page.waitForFunction(() => window.cart.items.length === 1)
    await page.evaluate(() => window.cart.removeFromCart(window.cart.items[0].id))
    await page.reload()
    await page.waitForFunction(() => window.cart?.status === 'ready')
    assert.deepEqual(await page.evaluate(() => window.cart.items), [])
  } finally {
    await context.close()
  }
})

test('concurrent tabs claim identical operations and keep pending entries bound to the original account', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate((item) => window.store.edit(() => [item]), item)
    const second = await context.newPage()
    await second.goto(origin)
    await second.waitForFunction(() => window.store)
    const [firstOps, secondOps] = await Promise.all([
      page.evaluate(() => window.store.claim('account-a')),
      second.evaluate(() => window.store.claim('account-a')),
    ])
    assert.equal(firstOps.length, 1)
    assert.equal(firstOps[0].id, secondOps[0].id)
    assert.deepEqual(await second.evaluate(() => window.store.claim('account-b')), [])
    await page.evaluate((id) => {
      window.operationId = id
    }, firstOps[0].id)
    await assert.rejects(
      page.evaluate(() => window.store.correct('account-a', window.operationId, 2)),
      /awaiting confirmation/
    )
    await assert.rejects(
      page.evaluate(() => window.store.clearRejected('account-a')),
      /pending transfers/
    )
    await page.evaluate((id) => window.store.reject(id), firstOps[0].id)
    await page.evaluate(() => window.store.correct('account-a', window.operationId, 2))
    const corrected = await second.evaluate(() => window.store.claim('account-a'))
    assert.notEqual(corrected[0].id, firstOps[0].id)
    assert.equal(corrected[0].item.quantity, 2)
  } finally {
    await context.close()
  }
})

test('lost merge response reload retries the same ID and acknowledges before failed refresh', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate(async (item) => {
      await window.store.edit(() => [item])
      window.api.mergeGuestItem = async (id) => {
        localStorage.setItem('committed-transfer', id)
        throw new Error('Lost response')
      }
      window.auth = { user: { id: 'account-a' }, loading: false }
      window.render()
    }, item)
    await page.waitForFunction(() => window.cart.status === 'error')
    const id = await page.evaluate(() => localStorage.getItem('committed-transfer'))
    assert.equal(
      await page.evaluate(async () => (await window.store.read()).operations[0].status),
      'pending'
    )
    await page.addInitScript(() => {
      window.auth = { user: { id: 'account-a' }, loading: false }
      window.api = {
        mergeGuestItem: async (id) => {
          localStorage.setItem('replayed-transfer', id)
          return { success: true, data: { status: 'applied' } }
        },
        getCart: async () => {
          throw new Error('Refresh failed')
        },
      }
    })
    await page.reload()
    await page.waitForFunction(() => window.cart?.error === 'Refresh failed')
    assert.equal(await page.evaluate(() => localStorage.getItem('replayed-transfer')), id)
    assert.equal(await page.evaluate(async () => (await window.store.read()).operations.length), 0)
    await page.reload()
    await page.waitForFunction(() => window.cart?.error === 'Refresh failed')
    assert.equal(await page.evaluate(async () => (await window.store.read()).operations.length), 0)
  } finally {
    await context.close()
  }
})

test('checkout waits for hydration; failed loading shows retry; old account response is ignored', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate(() => {
      window.checkout = true
      window.api.getCart = () => new Promise((resolve) => (window.resolveOldCart = resolve))
      window.auth = { user: { id: 'account-a' }, loading: false }
      window.render()
    })
    await page.waitForFunction(() => !!window.resolveOldCart)
    assert.equal(await page.evaluate(() => window.locationPath), '/checkout')
    await page.evaluate(() => {
      window.api.getCart = async () => {
        throw new Error('Offline')
      }
      window.auth = { user: { id: 'account-b' }, loading: false }
      window.render()
    })
    await page.waitForFunction(() => window.cart.status === 'error')
    assert.equal(await page.getByRole('button', { name: 'Retry loading cart' }).count(), 1)
    await page.evaluate(
      (item) =>
        window.resolveOldCart({ success: true, data: { items: [{ ...item, id: 'server-old' }] } }),
      item
    )
    assert.deepEqual(await page.evaluate(() => window.cart.items), [])
    assert.equal(await page.evaluate(() => window.locationPath), '/checkout')
  } finally {
    await context.close()
  }
})

test('legacy guest data migrates once and storage denial is a visible retryable error', async () => {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await page.addInitScript(
      (item) => localStorage.setItem('muvira_guest_cart_v1', JSON.stringify([item])),
      item
    )
    await page.goto(origin)
    await page.waitForFunction(() => window.cart?.status === 'ready')
    assert.equal(await page.evaluate(() => window.cart.items.length), 1)
    await page.evaluate(() => window.cart.removeFromCart(window.cart.items[0].id))
    await page.reload()
    await page.waitForFunction(() => window.cart?.status === 'ready')
    assert.deepEqual(await page.evaluate(() => window.cart.items), [])
    await page.evaluate(() => {
      Object.defineProperty(window, 'indexedDB', {
        value: {
          open() {
            throw new Error('Storage denied')
          },
        },
      })
      window.cart.retry()
    })
    await page.waitForFunction(() => window.cart.status === 'error')
    assert.equal(await page.getByRole('button', { name: 'Retry loading cart' }).count(), 1)
  } finally {
    await context.close()
  }
})

test('unavailable merge items remain editable and a correction gets a new operation ID', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate(async (item) => {
      await window.store.edit(() => [item])
      window.calls = []
      window.api.mergeGuestItem = async (id) => {
        window.calls.push(id)
        return { success: true, data: { status: 'rejected', message: 'Unavailable' } }
      }
      window.auth = { user: { id: 'account-a' }, loading: false }
      window.render()
    }, item)
    await page.waitForFunction(() => window.cart.status === 'ready' && window.cart.hasUnmergedItems)
    const original = await page.evaluate(() => window.calls[0])
    await page.evaluate(() => window.cart.updateQuantity(window.cart.items[0].id, 1))
    await page.waitForFunction(() => window.calls.length === 2 && window.cart.status === 'ready')
    assert.notEqual(await page.evaluate(() => window.calls[1]), original)
    assert.equal(await page.evaluate(() => window.cart.items[0].quantity), 2)
    await page.evaluate(() => window.cart.removeFromCart(window.cart.items[0].id))
    await page.waitForFunction(
      () => window.cart.status === 'ready' && !window.cart.hasUnmergedItems
    )
  } finally {
    await context.close()
  }
})

test('product content renders while reviews are pending and related products fail; stale navigation is ignored', async () => {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await page.addInitScript(() => {
      window.productMode = true
      window.startPath = '/products/chair'
      window.products = {
        getProductBySlug: async (slug) => ({
          success: true,
          data: {
            id: slug,
            name: slug,
            slug,
            price: 100,
            stock: 20,
            inStock: true,
            images: [],
            category: { name: 'Furniture', slug: 'furniture' },
          },
        }),
        getRelatedProducts: async () => {
          throw new Error('Related offline')
        },
      }
      window.reviews = () => new Promise((resolve) => (window.resolveReviews = resolve))
    })
    await page.goto(origin)
    await page.getByRole('heading', { name: 'chair', exact: true }).waitFor()
    assert.equal(
      await page.getByText('Related products could not be loaded: Related offline').count(),
      1
    )
    await page.evaluate(() => {
      window.oldReviews = window.resolveReviews
      window.reviews = async () => ({
        success: true,
        data: [],
        summary: { avgRating: null, totalReviews: 0 },
        pagination: { page: 1, totalPages: 1 },
      })
      window.navigate('/products/table')
    })
    await page.getByRole('heading', { name: 'table', exact: true }).waitFor()
    await page.evaluate(() =>
      window.oldReviews({
        success: true,
        data: [],
        summary: { avgRating: 5, totalReviews: 99 },
        pagination: { page: 1, totalPages: 1 },
      })
    )
    assert.equal(await page.getByText('99').count(), 0)
    assert.equal(await page.getByRole('heading', { name: 'table', exact: true }).count(), 1)
  } finally {
    await context.close()
  }
})

test('a session change during token lookup cannot submit another account transfer', async () => {
  const { context, page } = await setup()
  try {
    const result = await page.evaluate(async () => {
      let fetched = false
      window.fetch = async () => {
        fetched = true
        throw new Error('Unexpected fetch')
      }
      window.getSession = async () => ({
        data: { session: { user: { id: 'account-b' }, access_token: 'fixture-token' } },
      })
      try {
        await window.realApi.post('/api/cart/merge', {}, true, 'account-a')
        return { fetched }
      } catch (error) {
        return { fetched, code: error.code }
      }
    })
    assert.deepEqual(result, { fetched: false, code: 'SESSION_CHANGED' })
  } finally {
    await context.close()
  }
})

test('simultaneous mounted tab logins replay one shared transfer operation', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate((item) => window.store.edit(() => [item]), item)
    const second = await context.newPage()
    await second.goto(origin)
    await second.waitForFunction(() => window.cart?.status === 'ready')
    await Promise.all(
      [page, second].map((tab) =>
        tab.evaluate(() => {
          window.calls = []
          window.api.mergeGuestItem = async (id) => {
            window.calls.push(id)
            await new Promise((resolve) => (window.releaseMerge = resolve))
            return { success: true, data: { status: 'applied' } }
          }
          window.auth = { user: { id: 'account-a' }, loading: false }
          window.render()
        })
      )
    )
    await Promise.all(
      [page, second].map((tab) => tab.waitForFunction(() => window.calls.length === 1))
    )
    assert.equal(
      await page.evaluate(() => window.calls[0]),
      await second.evaluate(() => window.calls[0])
    )
    await Promise.all([page, second].map((tab) => tab.evaluate(() => window.releaseMerge())))
    await Promise.all(
      [page, second].map((tab) => tab.waitForFunction(() => window.cart.status === 'ready'))
    )
    assert.equal(await page.evaluate(async () => (await window.store.read()).operations.length), 0)
  } finally {
    await context.close()
  }
})

test('server and duplicate rejected product rows have independent controls; clear persists across reload', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate(async (item) => {
      await window.store.edit(() => [item])
      await window.store.claim('account-a')
      await window.store.edit(() => [item])
      const operations = await window.store.claim('account-a')
      for (const operation of operations) await window.store.reject(operation.id)
      window.deleted = []
      window.api.getCart = async () => ({
        success: true,
        data: { items: [{ ...item, id: 'server-row' }] },
      })
      window.api.deleteCartItem = async (id) => {
        window.deleted.push(id)
        return { success: true }
      }
      window.api.clearCart = async () => {
        window.api.getCart = async () => ({ success: true, data: { items: [] } })
        return { success: true }
      }
      window.auth = { user: { id: 'account-a' }, loading: false }
      window.render()
    }, item)
    await page.waitForFunction(
      () => window.cart.status === 'ready' && window.cart.items.length === 3
    )
    const identities = await page.evaluate(() => window.cart.items.map((item) => item.id))
    assert.equal(new Set(identities).size, 3)
    await page.getByRole('button', { name: 'Remove Chair', exact: true }).nth(2).click()
    await page.waitForFunction(
      () => window.cart.status === 'ready' && window.cart.items.length === 2
    )
    assert.deepEqual(await page.evaluate(() => window.deleted), [])
    assert.equal(await page.evaluate(async () => (await window.store.read()).operations.length), 1)
    assert.equal(
      await page.evaluate(async () => (await window.store.read()).operations[0].id),
      identities[1].replace('guest-transfer-', '')
    )
    await page.getByRole('button', { name: 'Remove Chair', exact: true }).nth(0).click()
    await page.waitForFunction(() => window.deleted.length === 1)
    assert.deepEqual(await page.evaluate(() => window.deleted), ['server-row'])
    await page.evaluate(() => window.cart.clearCart())
    assert.equal(await page.evaluate(async () => (await window.store.read()).operations.length), 0)
    await page.reload()
    await page.waitForFunction(() => window.cart?.status === 'ready')
    assert.deepEqual(await page.evaluate(() => window.cart.items), [])
  } finally {
    await context.close()
  }
})

test('malformed merge responses keep the original operation pending and frozen', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate(async (item) => {
      await window.store.edit(() => [item])
      window.calls = []
      window.api.mergeGuestItem = async (id) => {
        window.calls.push(id)
        return { success: true, data: { status: 'unknown' } }
      }
      window.auth = { user: { id: 'account-a' }, loading: false }
      window.render()
    }, item)
    await page.waitForFunction(() => window.cart.status === 'error')
    const first = await page.evaluate(async () => (await window.store.read()).operations[0])
    assert.equal(first.status, 'pending')
    await assert.rejects(
      page.evaluate((id) => window.store.correct('account-a', id, 2), first.id),
      /awaiting confirmation/
    )
    await page.evaluate(() => window.cart.retry())
    await page.waitForFunction(() => window.calls.length === 2 && window.cart.status === 'error')
    assert.deepEqual(await page.evaluate(() => window.calls), [first.id, first.id])
  } finally {
    await context.close()
  }
})

test('drawer hydration and loading errors never claim the cart is empty', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate(() => {
      window.cart.openCartDrawer()
      window.api.getCart = () => new Promise((resolve, reject) => (window.rejectCart = reject))
      window.auth = { user: { id: 'account-a' }, loading: false }
      window.render()
    })
    await page.waitForFunction(() => !!window.rejectCart)
    const drawer = page.getByRole('dialog', { name: 'Shopping cart' })
    assert.equal(await drawer.getByText('Loading your cart…', { exact: true }).count(), 1)
    assert.equal(await drawer.getByText('Your cart is empty', { exact: true }).count(), 0)
    await page.evaluate(() => window.rejectCart(new Error('Offline drawer')))
    await drawer.getByRole('button', { name: 'Retry loading cart' }).waitFor()
    assert.equal(await drawer.getByText('Offline drawer', { exact: true }).count(), 1)
    assert.equal(await drawer.getByText('Your cart is empty', { exact: true }).count(), 0)
  } finally {
    await context.close()
  }
})

test('cart reads, additions, quantity updates and clearing reject a changed session before fetch', async () => {
  const { context, page } = await setup()
  try {
    const results = await page.evaluate(async () => {
      window.fetch = async () => {
        throw new Error('Unsafe fetch')
      }
      window.getSession = async () => ({
        data: { session: { user: { id: 'account-b' }, access_token: 'fixture-token' } },
      })
      const requests = [
        () => window.realApi.get('/api/cart', true, 'account-a'),
        () => window.realApi.post('/api/cart', {}, true, 'account-a'),
        () => window.realApi.patch('/api/cart/item', {}, true, 'account-a'),
        () => window.realApi.delete('/api/cart', true, 'account-a'),
      ]
      const results = []
      for (const request of requests)
        try {
          await request()
          results.push('unexpected success')
        } catch (error) {
          results.push(error.code)
        }
      return results
    })
    assert.deepEqual(results, Array(4).fill('SESSION_CHANGED'))
  } finally {
    await context.close()
  }
})

test('a delayed unauthorized response cannot sign out a newer session', async () => {
  const { context, page } = await setup()
  try {
    const result = await page.evaluate(async () => {
      window.signOuts = 0
      window.getSession = async () => ({
        data: { session: { user: { id: 'account-a' }, access_token: 'token-a' } },
      })
      window.fetch = () => new Promise((resolve) => (window.resolveUnauthorized = resolve))
      const request = window.realApi
        .get('/api/cart', true, 'account-a')
        .catch((error) => error.code)
      while (!window.resolveUnauthorized) await new Promise((resolve) => setTimeout(resolve, 0))
      window.getSession = async () => ({
        data: { session: { user: { id: 'account-b' }, access_token: 'token-b' } },
      })
      window.resolveUnauthorized(
        new Response(
          JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        )
      )
      return { code: await request, signOuts: window.signOuts }
    })
    assert.deepEqual(result, { code: 'UNAUTHORIZED', signOuts: 0 })
  } finally {
    await context.close()
  }
})

test('clear detects another tab pending transfer before mutating the server', async () => {
  const { context, page } = await setup()
  try {
    await page.evaluate(() => {
      window.auth = { user: { id: 'account-a' }, loading: false }
      window.render()
    })
    await page.waitForFunction(() => window.cart.status === 'ready')
    await page.evaluate(async (item) => {
      await window.store.edit(() => [item])
      await window.store.claim('account-a')
      window.clears = 0
      window.api.clearCart = async () => {
        window.clears++
        return { success: true }
      }
    }, item)
    await assert.rejects(
      page.evaluate(() => window.cart.clearCart()),
      /pending transfers/
    )
    assert.equal(await page.evaluate(() => window.clears), 0)
    assert.equal(
      await page.evaluate(async () => (await window.store.read()).operations[0].status),
      'pending'
    )
  } finally {
    await context.close()
  }
})
