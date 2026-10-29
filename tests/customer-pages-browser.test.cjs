const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium, webkit, expect } = require('playwright/test')
let fixture
let accountServer
const browsers = {}
before(async () => {
  fixture = await (await import('./fixtures/editorial-server.mjs')).startEditorialServer()
  accountServer = await (
    await import('./fixtures/editorial-server.mjs')
  ).startEditorialServer({ realAuth: true, accountActions: true })
  for (const [name, engine] of Object.entries({ chromium, webkit }))
    browsers[name] = await engine.launch({ headless: true })
})
after(async () => {
  await Promise.all(Object.values(browsers).map((browser) => browser.close()))
  await fixture?.server.close()
  await accountServer?.server.close()
})
async function visit(engine, path, run, width = 1280, account = false) {
  const server = account ? accountServer : fixture
  const page = await browsers[engine].newPage({
    viewport: { width, height: 950 },
    reducedMotion: 'reduce',
  })
  page.setDefaultTimeout(6000)
  page.setDefaultNavigationTimeout(30000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (account)
    await page.addInitScript(() => {
      sessionStorage.setItem('auth-fixture-session', '1')
      window.accountFixture = {
        calls: [],
        delay: {
          addressLoad: location.search.includes('holdAddresses'),
          trackingLoad: location.search.includes('holdTracking'),
        },
        failure: {
          trackingLoad: location.search.includes('trackingFailure') ? 'Carrier unavailable' : null,
          preferencesLoad: location.search.includes('preferencesLoadFailure')
            ? 'Preferences temporarily unavailable'
            : null,
        },
        pending: {},
        release(name) {
          this.delay[name] = false
          ;(this.pending[name] || []).splice(0).forEach((done) => done())
        },
      }
    })
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === server.origin
      ? route.continue()
      : route.request().resourceType() === 'image'
        ? route.fulfill({ path: 'client/public/images/editorial/stone-alcove.png' })
        : route.abort()
  )
  try {
    await page.goto(server.origin + path)
    await page.locator('h1').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await run(page)
    assert.deepEqual(errors, [])
  } finally {
    await page.close()
  }
}
for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: overview previews load independently, retry failures and show genuine data`, () =>
    visit(
      engine,
      '/profile?holdAddresses',
      async (page) => {
        const order = page.getByRole('region', { name: 'Recent order', exact: true })
        const address = page.getByRole('region', { name: 'Default address', exact: true })
        await expect(order.getByText('#MUV-2026-1042', { exact: true })).toBeVisible()
        await expect(order.getByText('1 item', { exact: true })).toBeVisible()
        await expect(order.getByText('confirmed', { exact: true })).toBeVisible()
        await expect(order.getByText('₹499', { exact: true })).toBeVisible()
        await expect(order.getByText(/Placed on 26 Oct 2026/)).toBeVisible()
        await expect(order.locator('img')).toBeVisible()
        await page.route('**/unavailable-order.png', (route) => route.abort())
        await order.locator('img').evaluate((el) => (el.src = '/unavailable-order.png'))
        await expect(order.getByRole('img', { name: /image unavailable/ })).toBeVisible()
        await expect(order.getByRole('link', { name: 'View order', exact: true })).toHaveAttribute(
          'href',
          '/orders/fixture-order'
        )
        await expect(address.getByRole('status')).toContainText('Loading')
        await page.evaluate(() => {
          window.accountFixture.failure.addressLoad = 'Addresses unavailable'
          window.accountFixture.release('addressLoad')
        })
        await expect(address.getByRole('alert')).toHaveText('Addresses unavailable')
        await expect(address.getByText('No default address yet.', { exact: true })).toHaveCount(0)
        await page.evaluate(() => (window.accountFixture.failure.addressLoad = null))
        await address.getByRole('button', { name: 'Try again', exact: true }).click()
        await expect(address.getByText('24 Sample Lane', { exact: true })).toBeVisible()
        await page.evaluate(() => (window.accountFixture.delay.orderLoad = true))
        await page.getByRole('link', { name: 'Personal info', exact: true }).click()
        await page
          .getByRole('navigation', { name: 'Your account', exact: true })
          .getByRole('link', { name: 'Overview', exact: true })
          .click()
        await expect(order.getByRole('status')).toContainText('Loading')
        await expect(address.getByText('24 Sample Lane', { exact: true })).toBeVisible()
        await page.evaluate(() => {
          window.accountFixture.failure.orderLoad = 'Orders unavailable'
          window.accountFixture.release('orderLoad')
        })
        await expect(order.getByRole('alert')).toHaveText('Orders unavailable')
        await page.evaluate(() => {
          window.accountFixture.failure.orderLoad = null
          window.accountFixture.ordersEmpty = true
        })
        await order.getByRole('button', { name: 'Try again', exact: true }).click()
        await expect(order.getByText('No orders yet.', { exact: true })).toBeVisible()
      },
      1280,
      true
    ))

  test(`${engine}: hash history keeps drafts and confirmed default saves update the overview`, () =>
    visit(
      engine,
      '/profile#personal-info',
      async (page) => {
        await page.locator('#profile-full-name').fill('Unsaved personal draft')
        const nav = page.getByRole('navigation', { name: 'Your account', exact: true })
        await nav.getByRole('link', { name: /Saved addresses/ }).click()
        const heading = page.getByRole('heading', { name: 'Saved addresses', exact: true })
        await expect(heading).toBeVisible()
        assert.ok(
          await heading.evaluate(
            (el) =>
              el.getBoundingClientRect().top >=
              document.querySelector('.store-header').getBoundingClientRect().bottom - 1
          )
        )
        await page.getByRole('button', { name: 'Add address', exact: true }).click()
        for (const [name, value] of [
          ['Phone number', '9222222222'],
          ['Address line 1', '18 New Lane'],
          ['City', 'Kolkata'],
          ['Pincode', '700039'],
        ])
          await page.getByRole('textbox', { name, exact: true }).fill(value)
        await page.getByRole('checkbox', { name: 'Use as default address', exact: true }).check()
        await nav.getByRole('link', { name: 'Overview', exact: true }).click()
        await page.goBack()
        await expect(
          page.getByRole('textbox', { name: 'Address line 1', exact: true })
        ).toHaveValue('18 New Lane')
        await page.getByRole('button', { name: 'Save address', exact: true }).click()
        await expect(page.locator('#addresses').getByText('Default', { exact: true })).toHaveCount(
          1
        )
        await nav.getByRole('link', { name: 'Overview', exact: true }).click()
        await expect(
          page
            .getByRole('region', { name: 'Default address', exact: true })
            .getByText('18 New Lane', { exact: true })
        ).toBeVisible()
        await page.goBack()
        await nav.getByRole('link', { name: 'Personal info', exact: true }).click()
        await expect(page.locator('#profile-full-name')).toHaveValue('Unsaved personal draft')
        await nav.getByRole('link', { name: /Saved addresses/ }).click()
        const original = page.locator('.account-address').filter({ hasText: '24 Sample Lane' })
        await original.getByRole('button', { name: 'Edit address', exact: true }).click()
        await page.getByRole('checkbox', { name: 'Use as default address', exact: true }).check()
        await page.getByRole('button', { name: 'Save address', exact: true }).click()
        await expect(page.locator('#addresses').getByText('Default', { exact: true })).toHaveCount(
          1
        )
        await nav.getByRole('link', { name: 'Overview', exact: true }).click()
        await expect(
          page
            .getByRole('region', { name: 'Default address', exact: true })
            .getByText('24 Sample Lane', { exact: true })
        ).toBeVisible()
      },
      390,
      true
    ))

  test(`${engine}: an old order read cannot replace the current preview after hash navigation`, () =>
    visit(
      engine,
      '/profile#personal-info',
      async (page) => {
        const nav = page.getByRole('navigation', { name: 'Your account', exact: true })
        await page.evaluate(() => (window.accountFixture.delay.orderLoad = true))
        await nav.getByRole('link', { name: 'Overview', exact: true }).click()
        await expect(
          page.getByRole('region', { name: 'Recent order', exact: true }).getByRole('status')
        ).toBeVisible()
        await page.getByRole('link', { name: 'Personal info', exact: true }).click()
        await page.evaluate(() => {
          window.fixture.order = { ...window.fixture.order, orderNumber: 'MUV-LATEST' }
          window.accountFixture.delay.orderLoad = false
        })
        await nav.getByRole('link', { name: 'Overview', exact: true }).click()
        await expect(page.getByText('#MUV-LATEST', { exact: true })).toBeVisible()
        await page.evaluate(() => window.accountFixture.release('orderLoad'))
        await expect(page.getByText('#MUV-LATEST', { exact: true })).toBeVisible()
        await expect(page.getByText('#MUV-2026-1042', { exact: true })).toHaveCount(0)
      },
      390,
      true
    ))

  test(`${engine}: changing accounts clears drafts, previews and preferences and ignores old reads`, () =>
    visit(
      engine,
      '/profile#personal-info',
      async (page) => {
        await page.locator('#profile-full-name').fill('Old account draft')
        await page.getByRole('checkbox', { name: 'Receive order update emails' }).uncheck()
        await page
          .getByRole('navigation', { name: 'Your account', exact: true })
          .getByRole('link', { name: 'Overview', exact: true })
          .click()
        await page.evaluate(() => {
          window.accountFixture.delay.orderLoad = true
          window.accountFixture.delay.addressLoad = true
          window.accountFixture.delay.preferencesLoad = true
          window.fixture.addresses = [
            {
              ...window.fixture.address,
              id: 'new-user-address',
              line1: '8 New Account Street',
              isDefault: false,
            },
          ]
          window.fixture.order = { ...window.fixture.order, orderNumber: 'MUV-NEW-ACCOUNT' }
          window.accountFixture.emailEnabled = true
          window.authFixture.changeUser({
            ...window.fixture.auth.user,
            id: 'another-user',
            fullName: 'Meera Das',
            email: 'meera@example.test',
          })
        })
        await expect(page.getByText('Welcome back, Meera.', { exact: true })).toContainText('Meera')
        await expect(
          page.getByRole('region', { name: 'Recent order', exact: true }).getByRole('status')
        ).toBeVisible()
        await expect(page.getByText('24 Sample Lane', { exact: true })).toHaveCount(0)
        await page.getByRole('link', { name: 'Personal info', exact: true }).click()
        await expect(page.locator('#profile-full-name')).toHaveValue('Meera Das')
        await expect(
          page.getByText('Loading notification preferences…', { exact: true })
        ).toBeVisible()
        await page.evaluate(() => {
          window.accountFixture.release('preferencesLoad')
          window.accountFixture.release('addressLoad')
          window.accountFixture.release('orderLoad')
        })
        await expect(
          page.getByRole('checkbox', { name: 'Receive order update emails' })
        ).toBeChecked()
        await page
          .getByRole('navigation', { name: 'Your account', exact: true })
          .getByRole('link', { name: 'Overview', exact: true })
          .click()
        await expect(page.getByText('#MUV-NEW-ACCOUNT', { exact: true })).toBeVisible()
        await expect(page.getByText('#MUV-2026-1042', { exact: true })).toHaveCount(0)
        await expect(page.getByText('No default address yet.', { exact: true })).toBeVisible()
        await expect(
          page
            .getByRole('region', { name: 'Default address', exact: true })
            .getByText('8 New Account Street', { exact: true })
        ).toHaveCount(0)
      },
      390,
      true
    ))
  for (const width of [320, 390, 768, 1280, 1440]) {
    test(`${engine} ${width}px: category rail, account fields and long content remain reachable at 200% text`, () =>
      visit(
        engine,
        '/shop?category=pooja',
        async (page) => {
          const row = page.getByRole('navigation', { name: 'Browse sibling collections' })
          const next = page.getByRole('button', { name: 'Next collections', exact: true })
          const previous = page.getByRole('button', { name: 'Previous collections', exact: true })
          await expect(next).toBeVisible()
          assert.equal(await row.evaluate((el) => getComputedStyle(el).scrollbarWidth), 'none')
          assert.notEqual(
            await page.locator('html').evaluate((el) => getComputedStyle(el).scrollbarWidth),
            'none'
          )
          await previous.click()
          const left = await row.evaluate((el) => el.scrollLeft)
          await next.click()
          await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(left)
          assert.equal(await page.evaluate(() => scrollY), 0)
          assert.equal(
            await row
              .locator('.collection-image')
              .first()
              .evaluate((el) => el.getBoundingClientRect().width),
            56
          )
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '32px'
            document
              .querySelectorAll('.catalog-siblings a > span')
              .forEach(
                (el) =>
                  (el.textContent +=
                    ' — Traditional pieces for your daily ritual and thoughtful gifts')
              )
          })
          for (const link of await row.getByRole('link').all()) {
            await link.focus()
            await expect
              .poll(async () => {
                const [box, frame] = await Promise.all([link.boundingBox(), row.boundingBox()])
                return box.x >= frame.x - 1 && box.x + box.width <= frame.x + frame.width + 1
              })
              .toBe(true)
          }
          const first = row.getByRole('link').first()
          await first.focus()
          await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab')
          await expect(row.getByRole('link').nth(1)).toBeFocused()
          await page.goto(fixture.origin + '/profile')
          const accountNav = page.getByRole('navigation', { name: 'Your account', exact: true })
          await expect(accountNav.getByRole('link')).toHaveCount(4)
          const sidebar = await page.locator('.account-sidebar').boundingBox()
          const content = await page.locator('.account-main').boundingBox()
          if (width >= 1024) assert.ok(sidebar.x + sidebar.width < content.x)
          else assert.ok(sidebar.y + sidebar.height <= content.y)
          await expect(
            page.getByRole('region', { name: 'Recent order', exact: true })
          ).toBeVisible()
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '32px'
            document.querySelector('.account-email').textContent =
              'a-very-long-email-address-for-an-account@example.test'
            document.querySelector('.account-navigation__link span').textContent +=
              ' and delivery updates for your recent purchases'
          })
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
          )
          await page.screenshot({
            fullPage: true,
            path: `dev-scripts/account-${engine}-${width}-text200.png`,
          })
          await page.goto(fixture.origin + '/profile#personal-info')
          await expect(page.locator('#profile-full-name')).toBeVisible()
          const name = await page.locator('#profile-full-name').boundingBox()
          const phone = await page.locator('#profile-phone').boundingBox()
          assert.equal(Math.abs(name.y - phone.y) < 1, width >= 640)
          await expect(page.locator('#profile-email')).toBeDisabled()
          assert.ok(
            await page
              .locator('#profile-email')
              .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16)
          )
          await page.evaluate(() => (document.documentElement.style.fontSize = '32px'))
          await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
          )
          const nav = page.getByRole('navigation', { name: 'Your account', exact: true })
          for (const link of await nav.getByRole('link').all()) {
            await link.focus()
            await expect(link).toBeFocused()
          }
          await page.goto(fixture.origin + '/shop?scenario=sparse')
          if (width >= 1280) await expect(next).toHaveCount(0)
          await page.goto(fixture.origin + '/shop')
          await row.getByRole('link').last().waitFor()
          await page.route('**/*', (route) =>
            route.request().resourceType() === 'image' ? route.abort() : route.fallback()
          )
          await row
            .locator('img')
            .evaluateAll((els) => els.forEach((el) => (el.src = '/unavailable-category.png')))
          await expect(row.getByRole('img', { name: /image unavailable/ }).first()).toBeVisible()
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
          )
          await page.goto(fixture.origin + '/shop?category=god-idols')
          const crumbs = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
          await expect(crumbs.locator('[aria-current="page"]')).toHaveText('God Idols')
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '32px'
            document.querySelector('nav[aria-label="Breadcrumb"] [aria-current]').textContent =
              'Traditional handcrafted devotional pieces for your home mandir and thoughtful gifting'
          })
          assert.ok(await crumbs.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
          assert.equal(
            await crumbs
              .locator('[aria-current]')
              .evaluate((el) => getComputedStyle(el).textOverflow),
            'clip'
          )
          await expect(crumbs.getByRole('link', { name: 'Shop', exact: true })).toHaveAttribute(
            'href',
            '/shop'
          )
        },
        width
      ))
  }
  test(`${engine}: customer introductions use one shared title and deeper breadcrumbs`, () =>
    visit(engine, '/shop', async (page) => {
      for (const [path, title] of [
        ['/shop', 'Shop the collection'],
        ['/profile', 'Your account'],
        ['/categories', 'Collections'],
        ['/search', 'Find your piece'],
        ['/orders', 'My orders'],
      ]) {
        await page.goto(fixture.origin + path)
        await expect(page.locator('main h1')).toHaveText(title)
        await expect(page.locator('main .customer-heading h1')).toHaveCount(1)
        await expect(page.locator('main nav[aria-label="Breadcrumb"]')).toHaveCount(0)
        await expect(page.locator('main .customer-heading .eyebrow')).toHaveCount(0)
        assert.equal(
          await page.locator('main h1').evaluate((el) => getComputedStyle(el).fontSize),
          '40px'
        )
        await expect(page.locator('.store-footer')).toBeVisible()
      }
      for (const path of [
        '/shop?category=god-idols',
        '/product/fixture',
        '/orders/fixture-order',
      ]) {
        await page.goto(fixture.origin + path)
        const crumbs = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
        await expect(crumbs.locator('[aria-current="page"]')).toHaveCount(1)
        await expect(crumbs.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute(
          'href',
          '/'
        )
        for (const link of await crumbs.getByRole('link').all()) {
          const box = await link.boundingBox()
          assert.ok(box.width >= 44 && box.height >= 44)
        }
      }
    }))
  test(`${engine}: account navigation selects the route or address hash exactly once`, () =>
    visit(engine, '/profile', async (page) => {
      const nav = page.getByRole('navigation', { name: 'Your account', exact: true })
      await expect(page.getByRole('heading', { name: 'Recent order', exact: true })).toBeVisible()
      await page
        .getByRole('link', { name: /Saved addresses/ })
        .first()
        .click()
      const current = nav.locator('[aria-current="page"]')
      await expect(current).toContainText('Saved addresses')
      await nav.getByRole('link', { name: /Saved addresses/ }).click()
      await expect(page).toHaveURL(/\/profile#addresses$/)
      await expect(current).toHaveCount(1)
      await expect(current).toContainText('Saved addresses')
      await nav.getByRole('link', { name: 'My orders', exact: true }).click()
      await expect(page).toHaveURL(/\/orders$/)
      await expect(current).toHaveText('My orders')
      await nav.getByRole('link', { name: 'Personal info', exact: true }).click()
      await expect(current).toHaveText('Personal info')
      await nav.getByRole('link', { name: 'Overview', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Recent order', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Admin console', exact: true })).toHaveCount(0)
      await page.goto(fixture.origin + '/profile?fixtureRole=admin')
      await expect(page.getByRole('link', { name: 'Admin console', exact: true })).toHaveAttribute(
        'href',
        '/admin'
      )
    }))
  test(`${engine}: profile and preferences preserve pending, confirmed and failed saves`, () =>
    visit(
      engine,
      '/profile#personal-info',
      async (page) => {
        await page.locator('#profile-full-name').fill('Aarohi Sharma')
        await page.locator('#profile-phone').fill('9111111111')
        await page.evaluate(() => (window.accountFixture.delay.profileSave = true))
        const save = page.getByRole('button', { name: 'Save changes', exact: true })
        const before = await save.boundingBox()
        await save.click()
        await expect(save).toHaveAttribute('aria-busy', 'true')
        await expect(save).toBeDisabled()
        assert.equal((await save.boundingBox()).width, before.width)
        assert.equal((await save.boundingBox()).height, before.height)
        await page.evaluate(() => window.accountFixture.release('profileSave'))
        await expect(page.getByText('Profile updated successfully.', { exact: true })).toBeVisible()
        await expect(save).toBeEnabled()
        await page.evaluate(
          () => (window.accountFixture.failure.profileSave = 'Profile save unavailable')
        )
        await page.locator('#profile-full-name').fill('Retained draft')
        await save.click()
        await expect(page.getByText('Profile save unavailable', { exact: true })).toBeVisible()
        await expect(page.locator('#profile-full-name')).toHaveValue('Retained draft')
        const preference = page.getByRole('checkbox', { name: 'Receive order update emails' })
        await page.evaluate(() => (window.accountFixture.delay.preferencesSave = true))
        await preference.click()
        await expect(preference).toBeDisabled()
        await expect(preference).toBeChecked()
        await page.evaluate(() => window.accountFixture.release('preferencesSave'))
        await expect(preference).not.toBeChecked()
        await page.evaluate(
          () => (window.accountFixture.failure.preferencesSave = 'Preference save unavailable')
        )
        await preference.click()
        await expect(
          page.locator('section').filter({ has: preference }).getByRole('alert')
        ).toHaveText('Preference save unavailable')
        await expect(preference).not.toBeChecked()
        await expect(preference).toBeEnabled()
        await page.evaluate(() => (window.accountFixture.failure.preferencesSave = null))
        await preference.click()
        await expect(preference).toBeChecked()
      },
      1280,
      true
    ))
  test(`${engine}: address create, edit, default and delete retain feedback and reject duplicate submissions`, () =>
    visit(
      engine,
      '/profile?holdAddresses#addresses',
      async (page) => {
        await expect(page.getByText('No saved addresses yet.', { exact: true })).toHaveCount(0)
        await page.evaluate(() => window.accountFixture.release('addressLoad'))
        const section = page.locator('#addresses')
        await expect(section.getByText('24 Sample Lane', { exact: true })).toBeVisible()
        await section.getByRole('button', { name: 'Add address', exact: true }).click()
        for (const [name, value] of [
          ['Phone number', '9222222222'],
          ['Address line 1', '18 New Lane'],
          ['City', 'Kolkata'],
          ['Pincode', '700039'],
        ])
          await section.getByRole('textbox', { name, exact: true }).fill(value)
        await page.evaluate(() => (window.accountFixture.delay.addressCreate = true))
        const save = section.getByRole('button', { name: 'Save address', exact: true })
        const geometry = await save.boundingBox()
        await save.click()
        await expect(save).toBeDisabled()
        await expect(save).toHaveAttribute('aria-busy', 'true')
        assert.equal((await save.boundingBox()).width, geometry.width)
        assert.equal((await save.boundingBox()).height, geometry.height)
        await page.evaluate(() => window.accountFixture.release('addressCreate'))
        await expect(section.getByText('18 New Lane', { exact: true })).toBeVisible()
        let address = section.locator('.account-address').filter({ hasText: '18 New Lane' })
        await page.evaluate(
          () => (window.accountFixture.failure.addressDefault = 'Default address unavailable')
        )
        await address.getByRole('button', { name: 'Set default', exact: true }).click()
        await expect(page.getByText('Default address unavailable', { exact: true })).toBeVisible()
        await expect(address.getByText('Default', { exact: true })).toHaveCount(0)
        await page.evaluate(() => {
          window.accountFixture.failure.addressDefault = null
          window.accountFixture.delay.addressDefault = true
        })
        await address.getByRole('button', { name: 'Set default', exact: true }).click()
        await expect(
          address.getByRole('button', { name: 'Set default', exact: true })
        ).toBeDisabled()
        await page.evaluate(() => window.accountFixture.release('addressDefault'))
        await expect(address.getByText('Default', { exact: true })).toBeVisible()
        await expect(section.getByText('Default', { exact: true })).toHaveCount(1)
        await address.getByRole('button', { name: 'Edit address', exact: true }).click()
        await section
          .getByRole('textbox', { name: 'Address line 1', exact: true })
          .fill('19 Updated Lane')
        await page.evaluate(
          () => (window.accountFixture.failure.addressEdit = 'Address edit unavailable')
        )
        await save.click()
        await expect(page.getByText('Address edit unavailable', { exact: true })).toBeVisible()
        await expect(
          section.getByRole('textbox', { name: 'Address line 1', exact: true })
        ).toHaveValue('19 Updated Lane')
        await page.evaluate(() => (window.accountFixture.failure.addressEdit = null))
        await save.click()
        address = section.locator('.account-address').filter({ hasText: '19 Updated Lane' })
        await expect(address).toBeVisible()
        await page.evaluate(
          () => (window.accountFixture.failure.addressDelete = 'Address delete unavailable')
        )
        await address.getByRole('button', { name: 'Delete address', exact: true }).click()
        await expect(page.getByText('Address delete unavailable', { exact: true })).toBeVisible()
        await expect(address).toBeVisible()
        await page.evaluate(() => {
          window.accountFixture.failure.addressDelete = null
          window.accountFixture.delay.addressDelete = true
        })
        const remove = address.getByRole('button', { name: 'Delete address', exact: true })
        await remove.click()
        await expect(remove).toBeDisabled()
        await page.evaluate(() => window.accountFixture.release('addressDelete'))
        await expect(address).toHaveCount(0)
        assert.equal(
          await page.evaluate(
            () => window.accountFixture.calls.filter((c) => c.name === 'addressCreate').length
          ),
          1
        )
      },
      390,
      true
    ))
  test(`${engine}: notification load failures retry and account sign-out handles pending and failure`, () =>
    visit(
      engine,
      '/profile?preferencesLoadFailure#personal-info',
      async (page) => {
        const preference = page.getByRole('checkbox', { name: 'Receive order update emails' })
        await expect(preference).toBeDisabled()
        await page.evaluate(() => (window.accountFixture.failure.preferencesLoad = null))
        await page
          .locator('section')
          .filter({ has: preference })
          .getByRole('button', { name: 'Try again', exact: true })
          .click()
        await expect(preference).toBeEnabled()
        const options = page.getByRole('button', { name: 'Sign out', exact: true })
        await page.evaluate(() => {
          window.authFixture.delay.signout = true
          window.authFixture.signout = 'failure'
        })
        const geometry = await options.boundingBox()
        await options.click()
        await expect(options).toBeDisabled()
        assert.equal((await options.boundingBox()).width, geometry.width)
        assert.equal((await options.boundingBox()).height, geometry.height)
        await page.evaluate(() => window.authFixture.release('signout'))
        await expect(page.getByRole('alert')).toHaveText('Sign out unavailable')
        await expect(options).toBeEnabled()
        await expect(options).toBeFocused()
        await page.evaluate(() => (window.authFixture.signout = 'success'))
        await options.click()
        await expect(page.getByRole('dialog', { name: 'Welcome back.' })).toBeVisible()
        assert.equal(await page.evaluate(() => window.authFixture.calls.signout), 2)
      },
      390,
      true
    ))
}

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: tracking keeps owned order visible when carrier data fails and retries`, () =>
    visit(
      engine,
      '/orders/fixture-order/tracking?shipment&trackingFailure',
      async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Track your order', exact: true })
        ).toBeVisible()
        await expect(page.getByText('#MUV-2026-1042', { exact: true })).toBeVisible()
        await expect(page.getByRole('alert')).toContainText('Carrier unavailable')
        await expect(page.getByRole('region', { name: 'Order items', exact: true })).toContainText(
          'Krishna'
        )
        await page.evaluate(() => (window.accountFixture.failure.trackingLoad = null))
        await page.getByRole('button', { name: 'Retry tracking', exact: true }).click()
        await expect(page.getByText('FIXTURE12345', { exact: true })).toBeVisible()
        await expect(page.getByText('Picked up', { exact: true })).toBeVisible()
        await expect(
          page
            .getByRole('navigation', { name: 'Your account', exact: true })
            .getByRole('link', { name: 'My orders' })
        ).toHaveAttribute('aria-current', 'page')
        await page.getByRole('link', { name: 'View order details', exact: true }).click()
        await expect(page).toHaveURL(/\/orders\/fixture-order$/)
        await page.goBack()
        await expect(
          page.getByRole('heading', { name: 'Track your order', exact: true })
        ).toBeVisible()
      },
      1280,
      true
    ))

  test(`${engine}: tracking suppresses obsolete responses and exceptional states never claim delivery`, () =>
    visit(
      engine,
      '/orders/fixture-order/tracking?shipment&holdTracking',
      async (page) => {
        await expect(
          page.getByRole('heading', { name: 'Track your order', exact: true })
        ).toBeVisible()
        await expect(
          page
            .getByRole('region', { name: 'Tracking information', exact: true })
            .getByRole('status')
        ).toContainText('Loading shipment')
        await page.evaluate(() => {
          window.fixture.order = {
            ...window.fixture.order,
            orderNumber: 'MUV-SECOND',
            status: 'delivery_failed',
            awbCode: null,
            courierName: null,
            trackingUrl: null,
            shiprocketStatus: null,
          }
          window.fixture.tracking = {
            shipment_events: [],
            awb_code: null,
            courier_name: null,
            tracking_url: null,
            shiprocket_status: null,
          }
          window.accountFixture.delay.trackingLoad = false
          history.pushState({}, '', '/orders/second-order/tracking')
          dispatchEvent(new PopStateEvent('popstate'))
        })
        await expect(page.getByText('#MUV-SECOND', { exact: true })).toBeVisible()
        await page.evaluate(() => window.accountFixture.release('trackingLoad'))
        await expect(
          page.getByRole('region', { name: 'Delivery progress', exact: true })
        ).toHaveCount(0)
        await expect(page.getByRole('alert')).toContainText('Delivery failed')
        await expect(page.getByText('FIXTURE12345', { exact: true })).toHaveCount(0)
        await expect(page.getByText('Picked up', { exact: true })).toHaveCount(0)
      },
      390,
      true
    ))
}

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: tracking progress follows every real order status and hides unavailable owned data`, () =>
    visit(
      engine,
      '/orders/fixture-order/tracking',
      async (page) => {
        for (const [status, current] of [
          ['pending', 'Placed'],
          ['confirmed', 'Placed'],
          ['processing', 'Preparing'],
          ['shipped', 'Shipped'],
          ['out_for_delivery', 'Out for delivery'],
          ['delivered', 'Delivered'],
          ['cancelled', null],
          ['rto', null],
          ['returned', null],
          ['refunded', null],
          ['lost', null],
          ['damaged', null],
          ['delivery_failed', null],
        ]) {
          await page.evaluate((status) => {
            window.fixture.order = { ...window.fixture.order, status }
            history.pushState({}, '', `/orders/status-${status}/tracking`)
            dispatchEvent(new PopStateEvent('popstate'))
          }, status)
          if (current)
            await expect(
              page
                .getByRole('region', { name: 'Delivery progress', exact: true })
                .locator('[aria-current="step"]')
            ).toContainText(current)
          else {
            await expect(
              page.getByRole('region', { name: 'Delivery progress', exact: true })
            ).toHaveCount(0)
            await expect(page.getByRole('alert')).toBeVisible()
          }
        }
        await page.evaluate(() => {
          window.accountFixture.failure.orderDetail = 'Order unavailable'
          history.pushState({}, '', '/orders/not-owned/tracking')
          dispatchEvent(new PopStateEvent('popstate'))
        })
        await expect(page.getByRole('alert')).toHaveText('Order unavailable')
        await expect(page.getByRole('region', { name: 'Order items', exact: true })).toHaveCount(0)
        await page.evaluate(() => (window.accountFixture.failure.orderDetail = null))
        await page.getByRole('button', { name: 'Try again', exact: true }).click()
        await expect(page.getByRole('region', { name: 'Order items', exact: true })).toBeVisible()
      },
      390,
      true
    ))
}
