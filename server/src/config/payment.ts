import { createHash } from 'node:crypto'

interface PaymentConfiguration {
  NODE_ENV: string
  SUPABASE_URL: string
  RAZORPAY_MODE: string
  RAZORPAY_KEY_ID: string
  RAZORPAY_KEY_SECRET: string
  RAZORPAY_WEBHOOK_SECRET: string
}

export function paymentConfigurationIssues(config: PaymentConfiguration): string[] {
  const issues: string[] = []
  if (!new RegExp(`^rzp_${config.RAZORPAY_MODE}_[A-Za-z0-9]+$`).test(config.RAZORPAY_KEY_ID))
    issues.push('RAZORPAY_KEY_ID must match RAZORPAY_MODE')
  if (config.NODE_ENV !== 'test') {
    for (const field of [
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
    ] as const)
      if (/example|placeholder|your[_-]|changeme/i.test(config[field]))
        issues.push(`${field} must not contain a placeholder`)
  }
  let database: URL
  try {
    database = new URL(config.SUPABASE_URL)
  } catch {
    issues.push('SUPABASE_URL must be a valid URL')
    return issues
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)
  if (config.RAZORPAY_MODE === 'live' && local)
    issues.push('Live payments require a production database destination')
  if ((config.RAZORPAY_MODE === 'test' || config.NODE_ENV !== 'production') && !local)
    issues.push('Development and Test Mode require isolated local Supabase')
  if (config.NODE_ENV !== 'production' && config.RAZORPAY_MODE === 'live')
    issues.push('Live payments require the production runtime')
  return issues
}

export function paymentConfigurationIdentity(keyId: string): string {
  return createHash('sha256').update(keyId).digest('hex')
}
