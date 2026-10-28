const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium, webkit, expect } = require('playwright/test')
let fixture
const browsers = {}
before(async () => {
  fixture = await (await import('./fixtures/editorial-server.mjs')).startEditorialServer()
  browsers.chromium = await chromium.launch({ headless: true })
  browsers.webkit = await webkit.launch({ headless: true })
})
after(async () => {
  await Promise.all(Object.values(browsers).map((browser) => browser.close()))
  await fixture?.server.close()
})
async function visit(engine, query, run, width = 1280, shape = 'square') {
  const page = await browsers[engine].newPage({
    viewport: { width, height: 1000 },
    reducedMotion: 'reduce',
    hasTouch: width < 1024,
  })
  page.setDefaultTimeout(6000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) => {
    const req = route.request()
    if (new URL(req.url()).origin === fixture.origin) return route.continue()
    if (req.resourceType() !== 'image') return route.abort()
    const [width, height] =
      shape === 'portrait' ? [500, 900] : shape === 'landscape' ? [900, 500] : [700, 700]
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="wheat"/><rect x="40%" y="20%" width="20%" height="60%" fill="sienna"/></svg>`,
    })
  })
  try {
    await page.goto(fixture.origin + '/product/fixture' + query)
    await page.locator('.product-gallery').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await run(page)
    assert.deepEqual(errors, [])
  } finally {
    await page.close()
  }
}
for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: reviewed portrait framing leaves the complete original centered`, () =>
    visit(
      engine,
      '?photos=1',
      async (page) => {
        const source =
          'https://mmpsquheiibatsjficwm.supabase.co/storage/v1/object/public/images/products/1786036527347-ek3nr5ku-whatsapp-image-2026-03-06-at-7.52.22-pm.jpeg'
        await page.evaluate((url) => {
          window.fixture.product = {
            ...window.fixture.product,
            id: 'reviewed-portrait',
            images: [{ ...window.fixture.product.images[0], url }],
          }
          history.pushState({}, '', '/product/reviewed-portrait')
          dispatchEvent(new PopStateEvent('popstate'))
        }, source)
        const main = page.locator('.gallery-stage img')
        await expect(main).toHaveAttribute('src', source)
        await expect(main).toHaveCSS('object-position', '50% 22%')
        await page.getByRole('button', { name: /^Enlarge image of/ }).click()
        const original = page.locator('[data-lightbox-image]')
        await expect(original).toHaveAttribute('src', source)
        await expect(original).toHaveCSS('object-fit', 'contain')
        await expect(original).toHaveCSS('object-position', '50% 50%')
      },
      1280,
      'portrait'
    ))
  for (const count of [0, 1, 2, 7])
    test(`${engine}: ${count} photographs expose one main image and truthful navigation`, () =>
      visit(engine, '?photos=' + count, async (page) => {
        const gallery = page.locator('.product-gallery')
        if (!count) {
          await expect(gallery.getByText('Image unavailable', { exact: true })).toBeVisible()
          assert.equal(await gallery.getByRole('button').count(), 0)
          return
        }
        assert.equal(await gallery.locator('.gallery-stage img').count(), 1)
        assert.equal(
          await gallery.locator('.gallery-thumbnails button').count(),
          count > 1 ? count : 0
        )
        assert.equal(
          await gallery.getByRole('button', { name: 'Next image', exact: true }).count(),
          count > 1 ? 1 : 0
        )
        assert.equal(await gallery.getByRole('button', { name: /View all/ }).count(), 0)
        const main = gallery.getByRole('button', { name: /^Enlarge image of/ })
        if (count > 1) await gallery.locator('.gallery-thumbnail').last().click()
        const selected = await gallery.locator('.gallery-stage img').getAttribute('src')
        await main.click()
        const dialog = page.getByRole('dialog')
        await expect(dialog.locator('[data-lightbox-image]')).toHaveAttribute('src', selected)
        assert.equal(
          await dialog.getByRole('button', { name: 'Next image', exact: true }).count(),
          count > 1 ? 1 : 0
        )
        if (count > 1)
          await expect(dialog.locator('[aria-live="polite"]')).toHaveText(`${count} / ${count}`)
        await page.keyboard.press('Escape')
        await expect(main).toBeFocused()
      }))

  for (const width of [320, 390, 768, 1280, 1440])
    test(`${engine}: gallery geometry at ${width}px keeps a square main photo and reachable thumbnails`, () =>
      visit(
        engine,
        '?photos=7',
        async (page) => {
          const gallery = page.locator('.product-gallery'),
            stage = gallery.locator('.gallery-stage')
          const box = await stage.boundingBox(),
            thumbs = await gallery.locator('.gallery-thumbnails').boundingBox()
          assert.ok(Math.abs(box.width - box.height) < 2)
          if (width >= 1024) {
            assert.ok(thumbs.x + thumbs.width < box.x)
            assert.equal(
              Math.round((await gallery.locator('.gallery-thumbnail').first().boundingBox()).width),
              64
            )
          } else assert.ok(thumbs.y >= box.y + box.height)
          for (const button of await gallery.locator('.gallery-thumbnail').all()) {
            await button.focus()
            await page.keyboard.press('Enter')
            await expect(button).toHaveAttribute('aria-pressed', 'true')
          }
          await expect(gallery.locator('.gallery-position')).toHaveText('7 / 7')
          await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            true
          )
        },
        width
      ))

  for (const shape of ['square', 'portrait', 'landscape'])
    test(`${engine}: ${shape} source fills the main frame and remains complete in the lightbox`, () =>
      visit(
        engine,
        '?photos=2',
        async (page) => {
          const image = page.locator('.gallery-stage img')
          await image.evaluate((el) => el.decode())
          assert.equal(await image.evaluate((el) => getComputedStyle(el).objectFit), 'cover')
          await page.getByRole('button', { name: /^Enlarge image of/ }).click()
          const full = page.locator('[data-lightbox-image]')
          assert.equal(await full.evaluate((el) => getComputedStyle(el).objectFit), 'contain')
          await expect
            .poll(() =>
              page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement))
            )
            .toBe(true)
          await page.keyboard.press('+')
          await expect(full).toHaveAttribute('data-zoom', '2')
          await page.getByRole('button', { name: 'Pan right', exact: true }).click()
          await page.keyboard.press('ArrowUp')
          await page.getByRole('button', { name: 'Reset view', exact: true }).click()
          await expect(full).toHaveAttribute('data-zoom', '1')
          await page.keyboard.press('ArrowRight')
          await expect(page.getByRole('dialog').locator('[aria-live="polite"]')).toHaveText('2 / 2')
        },
        1280,
        shape
      ))

  test(`${engine}: swipe changes selection without opening the lightbox`, () =>
    visit(
      engine,
      '?photos=7',
      async (page) => {
        const stage = page.locator('.gallery-stage')
        await stage.dispatchEvent('touchstart', {
          touches: [{ identifier: 0, clientX: 260, clientY: 300 }],
        })
        await stage.dispatchEvent('touchend', {
          changedTouches: [{ identifier: 0, clientX: 80, clientY: 305 }],
        })
        await expect(page.locator('.gallery-position')).toHaveText('2 / 7')
        assert.equal(await page.getByRole('dialog').count(), 0)
        await page.waitForTimeout(320)
        await page.getByRole('button', { name: /^Enlarge image of/ }).tap()
        await expect(page.getByRole('dialog').locator('[aria-live="polite"]')).toHaveText('2 / 7')
      },
      390
    ))

  test(`${engine}: product navigation resets photo selection and zoom`, () =>
    visit(engine, '?photos=7', async (page) => {
      await page.locator('.gallery-thumbnail').nth(5).click()
      await page.getByRole('button', { name: /^Enlarge image of/ }).click()
      await expect
        .poll(() => page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement)))
        .toBe(true)
      await page.keyboard.press('+')
      await expect(page.locator('[data-lightbox-image]')).toHaveAttribute('data-zoom', '2')
      await page.evaluate(() => {
        window.fixture.product = {
          ...window.fixture.product,
          id: 'next-product',
          slug: 'next-product',
          name: 'Next product',
        }
        history.pushState({}, '', '/product/next-product')
        dispatchEvent(new PopStateEvent('popstate'))
      })
      await expect(page.locator('h1')).toHaveText('Next product')
      assert.equal(await page.getByRole('dialog').count(), 0)
      await expect(page.locator('.gallery-position')).toHaveText('1 / 7')
      await page.getByRole('button', { name: /^Enlarge image of/ }).click()
      await expect(page.locator('[data-lightbox-image]')).toHaveAttribute('data-zoom', '1')
    }))

  test(`${engine}: failed images stay unavailable in the main frame and original lightbox`, () =>
    visit(engine, '?scenario=broken-images', async (page) => {
      await expect(page.locator('.gallery-stage .store-image-fallback')).toBeVisible()
      await page.getByRole('button', { name: /^Enlarge image of/ }).click()
      await expect(
        page.getByRole('dialog').getByText('Image unavailable', { exact: true })
      ).toBeVisible()
    }))
}
