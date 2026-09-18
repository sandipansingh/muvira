import { z } from 'zod'

export const DiagnosticIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const DiagnosticActionSchema = z
  .object({
    reason: z.string().trim().min(3).max(1000),
  })
  .strict()
