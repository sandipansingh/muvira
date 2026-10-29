BEGIN;

CREATE TABLE public.checkout_attempts (
  request_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id,user_id)
);
CREATE TABLE public.checkout_cart_owners (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  FOREIGN KEY (request_id,user_id) REFERENCES public.checkout_attempts(request_id,user_id)
);
ALTER TABLE public.cart_items ADD COLUMN checkout_attempt_id UUID REFERENCES public.checkout_attempts(request_id);
ALTER TABLE public.cart_items ADD COLUMN checkout_version BIGINT NOT NULL DEFAULT 1
  CONSTRAINT cart_items_checkout_version_positive CHECK (checkout_version>0);
CREATE TABLE public.order_cart_sources (
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  cart_item_id UUID NOT NULL,
  attempt_id UUID NOT NULL REFERENCES public.checkout_attempts(request_id),
  cart_version BIGINT NOT NULL CONSTRAINT order_cart_sources_version_positive CHECK (cart_version>0),
  product_id UUID NOT NULL,
  quantity INT NOT NULL CONSTRAINT order_cart_sources_quantity_positive CHECK (quantity>0),
  PRIMARY KEY (order_id,cart_item_id)
);
CREATE INDEX cart_items_checkout_attempt_idx ON public.cart_items(checkout_attempt_id);
ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_cart_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_cart_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_attempts,public.checkout_cart_owners,public.order_cart_sources FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.checkout_attempts,public.checkout_cart_owners,public.order_cart_sources TO service_role;

CREATE FUNCTION public.version_checkout_cart_line() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  NEW.checkout_version:=OLD.checkout_version+1;
  RETURN NEW;
END; $$;
CREATE TRIGGER cart_items_checkout_version BEFORE UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.version_checkout_cart_line();
REVOKE ALL ON FUNCTION public.version_checkout_cart_line() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.begin_checkout_attempt(p_user_id UUID,p_request_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_owner UUID;
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Invalid checkout attempt' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout:'||p_user_id::TEXT,0));
  SELECT user_id INTO v_owner FROM public.checkout_attempts WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_owner<>p_user_id THEN RAISE EXCEPTION 'Checkout attempt not found' USING ERRCODE='P0002'; END IF;
    RETURN jsonb_build_object('attempt_id',p_request_id);
  END IF;
  -- Use the same table lock order as verified reservation to avoid lock upgrades.
  LOCK TABLE public.products IN EXCLUSIVE MODE;
  LOCK TABLE public.cart_items IN SHARE ROW EXCLUSIVE MODE;
  INSERT INTO public.checkout_attempts(request_id,user_id) VALUES(p_request_id,p_user_id);
  INSERT INTO public.checkout_cart_owners(user_id,request_id) VALUES(p_user_id,p_request_id)
    ON CONFLICT(user_id) DO UPDATE SET request_id=EXCLUDED.request_id;
  UPDATE public.cart_items SET checkout_attempt_id=p_request_id WHERE user_id=p_user_id;
  RETURN jsonb_build_object('attempt_id',p_request_id);
END; $$;

