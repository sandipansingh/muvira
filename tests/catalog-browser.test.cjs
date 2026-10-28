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
    client: `export class ApiError extends Error {};
      const ok=data=>({success:true,data});
      export const api={get:async(path)=>{(window.reads||=[]).push(path);if(window.failRefresh)throw new Error('Refresh unavailable');if(path.includes('categories'))return ok(window.categories);if(path==='/api/settings')return ok(window.settings);if(path.includes('/products/')){if(window.delayProductRead)await new Promise(resolve=>window.resolveProductRead=resolve);return ok(window.product)}return {...ok([window.product]),meta:{total:1,totalPages:1}}},post:async(path,body)=>{window.mutations.push({path,body});if(path.endsWith('/images')){if(window.attachMode!=='unknown')window.product.product_images.push({id:'image-1',...body});if(window.attachMode==='lost'||window.attachMode==='unknown')throw new Error('Response lost');window.failRefresh=Boolean(window.failAfterAttach);return ok({id:'image-1',...body})}if(path.includes('categories')){const category={id:'category-'+(window.categories.length+1),...body};window.categories.push(category);if(window.loseCategoryResponse)throw new Error('Category response lost');return ok(category)}return ok(window.product)},patch:async(path,body)=>{window.mutations.push({path,body});if(path.includes('settings')){Object.assign(window.settings,body);return ok(window.settings)}Object.assign(window.product,body);return ok(window.product)},delete:async()=>ok(null)};`,
    supabase: `export const supabase={storage:{from:()=>({upload:async(path,file)=>{window.uploads.push({path,size:file.size});return {error:null}},getPublicUrl:path=>({data:{publicUrl:'https://storage.example/storage/v1/object/public/images/'+path}}),remove:async paths=>{window.deleted.push(...paths);return{error:null}}})}}`,
    ToastContext: `export const useToast=()=>({showToast:(message)=>window.messages.push(message)})`,
    SiteSettingsContext: `export const useSiteSettings=()=>({applySettings:settings=>window.applied=settings})`,
  }
  vite = await createServer({
    root: join(__dirname, '../client'),
    cacheDir: join(__dirname, '../client/node_modules/.vite-catalog-browser-tests'),
    configFile: false,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'catalog-fixture',
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
            return `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{AdminCatalogPage}from'/src/pages/admin/AdminCatalogPage.tsx';import{adminApiService}from'/src/lib/services/admin/admin.service.ts';import{uploadImage}from'/src/lib/storage.ts';import*as media from'/src/lib/services/admin/catalogMedia.service.ts';window.media=media;window.admin=adminApiService;window.uploadImage=uploadImage;window.messages=[];window.mutations=[];window.uploads=[];window.deleted=[];window.categories=Array.from({length:5},(_,i)=>({id:'category-'+i,name:'Category '+i,slug:'category-'+i,is_active:true,show_in_navbar:true}));window.product={id:'product-1',name:'Cotton wrap',slug:'cotton-wrap',price_paisa:15000,compare_at_price_paisa:20000,stock:3,weight_grams:250,is_active:true,is_featured:false,sku:'WRAP',category_id:'category-0',categories:window.categories[0],product_images:[],metadata:{}};window.settings={heroSlides:[{id:'hero-1',title:'Wraps',subtitle:'Cotton',imageUrl:'https://example.com/hero.jpg',link:'/shop'}],promoBanners:[],storeDescription:'Soft wraps'};window.render=async mode=>{const AdminContentEditor=mode==='content'?(await import(/* @vite-ignore */ ['/src/components/admin','AdminContentEditor.tsx'].join('/'))).AdminContentEditor:null;return createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{},mode==='content'?React.createElement(AdminContentEditor,{settings:window.settings,onSaved:settings=>window.saved=settings}):React.createElement(AdminCatalogPage)))};window.renderCategory=async()=>{const{AdminCategoryEditor}=await import(/* @vite-ignore */ ['/src/components/admin','AdminCategoryEditor.tsx'].join('/'));const{mapCategory}=await import('/src/lib/utils/adapters.ts');createRoot(document.getElementById('root')).render(React.createElement(AdminCategoryEditor,{category:mapCategory(window.categories[0]),onSaved:async()=>{window.categorySaved=true;throw new Error('Catalog refresh unavailable')},onClose:()=>window.categoryClosed=true}))};window.ready=true;`
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

async function fixture(run) {
  const page = await browser.newPage()
  page.on('pageerror', (error) => console.error('Browser fixture:', error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text())
  })
  try {
    await page.goto(origin)
    await page.waitForFunction(() => window.ready)
    await run(page)
  } finally {
    await page.close()
  }
}

test('committed image attachment does not depend on a successful product refresh', () =>
  fixture(async (page) => {
    const result = await page.evaluate(async () => {
      window.failAfterAttach = true
      const result = await window.admin.uploadProductImages('product-1', [
        'https://example.com/image.jpg',
      ])
      return { result, images: window.product.product_images, deleted: window.deleted }
    })
    assert.equal(result.result.success, true)
    assert.equal(result.images.length, 1)
    assert.deepEqual(result.deleted, [])
  }))
test('lost image attachment response reconciles references; unknown outcome remains preserved', () =>
  fixture(async (page) => {
    const result = await page.evaluate(async () => {
      window.attachMode = 'lost'
      const committed = await window.admin.uploadProductImages('product-1', [
        'https://example.com/image.jpg',
      ])
      window.attachMode = 'unknown'
      window.failRefresh = true
      let unknown
      try {
        unknown = await window.admin.uploadProductImages('product-1', [
          'https://example.com/unknown.jpg',
        ])
      } catch (error) {
        unknown = { success: false, error: { code: error.code } }
      }
      return { committed, unknown, deleted: window.deleted }
    })
    assert.equal(result.committed.success, true)
    assert.equal(result.unknown.success, false)
    assert.equal(result.unknown.error.code, 'ATTACHMENT_UNKNOWN')
    assert.deepEqual(result.deleted, [])
  }))
test('sixth category defaults outside navigation and remains editable', () =>
  fixture(async (page) => {
    await page.evaluate(() => window.render('catalog'))
    await page.getByRole('tab', { name: 'Categories', exact: true }).click()
    await page.getByRole('button', { name: 'Add category', exact: true }).click()
    const form = page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: 'New category', exact: true }) })
    await form.getByPlaceholder('Category name').fill('Sixth category')
    await page
      .getByRole('dialog', { name: 'Add category', exact: true })
      .getByRole('button', { name: 'Create category', exact: true })
      .click()
    await page.waitForFunction(() =>
      window.mutations.some((m) => m.path === '/api/admin/categories')
    )
    assert.equal(
      await page.evaluate(
        () => window.mutations.find((m) => m.path === '/api/admin/categories').body.show_in_navbar
      ),
      false
    )
    await page.getByRole('button', { name: 'Edit category Sixth category', exact: true }).click()
    await page.getByRole('heading', { name: 'Edit category', exact: true }).waitFor()
  }))
