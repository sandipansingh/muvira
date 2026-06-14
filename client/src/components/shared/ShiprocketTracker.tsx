import React, { useState, useEffect } from 'react'
import { Truck, MapPin, Package, RefreshCw, ExternalLink } from 'lucide-react'
import { trackingApiService } from '../../lib/api/tracking'
import type { ShiprocketTrackData } from '../../types/order'

interface ShiprocketTrackerProps {
  awbCode: string | null
}

// Map Shiprocket sr-status-label to a colour class
function getStatusColor(label?: string): string {
  if (!label) return 'text-secondary500'
  const l = label.toUpperCase()
  if (l.includes('DELIVERED')) return 'text-emerald-600'
  if (l.includes('OUT FOR DELIVERY')) return 'text-blue-600'
  if (l.includes('TRANSIT') || l.includes('IN TRANSIT')) return 'text-blue-500'
  if (l.includes('PICKED') || l.includes('PICKUP')) return 'text-indigo-500'
  if (l.includes('CANCELLED') || l.includes('RTO')) return 'text-rose-600'
  if (l.includes('SHIPPED')) return 'text-purple-600'
  return 'text-secondary600'
}

function getStatusDotColor(label?: string): string {
  if (!label) return 'bg-secondary300'
  const l = label.toUpperCase()
  if (l.includes('DELIVERED')) return 'bg-emerald-500'
  if (l.includes('OUT FOR DELIVERY')) return 'bg-blue-500'
  if (l.includes('TRANSIT') || l.includes('IN TRANSIT')) return 'bg-blue-400'
  if (l.includes('PICKED') || l.includes('PICKUP')) return 'bg-indigo-500'
  if (l.includes('CANCELLED') || l.includes('RTO')) return 'bg-rose-500'
  if (l.includes('SHIPPED')) return 'bg-purple-500'
  return 'bg-secondary400'
}

function formatTrackDate(dateStr: string): { date: string; time: string } {
  try {
    const d = new Date(dateStr)
    return {
      date: d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      time: d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  } catch {
    return { date: dateStr, time: '' }
  }
}

const ShiprocketTracker: React.FC<ShiprocketTrackerProps> = ({ awbCode }) => {
  const [trackData, setTrackData] = useState<ShiprocketTrackData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTracking = async () => {
    if (!awbCode) return
    setLoading(true)
    setError(null)
    const data = await trackingApiService.trackSingle(awbCode)
    if (data) {
      setTrackData(data)
    } else {
      setError('Could not fetch live tracking. Try again shortly.')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTracking()
  }, [awbCode])

  // ── No AWB ───────────────────────────────────────────────────────────────────
  if (!awbCode) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-lightgrayColor border border-secondary200 flex items-center justify-center">
          <Package className="w-5 h-5 text-secondary400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-secondary600">Awaiting Dispatch</p>
          <p className="text-xs text-secondary400 mt-1">
            Tracking will appear once your order is shipped via Shiprocket.
          </p>
        </div>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Current status skeleton */}
        <div className="h-16 rounded-xl bg-lightgrayColor border border-secondary200" />
        {/* Activity items skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 pl-2">
            <div className="w-3 h-3 rounded-full bg-secondary200 mt-1 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-48 bg-secondary200 rounded" />
              <div className="h-3 w-32 bg-secondary100 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !trackData) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-xs text-secondary500">{error || 'No tracking data available yet.'}</p>
        <button
          onClick={fetchTracking}
          className="flex items-center gap-1.5 text-xs text-primaryBg font-semibold hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    )
  }

  const currentInfo = trackData.shipment_track?.[0]
  const activities = trackData.shipment_track_activities ?? []
  const currentStatusLabel = activities[0]?.['sr-status-label'] ?? currentInfo?.current_status ?? ''

  return (
    <div className="space-y-5 text-left">
      {/* ── Current Status Banner ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-secondary200 bg-lightgrayColor/40 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-white border border-secondary200 flex items-center justify-center shrink-0 shadow-sm">
          <Truck className="w-4 h-4 text-primaryBg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-bold tracking-wide ${getStatusColor(currentStatusLabel)}`}
            >
              {currentStatusLabel || currentInfo?.current_status || 'In Progress'}
            </span>
            {currentInfo?.courier_name && (
              <span className="text-[10px] font-medium text-secondary500 bg-white border border-secondary200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                via {currentInfo.courier_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-secondary400 shrink-0" />
            <span className="text-xs text-secondary500 truncate">
              {currentInfo?.origin} → {currentInfo?.destination}
            </span>
          </div>
          {trackData.etd && (
            <p className="text-[10px] text-secondary400 mt-1 uppercase tracking-wider font-medium">
              Est. Delivery: {formatTrackDate(trackData.etd).date}
            </p>
          )}
        </div>
        {/* AWB + Track URL */}
        <div className="text-right shrink-0">
          <p className="text-[10px] text-secondary400 uppercase tracking-wider">AWB</p>
          <p className="text-xs font-bold text-darkColor">{awbCode}</p>
          {trackData.track_url && (
            <a
              href={trackData.track_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-primaryBg font-semibold hover:underline mt-1 justify-end"
            >
              Shiprocket
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* ── Activity Timeline ─────────────────────────────────────────────── */}
      {activities.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-secondary500 mb-3 pl-0.5">
            Shipment Activity
          </h4>
          <div className="relative pl-5">
            {/* Vertical connector line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-[1.5px] bg-secondary200 pointer-events-none" />

            <div className="space-y-5">
              {activities.map((act, idx) => {
                const { date, time } = formatTrackDate(act.date)
                const srLabel = act['sr-status-label']
                const isFirst = idx === 0

                return (
                  <div key={idx} className="relative flex gap-3 items-start">
                    {/* Dot */}
                    <span
                      className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 border-white z-10 shadow-sm ${
                        isFirst ? getStatusDotColor(srLabel) + ' scale-125' : 'bg-secondary300'
                      }`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {srLabel && srLabel !== 'NA' && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest block mb-0.5 ${
                            isFirst ? getStatusColor(srLabel) : 'text-secondary400'
                          }`}
                        >
                          {srLabel}
                        </span>
                      )}
                      <p
                        className={`text-xs leading-snug ${
                          isFirst ? 'text-darkColor font-medium' : 'text-secondary600'
                        }`}
                      >
                        {act.activity}
                      </p>
                      {act.location && act.location !== 'NA' && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-secondary400 shrink-0" />
                          <span className="text-[10px] text-secondary400 capitalize">
                            {act.location}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-secondary500 font-medium block">
                        {date}
                      </span>
                      {time && <span className="text-[10px] text-secondary400 block">{time}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Refresh hint */}
      <div className="flex items-center justify-end gap-1.5 pt-1">
        <button
          onClick={fetchTracking}
          disabled={loading}
          className="flex items-center gap-1.5 text-[10px] text-secondary400 hover:text-primaryBg transition-colors font-medium uppercase tracking-wider"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  )
}

export default ShiprocketTracker
