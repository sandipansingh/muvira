BEGIN;

WITH ranked_images AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id
      ORDER BY is_primary DESC, sort_order, created_at, id
    ) AS position
  FROM product_images
)
UPDATE product_images
SET is_primary = ranked_images.position = 1
FROM ranked_images
WHERE product_images.id = ranked_images.id;

CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_per_product
  ON product_images (product_id)
  WHERE is_primary = TRUE;

CREATE OR REPLACE FUNCTION update_site_settings_bulk(p_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key TEXT;
  v_value JSONB;
BEGIN
  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'Settings payload must be an object' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_settings)
  LOOP
    IF v_key NOT IN (
      'contact_info',
      'announcement_bar',
      'hero_slides',
      'promo_banners',
      'store_description',
      'shipping_rules',
      'shiprocket_settings'
    ) THEN
      RAISE EXCEPTION 'Unsupported setting key: %', v_key USING ERRCODE = '22023';
    END IF;

    INSERT INTO site_settings (key, value, updated_at)
    VALUES (v_key, v_value, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION update_site_settings_bulk(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION update_site_settings_bulk(JSONB) TO service_role;

CREATE OR REPLACE FUNCTION add_product_image_atomic(
  p_product_id UUID,
  p_url TEXT,
  p_alt_text TEXT,
  p_sort_order INT,
  p_is_primary BOOLEAN
)
RETURNS product_images
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_image product_images%ROWTYPE;
BEGIN
  PERFORM 1 FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002'; END IF;

  IF p_is_primary THEN
    UPDATE product_images SET is_primary = FALSE WHERE product_id = p_product_id;
  END IF;

  INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
  VALUES (p_product_id, p_url, p_alt_text, p_sort_order, p_is_primary)
  RETURNING * INTO v_image;
  RETURN v_image;
END;
$$;

CREATE OR REPLACE FUNCTION delete_product_image_atomic(
  p_product_id UUID,
  p_image_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_was_primary BOOLEAN;
BEGIN
  PERFORM 1 FROM products WHERE id = p_product_id FOR UPDATE;
  DELETE FROM product_images
  WHERE id = p_image_id AND product_id = p_product_id
  RETURNING is_primary INTO v_was_primary;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF v_was_primary THEN
    UPDATE product_images
    SET is_primary = TRUE
    WHERE id = (
      SELECT id FROM product_images
      WHERE product_id = p_product_id
      ORDER BY sort_order, created_at
      LIMIT 1
    );
  END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION reorder_product_images_atomic(
  p_product_id UUID,
  p_image_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected INT;
  v_supplied INT;
BEGIN
  PERFORM 1 FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002'; END IF;

  SELECT COUNT(*) INTO v_expected FROM product_images WHERE product_id = p_product_id;
  SELECT COUNT(DISTINCT supplied.image_id)
  INTO v_supplied
  FROM unnest(p_image_ids) AS supplied(image_id);
  IF v_expected <> v_supplied OR EXISTS (
    SELECT 1 FROM unnest(p_image_ids) AS supplied(image_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM product_images
      WHERE product_images.id = supplied.image_id
        AND product_images.product_id = p_product_id
    )
  ) THEN
    RAISE EXCEPTION 'Image order must contain every product image exactly once'
      USING ERRCODE = '22023';
  END IF;

  UPDATE product_images
  SET is_primary = FALSE
  WHERE product_id = p_product_id;

  UPDATE product_images
  SET
    sort_order = ordered.position - 1,
    is_primary = ordered.position = 1
  FROM unnest(p_image_ids) WITH ORDINALITY AS ordered(image_id, position)
  WHERE product_images.id = ordered.image_id
    AND product_images.product_id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION add_product_image_atomic(UUID, TEXT, TEXT, INT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION delete_product_image_atomic(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION reorder_product_images_atomic(UUID, UUID[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION add_product_image_atomic(UUID, TEXT, TEXT, INT, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION delete_product_image_atomic(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reorder_product_images_atomic(UUID, UUID[]) TO service_role;

COMMIT;
