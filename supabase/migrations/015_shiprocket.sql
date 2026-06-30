-- Shiprocket integration
-- Adds shipping carrier fields to orders table + shipment_events tracking table

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_weight_grams INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_length_cm INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_breadth_cm INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_height_cm INT;

CREATE INDEX IF NOT EXISTS idx_orders_shiprocket_order_id ON orders (shiprocket_order_id)
  WHERE shiprocket_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shipment_id ON orders (shipment_id)
  WHERE shipment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS shipment_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  shipment_id  TEXT,
  status       TEXT        NOT NULL,
  location     TEXT,
  remarks      TEXT,
  event_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_order_id ON shipment_events (order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON shipment_events (shipment_id)
  WHERE shipment_id IS NOT NULL;

ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipment_events_select_own"
  ON shipment_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE POLICY "shipment_events_select_admin"
  ON shipment_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "shipment_events_insert_admin"
  ON shipment_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
