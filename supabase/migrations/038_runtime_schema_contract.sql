BEGIN;

-- Reconcile the canonical 037 privilege boundary for every object that is
-- present. Missing objects remain visible in the contract report below.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

DO $$
DECLARE
  application_function REGPROCEDURE;
BEGIN
  FOR application_function IN
    SELECT procedure.oid::REGPROCEDURE
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND (procedure.prosecdef OR procedure.proname IN ('enqueue_retry_job', 'generate_order_number'))
  LOOP
    EXECUTE FORMAT(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      application_function
    );
    EXECUTE FORMAT('GRANT EXECUTE ON FUNCTION %s TO service_role', application_function);
  END LOOP;

  IF TO_REGPROCEDURE('public.is_admin(uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated';
  END IF;
END;
$$;

-- Keep this contract in the database so the API can reject traffic before a
-- partially deployed schema turns into unrelated PostgREST failures.
CREATE OR REPLACE FUNCTION public.get_runtime_schema_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_missing_relations JSONB;
  v_missing_columns JSONB;
  v_missing_functions JSONB;
  v_invalid_relation_grants JSONB;
  v_invalid_function_grants JSONB;
  v_missing_constraints JSONB;
  v_invalid_rls_relations JSONB;
  v_missing_indexes JSONB;
  v_invalid_storage_capabilities JSONB;
  v_latest_migration TEXT;
BEGIN
  SELECT MAX(version) INTO v_latest_migration
  FROM supabase_migrations.schema_migrations;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_relations
  FROM (
    VALUES
      ('addresses'),
      ('cart_items'),
      ('categories'),
      ('coupon_redemption_reservations'),
      ('coupons'),
      ('inventory_reservations'),
      ('invoice_records'),
      ('low_stock_products'),
      ('notification_deliveries'),
      ('notification_logs'),
      ('notification_preferences'),
      ('order_items'),
      ('order_status_history'),
      ('orders'),
      ('outbox_events'),
      ('payment_logs'),
      ('payment_reconciliation_cases'),
      ('payments'),
      ('product_images'),
      ('product_reviews'),
      ('products'),
      ('profiles'),
      ('retry_jobs'),
      ('shipment_events'),
      ('shipment_health'),
      ('site_settings'),
      ('sync_jobs'),
      ('tracking_snapshots'),
      ('webhook_events')
  ) AS expected(name)
  WHERE TO_REGCLASS(FORMAT('public.%I', expected.name)) IS NULL;

  SELECT COALESCE(
    JSONB_AGG(expected.relation || '.' || expected.column_name
      ORDER BY expected.relation, expected.column_name),
    '[]'::JSONB
  )
  INTO v_missing_columns
  FROM (
    VALUES
      ('orders', 'billing_address_line1'),
      ('orders', 'billing_address_line2'),
      ('orders', 'billing_city'),
      ('orders', 'billing_country'),
      ('orders', 'billing_full_name'),
      ('orders', 'billing_gst_number'),
      ('orders', 'billing_pincode'),
      ('orders', 'billing_same_as_shipping'),
      ('orders', 'billing_state'),
      ('orders', 'checkout_expires_at'),
      ('orders', 'contact_email'),
      ('orders', 'fulfillment_step'),
      ('orders', 'fulfillment_status'),
      ('orders', 'payment_method'),
      ('orders', 'payment_status'),
      ('orders', 'shipping_method'),
      ('orders', 'status'),
      ('outbox_events', 'aggregate_id'),
      ('outbox_events', 'available_at'),
      ('outbox_events', 'claimed_at'),
      ('outbox_events', 'deduplication_key'),
      ('outbox_events', 'status'),
      ('notification_deliveries', 'available_at'),
      ('notification_deliveries', 'claimed_at'),
      ('notification_deliveries', 'max_attempts'),
      ('notification_deliveries', 'outbox_event_id'),
      ('notification_deliveries', 'status'),
      ('shipment_events', 'vendor_event_id'),
      ('invoice_records', 'object_path'),
      ('invoice_records', 'order_id'),
      ('invoice_records', 'status'),
      ('sync_jobs', 'updated_at'),
      ('webhook_events', 'event_id'),
      ('webhook_events', 'updated_at')
  ) AS expected(relation, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns AS actual
    WHERE actual.table_schema = 'public'
      AND actual.table_name = expected.relation
      AND actual.column_name = expected.column_name
  );

  SELECT COALESCE(JSONB_AGG(expected.signature ORDER BY expected.signature), '[]'::JSONB)
  INTO v_missing_functions
  FROM (
    VALUES
      ('public.add_cart_item_checked(uuid,uuid,integer)'),
      ('public.add_product_image_atomic(uuid,text,text,integer,boolean)'),
      ('public.attach_razorpay_order(uuid,uuid,text)'),
      ('public.begin_invoice_generation(uuid,text)'),
      ('public.claim_notification_deliveries(integer)'),
      ('public.claim_notification_outbox(integer)'),
      ('public.complete_notification_delivery(uuid,text)'),
      ('public.complete_notification_outbox(uuid)'),
      ('public.check_webhook_duplicate(text)'),
      ('public.decrement_stock(uuid,integer)'),
      ('public.enqueue_retry_job(text,text,jsonb,integer)'),
      ('public.expire_abandoned_checkouts(integer)'),
      ('public.fail_checkout(uuid,text)'),
      ('public.fail_notification_delivery(uuid,text)'),
      ('public.fail_notification_outbox(uuid,text)'),
      ('public.finalize_captured_payment(text,text,text,integer,text,text)'),
      ('public.get_product_review_summaries(uuid[])'),
      ('public.generate_order_number(text)'),
      ('public.increment_coupon_usage(uuid)'),
      ('public.initialize_checkout(uuid,uuid,text,text,boolean,jsonb,text,text)'),
      ('public.reorder_product_images_atomic(uuid,uuid[])'),
      ('public.set_cart_item_quantity_checked(uuid,uuid,integer)'),
      ('public.set_default_address(uuid,uuid)'),
      ('public.skip_notification_delivery(uuid,text)'),
      ('public.transition_order_status(uuid,text,text,text,uuid,jsonb)'),
      ('public.update_site_settings_bulk(jsonb)'),
      ('public.delete_product_image_atomic(uuid,uuid)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(expected.signature) IS NULL;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_invalid_relation_grants
  FROM (
    VALUES
      ('addresses'), ('cart_items'), ('categories'), ('coupon_redemption_reservations'),
      ('coupons'), ('inventory_reservations'), ('invoice_records'), ('low_stock_products'),
      ('notification_deliveries'), ('notification_logs'), ('notification_preferences'),
      ('order_items'), ('order_status_history'), ('orders'), ('outbox_events'),
      ('payment_logs'), ('payment_reconciliation_cases'), ('payments'), ('product_images'),
      ('product_reviews'), ('products'), ('profiles'), ('retry_jobs'), ('shipment_events'),
      ('shipment_health'), ('site_settings'), ('sync_jobs'), ('tracking_snapshots'),
      ('webhook_events')
  ) AS expected(name)
  WHERE TO_REGCLASS(FORMAT('public.%I', expected.name)) IS NOT NULL
    AND (
      NOT HAS_TABLE_PRIVILEGE('service_role', FORMAT('public.%I', expected.name), 'SELECT')
      OR (
        expected.name NOT IN ('low_stock_products', 'shipment_health')
        AND (
          NOT HAS_TABLE_PRIVILEGE('service_role', FORMAT('public.%I', expected.name), 'INSERT')
          OR NOT HAS_TABLE_PRIVILEGE('service_role', FORMAT('public.%I', expected.name), 'UPDATE')
          OR NOT HAS_TABLE_PRIVILEGE('service_role', FORMAT('public.%I', expected.name), 'DELETE')
        )
      )
      OR HAS_TABLE_PRIVILEGE('anon', FORMAT('public.%I', expected.name), 'SELECT')
      OR HAS_TABLE_PRIVILEGE('anon', FORMAT('public.%I', expected.name), 'INSERT')
      OR HAS_TABLE_PRIVILEGE('anon', FORMAT('public.%I', expected.name), 'UPDATE')
      OR HAS_TABLE_PRIVILEGE('anon', FORMAT('public.%I', expected.name), 'DELETE')
      OR HAS_TABLE_PRIVILEGE('authenticated', FORMAT('public.%I', expected.name), 'SELECT')
      OR HAS_TABLE_PRIVILEGE('authenticated', FORMAT('public.%I', expected.name), 'INSERT')
      OR HAS_TABLE_PRIVILEGE('authenticated', FORMAT('public.%I', expected.name), 'UPDATE')
      OR HAS_TABLE_PRIVILEGE('authenticated', FORMAT('public.%I', expected.name), 'DELETE')
    );

  SELECT COALESCE(JSONB_AGG(expected.signature ORDER BY expected.signature), '[]'::JSONB)
  INTO v_invalid_function_grants
  FROM (
    VALUES
      ('public.add_cart_item_checked(uuid,uuid,integer)'),
      ('public.add_product_image_atomic(uuid,text,text,integer,boolean)'),
      ('public.attach_razorpay_order(uuid,uuid,text)'),
      ('public.begin_invoice_generation(uuid,text)'),
      ('public.claim_notification_deliveries(integer)'),
      ('public.claim_notification_outbox(integer)'),
      ('public.complete_notification_delivery(uuid,text)'),
      ('public.complete_notification_outbox(uuid)'),
      ('public.check_webhook_duplicate(text)'),
      ('public.decrement_stock(uuid,integer)'),
      ('public.delete_product_image_atomic(uuid,uuid)'),
      ('public.enqueue_retry_job(text,text,jsonb,integer)'),
      ('public.expire_abandoned_checkouts(integer)'),
      ('public.fail_checkout(uuid,text)'),
      ('public.fail_notification_delivery(uuid,text)'),
      ('public.fail_notification_outbox(uuid,text)'),
      ('public.finalize_captured_payment(text,text,text,integer,text,text)'),
      ('public.get_product_review_summaries(uuid[])'),
      ('public.generate_order_number(text)'),
      ('public.increment_coupon_usage(uuid)'),
      ('public.initialize_checkout(uuid,uuid,text,text,boolean,jsonb,text,text)'),
      ('public.reorder_product_images_atomic(uuid,uuid[])'),
      ('public.set_cart_item_quantity_checked(uuid,uuid,integer)'),
      ('public.set_default_address(uuid,uuid)'),
      ('public.skip_notification_delivery(uuid,text)'),
      ('public.transition_order_status(uuid,text,text,text,uuid,jsonb)'),
      ('public.update_site_settings_bulk(jsonb)')
  ) AS expected(signature)
  WHERE TO_REGPROCEDURE(expected.signature) IS NOT NULL
    AND (
      NOT HAS_FUNCTION_PRIVILEGE('service_role', expected.signature, 'EXECUTE')
      OR HAS_FUNCTION_PRIVILEGE('anon', expected.signature, 'EXECUTE')
      OR HAS_FUNCTION_PRIVILEGE('authenticated', expected.signature, 'EXECUTE')
      OR EXISTS (
        SELECT 1
        FROM pg_proc AS procedure,
          LATERAL ACLEXPLODE(
            COALESCE(procedure.proacl, ACLDEFAULT('f', procedure.proowner))
          ) AS privilege
        WHERE procedure.oid = TO_REGPROCEDURE(expected.signature)
          AND privilege.grantee = 0
          AND privilege.privilege_type = 'EXECUTE'
      )
    );

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_constraints
  FROM (
    VALUES
      ('orders', 'orders_fulfillment_status_allowed'),
      ('orders', 'orders_fulfillment_step_allowed'),
      ('orders', 'orders_payment_status_allowed'),
      ('orders', 'orders_shipping_method_allowed'),
      ('orders', 'orders_status_allowed'),
      ('retry_jobs', 'retry_jobs_job_type_check')
  ) AS expected(relation, name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS actual
    JOIN pg_class AS relation ON relation.oid = actual.conrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = expected.relation
      AND actual.conname = expected.name
  );

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_invalid_rls_relations
  FROM (
    VALUES
      ('addresses'), ('cart_items'), ('categories'), ('coupon_redemption_reservations'),
      ('coupons'), ('inventory_reservations'), ('invoice_records'),
      ('notification_deliveries'), ('notification_logs'), ('notification_preferences'),
      ('order_items'), ('order_status_history'), ('orders'), ('outbox_events'),
      ('payment_logs'), ('payment_reconciliation_cases'), ('payments'), ('product_images'),
      ('product_reviews'), ('products'), ('profiles'), ('retry_jobs'), ('shipment_events'),
      ('site_settings'), ('sync_jobs'), ('tracking_snapshots'), ('webhook_events')
  ) AS expected(name)
  JOIN pg_class AS relation
    ON relation.oid = TO_REGCLASS(FORMAT('public.%I', expected.name))
  WHERE NOT relation.relrowsecurity;

  SELECT COALESCE(JSONB_AGG(expected.name ORDER BY expected.name), '[]'::JSONB)
  INTO v_missing_indexes
  FROM (
    VALUES
      ('idx_addresses_one_default_per_user'),
      ('idx_payments_one_per_order'),
      ('idx_webhook_events_source_event_id'),
      ('orders_awb_code_unique'),
      ('orders_shiprocket_order_id_unique'),
      ('orders_shipment_id_unique'),
      ('product_images_one_primary_per_product')
  ) AS expected(name)
  WHERE TO_REGCLASS(FORMAT('public.%I', expected.name)) IS NULL;

  SELECT COALESCE(JSONB_AGG(capability ORDER BY capability), '[]'::JSONB)
  INTO v_invalid_storage_capabilities
  FROM (
    SELECT 'images_bucket' AS capability
    WHERE NOT EXISTS (
      SELECT 1 FROM storage.buckets
      WHERE id = 'images'
        AND file_size_limit = 8388608
        AND allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::TEXT[]
    )
    UNION ALL
    SELECT 'invoices_bucket'
    WHERE NOT EXISTS (
      SELECT 1 FROM storage.buckets
      WHERE id = 'invoices'
        AND public = FALSE
        AND file_size_limit = 10485760
        AND allowed_mime_types @> ARRAY['application/pdf']::TEXT[]
    )
    UNION ALL
    SELECT expected.policy_name
    FROM (
      VALUES ('images_insert_admin'), ('images_update_admin'), ('images_delete_admin')
    ) AS expected(policy_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_policy AS policy
      JOIN pg_class AS relation ON relation.oid = policy.polrelid
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'storage'
        AND relation.relname = 'objects'
        AND policy.polname = expected.policy_name
    )
  ) AS invalid;

  RETURN JSONB_BUILD_OBJECT(
    'contract_version', 38,
    'migration_version', v_latest_migration,
    'ready',
      v_latest_migration = '038'
      AND v_missing_relations = '[]'::JSONB
      AND v_missing_columns = '[]'::JSONB
      AND v_missing_functions = '[]'::JSONB
      AND v_invalid_relation_grants = '[]'::JSONB
      AND v_invalid_function_grants = '[]'::JSONB
      AND v_missing_constraints = '[]'::JSONB
      AND v_invalid_rls_relations = '[]'::JSONB
      AND v_missing_indexes = '[]'::JSONB
      AND v_invalid_storage_capabilities = '[]'::JSONB,
    'missing_relations', v_missing_relations,
    'missing_columns', v_missing_columns,
    'missing_functions', v_missing_functions,
    'invalid_relation_grants', v_invalid_relation_grants,
    'invalid_function_grants', v_invalid_function_grants,
    'missing_constraints', v_missing_constraints,
    'invalid_rls_relations', v_invalid_rls_relations,
    'missing_indexes', v_missing_indexes,
    'invalid_storage_capabilities', v_invalid_storage_capabilities
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_runtime_schema_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status() TO service_role;

COMMIT;
