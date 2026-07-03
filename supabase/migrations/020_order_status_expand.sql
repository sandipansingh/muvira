-- 020: Expand order status to 13 states
-- Adds: out_for_delivery, delivery_failed, rto, returned, lost, damaged
-- Uses a DO block to drop the old unnamed CHECK constraint and create a named one

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'orders'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

ALTER TABLE orders ADD CONSTRAINT chk_orders_status
  CHECK (status IN (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'rto',
    'returned',
    'refunded',
    'lost',
    'damaged',
    'delivery_failed'
  ));
