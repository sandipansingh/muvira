BEGIN;

CREATE TABLE public.razorpay_order_bindings (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('test','live')),
  key_id TEXT NOT NULL CHECK (length(key_id)<=100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT razorpay_order_bindings_key_mode CHECK (key_id ~ ('^rzp_'||mode||'_[A-Za-z0-9]+$'))
);
ALTER TABLE public.razorpay_order_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.razorpay_order_bindings FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,DELETE ON public.razorpay_order_bindings TO service_role;

ALTER TABLE public.checkout_preparations ADD COLUMN setup_stage TEXT,
  ADD COLUMN setup_code TEXT, ADD COLUMN setup_outcome TEXT CHECK (setup_outcome IN ('rejected','unknown','created'));
ALTER TABLE public.provider_operations ADD COLUMN refund_idempotency_protected BOOLEAN NOT NULL DEFAULT FALSE;

CREATE FUNCTION public.assert_razorpay_order_environment(p_order_id UUID,p_provider_mode TEXT,p_provider_key_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_order_id IS NULL OR p_provider_mode IS NULL OR p_provider_mode NOT IN ('test','live')
    OR p_provider_key_id IS NULL OR length(p_provider_key_id)>100
    OR p_provider_key_id !~ ('^rzp_'||p_provider_mode||'_[A-Za-z0-9]+$') THEN
    RAISE EXCEPTION 'Invalid payment environment' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.razorpay_order_bindings WHERE order_id=p_order_id AND mode=p_provider_mode AND key_id=p_provider_key_id) THEN
    RAISE EXCEPTION 'Payment environment requires review' USING ERRCODE='22023'; END IF;
END; $$;

