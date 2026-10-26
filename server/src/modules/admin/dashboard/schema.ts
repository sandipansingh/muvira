import { z } from 'zod'

export const DashboardStatsQuerySchema = z
  .object({
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
  })
  .refine(
    (value) =>
      !value.from_date ||
      !value.to_date ||
      Date.parse(value.from_date) <= Date.parse(value.to_date),
    { path: ['to_date'], message: 'End date must be on or after the start date' }
  )

export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>
