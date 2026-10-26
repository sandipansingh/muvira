import { logger } from '../lib/logger'
import { getRuntimeSchemaStatus } from './runtimeSchema'
import { startPollingScheduler } from './pollingScheduler'
import { createWorkerStartup } from './workerStartupState'

let start = startPollingScheduler
const startup = createWorkerStartup({
  inspect: async () => {
    const status = await getRuntimeSchemaStatus({ forceRefresh: true })
    if (!status.ready)
      logger.warn(
        { contractVersion: status.contract?.contract_version ?? null },
        'Workers waiting for database schema; startup will retry'
      )
    return status.ready
  },
  start: () => start(),
  schedule: (work, delay) => {
    const timer = setTimeout(() => {
      void work()
    }, delay)
    timer.unref()
    return timer
  },
  cancel: clearTimeout,
})

export const getWorkerStartupStatus = startup.status
export const stopWorkerStartup = startup.stop

export async function startWorkersWhenSchemaReady(
  startWorkers: () => void = startPollingScheduler
): Promise<boolean> {
  start = startWorkers
  return startup.ensureStarted()
}
