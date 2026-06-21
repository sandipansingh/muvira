/**
 * Assigns a UUID to every incoming request.
 * Attached as req.requestId and returned in X-Request-Id response header.
 * Used for log correlation and error responses.
 */
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  req.requestId = uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
