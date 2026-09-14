-- Reserve checkout capacity and finalize payments in database transactions.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_expires_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_same_as_shipping BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_full_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_pincode TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_country TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_gst_number TEXT;

UPDATE orders AS orders_to_update
SET
  contact_email = profiles.email,
  shipping_method = 'standard',
  billing_full_name = orders_to_update.shipping_full_name,
  billing_address_line1 = orders_to_update.shipping_address_line1,
  billing_address_line2 = orders_to_update.shipping_address_line2,
  billing_city = orders_to_update.shipping_city,
  billing_state = orders_to_update.shipping_state,
  billing_pincode = orders_to_update.shipping_pincode,
  billing_country = orders_to_update.shipping_country
FROM profiles
WHERE profiles.id = orders_to_update.user_id
  AND orders_to_update.contact_email IS NULL;

ALTER TABLE orders ALTER COLUMN contact_email SET NOT NULL;
ALTER TABLE orders ALTER COLUMN shipping_method SET DEFAULT 'standard';
ALTER TABLE orders ALTER COLUMN shipping_method SET NOT NULL;
ALTER TABLE orders ALTER COLUMN billing_full_name SET NOT NULL;
ALTER TABLE orders ALTER COLUMN billing_address_line1 SET NOT NULL;
ALTER TABLE orders ALTER COLUMN billing_city SET NOT NULL;
ALTER TABLE orders ALTER COLUMN billing_state SET NOT NULL;
ALTER TABLE orders ALTER COLUMN billing_pincode SET NOT NULL;
ALTER TABLE orders ALTER COLUMN billing_country SET NOT NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shipping_method_allowed;
ALTER TABLE orders ADD CONSTRAINT orders_shipping_method_allowed
  CHECK (shipping_method IN ('standard', 'express'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_allowed;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_allowed
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('card', 'upi', 'netbanking', 'wallet', 'emi', 'paylater')
  );

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products (id),
  quantity INT NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'committed', 'released')),
  expires_at TIMESTAMPTZ NOT NULL,
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expiry
  ON inventory_reservations (expires_at)
  WHERE status = 'reserved';

