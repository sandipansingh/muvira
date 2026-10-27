import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
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
const { createFrontendServer, runtimeConfig } = await import('./frontend-host.mjs')
const server = createFrontendServer({ ...runtimeConfig(), distRoot })
server.listen(Number.parseInt(process.env.PORT ?? '3000', 10), '0.0.0.0', () => {
  console.log(`Listening on ${server.address().port}`)
})
