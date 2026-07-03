-- 024: Tracking Snapshots
-- Periodic snapshots of tracking data for analytics and delivery SLA monitoring.
-- Each snapshot captures a point-in-time view of a shipment's tracking state,
-- enabling historical queries like:
--   - Average delivery time by courier
--   - Shipments stuck in processing for >48h
--   - RTO rate by destination state
--   - Courier performance by region

CREATE TABLE IF NOT EXISTS tracking_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  awb_code        TEXT        NOT NULL,
  shipment_id     TEXT,
  courier_name    TEXT,
  current_status  TEXT        NOT NULL,
  origin          TEXT,
  destination     TEXT,
  estimated_delivery_date DATE,
  pickup_date     TIMESTAMPTZ,
  delivered_date  TIMESTAMPTZ,
  tracking_raw    JSONB,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_source     TEXT        NOT NULL CHECK (sync_source IN ('webhook', 'cron_poll', 'manual'))
);

-- Query patterns:
-- 1. Latest snapshot per order
-- 2. Time-range analytics by courier/status/region
-- 3. SLA breach detection (orders stuck in processing > 48h since pickup)
CREATE INDEX IF NOT EXISTS idx_tracking_snapshots_order
  ON tracking_snapshots (order_id, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_snapshots_synced_at
  ON tracking_snapshots (synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_snapshots_courier_status
  ON tracking_snapshots (courier_name, current_status)
  WHERE courier_name IS NOT NULL;

-- Admin-only table (raw tracking data)
ALTER TABLE tracking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracking_snapshots_select_admin"
  ON tracking_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "tracking_snapshots_insert_service_role"
  ON tracking_snapshots FOR INSERT
  WITH CHECK (true);

-- View: recent shipment health (orders not delivered within 3 days of OFD)
CREATE OR REPLACE VIEW shipment_health AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.status,
  o.courier_name,
  o.awb_code,
  o.created_at AS order_created_at,
  o.shipping_city || ', ' || o.shipping_state AS destination,
  ts.current_status AS last_tracking_status,
  ts.synced_at AS last_synced_at,
  CASE
    WHEN o.status = 'out_for_delivery' AND ts.synced_at < NOW() - INTERVAL '1 day'
      THEN 'warning: OFD > 24h, possible NDR'
    WHEN o.status = 'processing' AND o.created_at < NOW() - INTERVAL '2 days'
      THEN 'warning: processing > 48h, pickup may be delayed'
    WHEN o.status = 'shipped' AND o.created_at < NOW() - INTERVAL '7 days'
      THEN 'warning: in transit > 7 days'
    ELSE 'healthy'
  END AS health_status
FROM orders o
LEFT JOIN LATERAL (
  SELECT current_status, synced_at
  FROM tracking_snapshots
  WHERE order_id = o.id
  ORDER BY synced_at DESC
  LIMIT 1
) ts ON true
WHERE o.status IN ('processing', 'shipped', 'out_for_delivery', 'delivery_failed')
  AND o.awb_code IS NOT NULL
ORDER BY
  CASE
    WHEN o.status = 'delivery_failed' THEN 1
    WHEN o.status = 'out_for_delivery' THEN 2
    WHEN o.status = 'processing' THEN 3
    ELSE 4
  END;
