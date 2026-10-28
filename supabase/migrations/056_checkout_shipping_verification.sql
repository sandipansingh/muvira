BEGIN;

CREATE TABLE public.order_shipping_snapshots (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  context_fingerprint TEXT NOT NULL CONSTRAINT order_shipping_snapshots_fingerprint_valid CHECK (context_fingerprint ~ '^[a-f0-9]{64}$'),
  context JSONB NOT NULL CONSTRAINT order_shipping_snapshots_context_object CHECK (jsonb_typeof(context)='object'),
  verification JSONB NOT NULL CONSTRAINT order_shipping_snapshots_verification_object CHECK (jsonb_typeof(verification)='object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.order_shipping_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_shipping_snapshots FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.order_shipping_snapshots TO service_role;

CREATE FUNCTION public.get_checkout_shipping_context(
  p_user_id UUID, p_address_id UUID, p_shipping_method TEXT, p_coupon_code TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_address JSONB; v_cart JSONB; v_settings JSONB; v_methods JSONB; v_coupon public.coupons%ROWTYPE;
  v_subtotal BIGINT; v_discount BIGINT:=0; v_context JSONB;
BEGIN
  IF p_user_id IS NULL OR p_address_id IS NULL OR p_shipping_method IS NULL
    OR p_shipping_method NOT IN ('standard','express')
    OR (p_coupon_code IS NOT NULL AND length(p_coupon_code)>50) THEN
    RAISE EXCEPTION 'Invalid shipping context' USING ERRCODE='22023';
  END IF;
  SELECT to_jsonb(a) INTO v_address FROM public.addresses a WHERE a.id=p_address_id AND a.user_id=p_user_id;
  IF v_address IS NULL THEN RAISE EXCEPTION 'Shipping address not found' USING ERRCODE='P0002'; END IF;
  IF v_address->>'country' NOT IN ('India','IN') THEN
    RAISE EXCEPTION 'Delivery is available within India only' USING ERRCODE='22023'; END IF;
  SELECT jsonb_agg(jsonb_build_object('product_id',p.id,'quantity',c.quantity,'price_paisa',p.price_paisa,
      'weight_grams',p.weight_grams,'is_active',p.is_active) ORDER BY p.id),
    SUM(p.price_paisa::BIGINT*c.quantity)
    INTO v_cart,v_subtotal FROM public.cart_items c JOIN public.products p ON p.id=c.product_id
    WHERE c.user_id=p_user_id;
  IF v_cart IS NULL THEN RAISE EXCEPTION 'Your cart is empty' USING ERRCODE='P0002'; END IF;
  SELECT value INTO v_settings FROM public.site_settings WHERE key='shiprocket_settings';
  SELECT value INTO v_methods FROM public.site_settings WHERE key='shipping_methods';
  IF v_settings IS NULL OR v_methods IS NULL THEN
    RAISE EXCEPTION 'Shipping configuration is missing' USING ERRCODE='22023'; END IF;
  IF NULLIF(BTRIM(p_coupon_code),'') IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE code=UPPER(BTRIM(p_coupon_code));
    IF NOT FOUND OR v_coupon.is_active IS NOT TRUE OR v_coupon.valid_from>NOW()
      OR (v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until<NOW())
      OR v_subtotal<v_coupon.min_order_amount_paisa THEN
      RAISE EXCEPTION 'Coupon is unavailable' USING ERRCODE='22023'; END IF;
    IF v_coupon.discount_type='percentage' THEN
      v_discount:=ROUND(v_subtotal*v_coupon.discount_value/100.0)::BIGINT;
      IF v_coupon.max_discount_paisa>0 THEN v_discount:=LEAST(v_discount,v_coupon.max_discount_paisa); END IF;
    ELSE v_discount:=LEAST(v_subtotal,v_coupon.discount_value); END IF;
  END IF;
  v_context:=jsonb_build_object('address',v_address,'cart',v_cart,'shipping_method',p_shipping_method,
    'shipping_methods',v_methods,'shiprocket_settings',v_settings,
    'coupon',CASE WHEN v_coupon.id IS NULL THEN NULL ELSE to_jsonb(v_coupon) END,
    'declared_value_paisa',GREATEST(0,v_subtotal-v_discount));
  RETURN jsonb_build_object('context',v_context,
    'fingerprint',encode(extensions.digest(convert_to(v_context::TEXT,'UTF8'),'sha256'),'hex'));
END; $$;

ALTER FUNCTION public.initialize_checkout(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT) RENAME TO initialize_checkout_v53;

-- Old API callers must pass through the checked entrypoint before reserving stock.
CREATE FUNCTION public.initialize_checkout(
  p_user_id UUID,p_address_id UUID,p_coupon_code TEXT,p_shipping_method TEXT,
  p_billing_same_as_shipping BOOLEAN,p_billing JSONB,p_notes TEXT,p_order_prefix TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_user_id IS NULL OR p_address_id IS NULL OR p_shipping_method IS NULL
    OR p_billing_same_as_shipping IS NULL OR p_order_prefix IS NULL THEN
    RAISE EXCEPTION 'Invalid checkout' USING ERRCODE='22023'; END IF;
  RAISE EXCEPTION 'Shipping verification is required before checkout' USING ERRCODE='22023';
END; $$;

CREATE FUNCTION public.initialize_checkout_shipping(
  p_user_id UUID,p_address_id UUID,p_coupon_code TEXT,p_shipping_method TEXT,
  p_billing_same_as_shipping BOOLEAN,p_billing JSONB,p_notes TEXT,p_order_prefix TEXT,
  p_shipping_verification JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_current JSONB; v_initialized JSONB; v_check JSONB; v_checked_at TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR p_address_id IS NULL OR p_shipping_method IS NULL
    OR p_shipping_method NOT IN ('standard','express') OR p_billing_same_as_shipping IS NULL
    OR p_order_prefix IS NULL OR length(p_order_prefix) NOT BETWEEN 1 AND 10
    OR (p_notes IS NOT NULL AND length(p_notes)>2000)
    OR (p_coupon_code IS NOT NULL AND length(p_coupon_code)>50)
    OR (p_billing IS NOT NULL AND jsonb_typeof(p_billing)<>'object')
    OR p_shipping_verification IS NULL OR jsonb_typeof(p_shipping_verification)<>'object' THEN
    RAISE EXCEPTION 'Invalid verified checkout' USING ERRCODE='22023'; END IF;
  v_check:=p_shipping_verification->'availability';
  v_checked_at:=(p_shipping_verification->>'checked_at')::TIMESTAMPTZ;
  IF v_check->>'available' IS DISTINCT FROM 'true' OR v_checked_at IS NULL
    OR v_checked_at<NOW()-INTERVAL '5 minutes' OR v_checked_at>NOW()+INTERVAL '5 seconds'
    OR v_check->>'pickup_pincode' !~ '^[0-9]{6}$'
    OR jsonb_typeof(v_check->'recommended_courier') IS DISTINCT FROM 'object'
    OR (v_check->'recommended_courier'->>'courier_id')::BIGINT<=0 THEN
    RAISE EXCEPTION 'A recent serviceable courier is required' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout:'||p_user_id::TEXT,0));
  -- Block cart phantoms and product edits only for the short reservation transaction.
  LOCK TABLE public.products IN EXCLUSIVE MODE;
  LOCK TABLE public.cart_items IN SHARE MODE;
  PERFORM 1 FROM public.addresses WHERE id=p_address_id AND user_id=p_user_id FOR SHARE;
  PERFORM 1 FROM public.site_settings WHERE key IN ('shipping_methods','shiprocket_settings') ORDER BY key FOR SHARE;
  IF NULLIF(BTRIM(p_coupon_code),'') IS NOT NULL THEN
    PERFORM 1 FROM public.coupons WHERE code=UPPER(BTRIM(p_coupon_code)) FOR UPDATE;
  END IF;
  v_current:=public.get_checkout_shipping_context(p_user_id,p_address_id,p_shipping_method,p_coupon_code);
  IF v_current->>'fingerprint' IS DISTINCT FROM p_shipping_verification->>'fingerprint'
    OR v_current->'context' IS DISTINCT FROM p_shipping_verification->'context' THEN
    RAISE EXCEPTION 'Delivery details changed; check availability again' USING ERRCODE='40001'; END IF;
  IF (v_current->'context'->'shipping_methods'->p_shipping_method->>'enabled')::BOOLEAN IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Shipping method is unavailable' USING ERRCODE='22023'; END IF;
  v_initialized:=public.initialize_checkout_v53(p_user_id,p_address_id,p_coupon_code,p_shipping_method,
    p_billing_same_as_shipping,p_billing,p_notes,p_order_prefix);
  IF (v_initialized->'order'->>'total_amount_paisa')::BIGINT IS DISTINCT FROM
    (v_current->'context'->>'declared_value_paisa')::BIGINT THEN
    RAISE EXCEPTION 'Order value changed; check availability again' USING ERRCODE='40001'; END IF;
  INSERT INTO public.order_shipping_snapshots(order_id,context_fingerprint,context,verification)
    VALUES((v_initialized->'order'->>'id')::UUID,v_current->>'fingerprint',v_current->'context',p_shipping_verification);
  RETURN v_initialized;
END; $$;

CREATE FUNCTION public.lookup_checkout_preparation(
  p_user_id UUID,p_request_id UUID,p_request_fingerprint TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_preparation public.checkout_preparations%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL OR p_request_fingerprint IS NULL
    OR p_request_fingerprint !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid checkout request' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_preparation FROM public.checkout_preparations WHERE request_id=p_request_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_preparation.user_id<>p_user_id THEN RAISE EXCEPTION 'Checkout request not found' USING ERRCODE='P0002'; END IF;
  IF v_preparation.request_fingerprint<>p_request_fingerprint THEN
    RETURN jsonb_build_object('conflict','CHECKOUT_REQUEST_CONFLICT'); END IF;
  RETURN jsonb_build_object('order_id',v_preparation.order_id,'created',FALSE);
END; $$;

CREATE FUNCTION public.prepare_checkout_session_shipping(
  p_user_id UUID,p_request_id UUID,p_request_fingerprint TEXT,p_checkout JSONB,p_order_prefix TEXT,
  p_shipping_verification JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_existing JSONB; v_ids UUID[]; v_initialized JSONB;
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL OR p_request_fingerprint IS NULL
    OR p_request_fingerprint !~ '^[a-f0-9]{64}$' OR p_checkout IS NULL
    OR jsonb_typeof(p_checkout)<>'object' OR p_order_prefix IS NULL OR length(p_order_prefix) NOT BETWEEN 1 AND 10
    OR p_checkout-ARRAY['address_id','coupon_code','shipping_method','billing_same_as_shipping','billing','notes']<>'{}'::JSONB THEN
    RAISE EXCEPTION 'Invalid checkout preparation' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout:'||p_user_id::TEXT,0));
  v_existing:=public.lookup_checkout_preparation(p_user_id,p_request_id,p_request_fingerprint);
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  v_ids:=public.active_checkout_ids(p_user_id);
  IF cardinality(v_ids)>1 THEN RETURN jsonb_build_object('conflict','MULTIPLE_ACTIVE_CHECKOUTS'); END IF;
  IF cardinality(v_ids)=1 THEN
    RETURN jsonb_build_object('conflict','CHECKOUT_ALREADY_ACTIVE','order_id',v_ids[1]); END IF;
  v_initialized:=public.initialize_checkout_shipping(p_user_id,(p_checkout->>'address_id')::UUID,
    p_checkout->>'coupon_code',COALESCE(p_checkout->>'shipping_method','standard'),
    COALESCE((p_checkout->>'billing_same_as_shipping')::BOOLEAN,TRUE),p_checkout->'billing',
    p_checkout->>'notes',p_order_prefix,p_shipping_verification);
  INSERT INTO public.checkout_preparations(request_id,user_id,order_id,request_fingerprint)
    VALUES(p_request_id,p_user_id,(v_initialized->'order'->>'id')::UUID,p_request_fingerprint);
  RETURN jsonb_build_object('order_id',v_initialized->'order'->>'id','created',TRUE);
END; $$;

REVOKE ALL ON FUNCTION public.get_checkout_shipping_context(UUID,UUID,TEXT,TEXT),
  public.initialize_checkout_v53(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT),
  public.initialize_checkout(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT),
  public.initialize_checkout_shipping(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT,JSONB),
  public.lookup_checkout_preparation(UUID,UUID,TEXT),
  public.prepare_checkout_session_shipping(UUID,UUID,TEXT,JSONB,TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_checkout_shipping_context(UUID,UUID,TEXT,TEXT),
  public.initialize_checkout(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT),
  public.initialize_checkout_shipping(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT,JSONB),
  public.lookup_checkout_preparation(UUID,UUID,TEXT),
  public.prepare_checkout_session_shipping(UUID,UUID,TEXT,JSONB,TEXT,JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.initialize_checkout_v53(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT) FROM service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v55;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_contract JSONB:=public.get_runtime_schema_status_v55(); v_name TEXT; v_function REGPROCEDURE; v_ready BOOLEAN;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'public.get_checkout_shipping_context(uuid,uuid,text,text)',
    'public.initialize_checkout_shipping(uuid,uuid,text,text,boolean,jsonb,text,text,jsonb)',
    'public.lookup_checkout_preparation(uuid,uuid,text)',
    'public.prepare_checkout_session_shipping(uuid,uuid,text,jsonb,text,jsonb)'
  ] LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL THEN v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||jsonb_build_array(v_name));
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE')
      OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||jsonb_build_array(v_name));
    END IF;
  END LOOP;
  IF to_regclass('public.order_shipping_snapshots') IS NULL THEN
    v_contract:=jsonb_set(v_contract,'{missing_relations}',(v_contract->'missing_relations')||'["order_shipping_snapshots"]'::JSONB);
  ELSE
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.order_shipping_snapshots'::REGCLASS) THEN
      v_contract:=jsonb_set(v_contract,'{invalid_rls_relations}',(v_contract->'invalid_rls_relations')||'["order_shipping_snapshots"]'::JSONB); END IF;
    IF has_table_privilege('anon','public.order_shipping_snapshots','SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('authenticated','public.order_shipping_snapshots','SELECT,INSERT,UPDATE,DELETE')
      OR NOT has_table_privilege('service_role','public.order_shipping_snapshots','SELECT,INSERT,UPDATE,DELETE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_relation_grants}',(v_contract->'invalid_relation_grants')||'["order_shipping_snapshots"]'::JSONB); END IF;
    FOREACH v_name IN ARRAY ARRAY['order_shipping_snapshots_fingerprint_valid','order_shipping_snapshots_context_object','order_shipping_snapshots_verification_object'] LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.order_shipping_snapshots'::REGCLASS AND conname=v_name AND convalidated) THEN
        v_contract:=jsonb_set(v_contract,'{missing_constraints}',(v_contract->'missing_constraints')||jsonb_build_array(v_name)); END IF;
    END LOOP;
    IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indrelid='public.order_shipping_snapshots'::REGCLASS AND indisprimary AND indisvalid) THEN
      v_contract:=jsonb_set(v_contract,'{missing_indexes}',(v_contract->'missing_indexes')||'["order_shipping_snapshots_pkey"]'::JSONB); END IF;
  END IF;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN v_contract||jsonb_build_object('contract_version',56,'ready',v_ready AND v_contract->>'migration_version'='056');
END; $$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v55() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v55() TO service_role;
COMMIT;
