import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { startEditorialServer } from './editorial-server.mjs'

const output = resolve('responsive-audit/redesign')
await mkdir(output, { recursive: true })
const { server, origin } = await startEditorialServer()
const browser = await chromium.launch({ headless: true })
const results = [],
  images = new Map()
const viewports = [
  { width: 390, height: 844, label: 'mobile', touch: true },
  { width: 820, height: 1180, label: 'tablet', touch: true },
  { width: 1440, height: 1000, label: 'desktop' },
  { width: 320, height: 800, label: 'text-200', textScale: 2 },
  { width: 1280, height: 900, label: 'desktop-text-200', textScale: 2 },
]
async function runCase(name, path, viewport, exercise, reducedMotion = 'reduce') {
  if (process.env.HERITAGE_CASE && !name.includes(process.env.HERITAGE_CASE)) return
  if (process.env.HERITAGE_VIEWPORT && viewport.label !== process.env.HERITAGE_VIEWPORT) return
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.touch || false,
    isMobile: viewport.touch || false,
    reducedMotion,
  })
  page.setDefaultTimeout(6000)
  const errors = [],
    blocked = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    if (url.origin === origin) {
      if (url.pathname === '/fixture-broken-photo.webp')
        return route.fulfill({ status: 404, body: '' })
      return route.continue()
    }
    if (req.resourceType() === 'image' && url.hostname.endsWith('.supabase.co')) {
      if (!images.has(req.url()))
        images.set(
          req.url(),
          fetch(req.url()).then(async (response) => ({
            body: Buffer.from(await response.arrayBuffer()),
            contentType: response.headers.get('content-type') || 'image/jpeg',
          }))
        )
      return route.fulfill(await images.get(req.url()))
    }
    blocked.push(req.url())
    return route.abort()
  })
  try {
    await page.goto(origin + path)
    await page.locator('h1').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    if (viewport.textScale)
      await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    )
    await exercise(page)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
      'Document overflow'
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(blocked, [])
    await page.evaluate(async () => {
      for (const image of document.images) image.loading = 'eager'
      await Promise.race([
        Promise.allSettled([...document.images].map((image) => image.decode())),
        new Promise((done) => setTimeout(done, 2000)),
      ])
    })
    const screenshot = `heritage-${name}-${viewport.label}.png`
    await page.screenshot({
      path: resolve(output, screenshot),
      fullPage: !(await page.getByRole('dialog').count()),
    })
    results.push({ name, path, viewport: viewport.label, screenshot, errors, blocked })
    console.log(`${name} ${viewport.label}: ok`)
  } catch (error) {
    results.push({ name, path, viewport: viewport.label, error: error.message, errors, blocked })
    console.log(`${name} ${viewport.label}: FAIL ${error.message.split('\n')[0]}`)
  } finally {
    await page.close()
  }
}
try {
  for (const viewport of viewports) {
    for (let slide = 0; slide < 3; slide++)
      await runCase(`hero-${slide + 1}`, '/', viewport, async (page) => {
        for (let index = 0; index < slide; index++)
          await page.getByRole('button', { name: 'Next slide', exact: true }).click()
        const image = page.locator('.devotion-hero__image img')
        await image.evaluate((image) => image.decode())
        assert.match(
          await image.evaluate((image) => image.currentSrc),
          new RegExp(
            `${['ganesha', 'jagannath', 'balaji'][slide]}-${viewport.width <= 767 ? 'mobile' : 'desktop'}\\.webp$`
          )
        )
        await page
          .getByRole('heading', {
            level: 1,
            name: ['Ganesha Idols', 'Jaggarnath Idol', 'Balaji Idol'][slide],
            exact: true,
          })
          .waitFor()
        const header = page.locator('.store-header')
        const height = (await header.boundingBox()).height
        const wordmark = header.locator('.brand-lockup span')
        if (await wordmark.isVisible())
          assert.equal(
            await wordmark.evaluate(
              (element) =>
                element.getBoundingClientRect().height <
                parseFloat(getComputedStyle(element).lineHeight) * 1.5
            ),
            true,
            'Wordmark wraps'
          )
        await page.evaluate(() => window.scrollTo(0, 400))
        assert.ok(
          Math.abs((await header.boundingBox()).height - height) < 1,
          'Sticky header changes height'
        )
        await page.evaluate(() => window.scrollTo(0, 0))
      })
    await runCase('unknown-hero', '/?hero=unknown', viewport, async (page) => {
      await page.getByRole('heading', { name: 'A new photograph', exact: true }).waitFor()
      assert.match(
        await page.locator('.devotion-hero__image img').evaluate((image) => image.currentSrc),
        /stone-alcove.webp$/
      )
    })
    await runCase('collections', '/', viewport, async (page) => {
      const desktop = page.getByRole('button', { name: 'Collections', exact: true })
      if (!(await desktop.isVisible()))
        await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
      const trigger = page.getByRole('button', { name: 'Collections', exact: true }).last()
      await trigger.click()
      const menu = page.getByRole('menu')
      await page.keyboard.press('ArrowDown')
      assert.equal(await menu.evaluate((element) => element.contains(document.activeElement)), true)
      assert.ok((await menu.getByRole('menuitem').count()) > 1)
      await page.keyboard.press('Escape')
      assert.equal(await trigger.evaluate((element) => element === document.activeElement), true)
      await trigger.click()
    })
    await runCase('lightbox-2x', '/product/fixture', viewport, async (page) => {
      await page.getByRole('button', { name: /^Enlarge image of/ }).click()
      const dialog = page.getByRole('dialog')
      await page.waitForFunction(() =>
        document.querySelector('[role=dialog]')?.contains(document.activeElement)
      )
      assert.equal(
        await dialog
          .locator('.dropdown-scrollbar')
          .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        true,
        'Lightbox controls must fit horizontally'
      )
      const stageRect = await dialog.locator('.lightbox-stage').boundingBox()
      assert.ok(
        stageRect.y < viewport.height - 100 && stageRect.height > 100,
        'Lightbox image must remain visible'
      )
      const image = dialog.locator('[data-lightbox-image]')
      const first = await image.getAttribute('src')
      await page.keyboard.press('ArrowRight')
      assert.notEqual(await image.getAttribute('src'), first)
      await dialog.getByRole('button', { name: 'Zoom to 2×', exact: true }).click()
      assert.equal(await image.getAttribute('data-zoom'), '2')
      await dialog.getByRole('button', { name: 'Pan right', exact: true }).click()
      await page.keyboard.press('ArrowDown')
      for (let index = 0; index < 8; index++) {
        await page.keyboard.press('Tab')
        assert.equal(
          await dialog.evaluate((element) => element.contains(document.activeElement)),
          true
        )
      }
      await dialog.getByRole('button', { name: 'Reset view', exact: true }).click()
      assert.equal(await image.getAttribute('data-zoom'), '1')
      await dialog.getByRole('button', { name: 'Zoom to 2×', exact: true }).click()
    })
    await runCase('unavailable-purchase', '/product/fixture?stock=0', viewport, async (page) => {
      const buy = page.getByRole('button', { name: /^(Unavailable|Add to Cart|Buy Now)$/ })
      await buy.first().waitFor()
      for (const button of await buy.all()) assert.equal(await button.isDisabled(), true)
    })
    await runCase('catalog-care', '/product/fixture?care=1', viewport, async (page) => {
      await page
        .getByRole('button', { name: 'Care', exact: true })
        .filter({ visible: true })
        .click()
      await page
        .getByText('Care instructions supplied by the fixture catalog.', { exact: true })
        .waitFor()
    })
    await runCase(
      'tracking-invoice',
      '/orders/fixture-order/tracking?shipment=1',
      viewport,
      async (page) => {
        await page.getByText('Picked up', { exact: true }).waitFor()
        const download = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Download invoice', exact: true }).click()
        assert.equal((await download).suggestedFilename(), 'invoice-MUV-2026-1042.pdf')
      }
    )
    await runCase(
      'no-search-results',
      '/search?q=nonexistent&scenario=empty',
      viewport,
      async (page) => {
        await page
          .getByRole('heading', { name: 'No results found for “nonexistent”', exact: true })
          .waitFor()
      }
    )
  }
  for (const mode of ['fine', 'touch', 'reduced']) {
    const viewport = { width: 1440, height: 1000, label: mode, touch: mode === 'touch' }
    await runCase(
      'card-zoom',
      '/shop',
      viewport,
      async (page) => {
        const image = page.locator('.product-card .media-tile img').first()
        await image.hover()
        await page.waitForTimeout(400)
        const scale = await image.evaluate((element) =>
          getComputedStyle(element).transform === 'none'
            ? 1
            : new DOMMatrix(getComputedStyle(element).transform).a
        )
        assert.ok(Math.abs(scale - (mode === 'fine' ? 1.06 : 1)) < 0.001)
        if (mode !== 'reduced')
          assert.equal(
            await image.evaluate((element) => getComputedStyle(element).transitionDuration),
            '0.35s'
          )
        assert.equal(
          await page
            .locator('.product-card')
            .first()
            .getByRole('button', { name: /^Add .* to cart$/ })
            .filter({ visible: true })
            .isVisible(),
          true
        )
      },
      mode === 'reduced' ? 'reduce' : 'no-preference'
    )
    await runCase(
      'gallery-complete-photographs',
      '/product/fixture',
      viewport,
      async (page) => {
        const stage = page.locator('.product-gallery')
        const image = stage.locator('.gallery-stage img')
        await image.hover()
        assert.equal(
          await image.evaluate((element) => getComputedStyle(element).objectFit),
          'cover'
        )
        assert.equal(await stage.locator('.gallery-stage img').count(), 1)
        assert.equal(await stage.locator('.gallery-thumbnail').count(), 7)
        const first = await stage.locator('.gallery-thumbnail').nth(0).boundingBox()
        const second = await stage.locator('.gallery-thumbnail').nth(1).boundingBox()
        assert.ok(second.y > first.y, 'Desktop thumbnails form one vertical column')
        await stage.getByRole('button', { name: /^Enlarge image of/ }).click()
        assert.equal(
          await page
            .locator('[data-lightbox-image]')
            .evaluate((el) => getComputedStyle(el).objectFit),
          'contain'
        )
        await page.keyboard.press('Escape')
        const purchase = await page.locator('.product-purchase').boundingBox(),
          gallery = await stage.boundingBox()
        assert.ok(gallery.x + gallery.width <= purchase.x, 'Gallery covers purchase controls')
      },
      mode === 'reduced' ? 'reduce' : 'no-preference'
    )
  }
  await runCase('broken-images', '/shop?scenario=broken-images', viewports[0], async (page) => {
    await page.locator('.product-card .store-image-fallback').first().waitFor()
    await page.evaluate(() => {
      for (const image of document.images) image.loading = 'eager'
    })
    await page.waitForFunction(
      () => document.querySelectorAll('.product-card .media-tile img').length === 0
    )
  })
} finally {
  await browser.close()
  await server.close()
}
const failures = results.filter((result) => result.error)
await writeFile(
  resolve(output, 'heritage-findings.json'),
  JSON.stringify({ results, failures }, null, 2)
)
console.log(JSON.stringify({ screens: results.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
