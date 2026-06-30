-- 023: RLS Policies & Updated-At Triggers for new tables
-- Tables created in migrations 018-022 need RLS and triggers to match
-- the security posture of earlier tables (orders, payments, etc.)

-- ============================================================
-- UPDATED_AT triggers
-- ============================================================

-- webhook_events — mutable after initial insert (processing_status updates)
CREATE TRIGGER webhook_events_set_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- sync_jobs — mutable after initial insert (status/result updates)
CREATE TRIGGER sync_jobs_set_updated_at
  BEFORE UPDATE ON sync_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- notification_logs has a unique index that prevents dupes but no trigger needed
-- (append-only, no UPDATE path in application code)

-- order_status_history is append-only — no updated_at column needed

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- webhook_events — admin-only (contains raw payloads with sensitive data)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_select_admin"
  ON webhook_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "webhook_events_insert_service_role"
  ON webhook_events FOR INSERT
  WITH CHECK (true);  -- service_role bypasses RLS; this is for admin insert via API

-- sync_jobs — admin-only (internal sync tracking)
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_jobs_select_admin"
  ON sync_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "sync_jobs_insert_service_role"
  ON sync_jobs FOR INSERT
  WITH CHECK (true);

-- retry_jobs — admin-only (internal retry queue, contains payload data)
ALTER TABLE retry_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retry_jobs_select_admin"
  ON retry_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "retry_jobs_insert_service_role"
  ON retry_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "retry_jobs_update_admin"
  ON retry_jobs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- order_status_history — customer-visible (users see own, admins see all)
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_status_history_select_own"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_status_history_select_admin"
  ON order_status_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "order_status_history_insert_service_role"
  ON order_status_history FOR INSERT
  WITH CHECK (true);

-- notification_logs — customer-visible (users see own, admins see all)
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_logs_select_own"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "notification_logs_select_admin"
  ON notification_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "notification_logs_insert_service_role"
  ON notification_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- DATA INTEGRITY
-- ============================================================

-- shipment_events: ensure no duplicate events for the exact same payload hash
-- (idempotency at the DB level, complementing webhook_events dedup)
ALTER TABLE shipment_events ADD COLUMN IF NOT EXISTS payload_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_events_payload_hash
  ON shipment_events (payload_hash)
  WHERE payload_hash IS NOT NULL;

-- Add order_number index for improved search performance (already has unique,
-- but this explicitly covers the pattern used in admin search queries)
CREATE INDEX IF NOT EXISTS idx_orders_order_number_trgm
  ON orders USING gin (order_number gin_trgm_ops);

-- Fulfillment step + status combo for admin workflow filtering
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_step_status
  ON orders (fulfillment_step, status)
  WHERE fulfillment_step IS NOT NULL;
