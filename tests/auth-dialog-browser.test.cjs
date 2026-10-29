const assert = require('node:assert/strict')
const { before, after, test } = require('node:test')
const { chromium, expect } = require('playwright/test')
let browser, fixture
before(async () => {
  const { startEditorialServer } = await import('./fixtures/editorial-server.mjs')
  fixture = await startEditorialServer({ defaultRole: 'guest', realAuth: true })
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
  await fixture?.server.close()
})
async function visit(path, run, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ...options })
  page.setDefaultTimeout(7000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', (route) => {
    if (new URL(route.request().url()).origin === fixture.origin) return route.continue()
    if (route.request().resourceType() === 'image')
      return route.fulfill({
        path: 'client/public/images/editorial/stone-alcove.png',
        contentType: 'image/png',
      })
    return route.abort()
  })
  try {
    await page.goto(fixture.origin + path)
    await page.waitForFunction(() => window.fixtureReady && window.authFixture)
    await page.locator('.store-header').waitFor()
    await run(page)
    assert.deepEqual(errors, [])
  } finally {
    await page.close()
  }
}
const dialog = (page) =>
  page.getByRole('dialog').filter({ has: page.locator('[data-auth-dialog]') })

test('auth navigation state survives a StrictMode reload of its background entry', () =>
  visit('/signin', async (page) => {
    await expect(dialog(page)).toBeVisible()
    await page.reload()
    await expect(dialog(page)).toBeVisible()
  }))

