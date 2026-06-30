-- Webhook Events — audit trail for inbound Shiprocket webhooks
-- Stores raw payload, idempotency hash, and processing status.
-- Separate from shipment_events which stores the displayable timeline.

CREATE TABLE IF NOT EXISTS webhook_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source            TEXT        NOT NULL DEFAULT 'shiprocket'
                                CHECK (source IN ('shiprocket', 'razorpay')),
  event_type        TEXT,
  payload_hash      TEXT        NOT NULL,
  raw_payload       JSONB       NOT NULL,
  processing_status TEXT        NOT NULL DEFAULT 'received'
                                CHECK (processing_status IN ('received', 'verified', 'processed', 'failed', 'duplicate')),
  retry_count       INTEGER     NOT NULL DEFAULT 0,
  error_message     TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: duplicate webhook deliveries must never be processed twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_payload_hash
  ON webhook_events (payload_hash);

CREATE INDEX IF NOT EXISTS idx_webhook_events_source_status
  ON webhook_events (source, processing_status)
  WHERE processing_status IN ('received', 'failed');

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
  ON webhook_events (created_at DESC);