test('content editor saves slides, banners and description without shipping prerequisites', () =>
  fixture(async (page) => {
    await page.evaluate(() => window.render('content'))
    await page.getByLabel('Store description', { exact: true }).fill('Handwoven essentials')
    await page.getByLabel('Hero slide 1 title', { exact: true }).fill('New cotton collection')
    await page.getByRole('button', { name: 'Save storefront content', exact: true }).click()
    await page.waitForFunction(() => window.saved)
    const body = await page.evaluate(
      () => window.mutations.find((m) => m.path === '/api/admin/settings').body
    )
    assert.equal(body.store_description, 'Handwoven essentials')
    assert.equal(body.hero_slides[0].title, 'New cotton collection')
    assert.deepEqual(body.promo_banners, [])
    assert.equal(body.shiprocket_settings, undefined)
  }))
test('browser upload accepts exactly 8MiB and rejects one byte above before storage', () =>
  fixture(async (page) => {
    const result = await page.evaluate(async () => {
      await window.uploadImage(
        new File([new Uint8Array(8388608)], 'boundary.webp', { type: 'image/webp' }),
        'products'
      )
      let rejected = false
      try {
        await window.uploadImage(
          new File([new Uint8Array(8388609)], 'large.webp', { type: 'image/webp' }),
          'products'
        )
      } catch {
        rejected = true
      }
      return { rejected, uploads: window.uploads }
    })
    assert.equal(result.rejected, true)
    assert.equal(result.uploads.length, 1)
    assert.equal(result.uploads[0].size, 8388608)
  }))

