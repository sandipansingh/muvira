const assert = require('node:assert/strict')
const { test, before, after } = require('node:test')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')
let server, browser, origin
before(async () => {
  const { startEditorialServer } = await import(
    pathToFileURL(join(__dirname, 'fixtures/editorial-server.mjs')).href
  )
  const started = await startEditorialServer({ defaultRole: 'admin' })
  server = started.server
  origin = started.origin
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
  await server?.close()
})
async function fixture(path, width, run, height = 800) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  )
  try {
    await page.goto(origin + path)
    await page.locator('h1').first().waitFor()
    await run(page)
  } finally {
    await page.close()
  }
}
test('admin drawers use full-height right edge geometry and keep form actions reachable', async () => {
  for (const width of [390, 767, 820, 1440]) {
    await fixture('/admin/catalog', width, async (page) => {
      await page.getByRole('button', { name: 'Add product', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Add product', exact: true })
      const panel = dialog.locator('.overlay-panel')
      const box = await panel.boundingBox()
      assert.equal(Math.round(box.y), 0, 'The drawer must start at the viewport top')
      assert.equal(Math.round(box.y + box.height), 800, 'The drawer must end inside the viewport')
      assert.equal(Math.round(box.x + box.width), width)
      assert.equal(Math.round(box.height), 800)
      assert.equal(Math.round(box.width), width < 768 ? width : 640)
      const save = dialog.getByRole('button', { name: 'Create product', exact: true })
      const saveBox = await save.boundingBox()
      assert.ok(saveBox.y >= 0 && saveBox.y + saveBox.height <= 800, 'Save must be fully visible')
      assert.equal(await save.evaluate((el) => el.closest('footer') !== null), true)
      assert.equal(await save.evaluate((el) => el.form?.contains(el)), false)
      assert.equal(
        await save.evaluate((el) => el.form?.querySelector('[name="name"]') !== null),
        true
      )
      await dialog.getByRole('textbox', { name: 'Product name', exact: true }).fill('Unsaved item')
      await dialog.getByRole('button', { name: 'Close dialog' }).last().click()
      await page.getByRole('button', { name: 'Keep editing' }).click()
      assert.equal(
        await dialog.getByRole('textbox', { name: 'Product name', exact: true }).inputValue(),
        'Unsaved item'
      )
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Discard changes' }).click()
      await page.getByRole('tab', { name: 'Categories', exact: true }).click()
      await page.getByRole('button', { name: 'Add category', exact: true }).click()
      const categoryBox = await page
        .getByRole('dialog', { name: 'Add category', exact: true })
        .locator('.overlay-panel')
        .boundingBox()
      assert.equal(Math.round(categoryBox.width), width < 768 ? width : 480)
    })
  }
})
test('product drawer save targets product form while image forms remain independent and mounted', () =>
  fixture('/admin/catalog', 1440, async (page) => {
    await page
      .getByRole('button', { name: /^Edit product / })
      .first()
      .click()
    const dialog = page.getByRole('dialog', { name: 'Edit product', exact: true })
    const save = dialog.getByRole('button', { name: 'Save product', exact: true })
    const box = await dialog.locator('.overlay-panel').boundingBox()
    assert.equal(Math.round(box.y), 0)
    assert.equal(Math.round(box.y + box.height), 800)
    const saveBox = await save.boundingBox()
    assert.ok(saveBox.y + saveBox.height <= 800)
    assert.equal(await save.evaluate((el) => el.closest('footer') !== null), true)
    assert.equal(
      await save.evaluate((el) => el.form?.querySelector('[name="name"]') !== null),
      true
    )
    assert.equal(
      await save.evaluate((el) => el.form?.querySelector('[type="file"]') === null),
      true
    )
    const upload = dialog.locator('input[type=file]')
    await upload.setInputFiles({
      name: 'pending.png',
      mimeType: 'image/png',
      buffer: Buffer.from('pending'),
    })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Keep editing' }).click()
    assert.equal(await upload.evaluate((el) => el.files[0]?.name), 'pending.png')
    await dialog
      .getByRole('button', { name: /^Remove image/ })
      .first()
      .click()
    const confirmation = page.getByRole('dialog', { name: 'Remove product image', exact: true })
    assert.equal(
      Math.round((await confirmation.locator('.overlay-panel').boundingBox()).width),
      480
    )
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.activeElement?.textContent?.includes('Remove'))
    assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true)
  }))
