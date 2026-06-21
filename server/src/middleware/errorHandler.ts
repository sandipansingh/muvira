/**
 * Centralized error-handling middleware.
 *
 * SECURITY: In production, stack traces and internal error messages are
 * NEVER sent to the client. Only a safe generic message + request ID is
 * returned. Full details are logged server-side for debugging.
 *
 * Shape: { success: false, error: { code, message, requestId, fieldErrors? } }
 */
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';

  // Known application errors — safe to expose message + code
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
      },
    });
    return;
  }

  // Unknown / unexpected errors
  const isProduction = env.NODE_ENV === 'production';

  logger.error(
    {
      err,
      requestId,
      path: req.path,
      method: req.method,
    },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction
        ? 'An unexpected error occurred. Please try again or contact support.'
        : (err instanceof Error ? err.message : 'Unknown error'),
      requestId,
    },
  });
}

/** Catch-all for 404s on unmatched routes */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
  });
}
