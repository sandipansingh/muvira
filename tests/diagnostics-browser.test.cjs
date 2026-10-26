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
    client: `export class ApiError extends Error{};export const api={get:async path=>{window.requests.push(path);const url=new URL(path,'http://example.com'),page=Number(url.searchParams.get('page')??1),kind=url.searchParams.get('kind'),status=url.searchParams.get('status');if(window.failPath&&path.includes(window.failPath))throw new Error('Queue temporarily unavailable');if(path.includes('retry-queue')&&window.delayStatus===status)await new Promise(resolve=>window.releaseDelayed=resolve);const stamp='2026-10-26T10:00:00Z',base={id:'failure-'+page,order_id:'order-'+page,updated_at:stamp,created_at:stamp,last_error:'Older failure page '+page};const ok=data=>({success:true,data,meta:{page,limit:20,total:41}});if(path.endsWith('/summary'))return ok({worker_state:'waiting',overdue_late_capture_watches:4,pending_cancellation_refunds:3});if(path.includes('retry-queue'))return ok([{...base,job_type:'Retry page '+page+' '+status,status,retry_count:2,max_retries:5}]);if(path.includes('webhook-logs'))return ok([{...base,event_type:'Webhook page '+page,source:'razorpay',retry_count:2}]);if(path.includes('/notifications/logs'))return ok([{...base,event_type:'Email page '+page,sent_status:'failed',attempts:2}]);const keys={outbox:'dead_outbox_events',invoice:'failed_invoices',payment_reconciliation:'payment_reconciliation_cases',operational_alert:'operational_alerts',provider_operation:'provider_operations',retained_checkout:'retained_checkout_cases',late_capture_watch:'late_capture_watches',cancellation_refund:'cancellation_refunds'};return ok({[keys[kind]??'dead_outbox_events']:[{...base,event_type:'Outbox page '+page,aggregate_id:'order-'+page,payload:{orderId:'order-'+page},status:'pending',next_retry_at:stamp,next_check_at:stamp,check_attempts:7,failed_checks:2,last_check_error:'Provider temporarily unavailable',razorpay_order_id:'rzp-'+page}]})},post:async()=>({success:true,data:{}})};`,
    ToastContext: `export const useToast=()=>({showToast:()=>{}})`,
  }
  vite = await createServer({
    root: join(__dirname, '../client'),
    configFile: false,
    cacheDir: join(__dirname, '../client/node_modules/.vite-diagnostics-tests'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'diagnostics-fixture',
        enforce: 'pre',
        resolveId(source) {
          if (source === 'react-dom/client') return
          if (source === '/fixture.js') return '\0fixture'
          const key = source.replace(/.*\//, '').replace(/\.(tsx?|jsx?)$/, '')
          if (mocks[key]) return '\0mock:' + key
        },
        load(id) {
          if (id.startsWith('\0mock:')) return mocks[id.slice(6)]
          if (id === '\0fixture')
            return `import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{AdminFailuresPage}from'/src/pages/admin/AdminFailuresPage.tsx';window.requests=[];createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,{},React.createElement(AdminFailuresPage)));window.ready=true;`
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!['/', '/admin/failures'].includes(req.url.split('?')[0])) return next()
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
async function fixture(query, run) {
  const page = await browser.newPage()
  page.on('pageerror', (error) => console.error(error.message))
  try {
    await page.goto(origin + '/admin/failures' + query)
    await page.waitForFunction(() => window.ready && window.requests.length >= 4)
    await run(page)
  } finally {
    await page.close()
  }
}

test('diagnostic queues restore independent URL pages and fetch failures before notification pagination', () =>
  fixture(
    '?retry_page=2&retry_status=failed&webhook_page=3&notification_page=2&commerce_kind=cancellation_refund&commerce_cancellation_refund_page=2',
    async (page) => {
      const requests = await page.evaluate(() => window.requests)
      const url = (fragment) =>
        new URL(
          requests.find((path) => path.includes(fragment)),
          'http://example.com'
        )
      assert.equal(url('retry-queue').searchParams.get('page'), '2')
      assert.equal(url('retry-queue').searchParams.get('status'), 'failed')
      assert.equal(url('webhook-logs').searchParams.get('page'), '3')
      assert.equal(url('/notifications/logs').searchParams.get('page'), '2')
      assert.equal(url('/notifications/logs').searchParams.get('status'), 'failures')
      assert.equal(url('commerce-failures').searchParams.get('kind'), 'cancellation_refund')
      assert.equal(url('commerce-failures').searchParams.get('page'), '2')
      await page.getByText('Retry page 2 failed', { exact: true }).waitFor()
      await page.getByText('Webhook page 3', { exact: true }).waitFor()
      await page.getByText('Email page 2', { exact: true }).waitFor()
      await page.getByText('Cancellation refund', { exact: true }).waitFor()
      await page.getByText('Worker state: waiting', { exact: true }).waitFor()
    }
  ))

test('commerce kind switching preserves each page in URL and reaches older failure rows', () =>
  fixture('', async (page) => {
    const section = page.getByRole('region', { name: 'Commerce integrity', exact: true })
    await section.getByRole('button', { name: 'Go to page 2', exact: true }).click()
    await section.getByText('Outbox page 2', { exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('commerce_outbox_page'), '2')
    await section.getByRole('button', { name: 'Commerce failure kind', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Cancellation refunds', exact: true }).click()
    await section.getByRole('button', { name: 'Go to page 3', exact: true }).click()
    await page.waitForFunction(() =>
      location.search.includes('commerce_cancellation_refund_page=3')
    )
    await section.getByRole('button', { name: 'Commerce failure kind', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Outbox events', exact: true }).click()
    await section.getByText('Outbox page 2', { exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('commerce_cancellation_refund_page'), '3')
    await page.reload()
    await section.getByText('Outbox page 2', { exact: true }).waitFor()
  }))

test('queue errors remain retryable without hiding independent queues; stale filter results are ignored', () =>
  fixture('', async (page) => {
    const retry = page.getByRole('region', { name: 'Retry jobs', exact: true })
    await page.evaluate(() => {
      window.failPath = 'retry-queue'
    })
    await retry.getByRole('button', { name: 'Go to page 2', exact: true }).click()
    await retry.getByText('Queue temporarily unavailable', { exact: true }).waitFor()
    await page.getByText('Email page 1', { exact: true }).waitFor()
    await page.evaluate(() => {
      window.failPath = null
    })
    await retry.getByRole('button', { name: 'Reload queue', exact: true }).click()
    await retry.getByText('Retry page 2 dead', { exact: true }).waitFor()
    await page.evaluate(() => {
      window.delayStatus = 'failed'
    })
    await retry.getByRole('button', { name: 'Retry job status', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Failed jobs', exact: true }).click()
    await page.waitForFunction(() => window.releaseDelayed)
    await retry.getByRole('button', { name: 'Retry job status', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Pending jobs', exact: true }).click()
    await retry.getByText('Retry page 1 pending', { exact: true }).waitFor()
    await page.evaluate(() => window.releaseDelayed())
    assert.equal(await retry.getByText('Retry page 1 failed', { exact: true }).count(), 0)
    assert.equal(new URL(page.url()).searchParams.get('retry_status'), 'pending')
  }))

test('late capture scheduling and worker backlog remain visible on an older queue page', () =>
  fixture('?commerce_kind=late_capture_watch&commerce_late_capture_watch_page=2', async (page) => {
    const commerce = page.getByRole('region', { name: 'Commerce integrity', exact: true })
    await commerce.getByText('Late capture watch', { exact: true }).waitFor()
    await commerce.getByText('Provider temporarily unavailable', { exact: true }).waitFor()
    await commerce.getByText(/Checks: 7 · Failed checks: 2/).waitFor()
    await page.getByText('Overdue late capture watches: 4', { exact: true }).waitFor()
    await page.getByText('Pending cancellation refunds: 3', { exact: true }).waitFor()
    assert.equal(
      await commerce.getByRole('link', { name: 'Open order', exact: true }).getAttribute('href'),
      '/admin/orders/order-2'
    )
  }))