test('pending media survives reload and refuses retry until references can be read', () =>
  fixture(async (page) => {
    await page.evaluate(async () => {
      window.attachMode = 'unknown'
      window.failRefresh = true
      try {
        await window.media.attachUploadedProductImage({
          productId: 'product-1',
          url: 'https://example.com/preserved.jpg',
          path: 'products/preserved.jpg',
          fileName: 'preserved.jpg',
          altText: 'Cotton wrap',
          isPrimary: true,
          sortOrder: 0,
        })
      } catch {}
    })
    assert.equal(await page.evaluate(() => window.media.pendingProductImages().length), 1)
    await page.reload()
    await page.waitForFunction(() => window.ready)
    const unavailable = await page.evaluate(async () => {
      window.failRefresh = true
      try {
        await window.media.attachUploadedProductImage(window.media.pendingProductImages()[0])
      } catch {}
      return { pending: window.media.pendingProductImages(), mutations: window.mutations }
    })
    assert.equal(unavailable.pending.length, 1)
    assert.deepEqual(unavailable.mutations, [])
    const reconciled = await page.evaluate(async () => {
      window.failRefresh = false
      window.product.product_images = [{ id: 'image-1', url: 'https://example.com/preserved.jpg' }]
      await window.media.attachUploadedProductImage(window.media.pendingProductImages()[0])
      return {
        pending: window.media.pendingProductImages(),
        mutations: window.mutations,
        deleted: window.deleted,
      }
    })
    assert.deepEqual(reconciled, { pending: [], mutations: [], deleted: [] })
  }))

test('product editor saves commercial fields, descriptions, weight and visibility', () =>
  fixture(async (page) => {
    await page.evaluate(() => window.render('catalog'))
    await page.getByRole('button', { name: 'Edit product Cotton wrap', exact: true }).click()
    const editor = page.getByRole('region', { name: 'Product editor' })
    await editor.getByLabel('Product name', { exact: true }).fill('Handwoven wrap')
    await editor.getByLabel('Price ₹', { exact: true }).fill('175.50')
    await editor.getByLabel('Compare at price ₹', { exact: true }).fill('225')
    await editor.getByLabel('Weight grams', { exact: true }).fill('325')
    await editor.getByLabel('SKU', { exact: true }).fill('WRAP-NEW')
    await editor.getByLabel('Short description', { exact: false }).fill('Soft handwoven cotton')
    await editor
      .getByLabel('Description', { exact: true })
      .fill('Made with handwoven cotton for daily wear.')
    await editor.getByLabel('Featured', { exact: true }).check()
    await page.getByRole('button', { name: 'Save product', exact: true }).click()
    await page.waitForFunction(() =>
      window.mutations.some((m) => m.path === '/api/admin/products/product-1')
    )
    const body = await page.evaluate(
      () => window.mutations.find((m) => m.path === '/api/admin/products/product-1').body
    )
    assert.equal(body.price_paisa, 17550)
    assert.equal(body.compare_at_price_paisa, 22500)
    assert.equal(body.weight_grams, 325)
    assert.equal(body.is_featured, true)
    assert.equal(body.sku, 'WRAP-NEW')
    assert.equal(body.description, 'Made with handwoven cotton for daily wear.')
  }))

test('image editor sends alt text, order and primary changes through existing API contracts', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.product.product_images = [
        {
          id: 'image-1',
          url: 'https://example.com/first.jpg',
          alt_text: 'First wrap',
          sort_order: 0,
          is_primary: true,
        },
        {
          id: 'image-2',
          url: 'https://example.com/second.jpg',
          alt_text: 'Second wrap',
          sort_order: 1,
          is_primary: false,
        },
      ]
      return window.render('catalog')
    })
    await page.getByRole('button', { name: 'Edit product Cotton wrap', exact: true }).click()
    await page.getByLabel('Image 1 alt text', { exact: true }).fill('Soft cotton wrap')
    await page.getByRole('button', { name: 'Save alt text', exact: true }).first().click()
    await page.waitForFunction(() =>
      window.mutations.some((m) => m.path.endsWith('/images/image-1'))
    )
    assert.deepEqual(
      await page.evaluate(
        () => window.mutations.find((m) => m.path.endsWith('/images/image-1')).body
      ),
      { alt_text: 'Soft cotton wrap' }
    )
    await page.getByRole('button', { name: 'Make primary', exact: true }).click()
    await page.waitForFunction(() =>
      window.mutations.some((m) => m.path.endsWith('/images/reorder'))
    )
    assert.deepEqual(
      await page.evaluate(
        () => window.mutations.find((m) => m.path.endsWith('/images/reorder')).body
      ),
      { imageIds: ['image-2', 'image-1'] }
    )
  }))

