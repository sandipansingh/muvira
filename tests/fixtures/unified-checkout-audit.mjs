import { chromium, webkit, expect } from 'playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startEditorialServer } from './editorial-server.mjs'

const output = resolve('responsive-audit/redesign/unified-checkout')
await mkdir(output, { recursive: true })
const fixture = await startEditorialServer()
const results = []
try {
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    const browser = await launcher.launch()
    try {
      for (const [width, height] of [
        [320, 568],
        [390, 844],
        [768, 1024],
        [1280, 720],
        [1440, 900],
        [390, 500],
      ]) {
        for (const scale of [1, 2]) {
          const page = await browser.newPage({
            viewport: { width, height },
            reducedMotion: 'reduce',
          })
          page.setDefaultTimeout(6000)
          const result = { engine, width, height, scale, errors: [] }
          results.push(result)
          page.on('pageerror', (error) => result.errors.push(error.message))
          await page.addInitScript(() => {
            window.Razorpay = class {
              constructor() {
                this.events = {}
              }
              on(name, callback) {
                this.events[name] = callback
              }
              once(_name, callback) {
                setTimeout(
                  () =>
                    callback({
                      methods: {
                        upi: true,
                        card: true,
                        card_networks: { VISA: 1, MC: 1 },
                        netbanking: { HDFC: 'HDFC Bank' },
                        wallet: { payzapp: true },
                      },
                    }),
                  0
                )
              }
            }
          })
          await page.route('**/*', (route) =>
            new URL(route.request().url()).origin === fixture.origin
              ? route.continue()
              : route.request().resourceType() === 'image'
                ? route.fulfill({ path: 'client/public/images/editorial/stone-alcove.png' })
                : route.abort()
          )
          try {
            await page.goto(fixture.origin + '/checkout')
            await page.getByRole('radio', { name: /Credit or debit card/ }).check()
            await page.evaluate(async (scale) => {
              await document.fonts.ready
              document.documentElement.style.fontSize = `${16 * scale}px`
            }, scale)
            await expect(page.locator('.checkout-bag-item__price')).toHaveText('₹499')
            await page.evaluate(() => {
              document.activeElement?.blur()
              scrollTo(0, 0)
            })
            await page.screenshot({
              path: resolve(output, `${engine}-${width}x${height}-text${scale}.png`),
              fullPage: true,
            })
            result.findings = await page.evaluate(() => ({
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
              headings: document.querySelectorAll('h1').length,
              fixedActions: [...document.querySelectorAll('.checkout-action-bar')].some((el) =>
                ['fixed', 'sticky'].includes(getComputedStyle(el).position)
              ),
              smallFields: [...document.querySelectorAll('input,textarea')].filter(
                (el) =>
                  !['radio', 'checkbox'].includes(el.type) &&
                  parseFloat(getComputedStyle(el).fontSize) < 16
              ).length,
              equalColumns:
                innerWidth < 1024 ||
                Math.abs(
                  document.querySelector('.checkout-left').getBoundingClientRect().width -
                    document.querySelector('.checkout-right').getBoundingClientRect().width
                ) < 1,
              photo: document.querySelector('.checkout-bag-item__image').getBoundingClientRect()
                .width,
            }))
            await page
              .getByRole('link', { name: 'Continue shopping', exact: true })
              .scrollIntoViewIfNeeded()
            await expect(
              page.getByRole('link', { name: 'Continue shopping', exact: true })
            ).toBeInViewport()
            const select = page.getByRole('button', { name: 'Select a delivery address' })
            await select.click()
            await expect(page.getByRole('menu')).toBeVisible()
            await page.keyboard.press('Escape')
            await expect(select).toBeFocused()
            await page.getByRole('radio', { name: 'Netbanking', exact: true }).check()
            await page.getByRole('button', { name: 'Choose your bank', exact: true }).click()
            await expect(
              page.getByRole('menuitem', { name: 'HDFC Bank', exact: true })
            ).toBeInViewport()
            await page.screenshot({
              path: resolve(output, `${engine}-${width}x${height}-text${scale}-dropdown.png`),
              fullPage: true,
            })
            await page.keyboard.press('Escape')
            result.actionsReachable = true
          } catch (error) {
            result.error = error.message
          } finally {
            await page.close()
          }
        }
      }
    } finally {
      await browser.close()
    }
  }
} finally {
  await fixture.server.close()
}
await writeFile(
  resolve(output, 'findings.json'),
  JSON.stringify(
    { reference: 'design-references/Checkout page of an e-commerce website.jpg', results },
    null,
    2
  )
)
const failures = results.filter(
  (result) =>
    result.error ||
    result.errors.length ||
    result.findings?.overflow ||
    result.findings?.fixedActions ||
    result.findings?.smallFields ||
    !result.findings?.equalColumns ||
    result.findings?.photo !== 64
)
console.log(JSON.stringify({ cases: results.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