test('order work area contains fulfillment and refunds while addresses, notes and documents use sidebar', () =>
  fixture('/admin/orders/fixture-order', 1440, async (page) => {
    await page.getByRole('heading', { name: 'Purchased items and totals' }).waitFor()
    const main = page.locator('.admin-order-main')
    assert.equal((await main.getByRole('heading', { name: /Fulfillment/ }).count()) > 0, true)
    assert.equal((await main.getByRole('heading', { name: /Refunds/ }).count()) > 0, true)
    const side = page.getByRole('complementary', { name: 'Order actions' })
    for (const name of ['Shipping address', 'Billing address', 'Internal note']) {
      assert.equal(await main.getByRole('heading', { name, exact: true }).count(), 0)
      await side.getByRole('heading', { name, exact: true }).waitFor()
    }
    assert.equal(await side.locator('section.panel:has(address)').count(), 2)
    await page.evaluate(() => {
      window.fixture.order.billingGstin = '19ABCDE1234F1Z5'
      window.fixture.order.deliveryInstructions = 'Use the side entrance'
    })
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await side.getByText('GSTIN: 19ABCDE1234F1Z5', { exact: true }).waitFor()
    await side.getByText('Delivery instructions: Use the side entrance', { exact: true }).waitFor()
    await side.getByRole('heading', { name: 'Documents', exact: true }).waitFor()
    assert.equal(
      await side.getByRole('button', { name: 'Invoice', exact: true }).isDisabled(),
      true
    )
    const a = await main.boundingBox(),
      b = await side.boundingBox()
    assert.ok(a.width > b.width * 1.8)
  }))
test('text focus changes fill without accents and preserves button keyboard focus and validation', async () => {
  for (const path of ['/admin/catalog', '/shop']) {
    await fixture(path, 1440, async (page) => {
      const input = page.getByRole('searchbox').first()
      const wrapper = input.locator('..')
      const beforeWrapper = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor)
      const before = await input.evaluate((el) => ({
        border: getComputedStyle(el).borderColor,
        fill: getComputedStyle(el).backgroundColor,
      }))
      await input.focus()
      const focused = await input.evaluate((el) => ({
        outline: getComputedStyle(el).outlineStyle,
        shadow: getComputedStyle(el).boxShadow,
        border: getComputedStyle(el).borderColor,
        fill: getComputedStyle(el).backgroundColor,
      }))
      assert.equal(focused.outline, 'none')
      assert.equal(focused.shadow, 'none')
      assert.equal(focused.border, before.border)
      assert.equal(await wrapper.evaluate((el) => getComputedStyle(el).outlineStyle), 'none')
      assert.ok(
        focused.fill !== before.fill ||
          (await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor)) !== beforeWrapper
      )
      await page.keyboard.press('Tab')
      const focus = await page.evaluate(() => ({
        tag: document.activeElement.tagName,
        outline: getComputedStyle(document.activeElement).outlineStyle,
      }))
      assert.ok(['BUTTON', 'A'].includes(focus.tag))
      assert.equal(focus.outline, 'solid')
    })
  }
})
test('long customer and staff emails stay on one line with full accessible text', () =>
  fixture('/admin/orders/fixture-order', 1440, async (page) => {
    const email =
      'a-very-long-admin-and-customer-address-with-no-breaks@a-long-company-domain.example.test'
    await page.evaluate((email) => {
      window.fixture.order.customer.email = email
      window.fixture.auth.user.email = email
    }, email)
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    await page.getByRole('heading', { name: 'Status and customer' }).waitFor()
    const shown = page.locator('.email-value').filter({ hasText: email })
    assert.ok((await shown.count()) >= 2)
    for (const element of await shown.all()) {
      assert.equal(await element.getAttribute('title'), email)
      assert.equal(await element.textContent(), email)
      const style = await element.evaluate((el) => ({
        whiteSpace: getComputedStyle(el).whiteSpace,
        overflow: getComputedStyle(el).overflow,
        textOverflow: getComputedStyle(el).textOverflow,
      }))
      assert.deepEqual(style, {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      })
    }
  }))

