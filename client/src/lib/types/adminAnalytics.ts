export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year'

export interface AnalyticsSummary {
  collected_paisa: number
  refunded_paisa: number
  net_paisa: number
  orders_placed: number
}

export interface DashboardAnalytics {
  period: AnalyticsPeriod
  timezone: 'Asia/Kolkata'
  currency: 'INR'
  as_of: string
  start_at: string
  end_at: string
  bucket_unit: 'hour' | 'day' | 'month'
  summary: AnalyticsSummary
  previous: { start_at: string; end_at: string; summary: AnalyticsSummary }
  buckets: (AnalyticsSummary & { start_at: string; end_at: string })[]
  data_quality: {
    incomplete: boolean
    missing_capture_timestamps: number
    invalid_refund_events: number
    excluded_currency_events: number
    unattributed_refunds_paisa: number
  }
}
