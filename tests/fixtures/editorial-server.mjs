import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const snapshot = JSON.parse(
  await readFile(new URL('./editorial-catalog.json', import.meta.url), 'utf8')
)
const helper = `const f=()=>window.fixture; const ok=data=>({success:true,data}); const page=data=>({...ok(data),pagination:{page:1,limit:20,total:data.length,totalPages:1}}); const blocked=async()=>{throw new Error('Mutations are blocked in visual fixtures')}; const service=methods=>new Proxy(methods,{get:(target,key)=>key in target?target[key]:blocked}); const read=async data=>{if(f().scenario==='loading')await new Promise(()=>{});if(f().scenario==='error')throw new Error('Fixture service unavailable');return data};`
const mocks = {
  AuthContext: `import React from 'react'; export const AuthProvider=({children})=>children; export const useAuth=()=>window.fixture.auth;`,
  CartContext: `import React,{createContext,useContext,useState}from'react';const Context=createContext(null);export const useCart=()=>useContext(Context);export function CartProvider({children}){const[isDrawerOpen,setIsDrawerOpen]=useState(false);const[items,setItems]=useState(window.fixture.cart);const[loading,setLoading]=useState(false);const total=items.reduce((n,i)=>n+i.lineTotal,0);return React.createElement(Context.Provider,{value:{items,isDrawerOpen,setIsDrawerOpen,openCartDrawer:()=>setIsDrawerOpen(true),closeCartDrawer:()=>setIsDrawerOpen(false),itemCount:items.reduce((n,i)=>n+i.quantity,0),subtotalPaisa:total,totalPaisa:total,discountPaisa:0,shippingPaisa:0,freeShippingThresholdPaisa:0,amountForFreeShippingPaisa:0,loading,status:'ready',error:null,hasUnmergedItems:false,coupon:null,retry:()=>{},addToCart:async(product,quantity=1)=>{const query=new URLSearchParams(location.search);if(query.has('gatedAdd'))await new Promise(done=>window.fixture.resolveCartAdd=done);if(query.has('slowAdd'))await new Promise(done=>setTimeout(done,600));if(query.has('addFailure'))throw new Error('Cart update was not confirmed');if(!product.inStock)throw new Error('Out of stock');if(window.authFixture){(window.fixture.cartAdds ||= []).push(quantity);setItems(current=>current.map(item=>item.productId===product.id?{...item,quantity:item.quantity+quantity,lineTotal:(item.quantity+quantity)*item.unitPrice}:item))}else setItems(window.fixture.cart);setIsDrawerOpen(true)},removeFromCart:async id=>setItems(items.filter(i=>i.id!==id)),updateQuantity:async()=>{if(new URLSearchParams(location.search).has('slowQuantity')){setLoading(true);await new Promise(done=>setTimeout(done,500));setLoading(false)}},resetAfterOrder:()=>setItems([]),clearCart:async()=>setItems([]),applyCoupon:async()=>false,removeCoupon:()=>{}}},children)}`,
  'product.service': `${helper} export const productService=service({getProducts:async()=>page(await read(f().scenario==='empty'?[]:f().products)),getProductBySlug:async()=>ok(await read(f().product)),getRelatedProducts:async()=>ok(await read(f().products.slice(1,5)))});`,
  'category.service': `${helper} export const categoryService=service({getCategories:async()=>ok(await read(f().scenario==='empty'?[]:f().categories))});`,
  'settings.service': `${helper} export const settingsService=service({getSettings:async()=>ok(await read(f().settings))});`,
  'address.service': `${helper} export const addressService=service({getAddresses:async()=>ok(await read([f().address]))});`,
  'notification.service': `${helper} export const notificationService=service({getPreferences:async()=>ok({emailEnabled:true})});`,
  'checkout.service': `${helper} export const checkoutService=service({quote:async()=>read(f().quote),active:async()=>null,paymentConfig:async()=>({keyId:'rzp_test_fixture'})});`,
  'order.service': `${helper} export const orderApiService=service({getOrders:async()=>page(await read([f().order])),getOrderById:async()=>ok(await read(f().order)),getOrderTracking:async()=>ok(f().tracking||{awb_code:null,tracking_url:null,courier_name:null,shiprocket_status:null,shipment_events:[]}),downloadInvoice:async()=>{if(new URLSearchParams(location.search).has('gatedInvoice'))await new Promise(resolve=>window.fixture.resolveInvoice=resolve);return new Blob(['%PDF-1.4 visual fixture only'],{type:'application/pdf'})}});`,
  'review.service': `${helper} export const reviewService=service({getProductReviews:async()=>({...page([]),summary:{avgRating:null,totalReviews:0}})});`,
  'admin.service': `${helper} export const adminApiService=service({getDashboardStats:async()=>ok(await read(f().stats)),getProducts:async()=>page(await read(f().details)),getProduct:async()=>ok(f().product),getCategoriesList:async()=>page(await read(f().categories)),getCoupons:async()=>page(await read([f().coupon])),getOrders:async()=>page(await read([f().adminOrder])),getOrderById:async()=>ok(await read(f().order)),getPickupLocations:async()=>ok([]),getDiagnosticSummary:async()=>ok({workerState:'running',overdueLateCaptureWatches:0,pendingCancellationRefunds:0}),getRetryJobs:async()=>page([f().retry]),getWebhookFailures:async()=>page([]),getNotificationDeliveries:async()=>page([]),getCommerceFailures:async(_page,kind)=>page(['provider_operation','retained_checkout'].includes(kind)?[{id:'fixture-failure',kind,label:'Fixture provider outcome to review',orderId:'fixture-order',lastError:'Provider response not yet reconciled',state:'unknown',amountPaisa:10000,currency:'INR',targetType:'order',target:'fixture-order',businessKey:'fixture-operation',dispatchAttempts:1,reconciliationAttempts:2,localCompletionPending:false,deadlineAt:'2026-10-27T00:00:00Z',lastVerifiedAt:'2026-10-26T00:00:00Z',extensionCount:1,escalation:'watching',updatedAt:'2026-10-27T10:00:00Z'}]:[])});`,
  client: `export class ApiError extends Error{};export const api=new Proxy({},{get:()=>async()=>{throw new Error('Unhandled API call blocked in visual fixtures')}});`,
  supabase: `export const supabase={auth:{getSession:async()=>({data:{session:{access_token:'fixture-only'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}}),resetPasswordForEmail:async()=>({error:null})}};`,
}

