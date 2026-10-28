import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronDown, CircleHelp, TriangleAlert } from 'lucide-react'
import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  DashboardAnalytics,
} from '../../lib/types/adminAnalytics'
import { formatPrice } from '../../lib/utils/format'
import { AdminState, AdminTable } from './AdminWorkspace'

const periods: { value: AnalyticsPeriod; label: string; description: string }[] = [
  { value: 'day', label: 'Day', description: 'Today' },
  { value: 'week', label: 'Week', description: 'Last 7 days' },
  { value: 'month', label: 'Month', description: 'Last 30 days' },
  { value: 'year', label: 'Year', description: 'Last 12 months' },
]

function dateLabel(value: string, unit: DashboardAnalytics['bucket_unit'], full = false) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    ...(unit === 'hour'
      ? { hour: 'numeric', minute: '2-digit' }
      : unit === 'month'
        ? { month: 'short', ...(full ? { year: 'numeric' } : {}) }
        : { day: 'numeric', month: 'short' }),
  }).format(new Date(value))
}
function rangeLabel(start: string, end: string) {
  const format = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${format.format(new Date(start))} – ${format.format(new Date(end))}`
}
function comparison(value: number, previous: number, money: boolean) {
  const difference = value - previous
  if (difference === 0) return 'No change from previous period'
  const amount = money ? formatPrice(difference) : difference.toLocaleString('en-IN')
  const percent =
    previous > 0
      ? ` (${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format((difference / previous) * 100)}%)`
      : ''
  return `${difference > 0 ? '+' : ''}${amount}${percent} vs previous period`
}

function RevenueChart({ data }: { data: DashboardAnalytics }) {
  const chartId = useId().replaceAll(':', '')
  const container = useRef<HTMLDivElement>(null)
  const [geometry, setGeometry] = useState({ width: 720, fontSize: 16 })
  useEffect(() => {
    const measure = () => {
      if (!container.current) return
      const width = container.current.getBoundingClientRect().width
      const fontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      if (width > 0)
        setGeometry((current) =>
          current.width === width && current.fontSize === fontSize ? current : { width, fontSize }
        )
    }
    const observer = new ResizeObserver(measure)
    if (container.current) observer.observe(container.current)
    observer.observe(document.documentElement)
    measure()
    return () => observer.disconnect()
  }, [])
  const [hover, setHover] = useState<number | null>(null)
  const { width, fontSize } = geometry
  const height = fontSize * 15.625,
    left = fontSize * 3.75,
    right = fontSize,
    top = fontSize * 1.125,
    bottom = fontSize * 2.25
  const labelSlots = Math.max(1, Math.floor((width - left - right) / (fontSize * 5)))
  const values = data.buckets.map((bucket) => bucket.net_paisa)
  const min = Math.min(0, ...values),
    max = Math.max(100, ...values)
  const padding = (max - min) * 0.08
  const low = min < 0 ? min - padding : 0,
    high = max + padding
  const y = (value: number) => top + ((high - value) / (high - low)) * (height - top - bottom)
  const x = (index: number) =>
    left +
    (values.length === 1 ? 0.5 : index / Math.max(1, values.length - 1)) * (width - left - right)
  const line = values
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(value)}`)
    .join(' ')
  const area = values.length ? `${line} L${x(values.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : ''
  const selected = hover === null ? null : data.buckets[hover]
  const axis = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  const tickValues = [high, (high + low) / 2, low]
  return (
    <>
      <div ref={container} className="admin-revenue-chart" onPointerLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`${chartId}-title ${chartId}-description`}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const position = ((event.clientX - rect.left) / rect.width) * width
            setHover(
              values.length
                ? Math.max(
                    0,
                    Math.min(
                      values.length - 1,
                      Math.round(((position - left) / (width - left - right)) * (values.length - 1))
                    )
                  )
                : null
            )
          }}
        >
          <title id={`${chartId}-title`}>Net collections by {data.bucket_unit}</title>
          <desc id={`${chartId}-description`}>
            {formatPrice(data.summary.net_paisa)} net collections. Confirmed payments minus refunds,
            in IST. Exact values are available in the chart data table.
          </desc>
          <defs>
            <pattern id={`${chartId}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M2 0V5" stroke="var(--color-line)" strokeWidth="1" />
            </pattern>
          </defs>
          {tickValues.map((value, index) => (
            <g key={index}>
              <line
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--color-line)"
              />
              <text
                x={left - fontSize * 0.75}
                y={y(value) + fontSize * 0.25}
                textAnchor="end"
                className="admin-chart-axis"
              >
                {axis.format(value / 100)}
              </text>
            </g>
          ))}
          <line
            x1={left}
            x2={width - right}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-muted)"
            strokeDasharray="3 4"
          />
          <path d={area} fill={`url(#${chartId}-hatch)`} />
          <path
            d={line}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {data.buckets.map((bucket, index) => (
            <g key={bucket.start_at}>
              {(index === values.length - 1 ||
                (labelSlots > 1 &&
                  (index === 0 ||
                    index % Math.max(1, Math.ceil(values.length / labelSlots)) === 0))) && (
                <text
                  x={x(index)}
                  y={height - fontSize * 0.625}
                  textAnchor={
                    values.length === 1
                      ? 'middle'
                      : index === 0
                        ? 'start'
                        : index === values.length - 1
                          ? 'end'
                          : 'middle'
                  }
                  className="admin-chart-axis"
                >
                  {dateLabel(bucket.start_at, data.bucket_unit)}
                </text>
              )}
              {hover === index && (
                <>
                  <line
                    x1={x(index)}
                    x2={x(index)}
                    y1={top}
                    y2={height - bottom}
                    stroke="var(--color-muted)"
                    strokeDasharray="3 4"
                  />
                </>
              )}
              {(hover === index || values.length === 1) && (
                <circle
                  cx={x(index)}
                  cy={y(bucket.net_paisa)}
                  r="4"
                  fill="var(--color-paper)"
                  stroke="var(--color-ink)"
                  strokeWidth="2"
                />
              )}
            </g>
          ))}
        </svg>
        {selected && (
          <div className="admin-chart-tooltip" aria-hidden="true">
            <span>{dateLabel(selected.start_at, data.bucket_unit, true)}</span>
            <strong>{formatPrice(selected.net_paisa)}</strong>
            <span>
              Collected {formatPrice(selected.collected_paisa)} · Refunded{' '}
              {formatPrice(selected.refunded_paisa)}
            </span>
          </div>
        )}
      </div>
      {data.summary.collected_paisa === 0 && data.summary.refunded_paisa === 0 && (
        <p className="admin-chart-empty">No confirmed payments or refunds in this period.</p>
      )}
      <details className="admin-chart-data">
        <summary>
          View chart data
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <AdminTable
          label="Revenue by period"
          headers={['Period (IST)', 'Collected', 'Refunded', 'Net collections', 'Orders placed']}
        >
          {data.buckets.map((bucket) => (
            <tr key={bucket.start_at}>
              <td>{dateLabel(bucket.start_at, data.bucket_unit, true)}</td>
              <td className="admin-number">{formatPrice(bucket.collected_paisa)}</td>
              <td className="admin-number">{formatPrice(bucket.refunded_paisa)}</td>
              <td className="admin-number">{formatPrice(bucket.net_paisa)}</td>
              <td className="admin-number">{bucket.orders_placed.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </AdminTable>
      </details>
    </>
  )
}

export function AdminRevenue({
  period,
  onPeriodChange,
  data,
  loading,
  error,
  onRetry,
}: {
  period: AnalyticsPeriod
  onPeriodChange: (period: AnalyticsPeriod) => void
  data: DashboardAnalytics | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const current = data?.period === period ? data : null
  const metrics: { key: keyof AnalyticsSummary; label: string; money: boolean }[] = [
    { key: 'net_paisa', label: 'Net collections', money: true },
    { key: 'collected_paisa', label: 'Payments collected', money: true },
    { key: 'refunded_paisa', label: 'Refunds', money: true },
    { key: 'orders_placed', label: 'Orders placed', money: false },
  ]
  return (
    <section aria-label="Revenue analytics" className="admin-analytics">
      <div className="admin-performance-heading">
        <h2>Overview performance</h2>
        <div className="admin-period-control" role="group" aria-label="Reporting period">
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={period === item.value}
              onClick={() => onPeriodChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-analytics-body" aria-busy={loading}>
        {loading || (!current && !error) ? (
          <AdminState loading />
        ) : error ? (
          <AdminState error={error} onRetry={onRetry} />
        ) : (
          current && (
            <>
              <div className="admin-performance-grid" aria-label="Period totals">
                {metrics.map(({ key, label, money }) => (
                  <div key={key} className="admin-performance-cell">
                    <p>{label}</p>
                    <strong>
                      {money
                        ? formatPrice(current.summary[key])
                        : current.summary[key].toLocaleString('en-IN')}
                    </strong>
                    <span>
                      {comparison(current.summary[key], current.previous.summary[key], money)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="admin-revenue-heading">
                <h2>Revenue</h2>
                <span>{periods.find((item) => item.value === period)?.description}</span>
              </div>
              <div className="panel admin-revenue-panel">
                <div className="admin-revenue-summary">
                  <div>
                    <p>Net collections</p>
                    <strong>{formatPrice(current.summary.net_paisa)}</strong>
                    <span>{rangeLabel(current.start_at, current.end_at)} · IST</span>
                  </div>
                  <span className="admin-revenue-direction" aria-hidden="true">
                    {current.summary.net_paisa < 0 ? <ArrowDownLeft /> : <ArrowUpRight />}
                  </span>
                </div>
                <RevenueChart key={`${current.period}-${current.as_of}`} data={current} />
                <details className="admin-reporting-definition">
                  <summary>
                    <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                    How revenue is calculated
                  </summary>
                  <p>
                    Confirmed collections minus confirmed refunds, on their locally recorded
                    confirmation dates. Includes shipping and tax; processing fees are not deducted.
                    Orders placed use order creation dates. Current and previous periods include the
                    same elapsed portion.
                  </p>
                  <p>
                    Previous period:{' '}
                    {rangeLabel(current.previous.start_at, current.previous.end_at)} · IST. Updated{' '}
                    {new Intl.DateTimeFormat('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(current.as_of))}{' '}
                    IST.
                  </p>
                </details>
              </div>
              {current.data_quality.incomplete && (
                <div className="admin-reporting-warning" role="status">
                  <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <strong>Reporting is incomplete</strong>
                    <p>
                      Some confirmed transactions have missing or conflicting reporting records.
                      Unattributed refunds:{' '}
                      {formatPrice(current.data_quality.unattributed_refunds_paisa)}. Totals include
                      only transactions with reliable dates and identities.
                    </p>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </section>
  )
}
