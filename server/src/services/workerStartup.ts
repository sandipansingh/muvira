import { logger } from '../lib/logger'
import { getRuntimeSchemaStatus } from './runtimeSchema'
import { startPollingScheduler } from './pollingScheduler'

export async function startWorkersWhenSchemaReady(
  startWorkers: () => void = startPollingScheduler
): Promise<boolean> {
  const status = await getRuntimeSchemaStatus({ forceRefresh: true })
  if (!status.ready) {
    logger.error(
      {
        operation: 'worker_startup_schema_contract',
        contractVersion: status.contract?.contract_version ?? null,
        missingRelations: status.contract?.missing_relations ?? [],
        missingColumns: status.contract?.missing_columns ?? [],
        missingFunctions: status.contract?.missing_functions ?? [],
        postgrestCode: status.error?.code ?? null,
        postgrestMessage: status.error?.message ?? null,
        postgrestDetails: status.error?.details ?? null,
      },
      'Background workers suppressed because the database schema is incompatible'
    )
    return false
  }

  startWorkers()
  return true
}