CREATE FUNCTION public.prepare_checkout_payment(
  p_user_id UUID,p_request_id UUID,p_request_fingerprint TEXT,p_checkout JSONB,p_order_prefix TEXT,
  p_shipping_verification JSONB,p_provider_mode TEXT,p_provider_key_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result JSONB; v_order_id UUID;
BEGIN
  IF p_provider_mode IS NULL OR p_provider_mode NOT IN ('test','live') OR p_provider_key_id IS NULL
    OR length(p_provider_key_id)>100 OR p_provider_key_id !~ ('^rzp_'||p_provider_mode||'_[A-Za-z0-9]+$') THEN
    RAISE EXCEPTION 'Invalid payment environment' USING ERRCODE='22023'; END IF;
  v_result:=public.prepare_checkout_session_shipping(p_user_id,p_request_id,p_request_fingerprint,p_checkout,p_order_prefix,p_shipping_verification);
  IF v_result ? 'conflict' THEN RETURN v_result; END IF;
  v_order_id:=(v_result->>'order_id')::UUID;
  IF v_result->>'created'='true' THEN
    INSERT INTO public.razorpay_order_bindings(order_id,mode,key_id) VALUES(v_order_id,p_provider_mode,p_provider_key_id);
  END IF;
  PERFORM public.assert_razorpay_order_environment(v_order_id,p_provider_mode,p_provider_key_id);
  RETURN v_result;
END; $$;

CREATE FUNCTION public.complete_checkout_payment(
  p_user_id UUID,p_order_id UUID,p_provider_order_id TEXT,p_execution_scope TEXT,p_execution_resource_id TEXT,
  p_execution_owner_token UUID,p_execution_fencing_token BIGINT,p_provider_mode TEXT,p_provider_key_id TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  PERFORM public.assert_razorpay_order_environment(p_order_id,p_provider_mode,p_provider_key_id);
  PERFORM public.complete_checkout_preparation(p_user_id,p_order_id,p_provider_order_id,p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
END; $$;

CREATE FUNCTION public.finalize_checkout_payment(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_razorpay_order_id TEXT,p_razorpay_payment_id TEXT,p_razorpay_signature TEXT,p_amount_paisa INT,p_currency TEXT,p_payment_method TEXT,
  p_provider_mode TEXT,p_provider_key_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order_id UUID;
BEGIN
  IF p_razorpay_order_id IS NULL OR p_razorpay_order_id !~ '^order_[A-Za-z0-9]{1,90}$'
    OR p_razorpay_payment_id IS NULL OR p_razorpay_payment_id !~ '^pay_[A-Za-z0-9]{1,90}$' THEN
    RAISE EXCEPTION 'Invalid payment identity' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT order_id INTO v_order_id FROM public.payments WHERE razorpay_order_id=p_razorpay_order_id;
  IF p_execution_scope IS DISTINCT FROM 'checkout_payment' OR p_execution_resource_id IS DISTINCT FROM v_order_id::TEXT THEN
    RAISE EXCEPTION 'Invalid capture lease resource' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_razorpay_order_environment(v_order_id,p_provider_mode,p_provider_key_id);
  RETURN public.finalize_captured_payment_fenced(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,
    p_razorpay_order_id,p_razorpay_payment_id,p_razorpay_signature,p_amount_paisa,p_currency,p_payment_method);
END; $$;

CREATE FUNCTION public.record_checkout_setup_failure(
  p_order_id UUID,p_definitive BOOLEAN,p_code TEXT,p_provider_order_id TEXT,
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_order_id IS NULL OR p_definitive IS NULL OR p_code IS NULL OR p_code !~ '^[A-Z_]{1,80}$'
    OR p_execution_scope IS DISTINCT FROM 'checkout_payment' OR p_execution_resource_id IS DISTINCT FROM p_order_id::TEXT
    OR (p_provider_order_id IS NOT NULL AND p_provider_order_id !~ '^order_[A-Za-z0-9]{1,90}$') THEN
    RAISE EXCEPTION 'Invalid setup failure' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  UPDATE public.checkout_preparations SET
    dispatch_state=CASE WHEN p_definitive AND p_provider_order_id IS NULL THEN 'initialized' ELSE 'review' END,
    provider_order_id=COALESCE(p_provider_order_id,provider_order_id),
    setup_stage=CASE WHEN p_provider_order_id IS NULL THEN 'order_creation' ELSE 'attachment' END,
    setup_code=p_code,setup_outcome=CASE WHEN p_provider_order_id IS NOT NULL THEN 'created' WHEN p_definitive THEN 'rejected' ELSE 'unknown' END
    WHERE order_id=p_order_id AND dispatch_state='dispatched';
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispatch no longer owned' USING ERRCODE='40001'; END IF;
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
    RAISE EXCEPTION 'Delivery details changed; check availability again' USING ERRCODE='P0409'; END IF;
  IF (v_current->'context'->'shipping_methods'->p_shipping_method->>'enabled')::BOOLEAN IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Shipping method is unavailable' USING ERRCODE='22023'; END IF;
  v_initialized:=public.initialize_checkout_v53(p_user_id,p_address_id,p_coupon_code,p_shipping_method,
    p_billing_same_as_shipping,p_billing,p_notes,p_order_prefix);
  IF (v_initialized->'order'->>'total_amount_paisa')::BIGINT IS DISTINCT FROM
    (v_current->'context'->>'declared_value_paisa')::BIGINT THEN
    RAISE EXCEPTION 'Order value changed; check availability again' USING ERRCODE='P0409'; END IF;
  INSERT INTO public.order_shipping_snapshots(order_id,context_fingerprint,context,verification)
    VALUES((v_initialized->'order'->>'id')::UUID,v_current->>'fingerprint',v_current->'context',p_shipping_verification);
  INSERT INTO public.order_cart_sources(order_id,cart_item_id,attempt_id,cart_version,product_id,quantity)
    SELECT (v_initialized->'order'->>'id')::UUID,id,p_attempt_id,checkout_version,product_id,quantity
    FROM public.cart_items WHERE user_id=p_user_id AND checkout_attempt_id=p_attempt_id;
  RETURN v_initialized;
END; $$;

CREATE OR REPLACE FUNCTION public.initialize_checkout_v53(
  p_user_id UUID,
  p_address_id UUID,
  p_coupon_code TEXT,
  p_shipping_method TEXT,
  p_billing_same_as_shipping BOOLEAN,
  p_billing JSONB,
  p_notes TEXT,
  p_order_prefix TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  address_row addresses%ROWTYPE;
  profile_row profiles%ROWTYPE;
  coupon_row coupons%ROWTYPE;
  cart_line RECORD;
  order_row orders%ROWTYPE;
  shipping_methods JSONB;
  shipping_config JSONB;
  subtotal_value BIGINT := 0;
  discount_value BIGINT := 0;
  discounted_subtotal BIGINT;
  shipping_value BIGINT;
  total_value BIGINT;
  cart_count INT := 0;
  active_coupon_reservations BIGINT := 0;
  expiry_value TIMESTAMPTZ := NOW() + INTERVAL '15 minutes';
  order_number_value TEXT;
BEGIN
  IF p_user_id IS NULL OR p_address_id IS NULL OR p_shipping_method IS NULL OR p_billing_same_as_shipping IS NULL OR p_order_prefix IS NULL OR length(p_order_prefix) NOT BETWEEN 1 AND 10 OR p_shipping_method NOT IN ('standard', 'express') THEN
    RAISE EXCEPTION 'Shipping method is unavailable' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO profile_row FROM profiles WHERE id = p_user_id;
  IF NOT FOUND OR NULLIF(BTRIM(profile_row.email), '') IS NULL THEN
    RAISE EXCEPTION 'Customer email is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO address_row
  FROM addresses
  WHERE id = p_address_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipping address not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_billing_same_as_shipping IS NOT TRUE AND (
    NULLIF(BTRIM(p_billing ->> 'full_name'), '') IS NULL
    OR NULLIF(BTRIM(p_billing ->> 'address_line1'), '') IS NULL
    OR NULLIF(BTRIM(p_billing ->> 'city'), '') IS NULL
    OR NULLIF(BTRIM(p_billing ->> 'state'), '') IS NULL
    OR NULLIF(BTRIM(p_billing ->> 'pincode'), '') IS NULL
    OR NULLIF(BTRIM(p_billing ->> 'country'), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Complete billing address is required' USING ERRCODE = '22023';
  END IF;

  SELECT value INTO shipping_methods
  FROM site_settings
  WHERE key = 'shipping_methods';
  shipping_config := shipping_methods -> p_shipping_method;

  IF shipping_config IS NULL OR COALESCE((shipping_config ->> 'enabled')::BOOLEAN, FALSE) IS FALSE THEN
    RAISE EXCEPTION 'Shipping method is unavailable' USING ERRCODE = '22023';
  END IF;

  FOR cart_line IN
    SELECT
      cart_items.product_id,
      cart_items.quantity,
      products.name,
      products.sku,
      products.price_paisa,
      products.stock,
      products.is_active,
      (
        SELECT product_images.url
        FROM product_images
        WHERE product_images.product_id = products.id
        ORDER BY product_images.is_primary DESC, product_images.sort_order, product_images.id
        LIMIT 1
      ) AS image_url
    FROM cart_items
    JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.user_id = p_user_id
    ORDER BY products.id
    FOR UPDATE OF products, cart_items
  LOOP
    cart_count := cart_count + 1;
    IF cart_line.is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Product % is no longer available', cart_line.name USING ERRCODE = 'P0001';
    END IF;
    IF cart_line.quantity > cart_line.stock THEN
      RAISE EXCEPTION 'Product % has only % units available', cart_line.name, cart_line.stock
        USING ERRCODE = 'P0001';
    END IF;
    subtotal_value := subtotal_value + (cart_line.price_paisa::BIGINT * cart_line.quantity);
  END LOOP;

  IF cart_count = 0 THEN
    RAISE EXCEPTION 'Your cart is empty' USING ERRCODE = 'P0002';
  END IF;

  IF NULLIF(BTRIM(p_coupon_code), '') IS NOT NULL THEN
    SELECT * INTO coupon_row
    FROM coupons
    WHERE code = UPPER(BTRIM(p_coupon_code))
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Coupon code not found' USING ERRCODE = 'P0002';
    END IF;
    IF coupon_row.is_active IS NOT TRUE
      OR coupon_row.valid_from > NOW()
      OR (coupon_row.valid_until IS NOT NULL AND coupon_row.valid_until < NOW()) THEN
      RAISE EXCEPTION 'Coupon is not active' USING ERRCODE = 'P0001';
    END IF;
    IF subtotal_value < coupon_row.min_order_amount_paisa THEN
      RAISE EXCEPTION 'Coupon minimum order is not met' USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*) INTO active_coupon_reservations
    FROM coupon_redemption_reservations
    WHERE coupon_id = coupon_row.id
      AND status = 'reserved';

    IF coupon_row.max_uses IS NOT NULL
      AND coupon_row.times_used + active_coupon_reservations >= coupon_row.max_uses THEN
      RAISE EXCEPTION 'Coupon usage limit has been reached' USING ERRCODE = 'P0001';
    END IF;

    IF coupon_row.discount_type = 'percentage' THEN
      discount_value := ROUND(subtotal_value::NUMERIC * coupon_row.discount_value / 100.0)::BIGINT;
      IF coupon_row.max_discount_paisa IS NOT NULL AND coupon_row.max_discount_paisa > 0 THEN
        discount_value := LEAST(discount_value, coupon_row.max_discount_paisa);
      END IF;
    ELSE
      discount_value := LEAST(coupon_row.discount_value, subtotal_value);
    END IF;
  END IF;

  discounted_subtotal := GREATEST(0, subtotal_value - discount_value);
  IF discounted_subtotal = 0 OR (
    COALESCE((shipping_config ->> 'free_threshold_paisa')::INT, 0) > 0
    AND discounted_subtotal >= (shipping_config ->> 'free_threshold_paisa')::INT
  ) THEN
    shipping_value := 0;
  ELSE
    shipping_value := (shipping_config ->> 'charge_paisa')::INT;
  END IF;

  total_value := discounted_subtotal + shipping_value;
  IF total_value < 100 THEN
    RAISE EXCEPTION 'Order total must be at least 100 paisa' USING ERRCODE = '22023';
  END IF;

  IF subtotal_value NOT BETWEEN 100 AND 2147483647 OR discount_value NOT BETWEEN 0 AND 2147483647 OR total_value NOT BETWEEN 100 AND 2147483647 THEN
    RAISE EXCEPTION 'Order amount exceeds supported paisa bounds' USING ERRCODE='22023'; END IF;

  order_number_value := generate_order_number(p_order_prefix);

  INSERT INTO orders (
    order_number,
    user_id,
    status,
    payment_status,
    fulfillment_status,
    contact_email,
    shipping_full_name,
    shipping_phone,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_pincode,
    shipping_country,
    shipping_method,
    subtotal_paisa,
    discount_amount_paisa,
    shipping_amount_paisa,
    tax_amount_paisa,
    total_amount_paisa,
    coupon_id,
    coupon_code,
    coupon_discount_paisa,
    checkout_expires_at,
    billing_same_as_shipping,
    billing_full_name,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_state,
    billing_pincode,
    billing_country,
    billing_gst_number,
    notes
  ) VALUES (
    order_number_value,
    p_user_id,
    'pending',
    'pending',
    'unfulfilled',
    profile_row.email,
    address_row.full_name,
    address_row.phone,
    address_row.address_line1,
    address_row.address_line2,
    address_row.city,
    address_row.state,
    address_row.pincode,
    address_row.country,
    p_shipping_method,
    subtotal_value,
    discount_value,
    shipping_value,
    0,
    total_value,
    coupon_row.id,
    coupon_row.code,
    discount_value,
    expiry_value,
    p_billing_same_as_shipping,
    CASE WHEN p_billing_same_as_shipping THEN address_row.full_name ELSE p_billing ->> 'full_name' END,
    CASE WHEN p_billing_same_as_shipping THEN address_row.address_line1 ELSE p_billing ->> 'address_line1' END,
    CASE WHEN p_billing_same_as_shipping THEN address_row.address_line2 ELSE p_billing ->> 'address_line2' END,
    CASE WHEN p_billing_same_as_shipping THEN address_row.city ELSE p_billing ->> 'city' END,
    CASE WHEN p_billing_same_as_shipping THEN address_row.state ELSE p_billing ->> 'state' END,
    CASE WHEN p_billing_same_as_shipping THEN address_row.pincode ELSE p_billing ->> 'pincode' END,
    CASE WHEN p_billing_same_as_shipping THEN address_row.country ELSE p_billing ->> 'country' END,
    CASE WHEN p_billing_same_as_shipping THEN NULL ELSE NULLIF(BTRIM(p_billing ->> 'gst_number'), '') END,
    p_notes
  ) RETURNING * INTO order_row;

  FOR cart_line IN
    SELECT
      cart_items.product_id,
      cart_items.quantity,
      products.name,
      products.sku,
      products.price_paisa,
      (
        SELECT product_images.url
        FROM product_images
        WHERE product_images.product_id = products.id
        ORDER BY product_images.is_primary DESC, product_images.sort_order, product_images.id
        LIMIT 1
      ) AS image_url
    FROM cart_items
    JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.user_id = p_user_id
    ORDER BY products.id
  LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      product_sku,
      product_image_url,
      quantity,
      unit_price_paisa,
      total_price_paisa
    ) VALUES (
      order_row.id,
      cart_line.product_id,
      cart_line.name,
      cart_line.sku,
      cart_line.image_url,
      cart_line.quantity,
      cart_line.price_paisa,
      cart_line.price_paisa::BIGINT * cart_line.quantity
    );

    UPDATE products
    SET stock = stock - cart_line.quantity
    WHERE id = cart_line.product_id;

    INSERT INTO inventory_reservations (
      order_id,
      product_id,
      quantity,
      expires_at
    ) VALUES (
      order_row.id,
      cart_line.product_id,
      cart_line.quantity,
      expiry_value
    );
  END LOOP;

  IF coupon_row.id IS NOT NULL THEN
    INSERT INTO coupon_redemption_reservations (order_id, coupon_id, expires_at)
    VALUES (order_row.id, coupon_row.id, expiry_value);
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'order', TO_JSONB(order_row),
    'product_ids', (
      SELECT COALESCE(JSONB_AGG(order_items.product_id), '[]'::JSONB)
      FROM order_items
      WHERE order_items.order_id = order_row.id
    )
  );
END;
$$;


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

  IF payment_row.amount_paisa <> p_amount_paisa
    OR payment_row.currency <> UPPER(p_currency)
    OR order_row.total_amount_paisa <> p_amount_paisa THEN
    RAISE EXCEPTION 'Provider amount or currency does not match order' USING ERRCODE = '22023';
  END IF;

  IF p_payment_method NOT IN ('card', 'upi', 'netbanking', 'wallet', 'emi', 'paylater') THEN
    RAISE EXCEPTION 'Unsupported payment method' USING ERRCODE = '22023';
  END IF;

  IF payment_row.razorpay_payment_id IS NOT NULL AND payment_row.razorpay_payment_id IS DISTINCT FROM p_razorpay_payment_id THEN
    RAISE EXCEPTION 'Captured payment identity does not match' USING ERRCODE='22023'; END IF;
  IF payment_row.status = 'captured' AND order_row.payment_status = 'paid' THEN
    RETURN JSONB_BUILD_OBJECT('already_captured', TRUE, 'order', TO_JSONB(order_row));
  END IF;
  IF payment_row.status NOT IN ('created','authorized') OR order_row.status <> 'pending' OR order_row.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'Order is not eligible for capture; reconcile late funds' USING ERRCODE='22023'; END IF;

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

CREATE FUNCTION public.claim_razorpay_refund_dispatch(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_operation_id UUID,p_provider_mode TEXT,p_provider_key_id TEXT
) RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_op public.provider_operations%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL OR p_execution_scope IS DISTINCT FROM 'provider_operation'
    OR p_execution_resource_id IS DISTINCT FROM p_operation_id::TEXT THEN
    RAISE EXCEPTION 'Invalid refund lease' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT o.* INTO v_op FROM public.provider_operations o JOIN public.payments p ON p.id=o.payment_id AND p.order_id=o.order_id
    WHERE o.id=p_operation_id AND o.provider='razorpay' AND o.operation_type IN ('full_refund','partial_refund')
      AND p.razorpay_payment_id=o.provider_target_id FOR UPDATE OF o;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund payment identity does not match' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_razorpay_order_environment(v_op.order_id,p_provider_mode,p_provider_key_id);
  IF v_op.dispatch_attempts>0 AND v_op.refund_idempotency_protected IS NOT TRUE THEN
    RAISE EXCEPTION 'Legacy refund dispatch needs reconciliation' USING ERRCODE='22023'; END IF;
  UPDATE public.provider_operations SET refund_idempotency_protected=TRUE WHERE id=p_operation_id;
  RETURN public.claim_provider_operation_dispatch_v53(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,p_operation_id);
END; $$;

CREATE FUNCTION public.finalize_razorpay_refund(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_operation_id UUID,p_provider_target_type TEXT,p_provider_target_id TEXT,p_payment_id UUID,p_amount_paisa INT,p_currency TEXT,p_request_hash TEXT,
  p_provider_mode TEXT,p_provider_key_id TEXT
) RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order_id UUID;
BEGIN
  IF p_operation_id IS NULL OR p_execution_scope IS DISTINCT FROM 'provider_operation'
    OR p_execution_resource_id IS DISTINCT FROM p_operation_id::TEXT THEN RAISE EXCEPTION 'Invalid refund lease' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT o.order_id INTO v_order_id FROM public.provider_operations o JOIN public.payments p ON p.id=o.payment_id AND p.order_id=o.order_id
    WHERE o.id=p_operation_id AND o.provider='razorpay' AND o.operation_type IN ('full_refund','partial_refund');
  PERFORM public.assert_razorpay_order_environment(v_order_id,p_provider_mode,p_provider_key_id);
  RETURN public.finalize_provider_operation_v53(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,
    p_operation_id,p_provider_target_type,p_provider_target_id,p_payment_id,p_amount_paisa,p_currency,p_request_hash);
END; $$;

CREATE OR REPLACE FUNCTION public.claim_provider_operation_dispatch(p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,p_operation_id UUID)
RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order_id UUID;
BEGIN
  IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Operation is required' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT order_id INTO v_order_id FROM public.provider_operations WHERE id=p_operation_id AND provider='shiprocket' AND operation_type IN ('cancel_order','cancel_shipment');
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Use the environment-bound refund dispatcher' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.orders WHERE id=v_order_id FOR UPDATE;
  RETURN public.claim_provider_operation_dispatch_v53(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,p_operation_id);
END; $$;

CREATE OR REPLACE FUNCTION public.finalize_provider_operation(p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,p_operation_id UUID,p_provider_target_type TEXT,p_provider_target_id TEXT,p_payment_id UUID,p_amount_paisa INTEGER,p_currency TEXT,p_request_hash TEXT)
RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order_id UUID;
BEGIN
  IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Operation is required' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT order_id INTO v_order_id FROM public.provider_operations WHERE id=p_operation_id AND provider='shiprocket' AND operation_type IN ('cancel_order','cancel_shipment');
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Use the environment-bound refund finalizer' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.orders WHERE id=v_order_id FOR UPDATE;
  RETURN public.finalize_provider_operation_v53(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,p_operation_id,p_provider_target_type,p_provider_target_id,p_payment_id,p_amount_paisa,p_currency,p_request_hash);
END; $$;

CREATE OR REPLACE FUNCTION public.authorize_razorpay_refund_retry(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,p_operation_id UUID
) RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_op public.provider_operations%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL OR p_execution_scope IS DISTINCT FROM 'provider_operation'
    OR p_execution_resource_id IS DISTINCT FROM p_operation_id::TEXT THEN
    RAISE EXCEPTION 'Invalid refund lease' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  UPDATE public.provider_operations SET state='prepared',identical_retry_authorized_at=NOW()
    WHERE id=p_operation_id AND provider='razorpay' AND operation_type IN ('full_refund','partial_refund')
    AND state='outcome_unknown' AND local_applied_at IS NULL AND dispatch_attempts=1
    AND refund_idempotency_protected=TRUE AND identical_retry_authorized_at IS NULL
    AND reconciliation_attempts>0 AND last_reconciled_at IS NOT NULL AND response_metadata->>'reconciliation'='no_match'
    RETURNING * INTO v_op;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund replay requires protected original dispatch' USING ERRCODE='55P03'; END IF;
  RETURN v_op;
END; $$;

CREATE FUNCTION public.align_retained_coupon_deadline() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  UPDATE public.coupon_redemption_reservations SET expires_at=NEW.checkout_expires_at
    WHERE order_id=NEW.id AND status='reserved';
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_retained_coupon_deadline AFTER UPDATE OF checkout_expires_at ON public.orders
FOR EACH ROW WHEN (NEW.checkout_expires_at IS DISTINCT FROM OLD.checkout_expires_at)
EXECUTE FUNCTION public.align_retained_coupon_deadline();

REVOKE ALL ON FUNCTION public.prepare_checkout_session_shipping(UUID,UUID,TEXT,JSONB,TEXT,JSONB),
  public.complete_checkout_preparation(UUID,UUID,TEXT,TEXT,TEXT,UUID,BIGINT),
  public.attach_razorpay_order(UUID,UUID,TEXT),
  public.finalize_captured_payment(TEXT,TEXT,TEXT,INT,TEXT,TEXT),
  public.finalize_captured_payment_fenced(TEXT,TEXT,UUID,BIGINT,TEXT,TEXT,TEXT,INT,TEXT,TEXT),
  public.initialize_checkout_v53(UUID,UUID,TEXT,TEXT,BOOLEAN,JSONB,TEXT,TEXT)
FROM PUBLIC,anon,authenticated,service_role;

DO $$ DECLARE v_function REGPROCEDURE; BEGIN
  FOR v_function IN SELECT p.oid::REGPROCEDURE FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('assert_razorpay_order_environment','prepare_checkout_payment','complete_checkout_payment',
    'finalize_checkout_payment','record_checkout_setup_failure','claim_razorpay_refund_dispatch','finalize_razorpay_refund','authorize_razorpay_refund_retry')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_function);
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.align_retained_coupon_deadline() FROM PUBLIC,anon,authenticated;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v58;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_contract JSONB:=public.get_runtime_schema_status_v58(); v_name TEXT; v_function REGPROCEDURE; v_ready BOOLEAN;
  v_retired TEXT[]:=ARRAY['public.prepare_checkout_session_shipping(uuid,uuid,text,jsonb,text,jsonb)',
    'public.complete_checkout_preparation(uuid,uuid,text,text,text,uuid,bigint)','public.attach_razorpay_order(uuid,uuid,text)',
    'public.finalize_captured_payment(text,text,text,integer,text,text)',
    'public.finalize_captured_payment_fenced(text,text,uuid,bigint,text,text,text,integer,text,text)'];
BEGIN
  v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements_text(v_contract->'invalid_function_grants') WHERE NOT value=ANY(v_retired)),'[]'::JSONB));
  FOREACH v_name IN ARRAY v_retired LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL OR has_function_privilege('service_role',v_function,'EXECUTE')
      OR has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||jsonb_build_array(v_name)); END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY[
    'public.assert_razorpay_order_environment(uuid,text,text)',
    'public.prepare_checkout_payment(uuid,uuid,text,jsonb,text,jsonb,text,text)',
    'public.complete_checkout_payment(uuid,uuid,text,text,text,uuid,bigint,text,text)',
    'public.finalize_checkout_payment(text,text,uuid,bigint,text,text,text,integer,text,text,text,text)',
    'public.record_checkout_setup_failure(uuid,boolean,text,text,text,text,uuid,bigint)',
    'public.claim_razorpay_refund_dispatch(text,text,uuid,bigint,uuid,text,text)',
    'public.finalize_razorpay_refund(text,text,uuid,bigint,uuid,text,text,uuid,integer,text,text,text,text)'
  ] LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL THEN v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||jsonb_build_array(v_name));
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE')
      OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||jsonb_build_array(v_name)); END IF;
  END LOOP;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.razorpay_order_bindings'::REGCLASS)
    OR has_table_privilege('anon','public.razorpay_order_bindings','SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated','public.razorpay_order_bindings','SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('service_role','public.razorpay_order_bindings','UPDATE') THEN
    v_contract:=jsonb_set(v_contract,'{invalid_relation_grants}',(v_contract->'invalid_relation_grants')||'["razorpay_order_bindings"]'::JSONB); END IF;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN v_contract||jsonb_build_object('contract_version',59,'ready',v_ready AND v_contract->>'migration_version'='059');
END; $$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v58() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v58() TO service_role;

COMMIT;
