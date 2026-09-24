import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseUrl = process.env.RESPONSIVE_BASE_URL || 'http://localhost:5173'
const output = resolve('responsive-audit', process.argv.includes('--after') ? 'after' : 'before')
const sample = process.argv.includes('--sample')
const overlays = process.argv.includes('--overlays')
const dprOnly = process.argv.includes('--dpr-only')
const textOnly = process.argv.includes('--text-only')
const cartOnly = process.argv.includes('--cart-only')
const apiCache = new Map()

const viewports = [
  ...[
    [320, 568],
    [360, 640],
    [375, 667],
    [390, 844],
    [393, 852],
    [412, 915],
    [430, 932],
    [667, 375],
    [844, 390],
    [915, 412],
  ].map(([width, height]) => ({ width, height, touch: true, dpr: 3, label: 'phone' })),
  ...[
    [768, 1024],
    [1024, 768],
    [820, 1180],
    [1180, 820],
    [1024, 1366],
    [1366, 1024],
  ].map(([width, height]) => ({ width, height, touch: true, dpr: 2, label: 'tablet' })),
  ...[
    [1024, 768],
    [1280, 720],
    [1366, 768],
    [1440, 900],
    [1536, 864],
    [1920, 1080],
    [2560, 1440],
    [1097, 617],
    [960, 540],
    [1093, 614],
    [911, 512],
    [320, 800],
  ].map(([width, height]) => ({ width, height, touch: false, dpr: 1, label: 'desktop' })),
  ...[1, 1.5, 2, 3].map((dpr) => ({
    width: 390,
    height: 844,
    touch: true,
    dpr,
    label: 'image-dpr',
  })),
  ...[
    [320, 568],
    [960, 540],
    [1280, 720],
  ].map(([width, height]) => ({
    width,
    height,
    touch: false,
    dpr: 1,
    label: 'text-200',
    textScale: 2,
  })),
]

async function getRoutes() {
  const [productsResponse, categoriesResponse] = await Promise.all([
    fetch(`${baseUrl}/api/products?limit=12`),
    fetch(`${baseUrl}/api/categories`),
  ])
  const products = productsResponse.ok ? (await productsResponse.json()).data || [] : []
  const categories = categoriesResponse.ok ? (await categoriesResponse.json()).data || [] : []
  const slug =
    products.find((product) => product.slug && product.stock > 0)?.slug || 'audit-missing-product'
  const category = categories.find((item) => item.slug)?.slug || 'audit-missing-category'

  return [
    { name: 'home', path: '/' },
    { name: 'shop', path: '/shop' },
    { name: 'shop-category', path: `/shop?category=${encodeURIComponent(category)}` },
    { name: 'categories', path: '/categories' },
    { name: 'category-redirect', path: `/category/${encodeURIComponent(category)}` },
    { name: 'categories-redirect', path: `/categories/${encodeURIComponent(category)}` },
    { name: 'search', path: '/search?q=wood' },
    { name: 'product', path: `/product/${encodeURIComponent(slug)}` },
    { name: 'cart', path: '/cart' },
    { name: 'cart-populated', path: '/cart', setupPath: `/product/${encodeURIComponent(slug)}` },
    { name: 'signin', path: '/signin' },
    { name: 'signup', path: '/signup' },
    { name: 'reset-password', path: '/reset-password' },
    { name: 'login-redirect', path: '/login' },
    { name: 'checkout-guest', path: '/checkout' },
    { name: 'orders-guest', path: '/orders' },
    { name: 'order-detail-guest', path: '/orders/audit-order' },
    { name: 'order-success-guest', path: '/orders/success?orderId=audit-order' },
    { name: 'order-failure-guest', path: '/orders/failure' },
    { name: 'profile-guest', path: '/profile' },
    { name: 'not-found', path: '/responsive-audit-not-found' },
  ]
}

