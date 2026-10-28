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
async function visit(engine, path, run, options = {}) {
  const page = await browsers[engine].newPage({
    viewport: { width: 1280, height: 950 },
    reducedMotion: 'reduce',
    ...options,
  })
  page.setDefaultTimeout(6000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.origin
      ? route.continue()
      : route.request().resourceType() === 'image'
        ? route.fulfill({ path: 'client/public/images/editorial/stone-alcove.png' })
        : route.abort()
  )
  try {
    await page.goto(fixture.origin + path)
    await page.locator('h1').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    await run(page)
    assert.deepEqual(errors, [])
  } finally {
    await page.close()
  }
}

// Compare the first label line with the leading icon, including icons passed as Button children.
async function assertIconGeometry(controls) {
  const failures = await controls.evaluateAll((elements) =>
    elements.flatMap((element) => {
      if (!element.getClientRects().length) return []
      const icon = element.querySelector('svg')
      if (!icon) return []
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        if (node.textContent.trim() && !node.parentElement.closest('svg')) break
      }
      if (!node || !(icon.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))
        return []
      const range = document.createRange()
      range.selectNodeContents(node)
      const label = range.getClientRects()[0],
        image = icon.getBoundingClientRect()
      if (!label || !image.width) return []
      const fits =
        image.right <= label.left + 2 &&
        Math.abs(image.y + image.height / 2 - label.y - label.height / 2) < 9
      return fits
        ? []
        : [{ text: element.textContent.trim(), icon: image.toJSON(), label: label.toJSON() }]
    })
  )
  assert.deepEqual(failures, [])
}

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: a newly revealed hover menu immediately accepts Escape`, () =>
    visit(engine, '/', async (page) => {
      const search = page.getByRole('searchbox', {
        name: 'Search products and collections',
        exact: true,
      })
      const trigger = page.getByRole('button', { name: 'Collections', exact: true })
      await search.focus()
      await trigger.evaluate((element) => {
        const observer = new MutationObserver(() => {
          if (element.getAttribute('aria-expanded') !== 'true') return
          observer.disconnect()
          document.activeElement.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
          )
        })
        observer.observe(element, { attributes: true, attributeFilter: ['aria-expanded'] })
      })
      await trigger.hover()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(search).toBeFocused()
    }))
  test(`${engine}: Escape dismisses a hovered menu while focus remains in search`, () =>
    visit(engine, '/', async (page) => {
      const search = page.getByRole('searchbox', {
        name: 'Search products and collections',
        exact: true,
      })
      const trigger = page.getByRole('button', { name: 'Collections', exact: true })
      await search.focus()
      await trigger.hover()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(search).toBeFocused()
    }))
  test(`${engine}: preparing an invoice preserves its action geometry and busy label`, () =>
    visit(engine, '/orders/fixture-order?shipment=1&gatedInvoice=1', async (page) => {
      const action = page.locator('.customer-heading button')
      await expect(action).toBeVisible()
      const before = await action.boundingBox()
      await action.click()
      await expect(action).toBeDisabled()
      const pending = await action.boundingBox()
      assert.equal(pending.width, before.width)
      assert.equal(pending.height, before.height)
      await expect(action).toHaveAttribute('aria-busy', 'true')
      await expect(action).toHaveAccessibleName('Download invoice')
      await page.evaluate(() => window.fixture.resolveInvoice())
      await expect(action).toBeEnabled()
    }))
  for (const width of [320, 390, 768, 1280, 1440])
    test(`${engine} ${width}px: 404 controls stay whole and auth has one centered header`, () =>
      visit(
        engine,
        '/not-a-page?fixtureRole=guest',
        async (page) => {
          const actions = page.locator('.not-found-actions a')
          await expect(actions).toHaveText(['Shop', 'Collections', 'Home'])
          await assertIconGeometry(actions)
          const boxes = await Promise.all(
            (await actions.all()).map((action) => action.boundingBox())
          )
          if (width < 640) {
            assert.ok(boxes[1].y >= boxes[0].y + boxes[0].height)
            assert.ok(boxes[2].y >= boxes[1].y + boxes[1].height)
          } else if (width >= 1024)
            assert.ok(boxes.every((box) => Math.abs(box.y - boxes[0].y) < 2))
          await page.locator('header').getByRole('button', { name: 'Sign in', exact: true }).click()
          const dialog = page.getByRole('dialog')
          const heading = dialog.getByRole('heading', { name: 'Welcome back.', exact: true })
          const brand = dialog.locator('.modal-header__brand')
          await expect(heading).toBeVisible()
          assert.equal(await dialog.locator('img[src="/logo.png"]').count(), 1)
          const header = dialog.locator('.modal-header')
          assert.ok(
            await header.evaluate(
              (el) => el.contains(el.querySelector('h2')) && el.contains(el.querySelector('img'))
            )
          )
          const close = await header.getByRole('button', { name: 'Close dialog' }).boundingBox()
          assert.ok(close.width >= 44 && close.height >= 44)
          const center = await brand.boundingBox(),
            panel = await dialog.locator('.overlay-panel').boundingBox()
          assert.ok(Math.abs(center.x + center.width / 2 - panel.x - panel.width / 2) < 2)
          if (width === 320) {
            await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
            await page.evaluate(
              () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
            )
            const reflow = await heading.evaluate((el) => ({
              height: el.getBoundingClientRect().height,
              line: parseFloat(getComputedStyle(el).lineHeight),
            }))
            assert.ok(
              reflow.height <= reflow.line * 2 + 1,
              'The auth heading reflows across the header rather than a narrow icon column'
            )
            assert.ok(
              (await heading.boundingBox()).width > close.width * 3,
              'The heading has room beyond the narrow close-button column'
            )
            const mark = await brand.locator('[aria-label="Muvira"]').boundingBox()
            const exit = await header.getByRole('button', { name: 'Close dialog' }).boundingBox()
            assert.ok(
              mark.x + mark.width + 3 <= exit.x,
              'The enlarged brand must leave the close target clear'
            )
          }
          await page.keyboard.press('Escape')
          await expect(
            page.locator('header').getByRole('button', { name: 'Sign in', exact: true })
          ).toBeFocused()
        },
        { viewport: { width, height: 950 } }
      ))

  test(`${engine}: hover opens without focus, panel travel and clicks keep it open, dismissal is delayed`, () =>
    visit(engine, '/', async (page) => {
      const trigger = page.getByRole('button', { name: 'Collections', exact: true })
      const search = page.getByRole('searchbox', {
        name: 'Search products and collections',
        exact: true,
      })
      await search.focus()
      await trigger.hover()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(search).toBeFocused()
      await trigger.click()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const panel = page.locator('.collections-panel')
      await panel.getByRole('menuitem').first().hover()
      await expect(panel).toBeVisible()
      // Move focus out so the keyboard-focus hold is not active.
      await search.focus()
      await trigger.hover()
      await panel.getByRole('menuitem').first().hover()
      await page.mouse.move(1, 900)
      await page.waitForTimeout(70)
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await trigger.hover()
      await trigger.focus()
      await page.keyboard.press('ArrowDown')
      await page.mouse.move(1, 900)
      await page.waitForTimeout(220)
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      // A click can arrive in the same frame as pointer entry, before the hover render commits.
      await trigger.click()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await page.mouse.move(1, 900)
      await trigger.hover()
      await page.mouse.click(4, 900)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await trigger.hover()
      await panel.getByRole('menuitem').first().click()
      await expect(page).toHaveURL(fixture.origin + '/categories')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    }))

  test(`${engine}: touch collections and default sort remain click and keyboard operated`, () =>
    visit(
      engine,
      '/shop',
      async (page) => {
        const trigger = page.getByRole('button', { name: 'Collections', exact: true })
        await trigger.tap()
        await expect(trigger).toHaveAttribute('aria-expanded', 'true')
        await trigger.tap()
        await expect(trigger).toHaveAttribute('aria-expanded', 'false')
        const sort = page.locator('#catalog-sort')
        await sort.hover()
        await expect(sort).toHaveAttribute('aria-expanded', 'false')
        await sort.focus()
        await page.keyboard.press('ArrowDown')
        await expect(sort).toHaveAttribute('aria-expanded', 'true')
        await page.keyboard.press('Escape')
        await expect(sort).toBeFocused()
      },
      { hasTouch: true }
    ))

  for (const width of [320, 390, 768, 1280, 1440])
    test(`${engine} ${width}px: every collection stays on one reachable row`, () =>
      visit(
        engine,
        '/shop?category=vaastu',
        async (page) => {
          const strip = page.getByRole('navigation', { name: 'Browse sibling collections' })
          const links = strip.getByRole('link')
          await expect(links).toHaveCount(9)
          const rows = await links.evaluateAll((els) =>
            els.map((el) => el.getBoundingClientRect().y)
          )
          assert.ok(rows.every((y) => Math.abs(y - rows[0]) < 2))
          for (const link of await links.all()) {
            await link.focus()
            const box = await link.boundingBox(),
              frame = await strip.boundingBox()
            assert.ok(box.x >= frame.x - 1 && box.x + box.width <= frame.x + frame.width + 1)
            assert.ok(
              await link.locator('img').evaluate((el) => el.getBoundingClientRect().width >= 35)
            )
          }
          // Initial active collection is revealed horizontally without moving the page.
          await page.goto(fixture.origin + '/shop?category=pooja')
          await expect(strip.locator('[aria-current="page"]')).toBeVisible()
          const active = await strip.locator('[aria-current="page"]').boundingBox(),
            frame = await strip.boundingBox()
          assert.ok(active.x >= frame.x && active.x + active.width <= frame.x + frame.width)
          assert.equal(await page.evaluate(() => scrollY), 0)
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            true
          )
        },
        { viewport: { width, height: 950 } }
      ))

  test(`${engine}: enlarged text keeps customer icons beside labels and loading controls stable`, () =>
    visit(
      engine,
      '/orders/fixture-order?fixtureRole=customer',
      async (page) => {
        for (const path of [
          '/orders/fixture-order?fixtureRole=customer',
          '/profile?fixtureRole=customer',
          '/reset-password',
          '/cart?fixtureRole=customer',
          '/checkout?fixtureRole=customer',
          '/orders/failure?fixtureRole=customer',
        ]) {
          await page.goto(fixture.origin + path)
          await page.locator('h1').waitFor()
          await page.evaluate(() => document.fonts.ready)
          await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
          await page.evaluate(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
          )
          await assertIconGeometry(page.locator('main button, main a'))
          const layout = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
            outside: [...document.querySelectorAll('*')]
              .filter(
                (el) =>
                  el.getClientRects().length && el.getBoundingClientRect().right > innerWidth + 1
              )
              .map((el) => [
                el.tagName,
                el.className,
                el.textContent.slice(0, 80),
                el.getBoundingClientRect().right,
              ]),
          }))
          assert.ok(layout.scroll <= layout.width + 1, path + JSON.stringify(layout))
        }
        await page.goto(fixture.origin + '/product/fixture?gatedAdd=1')
        const add = page.locator('.product-purchase .product-add-button')
        await expect(add).toBeVisible()
        const before = await add.boundingBox()
        await add.click()
        await expect(add).toBeDisabled()
        await expect(add).toHaveAttribute('aria-busy', 'true')
        const after = await add.boundingBox()
        assert.ok(
          Math.abs(before.width - after.width) < 1 && Math.abs(before.height - after.height) < 1
        )
        await assertIconGeometry(add)
      },
      { viewport: { width: 320, height: 950 } }
    ))

  for (const path of ['/shop', '/search'])
    test(`${engine}: ${path} Reset owns filtering and browser history restores selections`, () =>
      visit(
        engine,
        path + '?q=Krishna&category=god-idols&minPrice=1000&inStock=true&sort=price_asc&page=2',
        async (page) => {
          await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible()
          assert.equal(await page.getByRole('button', { name: /^Remove .* filter$/ }).count(), 0)
          assert.equal(
            await page.getByRole('button', { name: 'Clear filters', exact: true }).count(),
            0
          )
          await page.getByRole('button', { name: 'Reset', exact: true }).click()
          await expect(page).toHaveURL(
            fixture.origin + path + (path === '/search' ? '?q=Krishna' : '')
          )
          await page.goBack()
          await expect(
            page.getByRole('spinbutton', { name: 'Minimum price', exact: true })
          ).toHaveValue('1000')
          assert.equal(new URL(page.url()).searchParams.get('sort'), 'price_asc')
          assert.equal(new URL(page.url()).searchParams.get('page'), '2')
        }
      ))
}
