-- Track Shiprocket order creation status + error messages

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_status TEXT
  CHECK (shiprocket_status IN ('pending', 'created', 'failed'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_error TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_shiprocket_status ON orders (shiprocket_status)
  WHERE shiprocket_status IS NOT NULL;
