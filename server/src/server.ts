import './config/env' // runs Zod validation; exits if invalid
import { createApp } from './app'
import { logger } from './lib/logger'
import { env } from './config/env'
import { stopPollingScheduler } from './services/pollingScheduler'
import { startWorkersWhenSchemaReady } from './services/workerStartup'

const PORT = parseInt(env.PORT, 10)

const app = createApp()

void (async () => {
  const server = app.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        env: env.NODE_ENV,
        store: env.STORE_NAME,
      },
      `🚀 ${env.STORE_NAME} API server running on port ${PORT}`
    )

    void startWorkersWhenSchemaReady()
  })

  // Graceful shutdown
  function shutdown(signal: string) {
    logger.info({ signal }, 'Graceful shutdown initiated')

    stopPollingScheduler()

    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })

    // Force-exit after 10 seconds if server doesn't close cleanly
    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
})()

process.on('unhandledRejection', (reason) => {
  // Do NOT log the full reason object - it may contain secrets in some stacks
  logger.error({ type: typeof reason }, 'Unhandled promise rejection')
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'Uncaught exception')
  process.exit(1)
})
