BEGIN;

CREATE FUNCTION public.get_dashboard_stats(
  p_from_date TIMESTAMPTZ DEFAULT NULL, p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_now TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_today TIMESTAMPTZ; v_orders JSONB; v_products JSONB;
BEGIN
  IF p_now IS NULL OR NOT isfinite(p_now)
    OR (p_from_date IS NOT NULL AND NOT isfinite(p_from_date))
    OR (p_to_date IS NOT NULL AND NOT isfinite(p_to_date))
    OR p_from_date > p_to_date THEN
    RAISE EXCEPTION 'Invalid dashboard date range' USING ERRCODE='22023';
  END IF;
  v_today:=date_trunc('day',p_now AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
  SELECT jsonb_build_object(
    'total_orders',COUNT(*) FILTER (WHERE (p_from_date IS NULL OR created_at>=p_from_date) AND (p_to_date IS NULL OR created_at<=p_to_date)),
    'orders_today',COUNT(*) FILTER (WHERE created_at>=v_today AND created_at<v_today+INTERVAL '24 hours'),
    'total_revenue_paisa',COALESCE(SUM(total_amount_paisa::BIGINT) FILTER (WHERE payment_status='paid' AND (p_from_date IS NULL OR created_at>=p_from_date) AND (p_to_date IS NULL OR created_at<=p_to_date)),0),
    'revenue_today_paisa',COALESCE(SUM(total_amount_paisa::BIGINT) FILTER (WHERE payment_status='paid' AND created_at>=v_today AND created_at<v_today+INTERVAL '24 hours'),0),
    'pending_orders',COUNT(*) FILTER (WHERE status='pending'),
    'confirmed_orders',COUNT(*) FILTER (WHERE status='confirmed')
  ) INTO v_orders FROM public.orders;
  SELECT jsonb_build_object('total_products',COUNT(*),'active_products',COUNT(*) FILTER(WHERE is_active),'low_stock_count',COUNT(*) FILTER(WHERE is_active AND stock<=10)) INTO v_products FROM public.products;
  RETURN v_orders||v_products||jsonb_build_object(
    'total_categories',(SELECT COUNT(*) FROM public.categories WHERE is_active),
    'active_coupons',(SELECT COUNT(*) FROM public.coupons WHERE is_active)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_dashboard_stats(TIMESTAMPTZ,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(TIMESTAMPTZ,TIMESTAMPTZ,TIMESTAMPTZ) TO service_role;

CREATE INDEX retry_jobs_diagnostics_idx ON public.retry_jobs(status,created_at DESC,id DESC);
CREATE INDEX notification_deliveries_diagnostics_idx ON public.notification_deliveries(status,created_at DESC,id DESC);
CREATE INDEX webhook_events_diagnostics_idx ON public.webhook_events(processing_status,created_at DESC,id DESC);
CREATE INDEX outbox_events_diagnostics_idx ON public.outbox_events(updated_at DESC,id DESC) WHERE status='dead';
CREATE INDEX invoice_records_diagnostics_idx ON public.invoice_records(updated_at DESC,id DESC) WHERE status='failed';
CREATE INDEX reconciliation_diagnostics_idx ON public.payment_reconciliation_cases(updated_at DESC,id DESC) WHERE status<>'resolved';
CREATE INDEX provider_operations_diagnostics_idx ON public.provider_operations(updated_at DESC,id DESC) WHERE local_applied_at IS NULL;
CREATE INDEX cancellation_refund_diagnostics_idx ON public.retry_jobs(created_at DESC,id DESC) WHERE job_type='cancellation_refund' AND status<>'completed';

-- Converge bucket limits; hosted Storage global limits remain an external deployment gate.
UPDATE storage.buckets
SET file_size_limit = 8388608,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::TEXT[]
WHERE id = 'images';

CREATE OR REPLACE FUNCTION public.add_product_image_atomic(
  p_product_id UUID,
  p_url TEXT,
  p_alt_text TEXT,
  p_sort_order INT,
  p_is_primary BOOLEAN
)
RETURNS public.product_images
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_image public.product_images%ROWTYPE;
BEGIN
  IF p_product_id IS NULL OR p_url IS NULL OR length(p_url) > 4096
    OR p_url !~ '^https?://[^[:space:]]+$'
    OR p_sort_order IS NULL OR p_sort_order < 0
    OR p_is_primary IS NULL OR length(COALESCE(p_alt_text, '')) > 300 THEN
    RAISE EXCEPTION 'Invalid product image input' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_image FROM public.product_images
  WHERE product_id = p_product_id AND url = p_url
  ORDER BY created_at, id LIMIT 1;
  IF FOUND THEN RETURN v_image; END IF;

  IF p_is_primary THEN
    UPDATE public.product_images SET is_primary = FALSE WHERE product_id = p_product_id;
  END IF;
  INSERT INTO public.product_images(product_id, url, alt_text, sort_order, is_primary)
  VALUES(p_product_id, p_url, p_alt_text, p_sort_order, p_is_primary)
  RETURNING * INTO v_image;
  RETURN v_image;
END;
$$;
REVOKE ALL ON FUNCTION public.add_product_image_atomic(UUID, TEXT, TEXT, INT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_product_image_atomic(UUID, TEXT, TEXT, INT, BOOLEAN)
  TO service_role;

CREATE FUNCTION public.enforce_navbar_category_limit() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.is_active AND NEW.show_in_navbar THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('navbar_category_limit',0));
    IF (SELECT COUNT(*) FROM public.categories WHERE is_active AND show_in_navbar AND id<>NEW.id)>=5 THEN
      RAISE EXCEPTION 'Maximum of 5 categories can be shown in the navbar' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER categories_navbar_limit BEFORE INSERT OR UPDATE OF is_active,show_in_navbar ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.enforce_navbar_category_limit();
REVOKE ALL ON FUNCTION public.enforce_navbar_category_limit() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_navbar_category_limit() TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v51;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_contract JSONB:=public.get_runtime_schema_status_v51(); v_name TEXT; v_function REGPROCEDURE; v_ready BOOLEAN;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['public.get_dashboard_stats(timestamp with time zone,timestamp with time zone,timestamp with time zone)','public.add_product_image_atomic(uuid,text,text,integer,boolean)','public.enforce_navbar_category_limit()'] LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL THEN
      v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||jsonb_build_array(v_name));
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE') OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||jsonb_build_array(v_name));
    END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['retry_jobs_diagnostics_idx','notification_deliveries_diagnostics_idx','webhook_events_diagnostics_idx','outbox_events_diagnostics_idx','invoice_records_diagnostics_idx','reconciliation_diagnostics_idx','provider_operations_diagnostics_idx','cancellation_refund_diagnostics_idx'] LOOP
    IF to_regclass('public.'||v_name) IS NULL THEN
      v_contract:=jsonb_set(v_contract,'{missing_indexes}',(v_contract->'missing_indexes')||jsonb_build_array(v_name));
    END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='images' AND file_size_limit=8388608 AND allowed_mime_types @> ARRAY['image/jpeg','image/png','image/webp','image/avif']::TEXT[]) THEN
    v_contract:=jsonb_set(v_contract,'{invalid_storage_capabilities}',(v_contract->'invalid_storage_capabilities')||'["images_upload_limit"]'::JSONB);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.categories'::REGCLASS AND tgname='categories_navbar_limit' AND NOT tgisinternal AND tgenabled='O') THEN
    v_contract:=jsonb_set(v_contract,'{missing_constraints}',(v_contract->'missing_constraints')||'["categories_navbar_limit"]'::JSONB);
  END IF;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN v_contract||jsonb_build_object('contract_version',52,'ready',v_ready AND v_contract->>'migration_version'='052');
END;
$$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v51() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v51() TO service_role;

COMMIT;