function inspectPage({ touch, dpr }) {
  const width = document.documentElement.clientWidth
  const height = document.documentElement.clientHeight
  const sample = (element) => ({
    selector: getSelector(element),
    text: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 70),
  })
  function getSelector(element) {
    const classes = [...element.classList]
      .filter((item) => /^[a-z][a-z0-9-]*$/i.test(item))
      .slice(0, 2)
    return `${element.tagName.toLowerCase()}${classes.map((item) => `.${item}`).join('')}`
  }
  function visible(element) {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    )
  }
  function clippedByAncestor(element) {
    let ancestor = element.parentElement
    while (ancestor && ancestor !== document.body) {
      const style = getComputedStyle(ancestor)
      if (/hidden|auto|scroll|clip/.test(`${style.overflowX} ${style.overflowY}`)) {
        const box = ancestor.getBoundingClientRect()
        if (box.left >= -1 && box.right <= width + 1) return true
      }
      ancestor = ancestor.parentElement
    }
    return false
  }

  const elements = [...document.body.querySelectorAll('*')].filter(visible)
  const outOfViewport = elements
    .filter((element) => {
      const rect = element.getBoundingClientRect()
      return (rect.left < -1 || rect.right > width + 1) && !clippedByAncestor(element)
    })
    .slice(0, 40)
    .map((element) => ({
      ...sample(element),
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
    }))

  const interactive = touch
    ? elements.filter((element) =>
        element.matches(
          'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="checkbox"]'
        )
      )
    : []
  const smallTargets = interactive
    .filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.width < 43.5 || rect.height < 43.5
    })
    .slice(0, 60)
    .map((element) => ({
      ...sample(element),
      width: Math.round(element.getBoundingClientRect().width),
      height: Math.round(element.getBoundingClientRect().height),
    }))

  const smallText = elements
    .filter(
      (element) =>
        element.matches('p, li, label, input:not([type="hidden"]), textarea, select') &&
        Number.parseFloat(getComputedStyle(element).fontSize) < 14
    )
    .slice(0, 40)
    .map((element) => ({ ...sample(element), fontSize: getComputedStyle(element).fontSize }))

  const clippedContent = elements
    .filter((element) => element.matches('button, a[href], input:not([type="hidden"]), h1, h2, h3'))
    .filter((element) => {
      const rect = element.getBoundingClientRect()
      let ancestor = element.parentElement
      while (ancestor) {
        const style = getComputedStyle(ancestor)
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          ancestor.scrollHeight > ancestor.clientHeight + 1
        )
          return false
        if (style.overflowY === 'hidden' || style.overflowY === 'clip') {
          const box = ancestor.getBoundingClientRect()
          if (rect.top >= box.bottom + 1 || rect.bottom > box.bottom + 8) return true
        }
        ancestor = ancestor.parentElement
      }
      return false
    })
    .slice(0, 40)
    .map(sample)

  const imageRisks = [...document.images]
    .filter(visible)
    .filter((image) => {
      if (image.hasAttribute('width') && image.hasAttribute('height')) return false
      if (getComputedStyle(image).aspectRatio !== 'auto') return false
      let parent = image.parentElement
      for (let depth = 0; parent && depth < 3; depth += 1, parent = parent.parentElement) {
        if (getComputedStyle(parent).aspectRatio !== 'auto') return false
      }
      return true
    })
    .slice(0, 40)
    .map((image) => ({ ...sample(image), src: image.currentSrc.slice(0, 140) }))
  const imageResolutionRisks = [...document.images]
    .filter(visible)
    .filter((image) => {
      const rect = image.getBoundingClientRect()
      return (
        image.naturalWidth > 0 &&
        image.naturalHeight > 0 &&
        (image.naturalWidth < rect.width * dpr * 0.9 ||
          image.naturalHeight < rect.height * dpr * 0.9)
      )
    })
    .slice(0, 40)
    .map((image) => ({
      ...sample(image),
      source: `${image.naturalWidth}x${image.naturalHeight}`,
      rendered: `${Math.round(image.getBoundingClientRect().width)}x${Math.round(image.getBoundingClientRect().height)}`,
    }))

  const floating = elements.filter(
    (element) =>
      ['fixed', 'sticky'].includes(getComputedStyle(element).position) &&
      element.getBoundingClientRect().top < height &&
      element.getBoundingClientRect().bottom > 0
  )
  const floatingOverlaps = []
  for (let index = 0; index < floating.length; index += 1) {
    for (let second = index + 1; second < floating.length; second += 1) {
      const a = floating[index]
      const b = floating[second]
      if (a.contains(b) || b.contains(a)) continue
      const x =
        Math.min(a.getBoundingClientRect().right, b.getBoundingClientRect().right) -
        Math.max(a.getBoundingClientRect().left, b.getBoundingClientRect().left)
      const y =
        Math.min(a.getBoundingClientRect().bottom, b.getBoundingClientRect().bottom) -
        Math.max(a.getBoundingClientRect().top, b.getBoundingClientRect().top)
      if (x > 8 && y > 8)
        floatingOverlaps.push({
          first: sample(a),
          second: sample(b),
          width: Math.round(x),
          height: Math.round(y),
        })
    }
  }

  return {
    width,
    height,
    heading: document.querySelector('main h1')?.textContent?.trim().slice(0, 120) || null,
    productCardCount: document.querySelectorAll('.product-card').length,
    scrollWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > width + 1,
    outOfViewport,
    smallTargets,
    smallText,
    clippedContent,
    floatingOverlaps: floatingOverlaps.slice(0, 25),
    imageRisks,
    imageResolutionRisks,
    imageCount: document.images.length,
  }
}

