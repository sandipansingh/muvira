-- 
-- payments
-- One row per Razorpay order. Status transitions:
--   created → captured (success)
--   created → failed   (payment failed)
--   captured → refunded (future)
-- 

CREATE TABLE IF NOT EXISTS payments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID        NOT NULL REFERENCES orders (id),
  razorpay_order_id     TEXT        NOT NULL UNIQUE,
  razorpay_payment_id   TEXT        UNIQUE,       -- set on capture
  razorpay_signature    TEXT,                     -- set on capture
  amount_paisa          INT         NOT NULL CHECK (amount_paisa > 0),
  currency              TEXT        NOT NULL DEFAULT 'INR',
  status                TEXT        NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','captured','failed','refunded')),
  failure_reason        TEXT,
  captured_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id          ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status            ON payments (status);

-- Row-Level Security 
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can see payments belonging to their orders
CREATE POLICY "payments_select_own"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- Admins can read all payments
CREATE POLICY "payments_select_admin"
  ON payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- NOTE: INSERT and UPDATE on payments is ONLY done via the service-role client
-- (in the checkout and payment-capture code paths). No user-level INSERT policy
-- is created — all payment mutations go through the trusted server layer.

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 
-- payment_logs
-- Audit trail for every payment lifecycle event. Append-only.
-- event_type values: created | verify_attempt | verify_success | verify_failure
--                    webhook_received | webhook_processed | webhook_duplicate | webhook_failed
-- 

CREATE TABLE IF NOT EXISTS payment_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id          UUID        REFERENCES payments (id),
  order_id            UUID        REFERENCES orders (id),
  event_type          TEXT        NOT NULL,
  payload             JSONB,
  razorpay_event_id   TEXT,       -- used for webhook dedup check
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_id       ON payment_logs (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id         ON payment_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type       ON payment_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_razorpay_event   ON payment_logs (razorpay_event_id)
  WHERE razorpay_event_id IS NOT NULL;

-- Row-Level Security 
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment logs
CREATE POLICY "payment_logs_select_own"
  ON payment_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- Admins can read all payment logs
CREATE POLICY "payment_logs_select_admin"
  ON payment_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- INSERT is service-role only (payment capture and webhook paths)