test('admin textarea focus shows fill without outlines or shadows', () =>
  fixture('/admin/orders/fixture-order', 1440, async (page) => {
    const note = page.getByRole('textbox', { name: 'Visible only to administrators' })
    await note.waitFor()
    const before = await note.evaluate((el) => getComputedStyle(el).backgroundColor)
    await note.focus()
    const after = await note.evaluate((el) => ({
      fill: getComputedStyle(el).backgroundColor,
      outline: getComputedStyle(el).outlineStyle,
      shadow: getComputedStyle(el).boxShadow,
    }))
    assert.notEqual(after.fill, before)
    assert.equal(after.outline, 'none')
    assert.equal(after.shadow, 'none')
  }))

test('admin validation borders keep the danger token during text focus', () =>
  fixture('/admin/orders/fixture-order', 1440, async (page) => {
    const note = page.getByRole('textbox', { name: 'Visible only to administrators' })
    await note.waitFor()
    await note.evaluate((el) => {
      el.setAttribute('aria-invalid', 'true')
      el.style.color = 'var(--color-danger)'
    })
    await note.focus()
    await page.waitForFunction(() => {
      const field = document.getElementById('admin-order-note')
      return field && getComputedStyle(field).borderTopColor === getComputedStyle(field).color
    })
    const colors = await note.evaluate((el) => ({
      border: getComputedStyle(el).borderTopColor,
      danger: getComputedStyle(el).color,
    }))
    assert.equal(colors.border, colors.danger)
    await page.getByRole('button', { name: 'Refresh', exact: true }).focus()
    assert.equal(await note.evaluate((el) => getComputedStyle(el).borderTopColor), colors.danger)
  }))

test('short and enlarged viewports keep drawer headers and save buttons visible while content scrolls', async () => {
  for (const { width, height, enlarged } of [
    { width: 1440, height: 660, enlarged: false },
    { width: 390, height: 568, enlarged: true },
  ]) {
    await fixture(
      '/admin/catalog',
      width,
      async (page) => {
        if (enlarged) await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
        await page
          .getByRole('button', { name: /^Edit product / })
          .first()
          .click()
        const dialog = page.getByRole('dialog', { name: 'Edit product', exact: true })
        const body = dialog.locator('.modal-body')
        for (const edge of ['top', 'bottom']) {
          await body.evaluate((el, edge) => {
            el.scrollTop = edge === 'top' ? 0 : el.scrollHeight
          }, edge)
          const bounds = await dialog.evaluate((el) => {
            const rect = el.querySelector('.overlay-panel').getBoundingClientRect()
            const header = el.querySelector('.modal-header').getBoundingClientRect()
            const save = el.querySelector('footer button[type="submit"]')
            const button = save.getBoundingClientRect()
            const hit = document.elementFromPoint(
              button.x + button.width / 2,
              button.y + button.height / 2
            )
            return {
              top: rect.top,
              bottom: rect.bottom,
              headerTop: header.top,
              saveBottom: button.bottom,
              saveReachable: save === hit || save.contains(hit),
            }
          })
          assert.equal(Math.round(bounds.top), 0)
          assert.equal(Math.round(bounds.bottom), height)
          assert.equal(Math.round(bounds.headerTop), 0)
          assert.ok(bounds.saveBottom <= height)
          assert.equal(
            bounds.saveReachable,
            true,
            `${width}px ${edge}: Save product must remain reachable`
          )
        }
      },
      height
    )
  }
})