async function auditRoute(browser, viewport, route) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    hasTouch: viewport.touch,
    isMobile: viewport.label === 'phone' || viewport.label === 'image-dpr',
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    if (
      request.method() !== 'GET' ||
      request.headers().authorization ||
      !new URL(request.url()).pathname.startsWith('/api/')
    ) {
      await route.continue()
      return
    }
    const key = request.url()
    if (!apiCache.has(key)) {
      apiCache.set(
        key,
        fetch(key).then(async (response) => ({
          status: response.status,
          contentType: response.headers.get('content-type') || 'application/json',
          body: Buffer.from(await response.arrayBuffer()),
        }))
      )
    }
    const cached = await apiCache.get(key)
    if (!page.isClosed()) {
      await route.fulfill({
        status: cached.status,
        contentType: cached.contentType,
        body: cached.body,
      })
    }
  })
  const consoleMessages = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push({ type: message.type(), text: message.text().slice(0, 300) })
    }
  })
  page.on('pageerror', (error) =>
    consoleMessages.push({ type: 'pageerror', text: error.message.slice(0, 300) })
  )
  let navigationError
  try {
    if (route.setupPath) {
      await page.goto(new URL(route.setupPath, baseUrl).href, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      })
      await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 10000 })
      await page.getByRole('button', { name: 'Add to Cart', exact: true }).first().click()
      await page.waitForFunction(() => !!localStorage.getItem('muvira_guest_cart_v1'))
    }
    await page.goto(new URL(route.path, baseUrl).href, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })
    await page.waitForTimeout(600)
    if (route.name === 'product') {
      await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 10000 })
    }
    await page.evaluate(() =>
      Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, 1500))])
    )
    if (viewport.textScale)
      await page.addStyleTag({
        content: `html { font-size: ${16 * viewport.textScale}px !important; }`,
      })
    await page.evaluate(() => {
      for (const image of document.images) image.loading = 'eager'
    })
    await page.evaluate(() =>
      Promise.race([
        Promise.allSettled([...document.images].map((image) => image.decode())),
        new Promise((done) => setTimeout(done, 1500)),
      ])
    )
    if (route.action === 'menu')
      await page.getByRole('button', { name: 'Open navigation menu' }).click()
    if (route.action === 'cart-drawer')
      await page.getByRole('button', { name: 'Shopping cart' }).click()
    if (route.action === 'header-search')
      await page.getByRole('button', { name: 'Search products' }).click()
    if (route.action === 'filters') await page.getByRole('button', { name: 'Filter' }).click()
    if (route.action === 'quick-view') {
      await page.locator('.product-card').first().waitFor({ state: 'visible', timeout: 10000 })
      await page.locator('.product-card').first().hover()
      await page
        .getByRole('button', { name: /^Quick view/ })
        .first()
        .click()
    }
    if (route.action === 'forgot-password')
      await page.getByRole('button', { name: 'Forgot Password?' }).click()
    if (route.action) await page.waitForTimeout(300)
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error)
  }

  let findings = null
  let screenshot = null
  if (!navigationError) {
    findings = await page.evaluate(inspectPage, { touch: viewport.touch, dpr: viewport.dpr })
    const suffix = `${viewport.width}x${viewport.height}-${viewport.label}-dpr${viewport.dpr}${viewport.textScale ? '-text200' : ''}`
    screenshot = `${route.name}__${suffix}.jpg`
    try {
      await page.screenshot({
        path: resolve(output, screenshot),
        type: 'jpeg',
        quality: 65,
        fullPage: true,
        timeout: 20000,
      })
    } catch (error) {
      navigationError = `Screenshot: ${error instanceof Error ? error.message : String(error)}`
      screenshot = null
    }
  }
  const result = {
    route: route.name,
    path: route.path,
    actualPath: new URL(page.url()).pathname,
    viewport,
    screenshot,
    navigationError,
    consoleMessages: [
      ...new Map(consoleMessages.map((item) => [`${item.type}:${item.text}`, item])).values(),
    ].slice(0, 20),
    findings,
  }
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await context.close()
  return result
}

