/**
 * Structured logger using pino.
 * IMPORTANT: Never log secrets, JWTs, full payment payloads, or card data.
 */
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    // Redact known secret paths from log objects
    paths: [
      'req.headers.authorization',
      'req.headers["x-razorpay-signature"]',
      '*.razorpay_key_secret',
      '*.RAZORPAY_KEY_SECRET',
      '*.RAZORPAY_WEBHOOK_SECRET',
      '*.SUPABASE_SERVICE_ROLE_KEY',
      '*.token',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
