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
    'admin.service': `const ok=data=>({success:true,data});export const adminApiService={getOrderById:async id=>{window.reads.push(id);const snapshot=structuredClone(window.orders[id]);if(window.delays[id])await new Promise(resolve=>{window.pending[id]=resolve;window.pendingReads.push({id,resolve})});window.finishedReads.push(id);return ok(snapshot)},getPickupLocations:async()=>ok([{pickup_location:'Warehouse A',city:'Mumbai',pincode:'400001'},{pickup_location:'Warehouse B',city:'Pune',pincode:'411001'}]),getOrderCouriers:async(id,input)=>{window.serviceability.push({id,input});const couriers=[{courier_id:17,courier_name:'FastPost',rate_paisa:9900,estimated_delivery_days:3},{courier_id:19,courier_name:'Another courier',rate_paisa:10900,estimated_delivery_days:null}];return ok({available:true,estimated_delivery_days:3,couriers,recommended_courier:couriers[0],pickup_pincode:'400001'})},fulfillOrder:async(id,input)=>{window.fulfillments.push({id,input});const order=window.orders[id];order.shiprocketOrderId='provider-'+id;order.shipmentId='shipment-'+id;order.awbCode='AWB-'+id;order.pickupLocation=input.pickup_location;order.packageWeightGrams=input.weight_grams;order.packageLengthCm=input.length_cm;order.packageBreadthCm=input.breadth_cm;order.packageHeightCm=input.height_cm;const first=window.fulfillments.length===1;order.fulfillmentStep=first?'awb_assigned':'ready_for_pickup';if(!first)order.pickupScheduledDate='2026-10-27';return ok({success:!first,order:structuredClone(order),steps:first?[{step:'create_order',status:'completed'},{step:'assign_awb',status:'completed'},{step:'schedule_pickup',status:'failed'}]:[{step:'create_order',status:'skipped'},{step:'assign_awb',status:'skipped'},{step:'schedule_pickup',status:'completed'}],error:first?'Pickup temporarily unavailable':undefined})},updateOrderStatus:async()=>ok({}),addOrderNote:async()=>ok({}),downloadInvoice:async()=>new Blob(['test invoice'],{type:'application/pdf'})};`,
    ToastContext: `export const useToast=()=>({showToast:()=>{}})`,
    AuthContext: `export const useAuth=()=>({user:window.user})`,
    'refundIntent.store': `export const refundIntentStore={load:async()=>null,acknowledge:async()=>{}}`,
    client: `export class ApiError extends Error{}`,
    SiteSettingsContext: `import{useState}from'react';export const useSiteSettings=()=>{const[settings,setSettings]=useState(window.settings);window.changeSettings=next=>{window.settings=next;setSettings(next)};return{settings}}`,
  }
  vite = await createServer({
    root: join(__dirname, '../client'),
    configFile: false,
    cacheDir: join(__dirname, '../client/node_modules/.vite-fulfillment-tests'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'fulfillment-fixture',
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
            return `import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,Routes,Route,Link}from'react-router-dom';import{AdminOrderDetailPage}from'/src/pages/admin/AdminOrderDetailPage.tsx';const address={fullName:'Fixture customer',phone:'9876543210',line1:'Local test address',line2:null,city:'Bengaluru',state:'Karnataka',pincode:'560001',country:'India'};const order=id=>({id,orderNumber:id,status:'confirmed',paymentStatus:'paid',fulfillmentStatus:'unfulfilled',fulfillmentStep:'idle',subtotal:150000,discountAmount:0,shippingAmount:0,totalAmount:150000,shippingMethod:'standard',shippingAddress:address,billingAddress:address,billingGstin:null,billingSameAsShipping:true,refundBalances:{captured_paisa:150000,refunded_paisa:0,reserved_paisa:0,refundable_paisa:150000,requires_review:false},providerOperations:[],shiprocketOrderId:null,shipmentId:null,awbCode:null,pickupScheduledDate:null,pickupLocation:id==='A'?'Warehouse A':'Warehouse B',packageWeightGrams:id==='A'?750:900,packageLengthCm:25,packageBreadthCm:18,packageHeightCm:6,items:[{id:'item-'+id,productId:'product-'+id,productName:'Cotton wrap '+id,quantity:1,unitPrice:150000,totalPrice:150000}],createdAt:'2026-10-26T10:00:00Z',updatedAt:'2026-10-26T10:00:00Z',adminNotes:[]});window.orders={A:order('A'),B:order('B')};window.user={id:'admin-fixture'};window.settings={shiprocketSettings:{pickupLocation:'Warehouse B',defaultWeightGrams:1200,defaultLengthCm:99,defaultBreadthCm:98,defaultHeightCm:97},configuration:{fulfillment_ready:true}};if(new URLSearchParams(location.search).has('frozenPackage')){window.orders.A.packageWeightGrams=2000;window.orders.A.items[0].quantity=4;window.orders.A.items[0].unitPrice=37500;window.settings.shiprocketSettings.defaultWeightGrams=500;}window.reads=[];window.finishedReads=[];window.delays={};window.pending={};window.pendingReads=[];window.serviceability=[];window.fulfillments=[];createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,{},React.createElement(React.Fragment,{},React.createElement(Link,{to:'/admin/orders/A'},'Navigate to A'),React.createElement(Link,{to:'/admin/orders/B'},'Navigate to B'),React.createElement(Routes,{},React.createElement(Route,{path:'/admin/orders/:id',element:React.createElement(AdminOrderDetailPage)})))));window.ready=true;`
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url.startsWith('/admin/orders/') && req.url !== '/') return next()
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
async function fixture(run, query = '') {
  const page = await browser.newPage()
  page.on('pageerror', (error) => console.error(error.message))
  try {
    await page.goto(origin + '/admin/orders/A' + query)
    await page.getByRole('heading', { name: 'Order A', exact: true }).waitFor()
    await run(page)
  } finally {
    await page.close()
  }
}

test('navigating to a delayed order hides the prior order actions and rejects its stale refresh', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.delays.A = true
      window.delays.B = true
    })
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.waitForFunction(() => window.pending.A)
    await page.getByRole('link', { name: 'Navigate to B', exact: true }).click()
    await page.waitForFunction(() => window.pending.B)
    assert.equal(await page.getByRole('heading', { name: 'Order A', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Fulfill order', exact: true }).count(), 0)
    assert.equal(await page.getByLabel('Refund amount ₹', { exact: true }).count(), 0)
    await page.evaluate(() => {
      window.delays.B = false
      window.pending.B()
    })
    await page.getByRole('heading', { name: 'Order B', exact: true }).waitFor()
    await page.evaluate(() => {
      window.delays.A = false
      window.pending.A()
    })
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    )
    assert.equal(await page.getByRole('heading', { name: 'Order A', exact: true }).count(), 0)
    assert.equal(await page.getByRole('heading', { name: 'Order B', exact: true }).count(), 1)
    assert.equal(await page.getByLabel('Weight g', { exact: true }).inputValue(), '900')
  }))

