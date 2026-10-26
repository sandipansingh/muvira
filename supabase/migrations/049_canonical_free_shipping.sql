BEGIN;

INSERT INTO public.site_settings (key, value) VALUES
  ('shipping_methods', '{"standard":{"enabled":true,"label":"Standard Shipping","description":"5–7 business days","charge_paisa":0,"free_threshold_paisa":0},"express":{"enabled":true,"label":"Express Shipping","description":"1–2 business days","charge_paisa":0,"free_threshold_paisa":0}}'),
  ('shipping_rules', '{"shipping_charge_paisa":0,"free_shipping_threshold_paisa":0}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

CREATE FUNCTION public.validate_commerce_setting() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_method JSONB; v_name TEXT;
BEGIN
  IF NEW.key = 'shipping_methods' THEN
    IF jsonb_typeof(NEW.value) IS DISTINCT FROM 'object' OR NOT NEW.value ?& ARRAY['standard','express'] THEN
      RAISE EXCEPTION 'Both shipping methods must be configured' USING ERRCODE = '22023';
    END IF;
    FOREACH v_name IN ARRAY ARRAY['standard','express'] LOOP
      v_method := NEW.value -> v_name;
      IF jsonb_typeof(v_method->'enabled') IS DISTINCT FROM 'boolean'
        OR jsonb_typeof(v_method->'label') IS DISTINCT FROM 'string'
        OR NULLIF(BTRIM(v_method->>'label'), '') IS NULL
        OR jsonb_typeof(v_method->'description') IS DISTINCT FROM 'string'
        OR v_method->'charge_paisa' IS DISTINCT FROM '0'::JSONB
        OR v_method->'free_threshold_paisa' IS DISTINCT FROM '0'::JSONB THEN
        RAISE EXCEPTION 'Shipping must be free with no minimum spend' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  ELSIF NEW.key = 'shipping_rules' THEN
    IF NEW.value IS DISTINCT FROM '{"shipping_charge_paisa":0,"free_shipping_threshold_paisa":0}'::JSONB THEN
      RAISE EXCEPTION 'Legacy shipping rules must match free standard shipping' USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.key = 'shiprocket_settings' THEN
    IF jsonb_typeof(NEW.value) IS DISTINCT FROM 'object'
      OR NULLIF(BTRIM(NEW.value->>'pickup_location'), '') IS NULL THEN
      RAISE EXCEPTION 'Select a registered Shiprocket pickup location' USING ERRCODE = '22023';
    END IF;
    FOREACH v_name IN ARRAY ARRAY['default_length_cm','default_breadth_cm','default_height_cm','default_weight_grams'] LOOP
      IF jsonb_typeof(NEW.value->v_name) IS DISTINCT FROM 'number'
        OR (NEW.value->>v_name)::NUMERIC <= 0
        OR (NEW.value->>v_name)::NUMERIC <> TRUNC((NEW.value->>v_name)::NUMERIC) THEN
        RAISE EXCEPTION 'Positive integer package dimensions and weight are required' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER site_settings_commerce_policy BEFORE INSERT OR UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_commerce_setting();

CREATE OR REPLACE FUNCTION public.update_site_settings_bulk(p_settings JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_key TEXT; v_value JSONB;
BEGIN
  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'Settings payload must be an object' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('commerce_settings', 0));
  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_settings) LOOP
    IF v_key NOT IN ('contact_info','announcement_bar','hero_slides','promo_banners','store_description','shipping_methods','shipping_rules','shiprocket_settings') THEN
      RAISE EXCEPTION 'Unsupported setting key: %', v_key USING ERRCODE = '22023';
    END IF;
    IF v_key IN ('contact_info','announcement_bar','shiprocket_settings') THEN
      IF jsonb_typeof(v_value) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Setting must be an object' USING ERRCODE = '22023';
      END IF;
      SELECT COALESCE((SELECT value FROM public.site_settings WHERE key = v_key), '{}'::JSONB) || v_value INTO v_value;
    END IF;
    INSERT INTO public.site_settings(key,value) VALUES(v_key,v_value)
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW();
  END LOOP;
  IF p_settings ? 'shipping_methods' OR p_settings ? 'shipping_rules' THEN
    INSERT INTO public.site_settings(key,value) VALUES('shipping_rules','{"shipping_charge_paisa":0,"free_shipping_threshold_paisa":0}')
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW();
  END IF;
END;
$$;

CREATE FUNCTION public.enforce_new_order_free_shipping() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_method JSONB;
BEGIN
  SELECT value->NEW.shipping_method INTO v_method FROM public.site_settings WHERE key='shipping_methods';
  IF v_method->'charge_paisa' IS DISTINCT FROM '0'::JSONB
    OR v_method->'free_threshold_paisa' IS DISTINCT FROM '0'::JSONB
    OR v_method->'enabled' IS DISTINCT FROM 'true'::JSONB THEN
    RAISE EXCEPTION 'Shipping configuration is unavailable' USING ERRCODE = '22023';
  END IF;
  IF NEW.shipping_amount_paisa IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'New orders must have free shipping' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_free_shipping BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_new_order_free_shipping();

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v48;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_contract JSONB := public.get_runtime_schema_status_v48(); v_ready BOOLEAN; v_signature TEXT; v_function REGPROCEDURE;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value <> '[]'::JSONB) INTO v_ready;
  FOREACH v_signature IN ARRAY ARRAY['public.validate_commerce_setting()','public.enforce_new_order_free_shipping()','public.update_site_settings_bulk(jsonb)'] LOOP
    v_function := to_regprocedure(v_signature);
    IF v_function IS NULL THEN
      v_contract := jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions') || jsonb_build_array(v_signature));
      v_ready := FALSE;
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE') OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      v_contract := jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants') || jsonb_build_array(v_signature));
      v_ready := FALSE;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='site_settings_commerce_policy' AND NOT tgisinternal AND tgenabled='O')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='orders_free_shipping' AND NOT tgisinternal AND tgenabled='O') THEN
    v_contract := jsonb_set(v_contract,'{missing_constraints}',(v_contract->'missing_constraints') || '["free_shipping_policy"]'::JSONB);
    v_ready := FALSE;
  END IF;
  RETURN v_contract || jsonb_build_object('contract_version',49,'ready',v_ready AND v_contract->>'migration_version'='049');
END;
$$;

REVOKE ALL ON FUNCTION public.validate_commerce_setting(), public.enforce_new_order_free_shipping(), public.update_site_settings_bulk(JSONB), public.get_runtime_schema_status(), public.get_runtime_schema_status_v48() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_commerce_setting(), public.enforce_new_order_free_shipping(), public.update_site_settings_bulk(JSONB), public.get_runtime_schema_status(), public.get_runtime_schema_status_v48() TO service_role;

COMMIT;
