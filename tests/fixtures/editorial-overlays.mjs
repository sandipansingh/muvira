import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startEditorialServer } from './editorial-server.mjs'

const output = resolve('responsive-audit/redesign')
await mkdir(output, { recursive: true })
const { server, origin } = await startEditorialServer()
const browser = await chromium.launch({ headless: true })
const cases = [
  {
    name: 'store-search',
    path: '/',
    button: 'Search products',
    dialog: 'Find something meaningful',
  },
  { name: 'shopping-bag', path: '/', button: 'Shopping cart', dialog: 'Shopping cart' },
  {
    name: 'empty-shopping-bag',
    path: '/?scenario=empty-cart',
    button: 'Shopping cart',
    dialog: 'Shopping cart',
  },
  { name: 'quick-view', path: '/shop', button: /^Quick view /, dialog: 'A closer look' },
  {
    name: 'mobile-menu',
    path: '/',
    button: 'Open navigation menu',
    dialog: 'Main menu',
    maxWidth: 1023,
  },
  {
    name: 'catalog-filters',
    path: '/shop?category=god-idols',
    button: /^Open filters/,
    dialog: true,
    maxWidth: 1023,
  },
  {
    name: 'review-editor',
    path: '/product/fixture',
    prepare: async (page) => page.getByRole('button', { name: 'Reviews', exact: true }).click(),
    button: 'Write a review',
    dialog: 'Write a review',
  },
  {
    name: 'password-recovery',
    path: '/signin?fixtureRole=guest',
    button: /forgot password/i,
    dialog: 'Reset password',
  },
  {
    name: 'checkout-address',
    path: '/checkout',
    button: 'Add new address',
    section: '.checkout-page section:has(input#shipping-firstName)',
  },
  {
    name: 'photographic-collections',
    path: '/',
    button: 'Collections',
    section: '.collections-panel',
    minWidth: 1024,
  },
  {
    name: 'admin-navigation',
    path: '/admin?fixtureRole=admin',
    button: 'Open admin navigation',
    dialog: 'Store management',
    maxWidth: 1023,
  },
  {
    name: 'coupon-editor',
    path: '/admin/coupons?fixtureRole=admin',
    button: 'Edit',
    dialog: 'Edit DEVOTION10',
  },
  {
    name: 'product-editor',
    path: '/admin/catalog?fixtureRole=admin',
    button: /^Edit product /,
    dialog: 'Edit product',
  },
  {
    name: 'category-editor',
    path: '/admin/catalog?fixtureRole=admin',
    prepare: async (page) => page.getByRole('tab', { name: 'Categories', exact: true }).click(),
    button: /^Edit category /,
    dialog: 'Edit category',
  },
  {
    name: 'remove-image',
    path: '/admin/catalog?fixtureRole=admin',
    prepare: async (page) =>
      page
        .getByRole('button', { name: /^Edit product / })
        .first()
        .click(),
    button: 'Remove image 1',
    dialog: 'Remove product image',
  },
  {
    name: 'refund-confirmation',
    path: '/admin/orders/fixture-order?fixtureRole=admin',
    prepare: prepareRefund,
    button: 'Review refund',
    dialog: 'Confirm refund',
  },
  {
    name: 'cancellation-confirmation',
    path: '/admin/orders/fixture-order?fixtureRole=admin&shipment=1',
    prepare: prepareRefund,
    button: 'Review cancellation',
    dialog: 'Confirm cancellation',
  },
  {
    name: 'reconcile-confirmation',
    path: '/admin/failures?fixtureRole=admin&queue=commerce&commerce_kind=provider_operation',
    prepare: async (page) =>
      page
        .getByRole('button', { name: /^View details for / })
        .first()
        .click(),
    button: 'Reconcile',
    dialog: 'Reconcile provider operation',
  },
  {
    name: 'release-confirmation',
    path: '/admin/failures?fixtureRole=admin&queue=commerce&commerce_kind=retained_checkout',
    prepare: async (page) =>
      page
        .getByRole('button', { name: /^View details for / })
        .first()
        .click(),
    button: 'Release inventory',
    dialog: 'Release retained checkout',
  },
  { name: 'address-editor', path: '/profile', button: 'Add Address', section: '#addresses form' },
  { name: 'gallery-zoom', path: '/product/fixture', button: /^Enlarge image of /, dialog: true },
]
async function prepareRefund(page) {
  await page.getByRole('button', { name: 'Use remaining balance' }).click()
  await page.getByLabel('Refund or cancellation reason').fill('Visual fixture review only')
}
const viewports = [
  { width: 390, height: 844, label: 'mobile' },
  { width: 820, height: 1180, label: 'tablet' },
  { width: 1440, height: 1000, label: 'desktop' },
  { width: 320, height: 800, label: 'text-200', textScale: 2 },
]
const results = [],
  images = new Map()
