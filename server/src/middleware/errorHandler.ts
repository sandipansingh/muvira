import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../types'
import { logger } from '../lib/logger'
import { env } from '../config/env'
import { sanitizePostgrestError } from '../lib/databaseError'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,

  _next: NextFunction
): void {
  const requestId = req.requestId ?? 'unknown'

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(
        {
          requestId,
          operation: err.context?.operation ?? `${req.method} ${req.path}`,
          postgrestCode: err.context?.postgrest?.code ?? null,
          postgrestMessage: err.context?.postgrest?.message ?? null,
          postgrestDetails: err.context?.postgrest?.details ?? null,
          statusCode: err.statusCode,
          errorCode: err.code,
        },
        'Request failed'
      )
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
      },
    })
    return
  }

  const isProduction = env.NODE_ENV === 'production'
  const postgrest = sanitizePostgrestError(err)

  logger.error(
    {
      err: postgrest ? undefined : err,
      requestId,
      operation: `${req.method} ${req.path}`,
      postgrestCode: postgrest?.code ?? null,
      postgrestMessage: postgrest?.message ?? null,
      postgrestDetails: postgrest?.details ?? null,
      path: req.path,
      method: req.method,
    },
    'Unhandled error'
  )

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction
        ? 'An unexpected error occurred. Please try again or contact support.'
        : err instanceof Error
          ? err.message
          : 'Unknown error',
      requestId,
    },
  })
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
  })
}
