--
-- Drop old manual tracking columns; add Shiprocket AWB code column.
-- carrier_name and tracking_id are replaced entirely by awb_code.
-- fulfillment_status is retained as a workflow status indicator.
--

ALTER TABLE orders
  DROP COLUMN IF EXISTS carrier_name,
  DROP COLUMN IF EXISTS tracking_id,
  ADD COLUMN IF NOT EXISTS awb_code TEXT;

-- Index for fast lookups (e.g. bulk tracking queries)
CREATE INDEX IF NOT EXISTS idx_orders_awb_code ON orders (awb_code) WHERE awb_code IS NOT NULL;
