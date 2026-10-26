const assert = require('node:assert/strict')
const { test, before, after } = require('node:test')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')
let vite, browser, origin

before(async () => {
  const { createServer } = await import(
    pathToFileURL(join(__dirname, '../client/node_modules/vite/dist/node/index.js')).href
  )
  const mocks = {
    AuthContext: 'export const useAuth=()=>({user:window.user})',
    'admin.service': `export const adminApiService={refundOrder:async(id,input)=>{sessionStorage.setItem('mutationCount',String(Number(sessionStorage.getItem('mutationCount')??0)+1));sessionStorage.setItem('operation',JSON.stringify({id:'operation-1',provider:'razorpay',operation_type:'partial_refund',business_key:'partial-refund:payment:'+input.refund_intent_id,state:'provider_pending',amount_paisa:input.amount_paisa,cause:input.reason,local_applied_at:null}));throw new Error('Response lost')},reconcileProviderOperation:async()=>{const op=JSON.parse(sessionStorage.getItem('operation'));op.local_applied_at=new Date().toISOString();op.state='provider_succeeded';sessionStorage.setItem('operation',JSON.stringify(op));return {success:true,data:op}}}`,
    client: 'export class ApiError extends Error {}',
  }
  vite = await createServer({
    root: join(__dirname, '../client'),
    cacheDir: join(__dirname, '../client/node_modules/.vite-refund-browser-tests'),
    configFile: false,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'refund-fixture',
        enforce: 'pre',
        resolveId(source) {
          if (source === '/fixture.js') return '\0fixture'
          if (source === 'react-dom/client') return
          const key = source.replace(/.*\//, '').replace(/\.(tsx?|jsx?)$/, '')
          if (mocks[key]) return '\0mock:' + key
        },
        load(id) {
          if (id.startsWith('\0mock:')) return mocks[id.slice(6)]
          if (id === '\0fixture')
            return `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{OrderRefundControls}from'/src/components/admin/OrderRefundControls.tsx';import{refundIntentStore}from'/src/lib/services/refundIntent.store.ts';window.store=refundIntentStore;window.user={id:'admin-1'};const root=createRoot(document.getElementById('root'));window.render=()=>{const saved=sessionStorage.getItem('operation');const operations=saved?[JSON.parse(saved)]:[];root.render(React.createElement(MemoryRouter,{},React.createElement(OrderRefundControls,{order:{id:'order-1',status:'confirmed',shiprocketOrderId:'provider-order',refundBalances:{captured_paisa:10000,refunded_paisa:0,reserved_paisa:0,refundable_paisa:10000,requires_review:false},providerOperations:operations},refresh:async()=>window.render()})))};window.render();`
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

test('confirmed partial refund survives lost response and reload without a second mutation', async () => {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    await page.goto(origin)
    await page.getByLabel('Refund amount ₹').fill('25')
    await page.getByLabel('Refund or cancellation reason').fill('Partial item adjustment')
    await page.getByRole('button', { name: 'Review refund' }).click()
    await page.getByRole('button', { name: 'Confirm refund', exact: true }).click()
    await page.getByRole('button', { name: 'Recover saved refund' }).waitFor()
    assert.equal(
      await page.evaluate(() => JSON.parse(sessionStorage.getItem('operation')).amount_paisa),
      2500
    )
    await page.reload()
    await page.getByRole('button', { name: 'Recover saved refund' }).click()
    await page.getByRole('button', { name: 'Review refund' }).waitFor()
    assert.equal(await page.evaluate(() => sessionStorage.getItem('mutationCount')), '1')
    assert.equal(await page.evaluate(() => window.store.load('admin-1', 'order-1')), null)
  } finally {
    await context.close()
  }
})

test('concurrent tabs claim one immutable refund intent and accounts remain separate', async () => {
  const context = await browser.newContext()
  const a = await context.newPage()
  const b = await context.newPage()
  try {
    await Promise.all([a.goto(origin), b.goto(origin)])
    await Promise.all([
      a.waitForFunction(() => window.store),
      b.waitForFunction(() => window.store),
    ])
    const [first, second] = await Promise.all([
      a.evaluate(() =>
        window.store.claim('admin-1', 'order-1', { amount_paisa: 2500, reason: 'First' })
      ),
      b.evaluate(() =>
        window.store.claim('admin-1', 'order-1', { amount_paisa: 5000, reason: 'Second' })
      ),
    ])
    assert.deepEqual(first, second)
    assert.equal(await a.evaluate(() => window.store.load('admin-2', 'order-1')), null)
    await a.reload()
    await a.waitForFunction(() => window.store)
    assert.deepEqual(await a.evaluate(() => window.store.load('admin-1', 'order-1')), first)
  } finally {
    await context.close()
  }
})

test('a saved intent persisted before dispatch resumes the same prepared refund', async () => {
  const context = await browser.newContext(),
    page = await context.newPage()
  try {
    await page.goto(origin)
    await page.waitForFunction(() => window.store)
    const intent = await page.evaluate(async () => {
      const saved = await window.store.claim('admin-1', 'order-1', {
        amount_paisa: 2500,
        reason: 'Prepared before crash',
      })
      sessionStorage.setItem(
        'operation',
        JSON.stringify({
          id: 'prepared-operation',
          provider: 'razorpay',
          operation_type: 'partial_refund',
          business_key: 'partial-refund:payment:' + saved.refund_intent_id,
          state: 'prepared',
          amount_paisa: 2500,
          cause: saved.reason,
          local_applied_at: null,
        })
      )
      return saved
    })
    await page.reload()
    await page.getByRole('button', { name: 'Recover saved refund' }).click()
    await page.waitForFunction(() => sessionStorage.getItem('mutationCount') === '1')
    assert.equal(
      (await page.evaluate(() => window.store.load('admin-1', 'order-1'))).refund_intent_id,
      intent.refund_intent_id
    )
    assert.equal(
      await page.evaluate(() => JSON.parse(sessionStorage.getItem('operation')).state),
      'provider_pending'
    )
  } finally {
    await context.close()
  }
})
