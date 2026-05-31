-- Insert default store description setting
INSERT INTO site_settings (key, value)
VALUES ('store_description', '"Premium Indian lifestyle, apparel, and solid wood furniture designed to bring warmth and authentic craftsmanship into your home."'::jsonb)
ON CONFLICT (key) DO NOTHING;
