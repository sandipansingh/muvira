-- Site settings (key-value JSONB store for global config)
-- Publicly readable. Only admins can modify (enforced in application + RLS).

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default initial settings
INSERT INTO site_settings (key, value) VALUES
  ('contact_info', '{
    "email": "support@muvira.com",
    "phone": "+91 98765 43210",
    "address": "12 Park Street, Flat 4B, Kolkata, West Bengal, 700016"
  }'::jsonb),
  ('announcement_bar', '{
    "enabled": true,
    "badge": "NEW DEALS",
    "message": "Diwali Festival Sale is active! Save 20% off with coupon DIWALI20"
  }'::jsonb),
  ('hero_slides', '[
    {
      "id": "1",
      "title": "Festival Furniture Bonanza",
      "subtitle": "Up to 30% Off Sheesham Wood Craftsmanship",
      "imageUrl": "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&auto=format&fit=crop&q=80",
      "link": "/categories/solid-wood-furniture"
    },
    {
      "id": "2",
      "title": "Handloom apparel & Kurtas",
      "subtitle": "Organic block-print cotton kurtas from Jaipur weavers",
      "imageUrl": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80",
      "link": "/categories/kurtas-apparel"
    },
    {
      "id": "3",
      "title": "Bespoke cushions & rugs",
      "subtitle": "Jaipur vegetable dye home coordinates to match your sofas",
      "imageUrl": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=1200&auto=format&fit=crop&q=80",
      "link": "/categories/home-decor"
    }
  ]'::jsonb),
  ('store_description', '"Premium Indian lifestyle, apparel, and solid wood furniture designed to bring warmth and authentic craftsmanship into your home."'),
  ('shipping_rules', '{
    "shipping_charge_paisa": 15000,
    "free_shipping_threshold_paisa": 100000
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public read (used on frontend for hero, contact, etc.)
CREATE POLICY "site_settings_select_public"
  ON site_settings FOR SELECT
  USING (true);

-- Only admins can modify settings
CREATE POLICY "site_settings_write_admin"
  ON site_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- updated_at trigger
CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
