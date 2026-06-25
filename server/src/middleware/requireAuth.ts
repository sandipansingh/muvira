import type { Request, Response, NextFunction } from 'express'
import { adminSupabase } from '../lib/supabase/admin'
import { createUserSupabaseClient } from '../lib/supabase/client'
import { logger } from '../lib/logger'

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
        },
      })
      return
    }

    const token = authHeader.slice(7) // Strip "Bearer "

    // Verify the JWT server-side using the admin client.
    // This call validates the signature, expiry, and audience.
    const {
      data: { user },
      error,
    } = await adminSupabase.auth.getUser(token)

    if (error || !user) {
      logger.warn({ requestId: req.requestId, errorMsg: error?.message }, 'JWT verification failed')
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Token is invalid or has expired',
        },
      })
      return
    }

    // Role comes from profiles table (single source of truth), not JWT claims.
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      logger.error(
        { requestId: req.requestId, userId: user.id },
        'Profile not found for authenticated user'
      )
      res.status(401).json({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'User profile not found',
        },
      })
      return
    }

    req.user = {
      id: user.id,
      email: user.email ?? '',
      role: profile.role as 'user' | 'admin',
    }
    req.token = token

    req.supabase = createUserSupabaseClient(token)

    next()
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Unexpected error in requireAuth')
    next(err)
  }
}
