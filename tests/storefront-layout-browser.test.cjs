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

// Action icons center against the complete label, including wrapped text.
async function assertIconGeometry(controls) {
  const failures = await controls.evaluateAll((elements) =>
    elements.flatMap((element) => {
      if (!element.getClientRects().length || element.matches('.account-shortcut')) return []
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
      const centered = element.matches(
        '.ui-button, .button-primary, .button-secondary, .account-navigation__link'
      )
      if (centered) {
        range.setEndAfter(node.parentElement.lastChild)
      }
      const label = centered ? range.getBoundingClientRect() : range.getClientRects()[0],
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
  test(`${engine}: footer labels follow authentication and omit payment-provider branding`, () =>
    visit(engine, '/shop?fixtureRole=guest', async (page) => {
      const account = page.getByRole('navigation', { name: 'Footer account' })
      await expect(account.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
        'href',
        '/signin'
      )
      await expect(account.getByRole('link', { name: 'Account details', exact: true })).toHaveCount(
        0
      )
      await account.getByRole('link', { name: 'Sign in', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Welcome back.' })).toBeVisible()
      await expect(page).toHaveURL(fixture.origin + '/shop?fixtureRole=guest')
      await page.keyboard.press('Escape')
      await page.goto(fixture.origin + '/shop')
      await expect(
        account.getByRole('link', { name: 'Account details', exact: true })
      ).toHaveAttribute('href', '/profile')
      await expect(account.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0)
      await expect(page.locator('.store-footer')).not.toContainText('Razorpay')
    }))
  test(`${engine}: modal Tab treats native price radios as one stop and skips negative tabindex`, () =>
    visit(
      engine,
      '/shop',
      async (page) => {
        await page.getByRole('button', { name: 'Open filters', exact: true }).click()
        const dialog = page.getByRole('dialog')
        const checked = dialog.getByRole('radio').first()
        await checked.focus()
        await page.keyboard.press('Tab')
        await expect(
          dialog.getByRole('spinbutton', { name: 'Minimum price', exact: true })
        ).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(checked).toBeFocused()
        await page.keyboard.press('ArrowDown')
        await expect(dialog.getByRole('radio').nth(1)).toBeChecked()
        await page.keyboard.press('Tab')
        await expect(
          dialog.getByRole('spinbutton', { name: 'Minimum price', exact: true })
        ).toBeFocused()
        await dialog
          .getByRole('button', { name: 'Close modal', exact: true })
          .evaluate((el) => (el.tabIndex = -1))
        await dialog.getByRole('button', { name: 'Show Results', exact: true }).focus()
        await page.keyboard.press('Tab')
        await expect(dialog.locator('#mobile-catalog-sort')).toBeFocused()
      },
      { viewport: { width: 390, height: 950 } }
    ))
  for (const width of [320, 390, 768, 1280, 1440]) {
    test(`${engine} ${width}px: 200% text and long names keep quick view and bag controls usable`, () =>
      visit(
        engine,
        '/shop?scenario=long-name&gatedAdd=1',
        async (page) => {
          const height = width === 320 ? 568 : 950
          await page.setViewportSize({ width, height })
          await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
          await page
            .getByRole('button', { name: /Quick view/ })
            .first()
            .click()
          let dialog = page.getByRole('dialog', { name: 'A closer look' })
          assert.ok(
            await dialog
              .locator('.modal-body')
              .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
          )
          const add = dialog.locator('.button-primary')
          await add.scrollIntoViewIfNeeded()
          const before = await add.boundingBox()
          await add.click()
          const busy = await add.boundingBox()
          assert.ok(
            Math.abs(before.height - busy.height) < 1 && Math.abs(before.width - busy.width) < 1
          )
          await expect(add).toHaveAttribute('aria-busy', 'true')
          await page.keyboard.press('Escape')
          await page.goto(fixture.origin + '/?scenario=long-name&bagCount=6')
          await page.locator('h1').waitFor()
          await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
          await page
            .locator('header')
            .getByRole('button', { name: 'Shopping cart', exact: true })
            .click()
          dialog = page.getByRole('dialog', { name: 'Shopping cart' })
          assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
          const checkout = dialog.getByRole('button', { name: 'Proceed to Checkout' })
          await checkout.scrollIntoViewIfNeeded()
          const box = await checkout.boundingBox()
          assert.ok(box.y >= 0 && box.y + box.height <= height)
          assert.ok(
            await dialog.locator('.cart-drawer-items').evaluate((el) => el.clientHeight >= 44)
          )
          const viewBag = dialog.getByRole('link', { name: 'View shopping bag' })
          await viewBag.scrollIntoViewIfNeeded()
          const viewBox = await viewBag.boundingBox()
          assert.ok(viewBox.y + viewBox.height <= height)
          const quantity = dialog.locator('.drawer-cart-item__quantity').first()
          await quantity.scrollIntoViewIfNeeded()
          assert.ok(await quantity.evaluate((el) => el.getBoundingClientRect().right <= innerWidth))
          await page.keyboard.press('Escape')
          await page.goto(fixture.origin + '/?hero=long')
          await page.locator('h1').waitFor()
          await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
          )
        },
        { viewport: { width, height: 950 } }
      ))
  }
  test(`${engine}: bag preserves empty, loading, retry, unresolved, pending and mutation failures`, () =>
    visit(engine, '/', async (page) => {
      const open = async (query) => {
        await page.goto(fixture.origin + '/?' + query)
        await page.locator('h1').waitFor()
        await page
          .locator('header')
          .getByRole('button', { name: 'Shopping cart', exact: true })
          .click()
        return page.getByRole('dialog', { name: 'Shopping cart' })
      }
      let dialog = await open('scenario=empty-cart')
      await expect(dialog.getByText('Your cart is empty')).toBeVisible()
      assert.equal(await dialog.locator('.cart-drawer-summary').count(), 0)
      dialog = await open('bagState=loading')
      await expect(dialog.getByText('Loading your cart…')).toBeVisible()
      assert.equal(await dialog.getByText('Your cart is empty').count(), 0)
      dialog = await open('bagState=error')
      await expect(dialog.getByText('Bag temporarily unavailable')).toBeVisible()
      await dialog.getByRole('button', { name: 'Retry loading cart' }).click()
      await expect(dialog.getByRole('button', { name: 'Proceed to Checkout' })).toBeEnabled()
      dialog = await open('bagState=unresolved')
      await expect(dialog.getByRole('button', { name: 'Resolve saved items' })).toBeDisabled()
      dialog = await open('bagState=pending')
      await expect(dialog.getByRole('button', { name: 'Proceed to Checkout' })).toBeDisabled()
      await expect(dialog.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
      dialog = await open('quantityFailure=1')
      await dialog.getByRole('button', { name: 'Increase quantity' }).click()
      await expect(dialog.getByRole('alert')).toHaveText('Quantity update was not confirmed')
      await expect(dialog.getByRole('button', { name: 'Proceed to Checkout' })).toBeDisabled()
      dialog = await open('bagTotals=1')
      await expect(dialog.getByText('-₹25', { exact: true })).toBeVisible()
      await expect(dialog.getByText('₹15', { exact: true })).toBeVisible()
      const expected = await page.evaluate(() =>
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format((window.fixture.cart[0].lineTotal - 2500 + 1500) / 100)
      )
      await expect(dialog.locator('.cart-drawer-total')).toContainText(expected)
      dialog = await open('fixtureRole=guest')
      await dialog.getByRole('button', { name: 'Proceed to Checkout' }).click()
      await expect(page.getByRole('dialog', { name: 'Welcome back.' })).toBeVisible()
      assert.equal(await page.locator('.cart-drawer-panel').count(), 0)
      await page.keyboard.press('Escape')
      await expect(
        page.locator('header').getByRole('button', { name: 'Shopping cart', exact: true })
      ).toBeFocused()
    }))
  test(`${engine}: customer photos fill their frames while broken and unavailable quick views stay truthful`, () =>
    visit(engine, '/shop', async (page) => {
      for (const path of [
        '/shop',
        '/cart',
        '/checkout',
        '/orders',
        '/orders/fixture-order',
        '/orders/success?orderId=fixture-order',
      ]) {
        await page.goto(fixture.origin + path)
        await page.locator('main img').first().waitFor()
        assert.deepEqual(
          await page
            .locator('main img')
            .evaluateAll((images) =>
              images
                .filter((image) => getComputedStyle(image).objectFit !== 'cover')
                .map((image) => image.alt)
            ),
          [],
          path
        )
      }
      await page.goto(fixture.origin + '/shop?scenario=broken-images')
      await page
        .getByRole('button', { name: /Quick view/ })
        .first()
        .click()
      let dialog = page.getByRole('dialog', { name: 'A closer look' })
      await expect(dialog.getByRole('img', { name: /image unavailable/ })).toBeVisible()
      await page.keyboard.press('Escape')
      await page.goto(fixture.origin + '/shop?stock=0')
      await page
        .getByRole('button', { name: /Quick view/ })
        .first()
        .click()
      dialog = page.getByRole('dialog', { name: 'A closer look' })
      await expect(dialog.getByRole('button', { name: 'Unavailable', exact: true })).toBeDisabled()
    }))
  for (const width of [320, 390, 768, 1280, 1440]) {
    test(`${engine} ${width}px: ivory bag keeps the header and checkout reachable as items scroll`, () =>
      visit(
        engine,
        '/?bagCount=8',
        async (page) => {
          const trigger = page
            .locator('header')
            .getByRole('button', { name: 'Shopping cart', exact: true })
          await trigger.focus()
          await trigger.click()
          const dialog = page.getByRole('dialog', { name: 'Shopping cart' })
          await expect(dialog).toHaveCSS('opacity', '1')
          const panel = await dialog.boundingBox()
          assert.equal(Math.round(panel.width), width < 768 ? width : 480)
          const close = await dialog
            .getByRole('button', { name: 'Close cart', exact: true })
            .boundingBox()
          assert.ok(close.width >= 44 && close.height >= 44)
          const image = dialog.locator('.drawer-cart-item img').first()
          assert.equal(await image.evaluate((el) => getComputedStyle(el).objectFit), 'cover')
          const frame = await image.locator('..').boundingBox()
          const photo = await image.boundingBox()
          assert.ok(
            Math.abs(frame.width - photo.width) < 1 && Math.abs(frame.height - photo.height) < 1
          )
          const checkout = dialog.getByRole('button', { name: 'Proceed to Checkout' })
          const summary = await dialog.locator('.cart-drawer-summary').boundingBox()
          const action = await checkout.boundingBox()
          assert.ok(action.width >= summary.width - 65, 'Checkout spans the summary')
          assert.ok(action.y >= 0 && action.y + action.height <= 950)
          const scroller = dialog.locator('.cart-drawer-items')
          assert.ok(await scroller.evaluate((el) => el.scrollHeight > el.clientHeight))
          await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight))
          assert.deepEqual(await checkout.boundingBox(), action)
          for (let index = 0; index < 16; index++) {
            await page.keyboard.press('Tab')
            assert.ok(await dialog.evaluate((el) => el.contains(document.activeElement)))
          }
          assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
          await page.keyboard.press('Escape')
          await expect(trigger).toBeFocused()
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden')
        },
        { viewport: { width, height: 950 } }
      ))
    test(`${engine} ${width}px: hero copy stays centered independently of slide navigation`, () =>
      visit(
        engine,
        '/',
        async (page) => {
          const hero = page.locator('.devotion-hero')
          const copy = page.locator('.devotion-hero__copy')
          const image = page.locator('.devotion-hero__image')
          assert.equal(await copy.locator('.hero-navigation').count(), 0)
          const slides = await page.evaluate(() => window.fixture.settings.heroSlides.length)
          for (let index = 0; index < slides; index++) {
            const heading = copy.locator('h1')
            await expect(heading).toHaveText(
              await page.evaluate((i) => window.fixture.settings.heroSlides[i].title, index)
            )
            const layout = await copy.evaluate((el) => {
              const first = el.firstElementChild.getBoundingClientRect()
              const last = el.querySelector('a').getBoundingClientRect()
              return { top: first.top, bottom: last.bottom }
            })
            if (width >= 768) {
              const frame = await hero.boundingBox()
              assert.ok(
                Math.abs((layout.top + layout.bottom) / 2 - (frame.y + frame.height / 2)) < 4
              )
            } else assert.ok((await copy.boundingBox()).y < (await image.boundingBox()).y)
            assert.equal(
              await copy.locator('.eyebrow').evaluate((el) => getComputedStyle(el).fontSize),
              '12px'
            )
            await page.getByRole('button', { name: 'Next slide', exact: true }).click()
          }
          const footer = page.locator('.store-footer')
          assert.equal(await footer.locator('.store-footer__grid > div').count(), 4)
          assert.equal(await footer.locator('.store-footer__navigation').count(), 0)
          assert.equal(await footer.getByText('Payments through Razorpay').count(), 0)
          assert.equal(
            await footer.evaluate((el) => getComputedStyle(el).backgroundColor),
            await page
              .locator('body')
              .evaluate(() =>
                getComputedStyle(document.documentElement).getPropertyValue('--surface-alt').trim()
              )
              .then((value) =>
                page.evaluate((value) => {
                  const el = document.createElement('span')
                  el.style.color = value
                  document.body.append(el)
                  const color = getComputedStyle(el).color
                  el.remove()
                  return color
                }, value)
              )
          )
        },
        { viewport: { width, height: 950 } }
      ))
  }
  for (const width of [320, 390, 768, 1280, 1440]) {
    test(`${engine} ${width}px: compact quick view fills its square photograph and centers stable actions`, () =>
      visit(
        engine,
        '/shop?gatedAdd=1',
        async (page) => {
          const trigger = page.getByRole('button', { name: /Quick view/ }).first()
          await trigger.focus()
          await trigger.click()
          const dialog = page.getByRole('dialog', { name: 'A closer look' })
          const image = dialog.locator('img').first()
          const photo = await image.boundingBox()
          assert.ok(Math.abs(photo.width - photo.height) < 1, 'Quick-view photograph is square')
          assert.equal(await image.evaluate((el) => getComputedStyle(el).objectFit), 'cover')
          const add = dialog.locator('.button-primary')
          const details = dialog.getByRole('link', { name: 'View Full Details' })
          const before = await add.boundingBox()
          assert.equal(before.height, (await details.boundingBox()).height)
          assert.equal(await add.evaluate((el) => getComputedStyle(el).alignItems), 'center')
          const centered = await add.evaluate((el) => {
            const icon = el.querySelector('svg').getBoundingClientRect()
            const label = el.querySelector('span').getBoundingClientRect()
            return Math.abs(icon.y + icon.height / 2 - label.y - label.height / 2) < 1
          })
          assert.ok(centered, 'Icon and label share a center line')
          await add.click()
          await expect(add).toHaveAttribute('aria-busy', 'true')
          const busy = await add.boundingBox()
          assert.ok(
            Math.abs(before.width - busy.width) < 1 && Math.abs(before.height - busy.height) < 1
          )
          await page.keyboard.press('Escape')
          await expect(dialog).toHaveCount(0)
          await expect(page.getByRole('button', { name: /Quick view/ }).first()).toBeFocused()
        },
        { viewport: { width, height: 950 } }
      ))
  }
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

  for (const width of [1024, 1280, 1440])
    test(`${engine} ${width}px: collection menu has three equal columns and retains standalone shop links`, () =>
      visit(
        engine,
        '/',
        async (page) => {
          const trigger = page.getByRole('button', { name: 'Collections', exact: true })
          await trigger.click()
          const panel = page.locator('.collections-panel')
          await expect(panel.getByRole('menuitem')).toHaveCount(10)
          await expect(
            panel.getByRole('menuitem', { name: /Shop all products|New arrivals/ })
          ).toHaveCount(0)
          const directory = panel.getByRole('menuitem').first()
          await expect(directory).toHaveAttribute('href', '/categories')
          const cards = panel
            .locator('.collections-panel__link')
            .filter({ has: page.locator('.collections-panel__image') })
          const boxes = await Promise.all((await cards.all()).map((card) => card.boundingBox()))
          assert.equal(boxes.length, 9)
          const frame = await directory.boundingBox()
          assert.ok(Math.abs(frame.width - (boxes[2].x + boxes[2].width - boxes[0].x)) < 2)
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const box = boxes[row * 3 + col]
              assert.ok(Math.abs(box.width - boxes[0].width) < 1)
              assert.ok(Math.abs(box.y - boxes[row * 3].y) < 1)
            }
          }
          await page.evaluate(() => {
            document
              .querySelectorAll('.collections-panel__link > span')
              .forEach((el) => (el.style.fontSize = '28px'))
            document
              .querySelectorAll('.collections-panel__link small')
              .forEach((el) => (el.style.fontSize = '24px'))
            document.querySelector(
              '.collections-panel__link:nth-child(2) > span'
            ).firstChild.textContent += ' — Traditional handcrafted pieces for the home mandir'
          })
          assert.ok(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
          for (const image of await panel.locator('.collections-panel__image').all()) {
            const box = await image.boundingBox()
            assert.equal(box.width, 80)
            assert.equal(box.height, 80)
          }
          await page.route('**/unavailable-menu.png', (route) => route.abort())
          await panel
            .locator('img')
            .first()
            .evaluate((el) => (el.src = '/unavailable-menu.png'))
          await expect(
            panel.getByRole('img', { name: 'Image unavailable', exact: true })
          ).toBeVisible()
          await directory.focus()
          await page.keyboard.press('Escape')
          await expect(trigger).toBeFocused()
          const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true })
          await expect(nav.getByRole('link', { name: 'Shop all', exact: true })).toHaveAttribute(
            'href',
            '/shop'
          )
          await expect(
            nav.getByRole('link', { name: 'New arrivals', exact: true })
          ).toHaveAttribute('href', '/shop?sort=newest')
          const footer = page.getByRole('navigation', { name: 'Footer catalog', exact: true })
          await expect(
            footer.getByRole('link', { name: 'All products', exact: true })
          ).toHaveAttribute('href', '/shop')
          await expect(
            footer.getByRole('link', { name: 'New arrivals', exact: true })
          ).toHaveAttribute('href', '/shop?sort=newest')
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

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: enlarged auth branding keeps the close target clear with expanded text spacing`, () =>
    visit(
      engine,
      '/not-a-page?fixtureRole=guest',
      async (page) => {
        await page.locator('header').getByRole('button', { name: 'Sign in', exact: true }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('heading', { name: 'Welcome back.', exact: true }).waitFor()
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '32px'
          document.querySelector('.modal-header__brand .brand-wordmark').style.letterSpacing =
            '0.12em'
        })
        await page.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
        )
        const mark = await dialog
          .locator('.modal-header__brand [aria-label="Muvira"]')
          .boundingBox()
        const close = await dialog
          .locator('.modal-header')
          .getByRole('button', { name: 'Close dialog' })
          .boundingBox()
        assert.ok(
          mark.x + mark.width + 3 <= close.x,
          'The enlarged brand must leave the close target clear'
        )
        assert.ok(close.width >= 44 && close.height >= 44)
      },
      { viewport: { width: 320, height: 950 } }
    ))
}
