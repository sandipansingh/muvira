import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const distRoot = fileURLToPath(new URL('../dist/', import.meta.url)).replace(/[\\/]$/, '')
const indexPath = resolve(distRoot, 'index.html')
try {
  if (!(await stat(indexPath)).isFile()) throw new Error('index.html is not a file')
} catch (error) {
  console.error(
    `Static build missing at ${indexPath}: ${error.message}. Build the client before starting.`
  )
  process.exit(1)
}
const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

async function existingFile(pathname) {
  const requestedPath = resolve(distRoot, `.${pathname}`)
  if (requestedPath !== distRoot && !requestedPath.startsWith(`${distRoot}${sep}`)) return null

  try {
    await access(requestedPath)
    const file = await stat(requestedPath)
    return file.isFile() ? requestedPath : null
  } catch {
    return null
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end()
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  } catch {
    response.writeHead(400)
    response.end('Bad request')
    return
  }

  let filePath = await existingFile(pathname)
  if (
    !filePath &&
    !extname(pathname) &&
    !pathname.startsWith('/assets/') &&
    request.headers.accept?.includes('text/html')
  ) {
    filePath = indexPath
  }
  if (!filePath) {
    response.writeHead(404)
    response.end('Not found')
    return
  }
  const extension = extname(filePath)
  const immutableAsset = filePath.includes(`${sep}assets${sep}`)
  response.writeHead(200, {
    'Cache-Control': immutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  })

  if (request.method === 'HEAD') {
    response.end()
    return
  }
  const stream = createReadStream(filePath)
  stream.on('error', (error) => {
    console.error(`Static stream failed: ${error.message}`)
    response.destroy(error)
  })
  response.on('close', () => stream.destroy())
  stream.pipe(response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on ${server.address().port}`)
})