await mkdir(output, { recursive: true })
const routes = await getRoutes()
const cases = overlays
  ? []
  : sample
    ? viewports.filter((item) => item.width === 320 && item.height === 568).slice(0, 1)
    : dprOnly
      ? viewports.filter((item) => item.label === 'image-dpr')
      : textOnly
        ? viewports.filter((item) => item.label === 'text-200')
        : viewports
const testedRoutes = cartOnly
  ? routes.filter((item) => item.name === 'cart-populated')
  : sample || dprOnly
    ? routes.filter((item) => ['home', 'shop', 'product', 'signin'].includes(item.name))
    : routes
const browser = await chromium.launch({ headless: true })
const results = []
let cursor = 0
async function worker() {
  while (cursor < cases.length) {
    const viewport = cases[cursor++]
    for (const route of testedRoutes) {
      const result = await auditRoute(browser, viewport, route)
      results.push(result)
      process.stdout.write(
        `${viewport.label} ${viewport.width}x${viewport.height} dpr${viewport.dpr} ${route.name}: ${result.navigationError ? 'ERROR' : result.findings?.horizontalOverflow ? 'OVERFLOW' : 'ok'}\n`
      )
    }
  }
}
await Promise.all([worker(), worker(), worker()])
if (overlays) {
  const overlayCases = viewports.filter(
    (item) =>
      ['320x568', '390x844', '960x540', '1280x720'].includes(`${item.width}x${item.height}`) &&
      item.label !== 'image-dpr' &&
      item.label !== 'text-200'
  )
  const scenarios = [
    { name: 'menu-open', path: '/', action: 'menu' },
    { name: 'cart-drawer-open', path: '/', action: 'cart-drawer' },
    { name: 'header-search-open', path: '/', action: 'header-search', maxWidth: 767 },
    { name: 'filters-open', path: '/shop', action: 'filters', maxWidth: 1023 },
    { name: 'quick-view-open', path: '/shop', action: 'quick-view' },
    { name: 'forgot-password-open', path: '/signin', action: 'forgot-password' },
  ]
  for (const viewport of overlayCases) {
    for (const scenario of scenarios.filter(
      (item) => !item.maxWidth || viewport.width <= item.maxWidth
    )) {
      const result = await auditRoute(browser, viewport, scenario)
      results.push(result)
      process.stdout.write(
        `${viewport.width}x${viewport.height} ${scenario.name}: ${result.navigationError ? 'ERROR' : 'ok'}\n`
      )
    }
  }
}
await browser.close()
const findingsName = overlays
  ? 'overlay-findings.json'
  : cartOnly
    ? 'cart-findings.json'
    : dprOnly
      ? 'dpr-findings.json'
      : textOnly
        ? 'text-findings.json'
        : 'findings.json'
const cachedResponses = await Promise.all(
  [...apiCache.entries()].map(async ([url, response]) => ({
    url: new URL(url).pathname,
    status: (await response).status,
  }))
)
await writeFile(
  resolve(output, findingsName),
  JSON.stringify(
    { baseUrl, routes, viewports: overlays ? [] : cases, cachedResponses, results },
    null,
    2
  )
)
process.stdout.write(`Saved ${results.length} cases to ${output}\n`)