test('completed password recovery opens sign in and restores its persistent recovery action', () =>
  visit('/shop', async (page) => {
    await page.evaluate(() => sessionStorage.setItem('auth-fixture-session', '1'))
    await page.goto(fixture.origin + '/reset-password')
    await page.getByLabel('New password', { exact: true }).fill('updated-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('updated-password')
    await page.getByRole('button', { name: 'Update password', exact: true }).click()
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Return to sign in' })).toBeFocused()
  }))
async function open(page) {
  await page.locator('header').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(dialog(page)).toBeVisible()
}
async function credentials(page) {
  await dialog(page).getByLabel('Email address').fill('aarohi@example.test')
  await dialog(page).getByLabel('Password', { exact: true }).fill('password123')
  await dialog(page).getByRole('button', { name: 'Sign in', exact: true }).click()
}
test('header popup preserves URL, scroll and cart, traps focus and restores its trigger', () =>
  visit('/shop?sort=newest#results', async (page) => {
    await page.evaluate(() => scrollTo(0, 450))
    const before = await page.evaluate(() => ({
      url: location.href,
      y: scrollY,
      bag: document.querySelector('.header-cart-count').textContent,
    }))
    await open(page)
    await page.keyboard.press('Shift+Tab')
    assert.equal(await dialog(page).evaluate((el) => el.contains(document.activeElement)), true)
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    assert.deepEqual(
      await page.evaluate(() => ({
        url: location.href,
        y: scrollY,
        bag: document.querySelector('.header-cart-count').textContent,
      })),
      before
    )
    await expect(
      page.locator('header').getByRole('button', { name: 'Sign in', exact: true })
    ).toBeFocused()
  }))
test('sign in failures remain recoverable and success stays on the shopping page', () =>
  visit('/shop?category=brass', async (page) => {
    await open(page)
    await page.evaluate(() => {
      window.authFixture.credentials = 'failure'
    })
    await credentials(page)
    await expect(dialog(page).getByRole('alert')).toBeVisible()
    await page.evaluate(() => {
      window.authFixture.credentials = 'success'
    })
    await credentials(page)
    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(fixture.origin + '/shop?category=brass')
  }))
test('profile loading gates checkout and profile failure supports retry', () =>
  visit('/checkout?step=shipping#address', async (page) => {
    await expect(page).toHaveURL(fixture.origin + '/cart')
    await page.evaluate(() => {
      window.authFixture.delay.profile = true
    })
    await credentials(page)
    await expect(dialog(page).getByRole('status')).toContainText('Loading your account')
    assert.equal(await page.getByText('Shipping address', { exact: true }).count(), 0)
    await page.evaluate(() => {
      window.authFixture.profile = 'failure'
      window.authFixture.release('profile')
    })
    await expect(dialog(page).getByText('Account profile unavailable')).toBeVisible()
    await page.evaluate(() => {
      window.authFixture.profile = 'success'
    })
    await dialog(page).getByRole('button', { name: 'Retry loading account' }).click()
    await expect(page).toHaveURL(fixture.origin + '/checkout?step=shipping#address')
  }))
test('profile failure can sign out and return to the email form', () =>
  visit('/shop', async (page) => {
    await open(page)
    await page.evaluate(() => {
      window.authFixture.profile = 'failure'
    })
    await credentials(page)
    await dialog(page).getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(dialog(page).getByLabel('Email address')).toHaveValue('aarohi@example.test')
    await expect(dialog(page).getByLabel('Password', { exact: true })).toHaveValue('')
  }))

test('profile sign-out failure remains recoverable without claiming the session ended', () =>
  visit('/shop', async (page) => {
    await open(page)
    await page.evaluate(() => {
      window.authFixture.profile = 'failure'
      window.authFixture.signout = 'failure'
    })
    await credentials(page)
    await dialog(page).getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(
      dialog(page).getByText('Your account could not be updated. Please try again.', {
        exact: true,
      })
    ).toBeVisible()
    await expect(
      dialog(page).getByText('Account profile unavailable', { exact: true })
    ).toBeVisible()
    await page.evaluate(() => {
      window.authFixture.signout = 'success'
    })
    await dialog(page).getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(dialog(page).getByLabel('Password', { exact: true })).toBeVisible()
    assert.equal(await page.evaluate(() => sessionStorage.getItem('auth-fixture-session')), null)
  }))
test('form switching preserves email, clears passwords and signup confirmation stays in the popup', () =>
  visit('/shop', async (page) => {
    await open(page)
    await dialog(page).getByLabel('Email address').fill('new@example.test')
    await dialog(page).getByLabel('Password', { exact: true }).fill('discard-me')
    await dialog(page).getByRole('button', { name: 'Sign up', exact: true }).click()
    await expect(dialog(page).getByLabel('Email address')).toHaveValue('new@example.test')
    await expect(dialog(page).getByLabel('Password', { exact: true })).toHaveValue('')
    await dialog(page).getByLabel('Full name').fill('New Shopper')
    await dialog(page).getByLabel('Password', { exact: true }).fill('password123')
    await dialog(page).getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(
      dialog(page).getByRole('heading', { name: 'Check your email', exact: true })
    ).toBeVisible()
    assert.equal(
      await page.locator('header').getByRole('button', { name: 'Sign in', exact: true }).count(),
      1
    )
    await expect(page).toHaveURL(fixture.origin + '/shop')
  }))
test('recovery errors retry inside the same popup with the entered email', () =>
  visit('/shop', async (page) => {
    await open(page)
    await dialog(page).getByLabel('Email address').fill('reset@example.test')
    await dialog(page).getByRole('button', { name: 'Forgot password?' }).click()
    await expect(dialog(page).getByLabel('Email address')).toHaveValue('reset@example.test')
    await page.evaluate(() => {
      window.authFixture.recovery = 'failure'
    })
    await dialog(page).getByRole('button', { name: 'Send reset link' }).click()
    await expect(dialog(page).getByRole('alert')).toContainText('Reset email unavailable')
    await page.evaluate(() => {
      window.authFixture.recovery = 'success'
    })
    await dialog(page).getByRole('button', { name: 'Send reset link' }).click()
    await expect(dialog(page).getByRole('heading', { name: 'Check your email' })).toBeVisible()
    assert.equal(
      await page.evaluate(() => window.authFixture.reset.options.redirectTo),
      fixture.origin + '/reset-password'
    )
    await dialog(page).getByRole('button', { name: 'Back to sign in' }).click()
    await expect(dialog(page).getByLabel('Email address')).toHaveValue('reset@example.test')
  }))
for (const phase of ['credentials', 'profile'])
  test(`dismissal during ${phase} ignores stale completion`, () =>
    visit('/checkout', async (page) => {
      await page.evaluate((phase) => {
        window.authFixture.delay[phase] = true
      }, phase)
      await credentials(page)
      await page.waitForFunction((phase) => window.authFixture.pending[phase]?.length, phase)
      await page.keyboard.press('Escape')
      await page.evaluate((phase) => window.authFixture.release(phase), phase)
      await page.waitForFunction(() => window.authFixture.calls.profile)
      await expect(page.locator('header').getByText('Account', { exact: true })).toBeVisible()
      await expect(page).toHaveURL(fixture.origin + '/cart')
      await expect(dialog(page)).toHaveCount(0)
    }))
for (const path of ['/signin', '/login', '/signup'])
  test(`legacy ${path} replaces with home and opens its popup`, () =>
    visit(path, async (page) => {
      await expect(page).toHaveURL(fixture.origin + '/')
      await expect(dialog(page).getByLabel('Email address')).toBeVisible()
      assert.equal(await dialog(page).getByLabel('Full name').count(), path === '/signup' ? 1 : 0)
    }))
for (const destination of [
  '/orders?status=paid#recent',
  '/orders/fixture-order/tracking',
  '/profile#saved-addresses',
  '/admin/orders?status=pending#latest',
])
  test(`protected ${destination} authenticates over home without mounting protected content`, () =>
    visit(destination, async (page) => {
      await expect(page).toHaveURL(fixture.origin + '/')
      await expect(dialog(page)).toBeVisible()
      if (destination.startsWith('/admin'))
        await page.evaluate(() => {
          window.authFixture.role = 'admin'
        })
      await credentials(page)
      await expect(page).toHaveURL(fixture.origin + destination)
    }))
for (const unsafe of [
  'https://evil.test',
  '//evil.test',
  '/signin?returnTo=/checkout',
  '/%5cevil.test',
  '/shop/../login',
])
  test(`rejects unsafe return destination ${unsafe}`, () =>
    visit('/signin?returnTo=' + encodeURIComponent(unsafe), async (page) => {
      await credentials(page)
      await expect(dialog(page)).toHaveCount(0)
      await expect(page).toHaveURL(fixture.origin + '/')
    }))
test('footer account link requests authentication on the current page and continues to account', () =>
  visit('/shop?sort=newest', async (page) => {
    await page
      .getByRole('navigation', { name: 'Footer account' })
      .getByRole('link', { name: 'My account', exact: true })
      .click()
    await expect(page).toHaveURL(fixture.origin + '/shop?sort=newest')
    await credentials(page)
    await expect(page).toHaveURL(fixture.origin + '/profile')
  }))
test('mobile menu closes before authentication and restores the menu control on dismissal', () =>
  visit(
    '/shop',
    async (page) => {
      await page.getByRole('button', { name: 'Open navigation menu' }).click()
      await page
        .getByRole('dialog', { name: 'Main menu' })
        .getByRole('link', { name: 'Sign in', exact: true })
        .click()
      await expect(page.getByRole('dialog', { name: 'Main menu' })).toHaveCount(0)
      await expect(dialog(page)).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeFocused()
    },
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
  ))
test('drawer checkout preserves the page and restores the persistent bag control', () =>
  visit('/shop', async (page) => {
    await page.getByRole('button', { name: 'Shopping cart', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Shopping cart' })
      .getByRole('button', { name: 'Proceed to Checkout' })
      .click()
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toHaveCount(0)
    await expect(page).toHaveURL(fixture.origin + '/shop')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Shopping cart', exact: true })).toBeFocused()
  }))

test('Buy now confirms the selected quantity once before authenticating', () =>
  visit('/product/fixture?slowAdd=1', async (page) => {
    await page.getByRole('button', { name: 'Increase quantity', exact: true }).click()
    const buy = page.getByRole('button', { name: 'Buy Now', exact: true }).first()
    await buy.click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(dialog(page)).toBeVisible()
    assert.deepEqual(await page.evaluate(() => window.fixture.cartAdds), [2])
    await expect(page.locator('.header-cart-count')).toHaveText('3')
    await credentials(page)
    await expect(page).toHaveURL(fixture.origin + '/checkout')
    assert.deepEqual(await page.evaluate(() => window.fixture.cartAdds), [2])
  }))

test('failed Buy now addition keeps authentication closed', () =>
  visit('/product/fixture?addFailure=1', async (page) => {
    await page.getByRole('button', { name: 'Buy Now', exact: true }).first().click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(fixture.origin + '/product/fixture?addFailure=1')
  }))

for (const delayedProfile of [false, true])
  test(`Buy now continues with authentication completed during its pending addition (delayed profile: ${delayedProfile})`, () =>
    visit('/product/fixture?gatedAdd=1', async (page) => {
      await page.getByRole('button', { name: 'Buy Now', exact: true }).first().click()
      await page.waitForFunction(() => window.fixture.resolveCartAdd)
      await open(page)
      if (delayedProfile)
        await page.evaluate(() => {
          window.authFixture.delay.profile = true
        })
      await credentials(page)
      if (delayedProfile)
        await expect(dialog(page).getByRole('status')).toContainText('Loading your account')
      else
        await expect(
          page.locator('header').getByRole('link', { name: 'My account', exact: true })
        ).toBeVisible()
      await page.evaluate(() => window.fixture.resolveCartAdd())
      await page.waitForFunction(() => window.fixture.cartAdds?.length === 1)
      if (delayedProfile) {
        await expect(dialog(page).getByRole('status')).toContainText('Loading your account')
        await page.evaluate(() => window.authFixture.release('profile'))
      }
      await expect(page).toHaveURL(fixture.origin + '/checkout')
      await expect(dialog(page)).toHaveCount(0)
      assert.deepEqual(await page.evaluate(() => window.fixture.cartAdds), [1])
    }))

test('cart checkout opens over the cart and retains its shipping step', () =>
  visit('/cart', async (page) => {
    await page.getByRole('button', { name: 'Proceed to Checkout', exact: true }).click()
    await expect(page).toHaveURL(fixture.origin + '/cart')
    await credentials(page)
    await expect(page).toHaveURL(fixture.origin + '/checkout?step=shipping')
  }))

test('closing and reopening clears passwords and does not consume an earlier pending submission', () =>
  visit('/shop', async (page) => {
    await open(page)
    await page.evaluate(() => {
      window.authFixture.delay.credentials = true
    })
    await credentials(page)
    await page.keyboard.press('Escape')
    await open(page)
    await expect(dialog(page).getByLabel('Password', { exact: true })).toHaveValue('')
    await page.evaluate(() => window.authFixture.release('credentials'))
    await expect(page.locator('header').getByText('Account', { exact: true })).toBeVisible()
    await expect(dialog(page)).toBeVisible()
  }))

test('close button and backdrop dismiss and ordinary browser navigation closes authentication', () =>
  visit('/', async (page) => {
    await page
      .getByRole('navigation', { name: 'Footer catalog' })
      .getByRole('link', { name: 'All products', exact: true })
      .click()
    await page.locator('.catalog-page').waitFor()
    await open(page)
    await dialog(page).getByRole('button', { name: 'Close dialog', exact: true }).last().click()
    await expect(dialog(page)).toHaveCount(0)
    await open(page)
    await dialog(page)
      .getByRole('button', { name: 'Close dialog', exact: true })
      .first()
      .click({ position: { x: 5, y: 5 } })
    await expect(dialog(page)).toHaveCount(0)
    await open(page)
    await page.goBack()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(fixture.origin + '/')
  }))

test('authenticated legacy visitors continue without a popup and customers cannot mount admin', () =>
  visit('/shop', async (page) => {
    await open(page)
    await credentials(page)
    await expect(dialog(page)).toHaveCount(0)
    await page.goto(fixture.origin + '/signup?returnTo=' + encodeURIComponent('/profile#addresses'))
    await expect(page).toHaveURL(fixture.origin + '/profile#addresses')
    await expect(dialog(page)).toHaveCount(0)
    await page.goto(fixture.origin + '/admin')
    await expect(page).toHaveURL(fixture.origin + '/')
    await expect(page.getByText('Operations overview', { exact: true })).toHaveCount(0)
  }))

test('native collection hash navigation and browser Back close authentication', () =>
  visit('/categories', async (page) => {
    await page
      .getByRole('navigation', { name: 'Jump to a collection' })
      .getByRole('link')
      .last()
      .click()
    await expect(page).toHaveURL(/#collection-/)
    await open(page)
    await page.goBack()
    await expect(page).toHaveURL(fixture.origin + '/categories')
    await expect(dialog(page)).toHaveCount(0)
  }))

test('popup fields and targets remain reachable with mobile keyboard, enlarged text and reduced motion', () =>
  visit(
    '/signup',
    async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px'
      })
      const popup = dialog(page)
      const title = popup.getByRole('heading', { name: 'Create an account', exact: true })
      assert.ok(
        (await title.boundingBox()).height < 180,
        'Enlarged title must remain readable without letter-by-letter wrapping'
      )
      assert.equal(
        await popup
          .locator('.overlay-panel')
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        true
      )
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab')
        assert.equal(await popup.evaluate((el) => el.contains(document.activeElement)), true)
      }
      assert.deepEqual(
        await popup
          .locator('input')
          .evaluateAll((inputs) =>
            inputs.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id)
          ),
        []
      )
      assert.deepEqual(
        await popup.locator('button:not(.fixed)').evaluateAll((buttons) =>
          buttons
            .filter((el) => {
              const r = el.getBoundingClientRect()
              return r.width < 44 || r.height < 44
            })
            .map((el) => el.textContent)
        ),
        []
      )
      assert.equal(await popup.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true)
      await popup
        .getByRole('button', { name: 'Create account', exact: true })
        .scrollIntoViewIfNeeded()
      await page.keyboard.press('Escape')
      await expect(popup).toHaveCount(0)
    },
    { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }
  ))
