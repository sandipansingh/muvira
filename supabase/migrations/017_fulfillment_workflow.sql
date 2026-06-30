-- Order Fulfillment Workflow
-- Tracks fulfillment step progress, pickup scheduling, and label/manifest generation

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_scheduled_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_token_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_generated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manifest_generated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_step TEXT
  CHECK (fulfillment_step IN ('idle','order_created','awb_assigned','pickup_scheduled','label_generated','manifest_generated','ready_for_pickup'));

-- Custom pickup locations stored in site_settings for user-managed warehouses
-- Structure: [{ id, name, company_name, contact_person, phone, email, address, address2, city, state, country, pincode, lat, lng }]
-- Stored under key 'custom_pickup_locations'