test('saved package and pickup override changed global settings, grams reach serviceability and carrier costs stay store-paid', () =>
  fixture(async (page) => {
    await page.getByRole('button', { name: 'Check couriers', exact: true }).waitFor()
    assert.equal(await page.getByLabel('Weight g', { exact: true }).inputValue(), '750')
    assert.equal(await page.getByLabel('Length cm', { exact: true }).inputValue(), '25')
    assert.equal(await page.getByLabel('Breadth cm', { exact: true }).inputValue(), '18')
    assert.equal(await page.getByLabel('Height cm', { exact: true }).inputValue(), '6')
    assert.match(
      await page.getByRole('button', { name: 'Registered pickup', exact: true }).innerText(),
      /Warehouse A/
    )
    await page.evaluate(() =>
      window.changeSettings({
        ...window.settings,
        shiprocketSettings: {
          pickupLocation: 'Warehouse B',
          defaultWeightGrams: 5000,
          defaultLengthCm: 80,
          defaultBreadthCm: 70,
          defaultHeightCm: 60,
        },
      })
    )
    assert.equal(await page.getByLabel('Weight g', { exact: true }).inputValue(), '750')
    await page.getByRole('button', { name: 'Check couriers', exact: true }).click()
    await page.getByRole('button', { name: 'Courier (store cost)', exact: true }).click()
    await page.getByRole('menuitem', { name: /FastPost/ }).click()
    assert.deepEqual(await page.evaluate(() => window.serviceability[0]), {
      id: 'A',
      input: {
        pickup_location: 'Warehouse A',
        weight_grams: 750,
        length_cm: 25,
        breadth_cm: 18,
        height_cm: 6,
      },
    })
    const shipping = page
      .locator('dl div')
      .filter({ has: page.locator('dt').filter({ hasText: /^Shipping$/ }) })
    assert.match(await shipping.innerText(), /₹0/)
    assert.equal(await page.evaluate(() => window.orders.A.shippingAmount), 0)
    assert.equal(await page.evaluate(() => window.orders.A.totalAmount), 150000)
  }))

