-- Insert default shipping rules configuration into site_settings
INSERT INTO site_settings (key, value) VALUES
  ('shipping_rules', '{"shipping_charge_paisa": 15000, "free_shipping_threshold_paisa": 100000}'::jsonb)
ON CONFLICT (key) DO NOTHING;
