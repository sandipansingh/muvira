const assert = require('node:assert/strict')
const { test, before, after } = require('node:test')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')
const { createRequire } = require('node:module')
const { chromium } = require('playwright')
const raw = require('./fixtures/editorial-catalog.json')
let server, browser, origin

before(async () => {
  const { createServer } = await import(
    pathToFileURL(join(__dirname, '../client/node_modules/vite/dist/node/index.js')).href
  )
  const clientRequire = createRequire(join(__dirname, '../client/package.json'))
  const tailwindConfig = (
    await import(pathToFileURL(join(__dirname, '../client/tailwind.config.js')).href)
  ).default
  const mocks = {
    ToastContext: `export const useToast=()=>({showToast:(message,tone)=>window.toasts.push({message,tone})})`,
    SiteSettingsContext: `export const useSiteSettings=()=>({applySettings:settings=>window.applied.push(settings)})`,
    'admin.service': `export const adminApiService={getPickupLocations:async()=>({success:true,data:[{pickup_location:'Main warehouse',city:'Kolkata',pincode:'700039'}]})}`,
    storage: `export const uploadImage=async()=>{throw new Error('Uploads blocked in fixture')}`,
    'settings.service': `export const settingsService={getSettings:async()=>{if(new URLSearchParams(location.search).has('loadFailure'))throw new Error('Settings are unavailable');return{success:true,data:window.settings}},adminUpdateSettings:async patch=>{window.mutations.push(patch);if(window.failSave)throw new Error('Settings save failed');if(window.holdSave)await new Promise(resolve=>window.releaseSave=resolve);const current=window.settings;window.settings={...current,contactInfo:patch.contact_info??current.contactInfo,announcementBar:patch.announcement_bar??current.announcementBar,heroSlides:patch.hero_slides??current.heroSlides,promoBanners:patch.promo_banners??current.promoBanners,storeDescription:patch.store_description??current.storeDescription,shiprocketSettings:patch.shiprocket_settings?{pickupLocation:patch.shiprocket_settings.pickup_location,defaultLengthCm:patch.shiprocket_settings.default_length_cm,defaultBreadthCm:patch.shiprocket_settings.default_breadth_cm,defaultHeightCm:patch.shiprocket_settings.default_height_cm,defaultWeightGrams:patch.shiprocket_settings.default_weight_grams}:current.shiprocketSettings};return{success:true,data:window.settings}}}`,
  }
  server = await createServer({
    css: {
      postcss: {
        plugins: [
          clientRequire('tailwindcss')({
            ...tailwindConfig,
            content: [join(__dirname, '../client/src/**/*.{js,ts,jsx,tsx}')],
          }),
          clientRequire('autoprefixer')(),
        ],
      },
    },
    root: join(__dirname, '../client'),
    configFile: false,
    cacheDir: join(__dirname, '../client/node_modules/.vite-settings-recovery-tests'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'settings-recovery-fixture',
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
            return `import React from'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{AdminSettingsPage}from'/src/pages/admin/AdminSettingsPage.tsx';import{mapSiteSettings}from'/src/lib/utils/adapters.ts';import'/src/index.css';window.settings=mapSiteSettings(${JSON.stringify(raw.settings)});window.settings.contactInfo.phone='9000000000';window.settings.contactInfo.address='24 Sample Lane, Kolkata';window.settings.shiprocketSettings.pickupLocation='Main warehouse';window.mutations=[];window.toasts=[];window.applied=[];createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,{},React.createElement('div',{className:'admin-theme',style:{padding:'24px'}},React.createElement(AdminSettingsPage))));`
        },
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url.split('?')[0] !== '/admin/settings') return next()
            res.setHeader('content-type', 'text/html')
            res.end('<div id="root"></div><script type="module" src="/fixture.js"></script>')
          })
        },
      },
    ],
  })
  await server.listen()
  origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
  await server?.close()
})

async function fixture(query, run, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  )
  try {
    await page.goto(origin + '/admin/settings' + query)
    await page.getByRole('heading', { name: 'Store settings', exact: true }).waitFor()
    if (!query.includes('loadFailure'))
      await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor()
    await run(page)
    assert.deepEqual(errors, [])
  } finally {
    await page.close()
  }
}

