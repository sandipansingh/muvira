import { z } from 'zod'

export const DiagnosticPageSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export const RetryQueueQuerySchema = DiagnosticPageSchema.extend({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'dead']).optional(),
})
export const WebhookLogsQuerySchema = DiagnosticPageSchema.extend({
  source: z.enum(['razorpay', 'shiprocket']).optional(),
  status: z
    .enum(['received', 'verified', 'processing', 'processed', 'failed', 'duplicate', 'ignored'])
    .optional(),
})
export const CommerceKinds = [
  'outbox',
  'invoice',
  'payment_reconciliation',
  'operational_alert',
  'provider_operation',
  'retained_checkout',
  'late_capture_watch',
  'cancellation_refund',
] as const
export type CommerceKind = (typeof CommerceKinds)[number]
export const CommerceFailuresQuerySchema = DiagnosticPageSchema.extend({
  kind: z.enum(CommerceKinds).optional(),
})

export const DiagnosticIdParamsSchema = z.object({
  id: z.string().uuid(),
})
export const DiagnosticOrderParamsSchema = z.object({ orderId: z.string().uuid() }).strict()

export const DiagnosticActionSchema = z
  .object({
    reason: z.string().trim().min(3).max(1000),
  })
  .strict()
