import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../types'
import { getRuntimeSchemaStatus } from '../services/runtimeSchema'

export async function requireRuntimeSchema(
  _req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const status = await getRuntimeSchemaStatus()
  if (status.ready) {
    next()
    return
  }

  next(
    new AppError(
      503,
      'SCHEMA_NOT_READY',
      'The service database is being upgraded. Please try again shortly.',
      undefined,
      {
        operation: 'runtime_schema_contract',
        ...(status.error ? { postgrest: status.error } : {}),
      }
    )
  )
}
