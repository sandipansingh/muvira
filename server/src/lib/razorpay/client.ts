/**
 * Razorpay SDK instance — initialized with server-side credentials.
 * SECURITY: RAZORPAY_KEY_SECRET is NEVER logged, returned in responses,
 * or accessible to client-side code.
 */
import Razorpay from 'razorpay';
import { env } from '../../config/env';

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});