try {
  for (const viewport of viewports) {
    for (const item of cases.filter(
      (item) =>
        (!item.maxWidth || viewport.width <= item.maxWidth) &&
        (!item.minWidth || viewport.width >= item.minWidth)
    )) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' })
      page.setDefaultTimeout(12000)
      const errors = [],
        blocked = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.route('**/*', async (route) => {
        const req = route.request(),
          url = new URL(req.url())
        if (url.origin === origin) return route.continue()
        if (req.resourceType() === 'image' && url.hostname.endsWith('.supabase.co')) {
          if (!images.has(req.url()))
            images.set(
              req.url(),
              fetch(req.url()).then(async (r) => ({
                body: Buffer.from(await r.arrayBuffer()),
                contentType: r.headers.get('content-type') || 'image/jpeg',
              }))
            )
          return route.fulfill(await images.get(req.url()))
        }
        blocked.push(req.url())
        return route.abort()
      })
      try {
        await page.goto(origin + item.path)
        await page.locator('h1').waitFor()
        await page.evaluate(() => document.fonts.ready)
        if (viewport.textScale)
          await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
        await item.prepare?.(page)
        const trigger = page
          .getByRole('button', { name: item.button, exact: typeof item.button === 'string' })
          .first()
        await trigger.click()
        const surface = item.dialog
          ? page.getByRole('dialog', typeof item.dialog === 'string' ? { name: item.dialog } : {})
          : page.locator(item.section)
        await surface.waitFor()
        if (item.path.startsWith('/admin')) {
          const panel = await surface.locator('.overlay-panel').last().boundingBox()
          if (
            !panel ||
            Math.round(panel.x + panel.width) !== viewport.width ||
            Math.round(panel.height) !== viewport.height
          )
            throw new Error('Admin drawer must fill height and align to the right edge')
        }
        await page.waitForTimeout(250)
        await page.evaluate(async () => {
          for (const image of document.images) image.loading = 'eager'
          await Promise.race([
            Promise.allSettled([...document.images].map((image) => image.decode())),
            new Promise((done) => setTimeout(done, 3000)),
          ])
        })
        const findings = await surface.evaluate((el) => {
          const r = el.getBoundingClientRect()
          return {
            horizontalOverflow:
              document.documentElement.scrollWidth > innerWidth + 1 ||
              r.left < -1 ||
              r.right > innerWidth + 1,
            smallFields: [
              ...el.querySelectorAll(
                'input:not([type=checkbox]):not([type=radio]),select,textarea'
              ),
            ]
              .filter(
                (field) =>
                  field.getClientRects().length && parseFloat(getComputedStyle(field).fontSize) < 16
              )
              .map((field) => field.name),
          }
        })
        const screenshot = `overlay-${item.name}-${viewport.label}.png`
        if (!item.dialog) await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: resolve(output, screenshot), fullPage: !item.dialog })
        let focusRestored = true
        if (item.dialog) {
          for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Tab')
            if (!(await surface.evaluate((el) => el.contains(document.activeElement))))
              throw new Error('Focus escaped dialog')
          }
          await page.keyboard.press('Escape')
          await surface.waitFor({ state: 'hidden' })
          focusRestored = await (
            item.name === 'password-recovery'
              ? page.locator('header [data-auth-focus="account"]')
              : trigger
          ).evaluate((el) => document.activeElement === el)
        }
        results.push({
          name: item.name,
          viewport: viewport.label,
          screenshot,
          findings,
          focusRestored,
          errors,
          blocked,
        })
        console.log(
          `${item.name} ${viewport.label}: ${findings.horizontalOverflow || !focusRestored ? 'FAIL' : 'ok'}`
        )
      } catch (error) {
        results.push({
          name: item.name,
          viewport: viewport.label,
          error: error.message,
          errors,
          blocked,
        })
        console.log(`${item.name} ${viewport.label}: ${error.message.split('\n')[0]}`)
      } finally {
        await page.close()
      }
    }
  }
} finally {
  await browser.close()
  await server.close()
}
const failures = results.filter(
  (r) =>
    r.error ||
    r.errors.length ||
    r.blocked.length ||
    r.findings.horizontalOverflow ||
    r.findings.smallFields.length ||
    !r.focusRestored
)
await writeFile(
  resolve(output, 'protected-overlays.json'),
  JSON.stringify({ results, failures }, null, 2)
)
console.log(JSON.stringify({ screens: results.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