const entry = `
import React from 'react';import{createRoot}from'react-dom/client';import{mapProductDetail,mapProductListItem,mapCategory,mapSiteSettings}from'/src/lib/utils/adapters.ts';import{App}from'/src/App.tsx';import'/src/index.css';
const raw=${JSON.stringify(snapshot)};
const query=new URLSearchParams(location.search),role=query.get('fixtureRole')||'customer',scenario=query.get('scenario')||'ready';
const products=raw.products.map(mapProductListItem),details=raw.products.map(mapProductDetail),product=details[0],categories=raw.categories.map(mapCategory),settings=mapSiteSettings(raw.settings);
const address={id:'fixture-address',label:'Home',fullName:'Aarohi Sen',phone:'9000000000',line1:'24 Sample Lane',line2:null,city:'Kolkata',state:'West Bengal',pincode:'700039',country:'India',isDefault:true};
const cart=[{id:'fixture-item',productId:product.id,productName:product.name,productSlug:product.slug,productImage:product.images[0]?.url,unitPrice:product.price,quantity:1,lineTotal:product.price,inStock:true,availableStock:product.stock}];
const order={id:'fixture-order',orderNumber:'MUV-2026-1042',status:'confirmed',paymentStatus:query.get('payment')||'paid',fulfillmentStatus:'unfulfilled',fulfillmentStep:'idle',subtotal:product.price,discountAmount:0,shippingAmount:0,taxAmount:0,totalAmount:product.price,couponCode:null,paymentMethod:'razorpay',shippingMethod:'standard',shippingAddress:address,billingAddress:address,billingSameAsShipping:true,billingGstin:null,refundBalances:{captured_paisa:product.price,refunded_paisa:0,reserved_paisa:0,refundable_paisa:product.price,requires_review:false},providerOperations:[],items:[{id:'item-1',productId:product.id,productName:product.name,productImage:product.images[0]?.url,unitPrice:product.price,quantity:1,totalPrice:product.price}],createdAt:'2026-10-26T10:00:00Z',updatedAt:'2026-10-26T10:00:00Z',awbCode:null,shiprocketOrderId:null,shiprocketStatus:null,shiprocketError:null,shipmentId:null,courierName:null,trackingUrl:null,pickupScheduledDate:null,pickupTokenNumber:null,labelGenerated:false,manifestGenerated:false,packageWeightGrams:500,pickupLocation:null,packageLengthCm:15,packageBreadthCm:10,packageHeightCm:5,customer:{id:'fixture-user',fullName:'Aarohi Sen',phone:address.phone,email:'aarohi@example.test'},adminNotes:[],itemCount:1,firstItemName:product.name,firstItemImage:product.images[0]?.url};
const quote={items:[{productId:product.id,productName:product.name,quantity:1,unitPricePaisa:product.price,lineTotalPaisa:product.price}],subtotalPaisa:product.price,discountAmountPaisa:0,shippingAmountPaisa:0,taxAmountPaisa:0,totalAmountPaisa:product.price,coupon:null,shippingMethod:'standard',shippingLabel:'Standard shipping',shippingDescription:'5–7 business days',shippingMethods:{standard:{enabled:true,label:'Standard shipping',description:'5–7 business days',amountPaisa:0},express:{enabled:true,label:'Express shipping',description:'1–2 business days',amountPaisa:0}}};
const user={id:'fixture-user',fullName:'Aarohi Sen',phone:address.phone,email:'aarohi@example.test',role:role==='admin'?'admin':'customer'};
const noop=async()=>false;
window.fixture={scenario,products,details,product,categories,settings,address,cart,order,quote,auth:{user:role==='guest'?null:user,isAuthenticated:role!=='guest',isAdmin:role==='admin',loading:false,profileError:null,login:noop,signup:noop,logout:noop,updateProfile:noop,retryProfile:noop},adminOrder:{...order,customerName:user.fullName,customerEmail:user.email,customerPhone:user.phone,destination:'Kolkata, West Bengal 700039'},stats:{totalOrders:42,ordersToday:3,totalRevenue:4280000,revenueToday:149700,totalProducts:products.length,activeProducts:products.length,totalCategories:categories.length,activeCoupons:1,lowStockCount:2,pendingOrders:4,confirmedOrders:3},coupon:{id:'fixture-coupon',code:'DEVOTION10',description:'Visual test coupon',discountType:'percentage',discountValue:10,minOrderAmount:100000,maxDiscountAmount:10000,usageLimit:100,timesUsed:8,validFrom:'2026-10-01T00:00:00Z',validUntil:null,isActive:true},retry:{id:'fixture-retry',jobType:'invoice_generation',referenceId:'fixture-order',status:'dead',retryCount:5,maxRetries:5,lastError:'Provider temporarily unavailable',nextRetryAt:'2026-10-27T10:00:00Z',createdAt:'2026-10-26T10:00:00Z'}};
if(scenario==='empty-cart')cart.splice(0);
if(scenario==='unconfigured')settings.heroSlides=[];
if(scenario==='missing-images'){products.forEach(p=>p.primaryImageUrl='');details.forEach(p=>p.images=[]);}
if(scenario==='long-name')products[0].name='Traditional handcrafted devotional idol with detailed ornaments for the home mandir and thoughtful gifting';
if(query.has('campaigns'))settings.promoBanners=[{id:'test-campaign-1',title:'For the home mandir',subtitle:'A place for your daily ritual.',imageUrl:'/images/editorial/stone-alcove.png',link:'/shop'},{id:'test-campaign-2',title:'A thoughtful beginning',subtitle:'Explore the current collection.',imageUrl:'/images/editorial/stone-alcove.png',link:'/categories'}];
if(query.has('shipment')){order.shiprocketOrderId=12345;order.awbCode='FIXTURE12345';order.courierName='Fixture courier';window.fixture.tracking={awb_code:order.awbCode,courier_name:order.courierName,shiprocket_status:'In transit',tracking_url:null,shipment_events:[{id:'fixture-event',status:'Picked up',location:'Kolkata',remarks:'Fixture tracking event',event_time:'2026-10-27T10:00:00Z'}]};}
if(query.get('hero')==='unknown')settings.heroSlides=[{...settings.heroSlides[0],title:'A new photograph',imageUrl:'/images/editorial/stone-alcove.webp',link:'/shop'}];
if(query.get('hero')==='long')settings.heroSlides[0].title='Meaningful pieces for your everyday moments of devotion and celebration';
if(query.get('scenario')==='broken-images'){products.forEach(p=>p.primaryImageUrl='/fixture-broken-photo.webp');details.forEach(p=>p.images=[{url:'/fixture-broken-photo.webp'}]);}
if(query.has('care'))product.metadata.care_instructions='Care instructions supplied by the fixture catalog.';
if(query.has('photos')){const count=Number(query.get('photos'));const original=product.images;product.images=Array.from({length:count},(_,i)=>({...original[i%original.length],id:'fixture-photo-'+i,sortOrder:i}));}
if(scenario==='sparse'){products.splice(1);details.splice(1);categories.splice(2);}
if(scenario==='unknown-collections')categories.forEach(category=>category.imageUrl='/images/editorial/stone-alcove.webp');
if(query.has('stock')){products.forEach(p=>{p.stock=0;p.inStock=false});details.forEach(p=>{p.stock=0;p.inStock=false});}
sessionStorage.setItem('muvira_password_recovery','fixture-only');
createRoot(document.getElementById('root')).render(React.createElement(App));window.fixtureReady=true;
`

