-- Drop gst_percent column from products table
ALTER TABLE products DROP COLUMN IF EXISTS gst_percent;
