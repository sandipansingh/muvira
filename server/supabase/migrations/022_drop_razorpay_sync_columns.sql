-- Revert: Drop columns that were added for Razorpay invoice / customer / item sync.
-- This feature was removed. Run via `supabase db push` (or apply manually).

-- Products
DROP INDEX IF EXISTS idx_products_razorpay_item_id;
ALTER TABLE products DROP COLUMN IF EXISTS razorpay_item_id;

-- Orders
DROP INDEX IF EXISTS idx_orders_razorpay_customer_id;
DROP INDEX IF EXISTS idx_orders_razorpay_invoice_id;
ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_customer_id;
ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_invoice_id;