CREATE TABLE IF NOT EXISTS coupon_redemption_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons (id),
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'committed', 'released')),
  expires_at TIMESTAMPTZ NOT NULL,
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_reservations_active
  ON coupon_redemption_reservations (coupon_id, expires_at)
  WHERE status = 'reserved';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_per_order ON payments (order_id);

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  deduplication_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_reconciliation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments (id),
  order_id UUID NOT NULL REFERENCES orders (id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'quarantined'
    CHECK (status IN ('quarantined', 'reviewing', 'resolved')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO payment_reconciliation_cases (payment_id, order_id, reason)
SELECT
  payments.id,
  payments.order_id,
  'Legacy custom-payment identifiers require manual provider reconciliation'
FROM payments
WHERE payments.razorpay_payment_id LIKE 'pay_custom_%'
  OR payments.razorpay_signature LIKE 'sig_custom_%'
ON CONFLICT (payment_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_outbox_events_claim
  ON outbox_events (available_at, created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_source_event_id
  ON webhook_events (source, event_id)
  WHERE event_id IS NOT NULL;

ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemption_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliation_cases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE inventory_reservations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE coupon_redemption_reservations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE outbox_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE payment_reconciliation_cases FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE inventory_reservations TO service_role;
GRANT ALL ON TABLE coupon_redemption_reservations TO service_role;
GRANT ALL ON TABLE outbox_events TO service_role;
GRANT ALL ON TABLE payment_reconciliation_cases TO service_role;

DROP TRIGGER IF EXISTS inventory_reservations_set_updated_at ON inventory_reservations;
CREATE TRIGGER inventory_reservations_set_updated_at
  BEFORE UPDATE ON inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS coupon_reservations_set_updated_at ON coupon_redemption_reservations;
CREATE TRIGGER coupon_reservations_set_updated_at
  BEFORE UPDATE ON coupon_redemption_reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS outbox_events_set_updated_at ON outbox_events;
CREATE TRIGGER outbox_events_set_updated_at
  BEFORE UPDATE ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS payment_reconciliation_cases_set_updated_at
  ON payment_reconciliation_cases;
CREATE TRIGGER payment_reconciliation_cases_set_updated_at
  BEFORE UPDATE ON payment_reconciliation_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION initialize_checkout(
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
SET search_path = public
AS $$
DECLARE
  address_row addresses%ROWTYPE;
  profile_row profiles%ROWTYPE;
  coupon_row coupons%ROWTYPE;
  cart_line RECORD;
  order_row orders%ROWTYPE;
  shipping_methods JSONB;
  shipping_config JSONB;
  subtotal_value INT := 0;
  discount_value INT := 0;
  discounted_subtotal INT;
  shipping_value INT;
  total_value INT;
  cart_count INT := 0;
  active_coupon_reservations INT := 0;
  expiry_value TIMESTAMPTZ := NOW() + INTERVAL '15 minutes';
  order_number_value TEXT;
BEGIN
  IF p_shipping_method NOT IN ('standard', 'express') THEN
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
    subtotal_value := subtotal_value + (cart_line.price_paisa * cart_line.quantity);
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
      AND status = 'reserved'
      AND expires_at > NOW();

    IF coupon_row.max_uses IS NOT NULL
      AND coupon_row.times_used + active_coupon_reservations >= coupon_row.max_uses THEN
      RAISE EXCEPTION 'Coupon usage limit has been reached' USING ERRCODE = 'P0001';
    END IF;

    IF coupon_row.discount_type = 'percentage' THEN
      discount_value := ROUND(subtotal_value * coupon_row.discount_value / 100.0)::INT;
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
      cart_line.price_paisa * cart_line.quantity
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

CREATE OR REPLACE FUNCTION attach_razorpay_order(
  p_user_id UUID,
  p_order_id UUID,
  p_razorpay_order_id TEXT
)
RETURNS payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row orders%ROWTYPE;
  payment_row payments%ROWTYPE;
BEGIN
  SELECT * INTO order_row
  FROM orders
  WHERE id = p_order_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR order_row.status <> 'pending' OR order_row.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'Pending order not found' USING ERRCODE = 'P0002';
  END IF;
  IF order_row.checkout_expires_at <= NOW() THEN
    RAISE EXCEPTION 'Checkout has expired' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO payment_row
  FROM payments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF FOUND THEN
    IF payment_row.razorpay_order_id <> p_razorpay_order_id THEN
      RAISE EXCEPTION 'Order already has a different provider reference' USING ERRCODE = '23505';
    END IF;
    RETURN payment_row;
  END IF;

  INSERT INTO payments (order_id, razorpay_order_id, amount_paisa, currency, status)
  VALUES (order_row.id, p_razorpay_order_id, order_row.total_amount_paisa, 'INR', 'created')
  RETURNING * INTO payment_row;

  INSERT INTO payment_logs (payment_id, order_id, event_type, payload)
  VALUES (
    payment_row.id,
    order_row.id,
    'created',
    JSONB_BUILD_OBJECT('razorpay_order_id', p_razorpay_order_id)
  );

  RETURN payment_row;
END;
$$;

CREATE OR REPLACE FUNCTION finalize_captured_payment(
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
SET search_path = public
AS $$
DECLARE
  payment_row payments%ROWTYPE;
  order_row orders%ROWTYPE;
  committed_coupon_id UUID;
BEGIN
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

  DELETE FROM cart_items
  USING order_items
  WHERE order_items.order_id = order_row.id
    AND cart_items.user_id = order_row.user_id
    AND cart_items.product_id = order_items.product_id
    AND cart_items.quantity <= order_items.quantity;

  UPDATE cart_items
  SET quantity = cart_items.quantity - order_items.quantity
  FROM order_items
  WHERE order_items.order_id = order_row.id
    AND cart_items.user_id = order_row.user_id
    AND cart_items.product_id = order_items.product_id
    AND cart_items.quantity > order_items.quantity;

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

CREATE OR REPLACE FUNCTION fail_checkout(
  p_order_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row orders%ROWTYPE;
BEGIN
  SELECT * INTO order_row FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF order_row.payment_status = 'paid' OR EXISTS (
    SELECT 1 FROM payments WHERE order_id = p_order_id AND status = 'captured'
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE products
  SET stock = products.stock + inventory_reservations.quantity
  FROM inventory_reservations
  WHERE inventory_reservations.order_id = p_order_id
    AND inventory_reservations.product_id = products.id
    AND inventory_reservations.status = 'reserved';

  UPDATE inventory_reservations
  SET status = 'released', released_at = NOW()
  WHERE order_id = p_order_id AND status = 'reserved';

  UPDATE coupon_redemption_reservations
  SET status = 'released', released_at = NOW()
  WHERE order_id = p_order_id AND status = 'reserved';

  UPDATE payments
  SET status = 'failed', failure_reason = LEFT(p_reason, 1000)
  WHERE order_id = p_order_id AND status <> 'captured';

  UPDATE orders
  SET status = 'cancelled', payment_status = 'failed'
  WHERE id = p_order_id;

  INSERT INTO outbox_events (
    aggregate_type,
    aggregate_id,
    event_type,
    payload,
    deduplication_key
  ) VALUES (
    'order',
    p_order_id,
    'order.payment_failed',
    JSONB_BUILD_OBJECT('order_id', p_order_id, 'reason', LEFT(p_reason, 1000)),
    'order.payment_failed:' || p_order_id::TEXT
  ) ON CONFLICT (deduplication_key) DO NOTHING;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION expire_abandoned_checkouts(p_limit INT DEFAULT 100)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_order RECORD;
  expired_count INT := 0;
BEGIN
  FOR expired_order IN
    SELECT id
    FROM orders
    WHERE status = 'pending'
      AND payment_status = 'pending'
      AND checkout_expires_at < NOW()
    ORDER BY checkout_expires_at
    LIMIT GREATEST(1, LEAST(p_limit, 1000))
    FOR UPDATE SKIP LOCKED
  LOOP
    IF fail_checkout(expired_order.id, 'Checkout expired') THEN
      expired_count := expired_count + 1;
    END IF;
  END LOOP;
  RETURN expired_count;
END;
$$;

REVOKE ALL ON FUNCTION initialize_checkout(UUID, UUID, TEXT, TEXT, BOOLEAN, JSONB, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION attach_razorpay_order(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION finalize_captured_payment(TEXT, TEXT, TEXT, INT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fail_checkout(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION expire_abandoned_checkouts(INT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION initialize_checkout(UUID, UUID, TEXT, TEXT, BOOLEAN, JSONB, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION attach_razorpay_order(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION finalize_captured_payment(TEXT, TEXT, TEXT, INT, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION fail_checkout(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION expire_abandoned_checkouts(INT) TO service_role;