test('combined fulfillment keeps partial steps visible and resumes persisted progress without charging the customer', () =>
  fixture(async (page) => {
    await page.getByRole('button', { name: 'Check couriers', exact: true }).click()
    await page.getByRole('button', { name: 'Courier (store cost)', exact: true }).click()
    await page.getByRole('menuitem', { name: /FastPost/ }).click()
    await page.getByRole('button', { name: 'Fulfill order', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Pickup temporarily unavailable' }).waitFor()
    await page.getByText('create order: completed', { exact: true }).waitFor()
    await page.getByText('assign awb: completed', { exact: true }).waitFor()
    await page.getByText('schedule pickup: failed', { exact: true }).waitFor()
    await page.getByText(/Progress: awb assigned/).waitFor()
    const resume = page.getByRole('button', { name: 'Resume fulfillment', exact: true })
    assert.equal(
      await resume.isEnabled(),
      true,
      'Persisted partial fulfillment must allow later fulfillment steps to resume'
    )
    await resume.click()
    await page.getByText('schedule pickup: completed', { exact: true }).waitFor()
    await page.getByText(/Progress: ready for pickup/).waitFor()
    const calls = await page.evaluate(() => window.fulfillments)
    assert.equal(calls.length, 2)
    assert.deepEqual(calls[0], {
      id: 'A',
      input: {
        pickup_location: 'Warehouse A',
        weight_grams: 750,
        length_cm: 25,
        breadth_cm: 18,
        height_cm: 6,
        courier_id: 17,
      },
    })
    assert.deepEqual(calls[1], calls[0])
    assert.equal(await page.evaluate(() => window.orders.A.shippingAmount), 0)
    assert.equal(await resume.isDisabled(), true)
  }))

test('a slower refresh cannot replace a newer response for the same order', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.delays.A = true
      window.orders.A.deliveryInstructions = 'Earlier instructions'
    })
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.waitForFunction(() => window.pendingReads.length === 1)
    await page.evaluate(() => {
      window.orders.A.deliveryInstructions = 'Latest instructions'
    })
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.waitForFunction(() => window.pendingReads.length === 2)
    await page.evaluate(() => window.pendingReads[1].resolve())
    await page.getByText('Delivery instructions: Latest instructions', { exact: true }).waitFor()
    await page.evaluate(() => window.pendingReads[0].resolve())
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    )
    assert.equal(
      await page.getByText('Delivery instructions: Earlier instructions', { exact: true }).count(),
      0
    )
    assert.equal(
      await page.getByText('Delivery instructions: Latest instructions', { exact: true }).count(),
      1
    )
  }))

