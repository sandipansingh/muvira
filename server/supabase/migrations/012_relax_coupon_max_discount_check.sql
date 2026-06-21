-- Allow max_discount_paisa = 0 (or NULL) to represent "no cap" for percentage discount coupons.
-- 0 in the admin UI means "No Cap".
-- Previous CHECK (max_discount_paisa > 0) was too strict.

ALTER TABLE coupons
  DROP CONSTRAINT IF EXISTS coupons_max_discount_paisa_check;

ALTER TABLE coupons
  ADD CONSTRAINT coupons_max_discount_paisa_check
  CHECK (max_discount_paisa IS NULL OR max_discount_paisa >= 0);

-- Optional: also document the new semantics
COMMENT ON COLUMN coupons.max_discount_paisa IS 
  'Max discount cap (paisa) for percentage-type coupons. NULL or 0 means no cap.';