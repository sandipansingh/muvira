import { z } from 'zod'
import dotenv from 'dotenv'

const nodeEnv = process.env.NODE_ENV || 'development'
dotenv.config({ path: `.env.${nodeEnv}` })
dotenv.config({ path: '.env' })

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().regex(/^\d+$/, 'PORT must be numeric').default('4000'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Supabase
    SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
    SUPABASE_ANON_KEY: z.string().min(10, 'SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, 'SUPABASE_SERVICE_ROLE_KEY is required'),

    // Razorpay - secrets must never be logged or returned in responses
    RAZORPAY_KEY_ID: z.string().min(5, 'RAZORPAY_KEY_ID is required'),
    RAZORPAY_KEY_SECRET: z.string().min(5, 'RAZORPAY_KEY_SECRET is required'),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(5, 'RAZORPAY_WEBHOOK_SECRET is required'),

    // CORS
    ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS must not be empty'),

    // Email
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().default('orders@muvira.com'),

    // Store config
    ORDER_PREFIX: z.string().min(1).max(10).default('MUV'),
    STORE_NAME: z.string().min(1).default('Muvira'),

    // Cache
    // Set CACHE_ENABLED=false to bypass the in-memory cache entirely (e.g. CI, debug)
    CACHE_ENABLED: z.enum(['true', 'false']).default('true'),
    // Set CACHE_DEBUG=true to log every HIT / MISS / SET / DELETE
    CACHE_DEBUG: z.enum(['true', 'false']).default('false'),

    // Shiprocket - used for order fulfillment + tracking
    SHIPROCKET_EMAIL: z.string().email(),
    SHIPROCKET_PASSWORD: z.string().min(1, 'SHIPROCKET_PASSWORD is required'),

    SHIPROCKET_WEBHOOK_ENABLED: z.enum(['true', 'false']).default('false'),
    SHIPROCKET_WEBHOOK_SECRET: z.string().min(16).optional(),
  })
  .superRefine((value, context) => {
    if (value.SHIPROCKET_WEBHOOK_ENABLED === 'true' && !value.SHIPROCKET_WEBHOOK_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SHIPROCKET_WEBHOOK_SECRET'],
        message: 'SHIPROCKET_WEBHOOK_SECRET is required when Shiprocket webhooks are enabled',
      })
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Deliberately print to stderr without pino so this works before logger init
  console.error(
    '❌  Missing or invalid environment variables:\n',
    parsed.error.flatten().fieldErrors
  )
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
