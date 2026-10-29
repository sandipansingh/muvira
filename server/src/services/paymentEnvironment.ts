import { env } from '../config/env'
import { adminSupabase } from '../lib/supabase/admin'
import { AppError } from '../types'

export const paymentEnvironmentArgs = () => ({
  p_provider_mode: env.RAZORPAY_MODE,
  p_provider_key_id: env.RAZORPAY_KEY_ID,
})

export async function assertPaymentEnvironment(orderId: string): Promise<void> {
  const { error } = await adminSupabase.rpc('assert_razorpay_order_environment', {
    p_order_id: orderId,
    ...paymentEnvironmentArgs(),
  })
  if (error)
    throw new AppError(
      409,
      'PAYMENT_ENVIRONMENT_REVIEW',
      'This payment needs a configuration review before it can continue.'
    )
}