test('settings navigation keeps required fields mounted and separates settings from homepage saves', () =>
  fixture('', async (page) => {
    const navigation = page.getByRole('navigation', { name: 'Settings sections' })
    assert.equal(await navigation.evaluate((el) => getComputedStyle(el).position), 'sticky')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('changed@example.test')
    await page
      .getByRole('textbox', { name: 'Store description', exact: true })
      .fill('An unsaved homepage description')
    await navigation.getByRole('link', { name: 'Shipping & fulfillment', exact: true }).click()
    assert.equal((await page.locator('input[required], textarea[required]').count()) >= 8, true)
    assert.equal(
      await page.getByRole('textbox', { name: 'Email', exact: true }).inputValue(),
      'changed@example.test'
    )
    await page.getByRole('button', { name: 'Save settings', exact: true }).click()
    await page.waitForFunction(() =>
      window.toasts.some((item) => item.message === 'Settings saved.')
    )
    const patch = await page.evaluate(() => window.mutations[0])
    assert.equal(patch.contact_info.email, 'changed@example.test')
    assert.equal('hero_slides' in patch, false)
    assert.equal('store_description' in patch, false)
    assert.equal(patch.shipping_methods.standard.charge_paisa, 0)
    assert.equal(patch.shipping_methods.express.charge_paisa, 0)
    assert.equal(patch.shipping_methods.standard.free_threshold_paisa, 0)
    assert.equal(patch.shipping_methods.express.free_threshold_paisa, 0)
    await navigation.getByRole('link', { name: 'Homepage content', exact: true }).click()
    assert.equal(
      await page.getByRole('textbox', { name: 'Store description', exact: true }).inputValue(),
      'An unsaved homepage description'
    )
    await page.getByRole('button', { name: 'Save storefront content', exact: true }).click()
    await page.waitForFunction(() => window.mutations.length === 2)
    const content = await page.evaluate(() => window.mutations[1])
    assert.deepEqual(Object.keys(content).sort(), [
      'hero_slides',
      'promo_banners',
      'store_description',
    ])
    assert.equal(content.store_description, 'An unsaved homepage description')
  }))

test('settings validation and failed saves preserve all entered values', () =>
  fixture('', async (page) => {
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill('')
    await page
      .getByRole('navigation', { name: 'Settings sections' })
      .getByRole('link', { name: 'Contact', exact: true })
      .click()
    await page.getByRole('button', { name: 'Save settings', exact: true }).click()
    assert.equal(await page.evaluate(() => window.mutations.length), 0)
    assert.equal(
      await page
        .getByRole('textbox', { name: 'Message', exact: true })
        .evaluate((el) => el === document.activeElement),
      true
    )
    await page
      .getByRole('textbox', { name: 'Message', exact: true })
      .fill('A retained announcement')
    await page.getByRole('textbox', { name: 'Phone', exact: true }).fill('9000001234')
    await page.evaluate(() => (window.failSave = true))
    await page.getByRole('button', { name: 'Save settings', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Settings save failed' }).waitFor()
    assert.equal(
      await page.getByRole('textbox', { name: 'Phone', exact: true }).inputValue(),
      '9000001234'
    )
    assert.equal(
      await page.getByRole('textbox', { name: 'Message', exact: true }).inputValue(),
      'A retained announcement'
    )
    assert.equal(await page.evaluate(() => window.applied.length), 0)
    await page.evaluate(() => (window.failSave = false))
    await page.getByRole('button', { name: 'Save settings', exact: true }).click()
    await page.waitForFunction(() => window.applied.length === 1)
  }))

test('settings sections and save actions remain reachable on narrow and enlarged layouts', async () => {
  for (const [width, fontSize] of [
    [390, 16],
    [320, 32],
  ])
    await fixture(
      '#settings-shipping',
      async (page) => {
        await page.evaluate(
          (size) => (document.documentElement.style.fontSize = size + 'px'),
          fontSize
        )
        await page
          .getByRole('navigation', { name: 'Settings sections' })
          .getByRole('link', { name: 'Shipping & fulfillment', exact: true })
          .click()
        await page
          .getByRole('spinbutton', { name: 'Weight g', exact: true })
          .scrollIntoViewIfNeeded()
        assert.equal(
          await page.getByRole('spinbutton', { name: 'Weight g', exact: true }).isVisible(),
          true
        )
        await page
          .getByRole('button', { name: 'Save settings', exact: true })
          .scrollIntoViewIfNeeded()
        assert.equal(
          await page
            .locator('.admin-settings-save')
            .evaluate((el) => getComputedStyle(el).position),
          'sticky'
        )
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          JSON.stringify(
            await page.evaluate(() =>
              [...document.querySelectorAll('body *')]
                .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
                .map((el) => ({
                  tag: el.tagName,
                  className: el.className,
                  right: el.getBoundingClientRect().right,
                }))
                .slice(0, 15)
            )
          )
        )
        await page
          .getByRole('navigation', { name: 'Settings sections' })
          .getByRole('link', { name: 'Homepage content', exact: true })
          .click()
        await page
          .getByRole('button', { name: 'Save storefront content', exact: true })
          .scrollIntoViewIfNeeded()
        assert.equal(
          await page
            .getByRole('button', { name: 'Save storefront content', exact: true })
            .isVisible(),
          true
        )
        assert.equal(
          await page
            .locator('.admin-content-save-bar')
            .evaluate((el) => getComputedStyle(el).position),
          'sticky'
        )
      },
      { width, height: 900 }
    )
})

test('settings loading failures expose the existing retry action', () =>
  fixture('?loadFailure', async (page) => {
    await page.getByRole('alert').filter({ hasText: 'Settings are unavailable' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Try again', exact: true }).count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Save settings', exact: true }).count(), 0)
  }))
