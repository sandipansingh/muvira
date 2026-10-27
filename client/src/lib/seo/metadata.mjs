export const HOME_TITLE = 'Buy God Idols & Puja Decor Online in India | Muvira'
export const HOME_DESCRIPTION =
  'Shop Ganesha, Radha Krishna, Shiva and Durga idols at Muvira. Explore resin murtis, stone Shivlings and puja decor for home temples and gifting.'
const HOME_KEYWORDS =
  'god idols online, Hindu murtis, puja idols, Ganesha idols, Radha Krishna murti, Shiva idols, Durga idols, resin idols, stone Shivlings, home temple decor'
const clean = (value) =>
  typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : ''
const concise = (value, limit) =>
  value.length <= limit ? value : `${value.slice(0, limit - 1).replace(/\s+\S*$/, '')}…`
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  )
export const safeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
export function httpsUrl(value, origin) {
  if (!value) return undefined
  try {
    const url = new URL(value, origin)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined
  } catch {
    return undefined
  }
}
export function categoryDestination(slug, search = '') {
  const params = new URLSearchParams(search)
  params.delete('category')
  return `/shop?${new URLSearchParams([['category', slug], ...params])}`
}
export function buildMetadata(route, data = {}, config = {}) {
  const origin = new URL(config.siteUrl || 'https://muvira.in').origin
  const url = new URL(route, origin)
  const path = url.pathname
  const params = url.searchParams
  const page = /^\d+$/.test(params.get('page') || '1')
    ? Math.max(1, Number(params.get('page') || 1))
    : 1
  const category = data.category
  const product = data.product
  const crumbs = [{ name: 'Home', url: `${origin}/` }]
  let title = HOME_TITLE,
    description = HOME_DESCRIPTION,
    keywords = HOME_KEYWORDS
  let canonical = `${origin}${path}`,
    type = 'website',
    indexable = path === '/'
  let image = `${origin}/images/editorial/ganesha-mandir.png`
  let imageWidth = 1536,
    imageHeight = 1024
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: 'Muvira',
      url: `${origin}/`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: 'Muvira',
      url: `${origin}/`,
      inLanguage: 'en-IN',
      publisher: { '@id': `${origin}/#organization` },
    },
  ]
  if (path === '/shop') {
    const name = clean(category?.name) || 'God Idols & Puja Decor'
    title = category
      ? `${name} Online in India | Muvira`
      : 'Shop God Idols, Hindu Murtis & Puja Decor | Muvira'
    description = category
      ? concise(
          `Shop ${name} at Muvira. ${clean(category.description) || `Explore the ${name} collection online in India for your puja space and home.`}`,
          160
        )
      : HOME_DESCRIPTION
    keywords = category ? `${name}, ${name} online, puja, Muvira` : HOME_KEYWORDS
    const canonicalParams = new URLSearchParams()
    if (category) canonicalParams.set('category', category.slug)
    if (page > 1) {
      canonicalParams.set('page', String(page))
      title = `${name} – Page ${page} | Muvira`
    }
    canonical = `${origin}/shop${canonicalParams.size ? `?${canonicalParams}` : ''}`
    indexable =
      data.total > 0 && (!params.has('category') || !!category || params.get('category') === 'all')
    crumbs.push({ name: 'Shop', url: `${origin}/shop` })
    if (category)
      crumbs.push({ name: category.name, url: `${origin}${categoryDestination(category.slug)}` })
  } else if (path === '/categories') {
    title = 'God Idol & Puja Decor Collections Online | Muvira'
    description =
      'Browse Muvira collections of god idols, Hindu murtis and puja decor. Find pieces for your home temple, spiritual space and thoughtful gifting.'
    indexable = data.total !== 0
    crumbs.push({ name: 'Collections', url: canonical })
  } else if (path.startsWith('/product/') && product && product.is_active !== false) {
    const name = clean(product.name)
    title = clean(product.meta_title) || `${concise(name, 48)} | Muvira`
    description =
      clean(product.meta_description) ||
      concise(
        `${name}. ${clean(product.short_description) || 'Explore this piece at Muvira for your home temple, puja space or gifting.'}`,
        160
      )
    keywords = product.tags?.length
      ? product.tags.map(clean).filter(Boolean).join(', ')
      : `${name}, ${clean(product.categories?.name)}, Muvira`
    canonical = `${origin}/product/${encodeURIComponent(product.slug)}`
    type = 'product'
    indexable = true
    const images = [...(product.product_images || [])]
      .sort(
        (a, b) =>
          Number(!!b.is_primary) - Number(!!a.is_primary) ||
          (a.sort_order || 0) - (b.sort_order || 0)
      )
      .map((x) => httpsUrl(x.url, origin))
      .filter(Boolean)
    if (images.length) {
      image = images[0]
      imageWidth = undefined
      imageHeight = undefined
    }
    crumbs.push({ name: 'Shop', url: `${origin}/shop` })
    if (product.categories?.slug)
      crumbs.push({
        name: product.categories.name,
        url: `${origin}${categoryDestination(product.categories.slug)}`,
      })
    crumbs.push({ name: product.name, url: canonical })
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      image: images,
      url: canonical,
      ...(product.sku ? { sku: product.sku } : {}),
      offers: {
        '@type': 'Offer',
        url: canonical,
        priceCurrency: 'INR',
        price: (product.price_paisa / 100).toFixed(2),
        availability: `https://schema.org/${product.stock > 0 ? 'InStock' : 'OutOfStock'}`,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': `${origin}/#organization` },
      },
    }
    schemas.push(schema)
  } else if (!['/', '/shop', '/categories'].includes(path)) {
    title =
      data.status === 503
        ? 'Temporarily unavailable | Muvira'
        : path.startsWith('/product/') || data.status === 404
          ? 'Page not found | Muvira'
          : 'Muvira'
    description = 'Explore Muvira god idols, Hindu murtis and puja decor.'
  }
  const filtered =
    [...params.keys()].some(
      (key) =>
        ![
          'category',
          'page',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_content',
          'utm_term',
          'gclid',
          'fbclid',
        ].includes(key)
    ) ||
    (path !== '/shop' && [...params.keys()].some((key) => ['category', 'page'].includes(key)))
  if (crumbs.length > 1)
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    })
  const robots =
    config.indexingEnabled === true && indexable && !filtered && !data.status
      ? 'index, follow'
      : 'noindex, follow'
  return {
    title,
    description,
    keywords,
    canonical,
    robots,
    image,
    imageWidth,
    imageHeight,
    type,
    schemas: data.status ? schemas.filter((x) => x['@type'] !== 'Product') : schemas,
  }
}
export function renderHead(meta) {
  const tag = (attribute, key, value) =>
    `<meta data-seo ${attribute}="${key}" content="${escapeHtml(value)}">`
  return [
    `<title data-seo>${escapeHtml(meta.title)}</title>`,
    ...['description', 'keywords', 'robots'].map((key) => tag('name', key, meta[key])),
    `<link data-seo rel="canonical" href="${escapeHtml(meta.canonical)}">`,
    ...Object.entries({
      'og:title': meta.title,
      'og:description': meta.description,
      'og:url': meta.canonical,
      'og:image': meta.image,
      'og:type': meta.type,
      'og:site_name': 'Muvira',
      'og:locale': 'en_IN',
      ...(meta.imageWidth
        ? { 'og:image:width': meta.imageWidth, 'og:image:height': meta.imageHeight }
        : {}),
    }).map(([key, value]) => tag('property', key, value)),
    ...Object.entries({
      'twitter:card': 'summary_large_image',
      'twitter:title': meta.title,
      'twitter:description': meta.description,
      'twitter:image': meta.image,
    }).map(([key, value]) => tag('name', key, value)),
    `<script data-seo type="application/ld+json">${safeJson({ '@context': 'https://schema.org', '@graph': meta.schemas })}</script>`,
  ].join('\n')
}
export async function resolvePage(route, read, config) {
  const url = new URL(route, config.siteUrl)
  const normalizedPath = url.pathname.replace(
    /^\/(shop|categories|category|product|search|cart|checkout|signin|signup|login|reset-password|profile|orders|admin)(?=\/|$)/i,
    (value) => value.toLowerCase()
  )
  if (normalizedPath !== url.pathname)
    return { status: 308, redirect: `${normalizedPath}${url.search}` }
  const alias = url.pathname.match(/^\/categor(?:y|ies)\/([^/]+)\/?$/)
  if (alias)
    return { status: 308, redirect: categoryDestination(decodeURIComponent(alias[1]), url.search) }
  if (url.pathname !== '/' && url.pathname.endsWith('/'))
    return {
      status: 308,
      redirect: `${url.pathname.replace(/\/+$/, '')}${url.search}`,
    }
  const data = {}
  let status = 200
  try {
    const productMatch = url.pathname.match(/^\/product\/([^/]+)$/)
    if (productMatch) {
      const result = await read(
        `/api/products/${encodeURIComponent(decodeURIComponent(productMatch[1]))}`
      )
      const item = result.data
      if (
        !item ||
        typeof item.name !== 'string' ||
        typeof item.slug !== 'string' ||
        !Number.isSafeInteger(item.price_paisa) ||
        item.price_paisa < 0 ||
        !Number.isSafeInteger(item.stock) ||
        item.stock < 0 ||
        !Array.isArray(item.product_images) ||
        item.product_images.some((image) => !image || typeof image.url !== 'string')
      ) {
        throw new Error('Invalid product response')
      }
      data.product = result.data
      if (!data.product || data.product.is_active === false) status = 404
    } else if (url.pathname === '/categories') {
      const result = await read('/api/categories')
      if (!Array.isArray(result.data)) throw new Error('Invalid categories response')
      data.total = result.data.filter((category) => category.is_active !== false).length
    } else if (url.pathname === '/shop') {
      const category = url.searchParams.get('category')
      if (category && category !== 'all') {
        data.category = (await read(`/api/categories/${encodeURIComponent(category)}`)).data
        if (
          !data.category ||
          typeof data.category.slug !== 'string' ||
          typeof data.category.name !== 'string'
        )
          throw new Error('Invalid category response')
        if (data.category.is_active === false) status = 404
      }
      const page = url.searchParams.get('page') || '1'
      if (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page))) status = 404
      else {
        const query = new URLSearchParams({ page, limit: '12' })
        if (category && category !== 'all') query.set('category', category)
        if (url.searchParams.has('q')) query.set('q', url.searchParams.get('q'))
        const sort = url.searchParams.get('sort')
        if (['price_asc', 'price_desc', 'newest', 'featured'].includes(sort))
          query.set('sort', sort)
        if (url.searchParams.get('inStock') === 'true') query.set('inStock', 'true')
        for (const [ui, api] of [
          ['minPrice', 'min_price_paisa'],
          ['maxPrice', 'max_price_paisa'],
        ])
          if (url.searchParams.has(ui)) {
            const amount = Number(url.searchParams.get(ui))
            if (
              !Number.isFinite(amount) ||
              amount < 0 ||
              !Number.isSafeInteger(Math.round(amount * 100))
            )
              return { status: 400, metadata: buildMetadata(route, { status: 400 }, config) }
            query.set(api, String(Math.round(amount * 100)))
          }
        const result = await read(`/api/products?${query}`)
        if (!Number.isFinite(result.meta?.total)) throw new Error('Invalid catalog response')
        data.total = result.meta.total
        if (Number(page) > Math.max(1, result.meta.totalPages)) status = 404
      }
    } else if (
      ![
        '/',
        '/categories',
        '/search',
        '/cart',
        '/checkout',
        '/signin',
        '/signup',
        '/login',
        '/reset-password',
        '/profile',
        '/orders',
        '/admin',
      ].includes(url.pathname) &&
      !/^\/(admin|orders)\//.test(url.pathname)
    )
      status = 404
  } catch (error) {
    status = error.status === 404 ? 404 : error.status === 400 ? 400 : 503
  }
  return {
    status,
    metadata: buildMetadata(route, { ...data, ...(status === 200 ? {} : { status }) }, config),
  }
}