CREATE OR REPLACE FUNCTION public.initialize_checkout_shipping(
  p_user_id UUID,p_address_id UUID,p_coupon_code TEXT,p_shipping_method TEXT,
  p_billing_same_as_shipping BOOLEAN,p_billing JSONB,p_notes TEXT,p_order_prefix TEXT,
  p_shipping_verification JSONB,p_attempt_id UUID
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
  PERFORM public.begin_checkout_attempt(p_user_id,p_attempt_id);
  IF NOT EXISTS(SELECT 1 FROM public.checkout_cart_owners WHERE user_id=p_user_id AND request_id=p_attempt_id) THEN
    RAISE EXCEPTION 'This purchase has been superseded; start a new order' USING ERRCODE='22023'; END IF;
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
  LOCK TABLE public.cart_items IN SHARE ROW EXCLUSIVE MODE;
  -- Rows added while this purchase was editable join its current bag at Review.
  UPDATE public.cart_items SET checkout_attempt_id=p_attempt_id
    WHERE user_id=p_user_id AND checkout_attempt_id IS DISTINCT FROM p_attempt_id;
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
  INSERT INTO public.order_cart_sources(order_id,cart_item_id,attempt_id,cart_version,product_id,quantity)
    SELECT (v_initialized->'order'->>'id')::UUID,id,p_attempt_id,checkout_version,product_id,quantity
    FROM public.cart_items WHERE user_id=p_user_id AND checkout_attempt_id=p_attempt_id;
  RETURN v_initialized;
END; $$;

CREATE OR REPLACE FUNCTION public.initialize_checkout_shipping(
  p_user_id UUID,p_address_id UUID,p_coupon_code TEXT,p_shipping_method TEXT,
  p_billing_same_as_shipping BOOLEAN,p_billing JSONB,p_notes TEXT,p_order_prefix TEXT,
  p_shipping_verification JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  RETURN public.initialize_checkout_shipping(p_user_id,p_address_id,p_coupon_code,p_shipping_method,
    p_billing_same_as_shipping,p_billing,p_notes,p_order_prefix,p_shipping_verification,gen_random_uuid());
END; $$;

CREATE OR REPLACE FUNCTION public.prepare_checkout_session_shipping(
  p_user_id UUID,p_request_id UUID,p_request_fingerprint TEXT,p_checkout JSONB,p_order_prefix TEXT,
  p_shipping_verification JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_existing JSONB; v_initialized JSONB;
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL OR p_request_fingerprint IS NULL
    OR p_request_fingerprint !~ '^[a-f0-9]{64}$' OR p_checkout IS NULL
    OR jsonb_typeof(p_checkout)<>'object' OR p_order_prefix IS NULL OR length(p_order_prefix) NOT BETWEEN 1 AND 10
    OR p_checkout-ARRAY['address_id','coupon_code','shipping_method','billing_same_as_shipping','billing','notes']<>'{}'::JSONB THEN
    RAISE EXCEPTION 'Invalid checkout preparation' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout:'||p_user_id::TEXT,0));
  v_existing:=public.lookup_checkout_preparation(p_user_id,p_request_id,p_request_fingerprint);
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  v_initialized:=public.initialize_checkout_shipping(p_user_id,(p_checkout->>'address_id')::UUID,
    p_checkout->>'coupon_code',COALESCE(p_checkout->>'shipping_method','standard'),
    COALESCE((p_checkout->>'billing_same_as_shipping')::BOOLEAN,TRUE),p_checkout->'billing',
    p_checkout->>'notes',p_order_prefix,p_shipping_verification,p_request_id);
  INSERT INTO public.checkout_preparations(request_id,user_id,order_id,request_fingerprint)
    VALUES(p_request_id,p_user_id,(v_initialized->'order'->>'id')::UUID,p_request_fingerprint);
  RETURN jsonb_build_object('order_id',v_initialized->'order'->>'id','created',TRUE);
END; $$;

CREATE OR REPLACE FUNCTION public.finalize_captured_payment(
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT,
  p_amount_paisa INT,
  p_currency TEXT,
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  payment_row payments%ROWTYPE;
  order_row orders%ROWTYPE;
  committed_coupon_id UUID;
BEGIN
  IF NULLIF(BTRIM(p_razorpay_order_id),'') IS NULL OR NULLIF(BTRIM(p_razorpay_payment_id),'') IS NULL
    OR p_amount_paisa IS NULL OR p_amount_paisa<=0 OR p_currency IS NULL OR p_currency<>'INR'
    OR p_payment_method IS NULL THEN
    RAISE EXCEPTION 'Invalid captured payment' USING ERRCODE='22023'; END IF;
  -- Reservation and capture both take the cart lock before any coupon row lock.
  LOCK TABLE public.cart_items IN ROW EXCLUSIVE MODE;
  SELECT * INTO payment_row
  FROM payments
  WHERE razorpay_order_id = p_razorpay_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO order_row
  FROM orders
  WHERE id = payment_row.order_id
  FOR UPDATE;

  IF payment_row.status = 'captured' AND order_row.payment_status = 'paid' THEN
    RETURN JSONB_BUILD_OBJECT('already_captured', TRUE, 'order', TO_JSONB(order_row));
  END IF;

  IF payment_row.amount_paisa <> p_amount_paisa
    OR payment_row.currency <> UPPER(p_currency)
    OR order_row.total_amount_paisa <> p_amount_paisa THEN
    RAISE EXCEPTION 'Provider amount or currency does not match order' USING ERRCODE = '22023';
  END IF;

  IF p_payment_method NOT IN ('card', 'upi', 'netbanking', 'wallet', 'emi', 'paylater') THEN
    RAISE EXCEPTION 'Unsupported payment method' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM inventory_reservations
    WHERE order_id = order_row.id AND status <> 'reserved'
  ) OR NOT EXISTS (
    SELECT 1 FROM inventory_reservations WHERE order_id = order_row.id
  ) THEN
    RAISE EXCEPTION 'Inventory reservation is unavailable' USING ERRCODE = 'P0001';
  END IF;

  UPDATE payments
  SET
    razorpay_payment_id = p_razorpay_payment_id,
    razorpay_signature = NULLIF(p_razorpay_signature, ''),
    status = 'captured',
    failure_reason = NULL,
    captured_at = NOW()
  WHERE id = payment_row.id;

  UPDATE orders
  SET status = 'confirmed', payment_status = 'paid', payment_method = p_payment_method
  WHERE id = order_row.id
  RETURNING * INTO order_row;

  UPDATE inventory_reservations
  SET status = 'committed', committed_at = NOW()
  WHERE order_id = order_row.id AND status = 'reserved';

  UPDATE coupon_redemption_reservations
  SET status = 'committed', committed_at = NOW()
  WHERE order_id = order_row.id AND status = 'reserved'
  RETURNING coupon_id INTO committed_coupon_id;

  IF committed_coupon_id IS NOT NULL THEN
    UPDATE coupons
    SET times_used = times_used + 1
    WHERE id = committed_coupon_id;
  END IF;

  DELETE FROM public.cart_items c USING public.order_cart_sources s
  WHERE s.order_id=order_row.id AND c.user_id=order_row.user_id
    AND c.id=s.cart_item_id AND c.product_id=s.product_id
    AND c.checkout_attempt_id=s.attempt_id AND c.checkout_version=s.cart_version
    AND c.quantity=s.quantity;

  INSERT INTO payment_logs (payment_id, order_id, event_type, payload)
  VALUES (
    payment_row.id,
    order_row.id,
    'verify_success',
    JSONB_BUILD_OBJECT(
      'razorpay_order_id', p_razorpay_order_id,
      'razorpay_payment_id', p_razorpay_payment_id
    )
  );

  INSERT INTO outbox_events (
    aggregate_type,
    aggregate_id,
    event_type,
    payload,
    deduplication_key
  ) VALUES (
    'order',
    order_row.id,
    'order.payment_captured',
    JSONB_BUILD_OBJECT(
      'order_id', order_row.id,
      'order_number', order_row.order_number,
      'user_id', order_row.user_id
    ),
    'order.payment_captured:' || order_row.id::TEXT
  ) ON CONFLICT (deduplication_key) DO NOTHING;

  RETURN JSONB_BUILD_OBJECT('already_captured', FALSE, 'order', TO_JSONB(order_row));
END;
$$;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v57;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_contract JSONB:=public.get_runtime_schema_status_v57(); v_name TEXT; v_function REGPROCEDURE; v_ready BOOLEAN;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'public.begin_checkout_attempt(uuid,uuid)',
    'public.initialize_checkout_shipping(uuid,uuid,text,text,boolean,jsonb,text,text,jsonb,uuid)'
  ] LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL THEN v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||jsonb_build_array(v_name));
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE')
      OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||jsonb_build_array(v_name)); END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['checkout_attempts','checkout_cart_owners','order_cart_sources'] LOOP
    IF to_regclass('public.'||v_name) IS NULL THEN
      v_contract:=jsonb_set(v_contract,'{missing_relations}',(v_contract->'missing_relations')||jsonb_build_array(v_name));
    ELSE
      IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.'||v_name)) THEN
        v_contract:=jsonb_set(v_contract,'{invalid_rls_relations}',(v_contract->'invalid_rls_relations')||jsonb_build_array(v_name)); END IF;
      IF has_table_privilege('anon','public.'||v_name,'SELECT,INSERT,UPDATE,DELETE')
        OR has_table_privilege('authenticated','public.'||v_name,'SELECT,INSERT,UPDATE,DELETE')
        OR has_any_column_privilege('anon','public.'||v_name,'SELECT,INSERT,UPDATE')
        OR has_any_column_privilege('authenticated','public.'||v_name,'SELECT,INSERT,UPDATE')
        OR NOT has_table_privilege('service_role','public.'||v_name,'SELECT,INSERT,UPDATE,DELETE') THEN
        v_contract:=jsonb_set(v_contract,'{invalid_relation_grants}',(v_contract->'invalid_relation_grants')||jsonb_build_array(v_name)); END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indrelid=to_regclass('public.'||v_name) AND indisprimary AND indisvalid) THEN
        v_contract:=jsonb_set(v_contract,'{missing_indexes}',(v_contract->'missing_indexes')||jsonb_build_array(v_name||'_pkey')); END IF;
    END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['checkout_attempt_id','checkout_version'] LOOP
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cart_items' AND column_name=v_name) THEN
      v_contract:=jsonb_set(v_contract,'{missing_columns}',(v_contract->'missing_columns')||jsonb_build_array('cart_items.'||v_name)); END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['cart_items_checkout_version_positive','order_cart_sources_version_positive','order_cart_sources_quantity_positive'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE connamespace='public'::REGNAMESPACE AND conname=v_name AND convalidated) THEN
      v_contract:=jsonb_set(v_contract,'{missing_constraints}',(v_contract->'missing_constraints')||jsonb_build_array(v_name)); END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.cart_items'::REGCLASS AND tgname='cart_items_checkout_version' AND tgenabled='O') THEN
    v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||'["cart_items_checkout_version trigger"]'::JSONB); END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.cart_items_checkout_attempt_idx') AND indisvalid) THEN
    v_contract:=jsonb_set(v_contract,'{missing_indexes}',(v_contract->'missing_indexes')||'["cart_items_checkout_attempt_idx"]'::JSONB); END IF;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN v_contract||jsonb_build_object('contract_version',58,'ready',v_ready AND v_contract->>'migration_version'='058');
END; $$;
REVOKE ALL ON FUNCTION public.begin_checkout_attempt(UUID,UUID),
  public.initialize_checkout_shipping(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT,JSONB,UUID),
  public.initialize_checkout_shipping(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT,JSONB),
  public.prepare_checkout_session_shipping(UUID,UUID,TEXT,JSONB,TEXT,JSONB),
  public.finalize_captured_payment(TEXT,TEXT,TEXT,INT,TEXT,TEXT),
  public.get_runtime_schema_status(),public.get_runtime_schema_status_v57() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_checkout_attempt(UUID,UUID),
  public.initialize_checkout_shipping(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT,JSONB,UUID),
  public.initialize_checkout_shipping(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT,JSONB),
  public.prepare_checkout_session_shipping(UUID,UUID,TEXT,JSONB,TEXT,JSONB),
  public.finalize_captured_payment(TEXT,TEXT,TEXT,INT,TEXT,TEXT),
  public.get_runtime_schema_status(),public.get_runtime_schema_status_v57() TO service_role;
COMMIT;
