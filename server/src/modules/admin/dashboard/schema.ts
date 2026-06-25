import { z } from 'zod'

export const DashboardStatsQuerySchema = z.object({
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
})

export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>