test('an unresolved cancellation or refund operation blocks fulfillment actions', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.orders.A.providerOperations = [
        {
          id: 'cancel-A',
          provider: 'shiprocket',
          operation_type: 'cancel_order',
          business_key: 'cancel:A',
          state: 'provider_pending',
          amount_paisa: null,
          cause: 'Customer requested cancellation',
          local_applied_at: null,
        },
      ]
    })
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('button')).find(
          (button) => button.textContent === 'Check couriers'
        )?.disabled
    )
    assert.equal(
      await page.getByRole('button', { name: 'Check couriers', exact: true }).isDisabled(),
      true
    )
    assert.equal(
      await page.getByRole('button', { name: 'Fulfill order', exact: true }).isDisabled(),
      true
    )
    assert.deepEqual(await page.evaluate(() => window.fulfillments), [])
    await page.evaluate(() => {
      window.orders.A.providerOperations[0].provider = 'razorpay'
      window.orders.A.providerOperations[0].operation_type = 'partial_refund'
    })
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.getByRole('button', { name: 'Fulfill order', exact: true }).waitFor()
    assert.equal(
      await page.getByRole('button', { name: 'Fulfill order', exact: true }).isDisabled(),
      true
    )
  }))

test('choosing a nonrecommended order courier requires and records an override reason', () =>
  fixture(async (page) => {
    await page.getByRole('button', { name: 'Check couriers', exact: true }).click()
    await page.getByRole('button', { name: 'Courier (store cost)', exact: true }).click()
    await page.getByRole('menuitem', { name: /Another courier/ }).click()
    const reason = page.getByLabel('Reason for choosing another courier')
    await reason.waitFor()
    assert.equal(
      await page.getByRole('button', { name: 'Fulfill order', exact: true }).isDisabled(),
      true
    )
    await reason.fill('Preferred collection window for this order')
    await page.getByRole('button', { name: 'Fulfill order', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Pickup temporarily unavailable' }).waitFor()
    assert.equal(await page.evaluate(() => window.fulfillments[0].input.courier_id), 19)
    assert.equal(
      await page.evaluate(() => window.fulfillments[0].input.courier_override_reason),
      'Preferred collection window for this order'
    )
  }))

test('changing any package dimension clears the old recommendation and checks the order again', () =>
  fixture(async (page) => {
    await page.getByRole('button', { name: 'Check couriers', exact: true }).click()
    await page.getByRole('button', { name: 'Courier (store cost)', exact: true }).waitFor()
    await page.getByLabel('Height cm', { exact: true }).fill('9')
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll('button')].some(
          (button) => button.getAttribute('aria-label') === 'Courier (store cost)'
        )
    )
    await page.getByRole('button', { name: 'Check couriers', exact: true }).click()
    await page.getByRole('button', { name: 'Courier (store cost)', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.serviceability[1].input.height_cm), 9)
  }))

test('fully persisted successful shipping operations permit the next fulfillment step', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.orders.A.providerOperations = [
        {
          id: 'create-A',
          provider: 'shiprocket',
          operation_type: 'create_order',
          state: 'provider_succeeded',
          local_applied_at: '2026-10-28T10:00:00Z',
        },
      ]
    })
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.getByRole('button', { name: 'Fulfill order', exact: true }).waitFor()
    assert.equal(
      await page.getByRole('button', { name: 'Fulfill order', exact: true }).isEnabled(),
      true
    )
  }))

test('normal admin courier lookup and fulfillment retain the frozen2kg package over newer500g defaults', () =>
  fixture(async (page) => {
    assert.equal(await page.getByLabel('Weight g', { exact: true }).inputValue(), '2000')
    assert.equal(
      await page.evaluate(() => window.settings.shiprocketSettings.defaultWeightGrams),
      500
    )
    await page.getByRole('button', { name: 'Check couriers', exact: true }).click()
    await page.getByRole('button', { name: 'Courier (store cost)', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Fulfill order', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Pickup temporarily unavailable' }).waitFor()
    assert.equal(await page.evaluate(() => window.serviceability[0].input.weight_grams), 2000)
    assert.equal(await page.evaluate(() => window.fulfillments[0].input.weight_grams), 2000)
  }, '?frozenPackage=1'))
