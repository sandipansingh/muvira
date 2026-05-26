CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO site_settings (key, value) VALUES
  ('contact_info', '{"email": "support@muvira.com", "phone": "+91 98765 43210", "address": "12 Park Street, Flat 4B, Kolkata, West Bengal, 700016"}'::jsonb),
  ('announcement_bar', '{"enabled": true, "badge": "NEW DEALS", "message": "Diwali Festival Sale is active! Save 20% off with coupon DIWALI20"}'::jsonb),
  ('hero_slides', '[{"id": "1", "title": "Festival Furniture Bonanza", "subtitle": "Up to 30% Off Sheesham Wood Craftsmanship", "imageUrl": "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&auto=format&fit=crop&q=80", "link": "/categories/solid-wood-furniture"}, {"id": "2", "title": "Handloom apparel & Kurtas", "subtitle": "Organic block-print cotton kurtas from Jaipur weavers", "imageUrl": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=80", "link": "/categories/kurtas-apparel"}, {"id": "3", "title": "Bespoke cushions & rugs", "subtitle": "Jaipur vegetable dye home coordinates to match your sofas", "imageUrl": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=1200&auto=format&fit=crop&q=80", "link": "/categories/home-decor"}]'::jsonb)
ON CONFLICT (key) DO NOTHING;
