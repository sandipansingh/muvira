-- Revert: Drop columns that were added for Razorpay Item + Invoice sync.
-- This feature (auto-create Razorpay Item on product + create Invoice on payment + PDF download)
-- has been removed.
--
-- Run this migration to clean the database:
--   - supabase db push
--   - or apply manually in the SQL editor

-- ============================================
-- Products table
-- ============================================
DROP INDEX IF EXISTS idx_products_razorpay_item_id;

ALTER TABLE products
DROP COLUMN IF EXISTS razorpay_item_id;

-- ============================================
-- Orders table
-- ============================================
DROP INDEX IF EXISTS idx_orders_razorpay_invoice_id;

ALTER TABLE orders
DROP COLUMN IF EXISTS razorpay_invoice_id;

-- Note: We did not add razorpay_customer_id in this attempt, so it is not dropped here.
-- If you have older columns from previous attempts, they may have already been removed by 022/023.