export async function startEditorialServer({
  defaultRole = 'customer',
  publicCatalog = false,
  realAuth = false,
  customCheckout = false,
} = {}) {
  const fixtureEntry = entry.replace(
    "query.get('fixtureRole')||'customer'",
    `query.get('fixtureRole')||${JSON.stringify(defaultRole)}`
  )
  const { createServer } = await import(
    pathToFileURL(join(root, 'client/node_modules/vite/dist/node/index.js')).href
  )
  const require = createRequire(join(root, 'client/package.json'))
  const tailwindConfig = (await import(pathToFileURL(join(root, 'client/tailwind.config.js')).href))
    .default
  const server = await createServer({
    define: {
      ...(realAuth ? { 'import.meta.env.VITE_AUTH_REDIRECT_URL': JSON.stringify('') } : {}),
      ...(customCheckout ? { 'import.meta.env.VITE_API_URL': JSON.stringify('') } : {}),
    },
    css: {
      postcss: {
        plugins: [
          require('tailwindcss')({
            ...tailwindConfig,
            content: [
              join(root, 'client/index.html'),
              join(root, 'client/src/**/*.{js,ts,jsx,tsx}'),
            ],
          }),
          require('autoprefixer')(),
        ],
      },
    },
    root: join(root, 'client'),
    configFile: false,
    cacheDir: join(root, 'client/node_modules/.vite-editorial-fixtures', String(process.pid)),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'isolated-editorial-fixtures',
        enforce: 'pre',
        resolveId(source) {
          if (source === 'react-dom/client') return
          if (source === '/editorial-fixture.js') return '\0editorial-fixture'
          const key = source.replace(/.*\//, '').replace(/\.(tsx?|jsx?)$/, '')
          if (customCheckout && ['checkout.service', 'client'].includes(key)) return
          if (realAuth && key === 'AuthContext') return
          if (realAuth && authBrowserMocks[key]) return '\0auth-browser-mock:' + key
          if (mocks[key]) return '\0editorial-mock:' + key
        },
        load(id) {
          if (id.startsWith('\0auth-browser-mock:')) return authBrowserMocks[id.slice(19)]
          if (id === '\0editorial-fixture')
            return realAuth
              ? fixtureEntry.replace(
                  'React.createElement(App)',
                  'React.createElement(React.StrictMode,null,React.createElement(App))'
                )
              : fixtureEntry
          if (id.startsWith('\0editorial-mock:')) return mocks[id.slice(16)]
        },
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            const path = new URL(req.url, 'http://fixture.local').pathname
            if (
              publicCatalog &&
              req.method === 'GET' &&
              ['/api/products', '/api/categories'].includes(path)
            ) {
              res.setHeader('content-type', 'application/json')
              return res.end(
                JSON.stringify({
                  success: true,
                  data: path === '/api/products' ? snapshot.products : snapshot.categories,
                })
              )
            }
            if (req.url.startsWith('/api/')) {
              res.statusCode = 500
              return res.end('Unmocked API call blocked')
            }
            if (req.headers.accept?.includes('text/html')) {
              res.setHeader('content-type', 'text/html')
              return res.end(
                '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/editorial-fixture.js"></script></html>'
              )
            }
            next()
          })
        },
      },
    ],
  })
  await server.listen()
  return { server, origin: `http://127.0.0.1:${server.httpServer.address().port}` }
}
import { authBrowserMocks } from './auth-browser-mocks.mjs'