test('category creation reconciles a lost response before retrying its preserved upload', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.loseCategoryResponse = true
      return window.render('catalog')
    })
    await page.getByRole('tab', { name: 'Categories', exact: true }).click()
    await page.getByRole('button', { name: 'Add category', exact: true }).click()
    const form = page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: 'New category', exact: true }) })
    await form.getByPlaceholder('Category name').fill('Preserved category')
    await form.locator('input[type=file]').setInputFiles({
      name: 'category.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('image fixture'),
    })
    await page
      .getByRole('dialog', { name: 'Add category', exact: true })
      .getByRole('button', { name: 'Create category', exact: true })
      .click()
    await page
      .getByText(
        'Category response lost Uploaded image preserved; retry checks existing categories first.',
        { exact: true }
      )
      .waitFor()
    await page
      .getByRole('dialog', { name: 'Add category', exact: true })
      .getByRole('button', { name: 'Create category', exact: true })
      .click()
    await page.waitForFunction(() => window.messages.includes('Category creation verified.'))
    const counts = await page.evaluate(() => ({
      mutations: window.mutations.filter((m) => m.path === '/api/admin/categories').length,
      uploads: window.uploads.length,
      deleted: window.deleted,
    }))
    assert.deepEqual(counts, { mutations: 1, uploads: 1, deleted: [] })
  }))

test('clearing a category image sends an explicit nullable removal through the API', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.categories[0].image_url = 'https://example.com/category.webp'
      return window.render('catalog')
    })
    await page.getByRole('tab', { name: 'Categories', exact: true }).click()
    await page.getByRole('button', { name: 'Edit category Category 0', exact: true }).click()
    await page.waitForFunction(() =>
      document.querySelector('[role=dialog]')?.contains(document.activeElement)
    )
    const imageUrl = page.getByLabel('Category image URL', { exact: true })
    await imageUrl.fill('')
    await imageUrl.press('Tab')
    assert.equal(await imageUrl.inputValue(), '')
    await page.getByRole('button', { name: 'Save category', exact: true }).click()
    await page.waitForFunction(() =>
      window.mutations.some((m) => m.path === '/api/admin/categories/category-0')
    )
    assert.equal(
      await page.evaluate(
        () =>
          window.mutations.find((m) => m.path === '/api/admin/categories/category-0').body.image_url
      ),
      null
    )
  }))

test('category mutation success followed by refresh failure stays saved and shows a separate warning', () =>
  fixture(async (page) => {
    await page.evaluate(() => window.renderCategory())
    await page.getByRole('button', { name: 'Save category', exact: true }).click()
    await page.waitForFunction(() => window.categorySaved)
    assert.equal(await page.getByRole('alert').count(), 0)
    assert.match(
      await page.getByRole('status').innerText(),
      /Category saved.*Catalog refresh unavailable/
    )
    assert.equal(await page.evaluate(() => window.categoryClosed ?? false), false)
  }))

test('general product edits cannot overwrite stock purchased after the editor opened', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.product.stock = 5
      return window.render('catalog')
    })
    await page.getByRole('button', { name: 'Edit product Cotton wrap', exact: true }).click()
    await page.evaluate(() => (window.product.stock = 4))
    await page
      .getByLabel('Short description', { exact: false })
      .fill('Updated without changing stock')
    await page.getByRole('button', { name: 'Save product', exact: true }).click()
    await page.waitForFunction(() =>
      window.mutations.some((m) => m.path === '/api/admin/products/product-1')
    )
    const body = await page.evaluate(
      () => window.mutations.find((m) => m.path === '/api/admin/products/product-1').body
    )
    assert.equal(Object.hasOwn(body, 'stock'), false)
    assert.equal(await page.evaluate(() => window.product.stock), 4)
  }))

test('committed product save followed by refresh failure shows a saved warning', () =>
  fixture(async (page) => {
    await page.evaluate(() => window.render('catalog'))
    await page.getByRole('button', { name: 'Edit product Cotton wrap', exact: true }).click()
    await page.getByLabel('Short description', { exact: false }).fill('Saved description')
    await page.evaluate(() => (window.failRefresh = true))
    await page.getByRole('button', { name: 'Save product', exact: true }).click()
    await page.waitForFunction(() => window.messages.includes('Product saved.'))
    assert.equal(await page.getByRole('alert').count(), 0)
    assert.match(
      await page.getByRole('region', { name: 'Product editor' }).getByRole('status').innerText(),
      /Product saved.*Refresh unavailable/
    )
  }))

