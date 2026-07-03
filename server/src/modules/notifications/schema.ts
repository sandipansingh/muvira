import { z } from 'zod'

export const UpdateNotificationPrefsSchema = z
  .object({
    email_enabled: z.boolean().optional(),
  })
  .strict()

export type UpdateNotificationPrefsInput = z.infer<typeof UpdateNotificationPrefsSchema>
