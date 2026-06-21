/**
 * Admin authorization middleware.
 *
 * Must be applied AFTER requireAuth. Checks that the authenticated user's
 * role is 'admin' (sourced from the profiles table, verified in requireAuth).
 *
 * Multiple admins are supported — this checks role === 'admin', not a
 * specific user ID.
 *
 * Returns 403 (not 401) because the user IS authenticated, just not authorized.
 */
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // requireAuth must have run first
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  if (req.user.role !== 'admin') {
    logger.warn(
      { requestId: req.requestId, userId: req.user.id, role: req.user.role },
      'Non-admin attempted to access admin route',
    );
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
    return;
  }

  next();
}
