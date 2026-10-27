import { createReadStream, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { createGzip, gzipSync } from 'node:zlib'
import { escapeHtml, safeJson, renderHead, resolvePage } from '../src/lib/seo/metadata.mjs'

function acceptsGzip(header = '') {
  return header.split(',').some((value) => {
    const [encoding, ...parameters] = value.trim().toLowerCase().split(';')
    const quality = parameters.find((parameter) => parameter.trim().startsWith('q='))
    return encoding === 'gzip' && (!quality || Number(quality.trim().slice(2)) > 0)
  })
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
}
export function runtimeConfig(environment = process.env) {
  const site = new URL(environment.SITE_URL || 'https://muvira.in')
  if (
    site.protocol !== 'https:' ||
    site.username ||
    site.password ||
    site.pathname !== '/' ||
    site.search ||
    site.hash
  )
    throw new Error('SITE_URL must be an HTTPS origin')
  const api = environment.SEO_API_URL || environment.VITE_API_URL
  if (!api) throw new Error('SEO_API_URL is required')
  const upstream = new URL(api)
  if (
    !['https:', 'http:'].includes(upstream.protocol) ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== '/' ||
    upstream.search ||
    upstream.hash
  )
    throw new Error('SEO_API_URL must be an API origin')
  if (!environment.SEO_INTERNAL_TOKEN || environment.SEO_INTERNAL_TOKEN.length < 32)
    throw new Error('SEO_INTERNAL_TOKEN must contain at least 32 characters')
  if (
    environment.SEO_INDEXING_ENABLED &&
    !['true', 'false'].includes(environment.SEO_INDEXING_ENABLED)
  )
    throw new Error('SEO_INDEXING_ENABLED must be true or false')
  return {
    siteUrl: site.origin,
    apiUrl: upstream.origin,
    indexingEnabled: environment.SEO_INDEXING_ENABLED === 'true',
    token: environment.SEO_INTERNAL_TOKEN,
  }
}
export function catalogReader(config) {
  return async (path) => {
    if (!/^\/api\/(products(?:\?[^#]*)?|products\/[^/?#]+|categories(?:\/[^/?#]+)?)$/.test(path))
      throw new Error('Catalog path not allowed')
    const response = await fetch(new URL(path, config.apiUrl), {
      headers: { Accept: 'application/json', 'X-Muvira-SEO-Token': config.token },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      const error = new Error('Catalog request failed')
      error.status = response.status
      throw error
    }
    const result = await response.json()
    if (result?.success !== true || result.data === undefined)
      throw new Error('Invalid catalog envelope')
    return result
  }
}
async function sitemap(read, config) {
  const categories = (await read('/api/categories')).data
  if (!Array.isArray(categories)) throw new Error('Invalid categories')
  const products = []
  let pages = 1
  for (let page = 1; page <= pages; page++) {
    const result = await read(`/api/products?page=${page}&limit=100`)
    if (
      !Array.isArray(result.data) ||
      !Number.isInteger(result.meta?.totalPages) ||
      result.meta.totalPages < 0 ||
      result.meta.totalPages > 500
    )
      throw new Error('Invalid sitemap pagination')
    pages = result.meta.totalPages
    products.push(...result.data.filter((product) => product.is_active !== false))
  }
  const entries = [{ path: '/' }]
  if (products.length) entries.push({ path: '/shop' })
  if (categories.some((category) => category.is_active !== false))
    entries.push({ path: '/categories' })
  const timestamp = (value) =>
    typeof value === 'string' && Number.isFinite(Date.parse(value))
      ? new Date(value).toISOString()
      : undefined
  for (const product of products)
    entries.push({
      path: `/product/${encodeURIComponent(product.slug)}`,
      modified: timestamp(product.updated_at),
    })
  for (const category of categories) {
    const members = products.filter((product) => product.category_id === category.id)
    if (category.is_active === false || !members.length) continue
    const dates = [
      timestamp(category.updated_at),
      ...members.map((product) => timestamp(product.updated_at)),
    ]
      .filter(Boolean)
      .sort()
    entries.push({
      path: `/shop?category=${encodeURIComponent(category.slug)}`,
      modified: dates.at(-1),
    })
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${escapeHtml(config.siteUrl + entry.path)}</loc>${entry.modified ? `<lastmod>${entry.modified}</lastmod>` : ''}</url>`).join('')}</urlset>`
}
export function createFrontendServer(config) {
  const root = resolve(config.distRoot)
  const template = readFileSync(resolve(root, 'index.html'), 'utf8')
  const read = catalogReader(config)
  const publicConfig = { siteUrl: config.siteUrl, indexingEnabled: config.indexingEnabled }
  return createServer(async (request, response) => {
    const send = (status, body, type, headers = {}) => {
      const compressed =
        acceptsGzip(request.headers['accept-encoding']) && Buffer.byteLength(body) > 1024
      response.writeHead(status, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Accept-Encoding',
        ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
        ...headers,
      })
      response.end(request.method === 'HEAD' ? undefined : compressed ? gzipSync(body) : body)
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      send(405, 'Method not allowed', 'text/plain', { Allow: 'GET, HEAD' })
      return
    }
    try {
      const url = new URL(request.url || '/', 'http://localhost')
      const pathname = decodeURIComponent(url.pathname)
      if (pathname === '/healthz') {
        send(200, 'ok\n', 'text/plain')
        return
      }
      if (
        (request.headers.host || '').toLowerCase().split(':')[0] ===
        `www.${new URL(config.siteUrl).hostname}`
      ) {
        send(308, '', 'text/plain', { Location: `${config.siteUrl}${url.pathname}${url.search}` })
        return
      }
      if (pathname === '/robots.txt') {
        send(
          200,
          `User-agent: *\n${config.indexingEnabled ? 'Allow: /' : 'Disallow: /'}\nSitemap: ${config.siteUrl}/sitemap.xml\n`,
          'text/plain; charset=utf-8'
        )
        return
      }
      if (pathname === '/sitemap.xml') {
        send(200, await sitemap(read, config), 'application/xml; charset=utf-8', {
          'X-Robots-Tag': config.indexingEnabled ? 'index, follow' : 'noindex, follow',
        })
        return
      }
      const file = resolve(root, `.${pathname}`)
      const inRoot = file.startsWith(`${root}${sep}`)
      const isFile =
        inRoot &&
        (await stat(file).then(
          (info) => info.isFile(),
          () => false
        ))
      if (isFile && file !== resolve(root, 'index.html')) {
        const type = mimeTypes[extname(file)] || 'application/octet-stream'
        const gzip =
          acceptsGzip(request.headers['accept-encoding']) && /text|json|javascript|xml/.test(type)
        response.writeHead(200, {
          'Content-Type': type,
          'Cache-Control': file.includes(`${sep}assets${sep}`)
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=604800',
          'X-Content-Type-Options': 'nosniff',
          Vary: 'Accept-Encoding',
          ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
        })
        if (request.method === 'HEAD') {
          response.end()
          return
        }
        const stream = createReadStream(file)
        stream.on('error', () => response.destroy())
        response.on('close', () => stream.destroy())
        if (gzip) stream.pipe(createGzip()).pipe(response)
        else stream.pipe(response)
        return
      }
      if (pathname === '/index.html') {
        send(308, '', 'text/plain', { Location: `/${url.search}` })
        return
      }
      if (
        extname(pathname) ||
        pathname.startsWith('/assets/') ||
        (request.headers.accept && !/text\/html|\*\/\*/.test(request.headers.accept))
      ) {
        send(404, 'Not found', 'text/plain', { 'X-Robots-Tag': 'noindex' })
        return
      }
      const route = `${url.pathname}${url.search}`
      const result = await resolvePage(route, read, publicConfig)
      if (result.redirect) {
        send(308, '', 'text/plain', { Location: result.redirect })
        return
      }
      const initial = { route, metadata: result.metadata }
      const head =
        renderHead(result.metadata) +
        `\n<script id="seo-config" type="application/json">${safeJson(publicConfig)}</script>\n<script id="seo-initial" type="application/json">${safeJson(initial)}</script>`
      const html = template.replace('<!-- SEO_HEAD -->', head)
      send(result.status, html, 'text/html; charset=utf-8', {
        'X-Robots-Tag': result.metadata.robots,
        ...(result.status === 503 ? { 'Retry-After': '60' } : {}),
      })
    } catch (error) {
      const malformed = error instanceof URIError
      send(
        malformed ? 400 : 503,
        malformed ? 'Bad request' : 'Temporarily unavailable',
        'text/plain; charset=utf-8',
        { 'X-Robots-Tag': 'noindex', ...(!malformed ? { 'Retry-After': '60' } : {}) }
      )
    }
  })
}