test('actual image form clears its file and retries an ambiguous attachment using the preserved URL', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.attachMode = 'unknown'
      return window.render('catalog')
    })
    await page.getByRole('button', { name: 'Edit product Cotton wrap', exact: true }).click()
    const file = page.getByLabel('Add product image (up to 8 MiB)', { exact: true })
    await file.setInputFiles({
      name: 'wrap.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('fixture image'),
    })
    const upload = page.getByRole('button', { name: 'Upload product image', exact: true })
    await upload.click()
    await page.getByRole('button', { name: 'Check image attachment', exact: true }).waitFor()
    await page
      .getByRole('alert')
      .filter({ hasText: 'Image attachment could not be verified' })
      .waitFor()
    assert.equal(await file.inputValue(), '')
    assert.equal(await upload.isDisabled(), true)
    await page.evaluate(() => (window.attachMode = undefined))
    await page.getByRole('button', { name: 'Check image attachment', exact: true }).click()
    await page.waitForFunction(() => window.media.pendingProductImages().length === 0)
    const outcome = await page.evaluate(() => ({
      uploads: window.uploads.length,
      urls: window.mutations.filter((m) => m.path.endsWith('/images')).map((m) => m.body.url),
      deleted: window.deleted,
    }))
    assert.equal(outcome.uploads, 1)
    assert.equal(outcome.urls.length, 2)
    assert.equal(new Set(outcome.urls).size, 1)
    assert.deepEqual(outcome.deleted, [])
  }))

test('category API schema accepts explicit null removal while rejecting invalid image URLs', async () => {
  const { UpdateCategorySchema } = await vite.ssrLoadModule(
    join(__dirname, '../server/src/modules/categories/schema.ts')
  )
  assert.equal(UpdateCategorySchema.safeParse({ image_url: null }).success, true)
  assert.equal(UpdateCategorySchema.safeParse({ image_url: 'not-an-image-url' }).success, false)
  assert.equal(UpdateCategorySchema.safeParse({ name: 'Category only' }).success, true)
})

test('SEO overrides survive unrelated edits and blank controls restore defaults', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      Object.assign(window.product, {
        meta_title: 'Custom Ganesha title',
        meta_description: 'Custom catalog description',
        tags: ['Ganesha', 'resin'],
      })
      window.render('catalog')
    })
    await page.getByRole('button', { name: 'Edit product Cotton wrap', exact: true }).click()
    await page.getByRole('textbox', { name: 'SEO title', exact: true }).waitFor()
    assert.equal(
      await page.getByRole('textbox', { name: 'SEO title', exact: true }).inputValue(),
      'Custom Ganesha title'
    )
    await page
      .getByRole('region', { name: 'Product editor' })
      .getByRole('textbox', { name: 'Product name', exact: true })
      .fill('Updated wrap')
    await page.getByRole('button', { name: 'Save product', exact: true }).click()
    await page.waitForFunction(() => window.mutations.some((x) => x.body?.name === 'Updated wrap'))
    assert.equal(await page.evaluate(() => window.product.meta_title), 'Custom Ganesha title')
    await page.getByRole('textbox', { name: 'SEO title', exact: true }).fill('')
    await page.getByRole('textbox', { name: 'SEO description', exact: true }).fill('')
    await page.getByRole('textbox', { name: 'SEO keywords', exact: true }).fill('')
    await page.getByRole('button', { name: 'Save product', exact: true }).click()
    await page.waitForFunction(() => window.product.meta_title === '')
    assert.deepEqual(
      await page.evaluate(() => ({
        title: window.product.meta_title,
        description: window.product.meta_description,
        tags: window.product.tags,
      })),
      { title: '', description: '', tags: [] }
    )
  }))

test('admin adapters forward supported order filters and encode inventory category parameters', () =>
  fixture(async (page) => {
    const paths = await page.evaluate(async () => {
      window.reads = []
      await window.admin.getOrders({
        page: 2,
        paymentStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        q: 'MUV-123',
      })
      await window.admin.getInventory(3, 20, true, 'category with spaces')
      return window.reads
    })
    const orders = new URL(paths[0], 'http://fixture.test')
    assert.equal(orders.searchParams.get('payment_status'), 'paid')
    assert.equal(orders.searchParams.get('fulfillment_status'), 'unfulfilled')
    assert.equal(orders.searchParams.get('q'), 'MUV-123')
    const inventory = new URL(paths[1], 'http://fixture.test')
    assert.equal(inventory.searchParams.get('category'), 'category with spaces')
    assert.equal(inventory.searchParams.get('page'), '3')
  }))

