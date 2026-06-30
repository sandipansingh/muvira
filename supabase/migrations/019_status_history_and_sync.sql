-- 019: Order Status History, Sync Jobs, and performance indexes
-- Records every status transition for audit trail and debugging

CREATE TABLE IF NOT EXISTS order_status_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT        NOT NULL,
  source       TEXT        NOT NULL CHECK (source IN ('webhook', 'polling_sync', 'admin_manual', 'system')),
  actor_id     UUID        REFERENCES profiles (id) ON DELETE SET NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order
  ON order_status_history (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_history_source
  ON order_status_history (source);

-- Sync job tracking — records each cron/manual sync run
CREATE TABLE IF NOT EXISTS sync_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT        NOT NULL CHECK (job_type IN ('full_poll', 'ofd_poll', 'manual')),
  status          TEXT        NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  orders_checked  INTEGER     NOT NULL DEFAULT 0,
  orders_updated  INTEGER     NOT NULL DEFAULT 0,
  errors          JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_type_created
  ON sync_jobs (job_type, started_at DESC);

-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_orders_awb_status
  ON orders (awb_code, status)
  WHERE awb_code IS NOT NULL AND status NOT IN ('delivered', 'cancelled', 'returned', 'refunded', 'lost', 'damaged');

CREATE INDEX IF NOT EXISTS idx_shipment_events_order_time
  ON shipment_events (order_id, event_time DESC);
