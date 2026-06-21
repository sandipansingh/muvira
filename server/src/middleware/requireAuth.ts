/**
 * Authentication middleware.
 *
 * Verifies the Supabase JWT from the Authorization header.
 * On success, attaches to the request:
 *  - req.user      — verified identity (id, email, role)
 *  - req.token     — raw JWT (for constructing user-scoped DB client)
 *  - req.supabase  — user-scoped Supabase client (RLS is active)
 *
 * SECURITY GUARANTEES:
 *  - Identity always comes from the verified JWT, NEVER from request body/query.
 *  - Expired or malformed tokens are rejected with 401 before any business logic.
 *  - The user's role is fetched from the profiles table (not from the JWT claim)
 *    to prevent client-side privilege escalation.
 */
import type { Request, Response, NextFunction } from 'express';
import { adminSupabase } from '../lib/supabase/admin';
import { createUserSupabaseClient } from '../lib/supabase/client';
import { logger } from '../lib/logger';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
        },
      });
      return;
    }

    const token = authHeader.slice(7); // Strip "Bearer "

    // Verify the JWT server-side using the admin client.
    // This call validates the signature, expiry, and audience.
    const {
      data: { user },
      error,
    } = await adminSupabase.auth.getUser(token);

    if (error || !user) {
      logger.warn(
        { requestId: req.requestId, errorMsg: error?.message },
        'JWT verification failed',
      );
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Token is invalid or has expired',
        },
      });
      return;
    }

    // Fetch the user's role from profiles — do NOT trust any role claim in the JWT.
    // The role in profiles is the single source of truth for authorization decisions.
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error(
        { requestId: req.requestId, userId: user.id },
        'Profile not found for authenticated user',
      );
      res.status(401).json({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'User profile not found',
        },
      });
      return;
    }

    // Attach verified identity to the request
    req.user = {
      id: user.id,
      email: user.email ?? '',
      role: profile.role as 'user' | 'admin',
    };
    req.token = token;

    // Create a user-scoped client for this request.
    // All user-facing DB queries go through this client so RLS is enforced.
    req.supabase = createUserSupabaseClient(token);

    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Unexpected error in requireAuth');
    next(err);
  }
}
