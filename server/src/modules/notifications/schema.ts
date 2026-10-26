import { z } from 'zod'
import { DiagnosticPageSchema } from '../admin/diagnostics/schema'

export const NotificationLogsQuerySchema = DiagnosticPageSchema.extend({
  orderId: z.string().uuid().optional(),
  status: z
    .enum(['pending', 'processing', 'sent', 'failed', 'dead', 'skipped', 'failures'])
    .optional(),
})

export const UpdateNotificationPrefsSchema = z
  .object({
    email_enabled: z.boolean(),
  })
  .strict()

export type UpdateNotificationPrefsInput = z.infer<typeof UpdateNotificationPrefsSchema>