test('successful category save leaves the catalog ready for further edits', () =>
  fixture(async (page) => {
    await page.evaluate(() => window.render('catalog'))
    await page.getByRole('tab', { name: 'Categories', exact: true }).click()
    await page.getByRole('button', { name: 'Edit category Category 0', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit category', exact: true })
    await dialog.getByLabel('Category name', { exact: true }).fill('Renamed category')
    await dialog.getByRole('button', { name: 'Save category', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Add category', exact: true }).click()
    await page.getByRole('dialog', { name: 'Add category', exact: true }).waitFor()
  }))

test('discarding an ambiguous category attempt cannot swallow a different creation', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.loseCategoryResponse = true
      return window.render('catalog')
    })
    await page.getByRole('tab', { name: 'Categories', exact: true }).click()
    await page.getByRole('button', { name: 'Add category', exact: true }).click()
    let dialog = page.getByRole('dialog', { name: 'Add category', exact: true })
    await dialog.getByLabel('Category name', { exact: true }).fill('Earlier category')
    await dialog.getByRole('button', { name: 'Create category', exact: true }).click()
    await dialog.getByRole('alert').waitFor()
    await dialog.getByRole('button', { name: 'Close dialog' }).last().click()
    await page.getByRole('button', { name: 'Discard changes' }).click()
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await page.evaluate(() => (window.loseCategoryResponse = false))
    await page.getByRole('button', { name: 'Add category', exact: true }).click()
    dialog = page.getByRole('dialog', { name: 'Add category', exact: true })
    await dialog.getByLabel('Category name', { exact: true }).fill('Later category')
    await dialog.getByRole('button', { name: 'Create category', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(
      await page.evaluate(() =>
        window.categories.some((category) => category.name === 'Later category')
      ),
      true
    )
    assert.equal(
      await page.evaluate(
        () =>
          window.mutations.filter((mutation) => mutation.path === '/api/admin/categories').length
      ),
      2
    )
  }))

test('discarded category upload remains independently verifiable without another upload or create', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.loseCategoryResponse = true
      return window.render('catalog')
    })
    await page.getByRole('tab', { name: 'Categories', exact: true }).click()
    await page.getByRole('button', { name: 'Add category', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Add category', exact: true })
    await dialog.getByLabel('Category name', { exact: true }).fill('Preserved outside dialog')
    await dialog.locator('input[type=file]').setInputFiles({
      name: 'preserved.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('fixture image'),
    })
    await dialog.getByRole('button', { name: 'Create category', exact: true }).click()
    await dialog.getByRole('alert').waitFor()
    await dialog.getByRole('button', { name: 'Close dialog' }).last().click()
    await page.getByRole('button', { name: 'Discard changes' }).click()
    const recovery = page.getByRole('region', { name: 'Category creation to check', exact: true })
    await recovery.getByRole('link', { name: 'View preserved category image' }).waitFor()
    await recovery.getByRole('button', { name: 'Check and retry category creation' }).click()
    await recovery.waitFor({ state: 'hidden' })
    assert.equal(await page.evaluate(() => window.uploads.length), 1)
    assert.equal(
      await page.evaluate(
        () =>
          window.mutations.filter((mutation) => mutation.path === '/api/admin/categories').length
      ),
      1
    )
    assert.equal(
      await page.getByRole('button', { name: 'Add category', exact: true }).isDisabled(),
      false
    )
  }))

test('successful image removal keeps focus in the editor while product refresh is pending', () =>
  fixture(async (page) => {
    await page.evaluate(() => {
      window.product.product_images = [
        {
          id: 'image-1',
          url: '/test-image.webp',
          alt_text: 'Fixture image',
          sort_order: 0,
          is_primary: true,
        },
      ]
      return window.render('catalog')
    })
    await page
      .getByRole('button', { name: /^Edit product / })
      .first()
      .click()
    const editor = page.getByRole('dialog', { name: 'Edit product', exact: true })
    await editor.getByRole('button', { name: 'Remove image 1', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: 'Remove product image', exact: true })
    await page.evaluate(() => (window.delayProductRead = true))
    await confirmation.getByRole('button', { name: 'Remove image', exact: true }).click()
    await page.waitForFunction(() => typeof window.resolveProductRead === 'function')
    await confirmation.waitFor({ state: 'hidden' })
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[role=dialog]')].some((el) =>
          el.contains(document.activeElement)
        ),
      undefined,
      { timeout: 1500 }
    )
    assert.equal(await editor.evaluate((el) => el.contains(document.activeElement)), true)
    await page.evaluate(() => {
      window.delayProductRead = false
      window.resolveProductRead()
    })
  }))
