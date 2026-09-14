BEGIN;

UPDATE site_settings
SET value = '{"email":"","phone":"","address":""}'::jsonb
WHERE key = 'contact_info'
  AND value = '{
    "email": "support@muvira.com",
    "phone": "+91 98765 43210",
    "address": "12 Park Street, Flat 4B, Kolkata, West Bengal, 700016"
  }'::jsonb;

UPDATE site_settings
SET value = '{"enabled":false,"badge":"","message":""}'::jsonb
WHERE key = 'announcement_bar'
  AND value = '{
    "enabled": true,
    "badge": "NEW DEALS",
    "message": "Diwali Festival Sale is active! Save 20% off with coupon DIWALI20"
  }'::jsonb;

UPDATE site_settings
SET value = '[]'::jsonb
WHERE key = 'hero_slides'
  AND value = '[
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
  ]'::jsonb;

UPDATE site_settings
SET value = '""'::jsonb
WHERE key = 'store_description'
  AND value = '"Premium Indian lifestyle, apparel, and solid wood furniture designed to bring warmth and authentic craftsmanship into your home."'::jsonb;

COMMIT;
