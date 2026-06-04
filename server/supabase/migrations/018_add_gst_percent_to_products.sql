-- Alter products table to add gst_percent column
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_percent INT NOT NULL DEFAULT 0 CHECK (gst_percent >= 0 AND gst_percent <= 100);
