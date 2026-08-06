


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."check_webhook_duplicate"("p_event_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  exists_flag BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM payment_logs
    WHERE razorpay_event_id = p_event_id
      AND event_type IN ('webhook_processed', 'webhook_duplicate')
  ) INTO exists_flag;
  RETURN exists_flag;
END;
$$;


ALTER FUNCTION "public"."check_webhook_duplicate"("p_event_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_stock"("p_product_id" "uuid", "p_qty" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_stock INT;
BEGIN
  UPDATE products
  SET stock = stock - p_qty
  WHERE id = p_product_id AND stock >= p_qty
  RETURNING stock INTO new_stock;

  -- new_stock is NULL if no row was updated (insufficient stock)
  RETURN new_stock;
END;
$$;


ALTER FUNCTION "public"."decrement_stock"("p_product_id" "uuid", "p_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_retry_job"("p_job_type" "text", "p_reference_id" "text", "p_payload" "jsonb", "p_max_retries" integer DEFAULT 5) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO retry_jobs (job_type, reference_id, payload, max_retries)
  VALUES (p_job_type, p_reference_id, p_payload, p_max_retries)
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;


ALTER FUNCTION "public"."enqueue_retry_job"("p_job_type" "text", "p_reference_id" "text", "p_payload" "jsonb", "p_max_retries" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number"("prefix" "text" DEFAULT 'MUV'::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  next_val BIGINT;
BEGIN
  SELECT nextval('order_number_seq') INTO next_val;
  -- Zero-pads to 6 digits; increase width here if > 999999 orders expected
  RETURN prefix || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$;


ALTER FUNCTION "public"."generate_order_number"("prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: re-running migrations is safe
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_coupon_usage"("p_coupon_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE coupons
  SET times_used = times_used + 1
  WHERE id = p_coupon_id;
END;
$$;


ALTER FUNCTION "public"."increment_coupon_usage"("p_coupon_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id
      AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."retry_jobs_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."retry_jobs_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "pincode" "text" NOT NULL,
    "country" "text" DEFAULT 'India'::"text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "parent_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "show_in_navbar" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" integer NOT NULL,
    "min_order_amount_paisa" integer DEFAULT 0 NOT NULL,
    "max_discount_paisa" integer,
    "max_uses" integer,
    "times_used" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" > 0)),
    CONSTRAINT "coupons_max_discount_paisa_check" CHECK ((("max_discount_paisa" IS NULL) OR ("max_discount_paisa" >= 0))),
    CONSTRAINT "coupons_max_uses_check" CHECK (("max_uses" > 0)),
    CONSTRAINT "coupons_min_order_amount_paisa_check" CHECK (("min_order_amount_paisa" >= 0)),
    CONSTRAINT "coupons_times_used_check" CHECK (("times_used" >= 0))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "short_description" "text",
    "category_id" "uuid" NOT NULL,
    "price_paisa" integer NOT NULL,
    "compare_at_price_paisa" integer,
    "cost_price_paisa" integer,
    "sku" "text",
    "stock" integer DEFAULT 0 NOT NULL,
    "weight_grams" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "tags" "text"[],
    "meta_title" "text",
    "meta_description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_compare_at_price_paisa_check" CHECK (("compare_at_price_paisa" >= 0)),
    CONSTRAINT "products_cost_price_paisa_check" CHECK (("cost_price_paisa" >= 0)),
    CONSTRAINT "products_price_paisa_check" CHECK (("price_paisa" >= 0)),
    CONSTRAINT "products_stock_check" CHECK (("stock" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."low_stock_products" AS
 SELECT "p"."id",
    "p"."name",
    "p"."sku",
    "p"."stock",
    "c"."name" AS "category_name"
   FROM ("public"."products" "p"
     JOIN "public"."categories" "c" ON (("c"."id" = "p"."category_id")))
  WHERE (("p"."stock" <= 10) AND ("p"."is_active" = true))
  ORDER BY "p"."stock";


ALTER VIEW "public"."low_stock_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "sent_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_message_id" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_logs_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['email'::"text", 'sms'::"text", 'push'::"text"]))),
    CONSTRAINT "notification_logs_sent_status_check" CHECK (("sent_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_enabled" boolean DEFAULT true NOT NULL,
    "sms_enabled" boolean DEFAULT false NOT NULL,
    "push_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "product_sku" "text",
    "product_image_url" "text",
    "quantity" integer NOT NULL,
    "unit_price_paisa" integer NOT NULL,
    "total_price_paisa" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_total_price_paisa_check" CHECK (("total_price_paisa" >= 0)),
    CONSTRAINT "order_items_unit_price_paisa_check" CHECK (("unit_price_paisa" >= 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "source" "text" NOT NULL,
    "actor_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_status_history_source_check" CHECK (("source" = ANY (ARRAY['webhook'::"text", 'polling_sync'::"text", 'admin_manual'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "fulfillment_status" "text" DEFAULT 'unfulfilled'::"text" NOT NULL,
    "shipping_full_name" "text" NOT NULL,
    "shipping_phone" "text" NOT NULL,
    "shipping_address_line1" "text" NOT NULL,
    "shipping_address_line2" "text",
    "shipping_city" "text" NOT NULL,
    "shipping_state" "text" NOT NULL,
    "shipping_pincode" "text" NOT NULL,
    "shipping_country" "text" DEFAULT 'India'::"text" NOT NULL,
    "subtotal_paisa" integer NOT NULL,
    "discount_amount_paisa" integer DEFAULT 0 NOT NULL,
    "shipping_amount_paisa" integer DEFAULT 0 NOT NULL,
    "tax_amount_paisa" integer DEFAULT 0 NOT NULL,
    "total_amount_paisa" integer NOT NULL,
    "coupon_id" "uuid",
    "coupon_code" "text",
    "coupon_discount_paisa" integer DEFAULT 0 NOT NULL,
    "awb_code" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shiprocket_order_id" "text",
    "shipment_id" "text",
    "courier_name" "text",
    "tracking_url" "text",
    "pickup_location" "text",
    "package_weight_grams" integer,
    "package_length_cm" integer,
    "package_breadth_cm" integer,
    "package_height_cm" integer,
    "shiprocket_status" "text",
    "shiprocket_error" "text",
    "pickup_scheduled_date" timestamp with time zone,
    "pickup_token_number" "text",
    "label_generated" boolean DEFAULT false NOT NULL,
    "manifest_generated" boolean DEFAULT false NOT NULL,
    "fulfillment_step" "text",
    CONSTRAINT "chk_orders_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'processing'::"text", 'shipped'::"text", 'out_for_delivery'::"text", 'delivered'::"text", 'cancelled'::"text", 'rto'::"text", 'returned'::"text", 'refunded'::"text", 'lost'::"text", 'damaged'::"text", 'delivery_failed'::"text"]))),
    CONSTRAINT "orders_discount_amount_paisa_check" CHECK (("discount_amount_paisa" >= 0)),
    CONSTRAINT "orders_fulfillment_step_check" CHECK (("fulfillment_step" = ANY (ARRAY['idle'::"text", 'order_created'::"text", 'awb_assigned'::"text", 'pickup_scheduled'::"text", 'label_generated'::"text", 'manifest_generated'::"text", 'ready_for_pickup'::"text"]))),
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_shipping_amount_paisa_check" CHECK (("shipping_amount_paisa" >= 0)),
    CONSTRAINT "orders_shiprocket_status_check" CHECK (("shiprocket_status" = ANY (ARRAY['pending'::"text", 'created'::"text", 'failed'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'processing'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_subtotal_paisa_check" CHECK (("subtotal_paisa" >= 0)),
    CONSTRAINT "orders_tax_amount_paisa_check" CHECK (("tax_amount_paisa" >= 0)),
    CONSTRAINT "orders_total_amount_paisa_check" CHECK (("total_amount_paisa" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid",
    "order_id" "uuid",
    "event_type" "text" NOT NULL,
    "payload" "jsonb",
    "razorpay_event_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "razorpay_order_id" "text" NOT NULL,
    "razorpay_payment_id" "text",
    "razorpay_signature" "text",
    "amount_paisa" integer NOT NULL,
    "currency" "text" DEFAULT 'INR'::"text" NOT NULL,
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "failure_reason" "text",
    "captured_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_paisa_check" CHECK (("amount_paisa" > 0)),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['created'::"text", 'captured'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "alt_text" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."retry_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_type" "text" NOT NULL,
    "reference_id" "text",
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "max_retries" integer DEFAULT 5 NOT NULL,
    "next_retry_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "retry_jobs_job_type_check" CHECK (("job_type" = ANY (ARRAY['webhook_process'::"text", 'tracking_sync'::"text", 'notification'::"text", 'label_generate'::"text", 'invoice_generate'::"text"]))),
    CONSTRAINT "retry_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'dead'::"text"])))
);


ALTER TABLE "public"."retry_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "shipment_id" "text",
    "status" "text" NOT NULL,
    "location" "text",
    "remarks" "text",
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raw_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload_hash" "text"
);


ALTER TABLE "public"."shipment_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracking_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "awb_code" "text" NOT NULL,
    "shipment_id" "text",
    "courier_name" "text",
    "current_status" "text" NOT NULL,
    "origin" "text",
    "destination" "text",
    "estimated_delivery_date" "date",
    "pickup_date" timestamp with time zone,
    "delivered_date" timestamp with time zone,
    "tracking_raw" "jsonb",
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sync_source" "text" NOT NULL,
    CONSTRAINT "tracking_snapshots_sync_source_check" CHECK (("sync_source" = ANY (ARRAY['webhook'::"text", 'cron_poll'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."tracking_snapshots" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."shipment_health" AS
 SELECT "o"."id" AS "order_id",
    "o"."order_number",
    "o"."status",
    "o"."courier_name",
    "o"."awb_code",
    "o"."created_at" AS "order_created_at",
    (("o"."shipping_city" || ', '::"text") || "o"."shipping_state") AS "destination",
    "ts"."current_status" AS "last_tracking_status",
    "ts"."synced_at" AS "last_synced_at",
        CASE
            WHEN (("o"."status" = 'out_for_delivery'::"text") AND ("ts"."synced_at" < ("now"() - '1 day'::interval))) THEN 'warning: OFD > 24h, possible NDR'::"text"
            WHEN (("o"."status" = 'processing'::"text") AND ("o"."created_at" < ("now"() - '2 days'::interval))) THEN 'warning: processing > 48h, pickup may be delayed'::"text"
            WHEN (("o"."status" = 'shipped'::"text") AND ("o"."created_at" < ("now"() - '7 days'::interval))) THEN 'warning: in transit > 7 days'::"text"
            ELSE 'healthy'::"text"
        END AS "health_status"
   FROM ("public"."orders" "o"
     LEFT JOIN LATERAL ( SELECT "tracking_snapshots"."current_status",
            "tracking_snapshots"."synced_at"
           FROM "public"."tracking_snapshots"
          WHERE ("tracking_snapshots"."order_id" = "o"."id")
          ORDER BY "tracking_snapshots"."synced_at" DESC
         LIMIT 1) "ts" ON (true))
  WHERE (("o"."status" = ANY (ARRAY['processing'::"text", 'shipped'::"text", 'out_for_delivery'::"text", 'delivery_failed'::"text"])) AND ("o"."awb_code" IS NOT NULL))
  ORDER BY
        CASE
            WHEN ("o"."status" = 'delivery_failed'::"text") THEN 1
            WHEN ("o"."status" = 'out_for_delivery'::"text") THEN 2
            WHEN ("o"."status" = 'processing'::"text") THEN 3
            ELSE 4
        END;


ALTER VIEW "public"."shipment_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_type" "text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "orders_checked" integer DEFAULT 0 NOT NULL,
    "orders_updated" integer DEFAULT 0 NOT NULL,
    "errors" "jsonb",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "sync_jobs_job_type_check" CHECK (("job_type" = ANY (ARRAY['full_poll'::"text", 'ofd_poll'::"text", 'manual'::"text"]))),
    CONSTRAINT "sync_jobs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."sync_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" DEFAULT 'shiprocket'::"text" NOT NULL,
    "event_type" "text",
    "payload_hash" "text" NOT NULL,
    "raw_payload" "jsonb" NOT NULL,
    "processing_status" "text" DEFAULT 'received'::"text" NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "webhook_events_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['received'::"text", 'verified'::"text", 'processed'::"text", 'failed'::"text", 'duplicate'::"text"]))),
    CONSTRAINT "webhook_events_source_check" CHECK (("source" = ANY (ARRAY['shiprocket'::"text", 'razorpay'::"text"])))
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_logs"
    ADD CONSTRAINT "payment_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_razorpay_order_id_key" UNIQUE ("razorpay_order_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_razorpay_payment_id_key" UNIQUE ("razorpay_payment_id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."retry_jobs"
    ADD CONSTRAINT "retry_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipment_events"
    ADD CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."sync_jobs"
    ADD CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracking_snapshots"
    ADD CONSTRAINT "tracking_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "unique_user_product_review" UNIQUE ("product_id", "user_id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_addresses_user_id" ON "public"."addresses" USING "btree" ("user_id");



CREATE INDEX "idx_cart_items_user_id" ON "public"."cart_items" USING "btree" ("user_id");



CREATE INDEX "idx_categories_is_active" ON "public"."categories" USING "btree" ("is_active");



CREATE INDEX "idx_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "idx_categories_slug" ON "public"."categories" USING "btree" ("slug");



CREATE INDEX "idx_coupons_code" ON "public"."coupons" USING "btree" ("code");



CREATE INDEX "idx_coupons_is_active" ON "public"."coupons" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_notification_logs_idempotent" ON "public"."notification_logs" USING "btree" ("order_id", "event_type", "notification_type") WHERE ("sent_status" = 'sent'::"text");



CREATE INDEX "idx_notification_logs_order" ON "public"."notification_logs" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_notification_prefs_user" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_awb_code" ON "public"."orders" USING "btree" ("awb_code") WHERE ("awb_code" IS NOT NULL);



CREATE INDEX "idx_orders_awb_status" ON "public"."orders" USING "btree" ("awb_code", "status") WHERE (("awb_code" IS NOT NULL) AND ("status" <> ALL (ARRAY['delivered'::"text", 'cancelled'::"text", 'returned'::"text", 'refunded'::"text", 'lost'::"text", 'damaged'::"text"])));



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_fulfillment_step_status" ON "public"."orders" USING "btree" ("fulfillment_step", "status") WHERE ("fulfillment_step" IS NOT NULL);



CREATE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_order_number_trgm" ON "public"."orders" USING "gin" ("order_number" "public"."gin_trgm_ops");



CREATE INDEX "idx_orders_payment_status" ON "public"."orders" USING "btree" ("payment_status");



CREATE INDEX "idx_orders_shipment_id" ON "public"."orders" USING "btree" ("shipment_id") WHERE ("shipment_id" IS NOT NULL);



CREATE INDEX "idx_orders_shiprocket_order_id" ON "public"."orders" USING "btree" ("shiprocket_order_id") WHERE ("shiprocket_order_id" IS NOT NULL);



CREATE INDEX "idx_orders_shiprocket_status" ON "public"."orders" USING "btree" ("shiprocket_status") WHERE ("shiprocket_status" IS NOT NULL);



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_payment_logs_event_type" ON "public"."payment_logs" USING "btree" ("event_type");



CREATE INDEX "idx_payment_logs_order_id" ON "public"."payment_logs" USING "btree" ("order_id");



CREATE INDEX "idx_payment_logs_payment_id" ON "public"."payment_logs" USING "btree" ("payment_id");



CREATE INDEX "idx_payment_logs_razorpay_event" ON "public"."payment_logs" USING "btree" ("razorpay_event_id") WHERE ("razorpay_event_id" IS NOT NULL);



CREATE INDEX "idx_payments_order_id" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_payments_razorpay_order_id" ON "public"."payments" USING "btree" ("razorpay_order_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_product_images_product_id" ON "public"."product_images" USING "btree" ("product_id");



CREATE INDEX "idx_product_reviews_created_at" ON "public"."product_reviews" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_product_reviews_product_id" ON "public"."product_reviews" USING "btree" ("product_id");



CREATE INDEX "idx_product_reviews_rating" ON "public"."product_reviews" USING "btree" ("rating");



CREATE INDEX "idx_product_reviews_user_id" ON "public"."product_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_created_at" ON "public"."products" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_products_description_trgm" ON "public"."products" USING "gin" ("description" "public"."gin_trgm_ops");



CREATE INDEX "idx_products_is_active" ON "public"."products" USING "btree" ("is_active");



CREATE INDEX "idx_products_is_featured" ON "public"."products" USING "btree" ("is_featured");



CREATE INDEX "idx_products_name_trgm" ON "public"."products" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_products_price_paisa" ON "public"."products" USING "btree" ("price_paisa");



CREATE INDEX "idx_products_slug" ON "public"."products" USING "btree" ("slug");



CREATE INDEX "idx_products_stock" ON "public"."products" USING "btree" ("stock");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_retry_jobs_failed" ON "public"."retry_jobs" USING "btree" ("status", "created_at" DESC) WHERE ("status" = ANY (ARRAY['failed'::"text", 'dead'::"text"]));



CREATE INDEX "idx_retry_jobs_pending" ON "public"."retry_jobs" USING "btree" ("status", "next_retry_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_shipment_events_order_id" ON "public"."shipment_events" USING "btree" ("order_id");



CREATE INDEX "idx_shipment_events_order_time" ON "public"."shipment_events" USING "btree" ("order_id", "event_time" DESC);



CREATE UNIQUE INDEX "idx_shipment_events_payload_hash" ON "public"."shipment_events" USING "btree" ("payload_hash") WHERE ("payload_hash" IS NOT NULL);



CREATE INDEX "idx_shipment_events_shipment_id" ON "public"."shipment_events" USING "btree" ("shipment_id") WHERE ("shipment_id" IS NOT NULL);



CREATE INDEX "idx_status_history_order" ON "public"."order_status_history" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_status_history_source" ON "public"."order_status_history" USING "btree" ("source");



CREATE INDEX "idx_sync_jobs_type_created" ON "public"."sync_jobs" USING "btree" ("job_type", "started_at" DESC);



CREATE INDEX "idx_tracking_snapshots_courier_status" ON "public"."tracking_snapshots" USING "btree" ("courier_name", "current_status") WHERE ("courier_name" IS NOT NULL);



CREATE INDEX "idx_tracking_snapshots_order" ON "public"."tracking_snapshots" USING "btree" ("order_id", "synced_at" DESC);



CREATE INDEX "idx_tracking_snapshots_synced_at" ON "public"."tracking_snapshots" USING "btree" ("synced_at" DESC);



CREATE INDEX "idx_webhook_events_created_at" ON "public"."webhook_events" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "idx_webhook_events_payload_hash" ON "public"."webhook_events" USING "btree" ("payload_hash");



CREATE INDEX "idx_webhook_events_source_status" ON "public"."webhook_events" USING "btree" ("source", "processing_status") WHERE ("processing_status" = ANY (ARRAY['received'::"text", 'failed'::"text"]));



CREATE OR REPLACE TRIGGER "addresses_set_updated_at" BEFORE UPDATE ON "public"."addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cart_items_set_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "coupons_set_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notification_prefs_set_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "orders_set_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "payments_set_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "product_reviews_set_updated_at" BEFORE UPDATE ON "public"."product_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "products_set_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "retry_jobs_set_updated_at_trigger" BEFORE UPDATE ON "public"."retry_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."retry_jobs_set_updated_at"();



CREATE OR REPLACE TRIGGER "site_settings_set_updated_at" BEFORE UPDATE ON "public"."site_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sync_jobs_set_updated_at" BEFORE UPDATE ON "public"."sync_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "webhook_events_set_updated_at" BEFORE UPDATE ON "public"."webhook_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payment_logs"
    ADD CONSTRAINT "payment_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."payment_logs"
    ADD CONSTRAINT "payment_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shipment_events"
    ADD CONSTRAINT "shipment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracking_snapshots"
    ADD CONSTRAINT "tracking_snapshots_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "addresses_delete_own" ON "public"."addresses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "addresses_insert_own" ON "public"."addresses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "addresses_select_admin" ON "public"."addresses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "addresses_select_own" ON "public"."addresses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "addresses_update_own" ON "public"."addresses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cart_items_delete_own" ON "public"."cart_items" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "cart_items_insert_own" ON "public"."cart_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "cart_items_select_own" ON "public"."cart_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "cart_items_update_own" ON "public"."cart_items" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_admin" ON "public"."categories" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "categories_insert_admin" ON "public"."categories" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "categories_select_admin" ON "public"."categories" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "categories_select_public" ON "public"."categories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "categories_update_admin" ON "public"."categories" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupons_delete_admin" ON "public"."coupons" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "coupons_insert_admin" ON "public"."coupons" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "coupons_select_admin" ON "public"."coupons" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "coupons_select_authenticated" ON "public"."coupons" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("is_active" = true)));



CREATE POLICY "coupons_update_admin" ON "public"."coupons" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_logs_insert_service_role" ON "public"."notification_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "notification_logs_select_admin" ON "public"."notification_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "notification_logs_select_own" ON "public"."notification_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "notification_logs"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_prefs_insert_own" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "notification_prefs_select_admin" ON "public"."notification_preferences" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "notification_prefs_select_own" ON "public"."notification_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notification_prefs_update_own" ON "public"."notification_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_insert_own" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "order_items_select_admin" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "order_items_select_own" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_status_history_insert_service_role" ON "public"."order_status_history" FOR INSERT WITH CHECK (true);



CREATE POLICY "order_status_history_select_admin" ON "public"."order_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "order_status_history_select_own" ON "public"."order_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_history"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_insert_own" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "orders_select_admin" ON "public"."orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "orders_select_own" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "orders_update_admin" ON "public"."orders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."payment_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_logs_select_admin" ON "public"."payment_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "payment_logs_select_own" ON "public"."payment_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payment_logs"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_select_admin" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "payments_select_own" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_images_delete_admin" ON "public"."product_images" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "product_images_insert_admin" ON "public"."product_images" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "product_images_select_admin" ON "public"."product_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "product_images_select_public" ON "public"."product_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_images"."product_id") AND ("p"."is_active" = true)))));



CREATE POLICY "product_images_update_admin" ON "public"."product_images" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete_admin" ON "public"."products" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "products_insert_admin" ON "public"."products" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "products_select_admin" ON "public"."products" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "products_select_public" ON "public"."products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "products_update_admin" ON "public"."products" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_admin" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."retry_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "retry_jobs_insert_service_role" ON "public"."retry_jobs" FOR INSERT WITH CHECK (true);



CREATE POLICY "retry_jobs_select_admin" ON "public"."retry_jobs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "retry_jobs_update_admin" ON "public"."retry_jobs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "reviews_all_admin" ON "public"."product_reviews" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "reviews_insert_own" ON "public"."product_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "reviews_select_public" ON "public"."product_reviews" FOR SELECT USING (true);



CREATE POLICY "reviews_update_own" ON "public"."product_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."shipment_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shipment_events_insert_admin" ON "public"."shipment_events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "shipment_events_select_admin" ON "public"."shipment_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "shipment_events_select_own" ON "public"."shipment_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "shipment_events"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_settings_select_public" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "site_settings_write_admin" ON "public"."site_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."sync_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sync_jobs_insert_service_role" ON "public"."sync_jobs" FOR INSERT WITH CHECK (true);



CREATE POLICY "sync_jobs_select_admin" ON "public"."sync_jobs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."tracking_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tracking_snapshots_insert_service_role" ON "public"."tracking_snapshots" FOR INSERT WITH CHECK (true);



CREATE POLICY "tracking_snapshots_select_admin" ON "public"."tracking_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_events_insert_service_role" ON "public"."webhook_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "webhook_events_select_admin" ON "public"."webhook_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."check_webhook_duplicate"("p_event_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_webhook_duplicate"("p_event_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_webhook_duplicate"("p_event_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_stock"("p_product_id" "uuid", "p_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_stock"("p_product_id" "uuid", "p_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_stock"("p_product_id" "uuid", "p_qty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_retry_job"("p_job_type" "text", "p_reference_id" "text", "p_payload" "jsonb", "p_max_retries" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_retry_job"("p_job_type" "text", "p_reference_id" "text", "p_payload" "jsonb", "p_max_retries" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_retry_job"("p_job_type" "text", "p_reference_id" "text", "p_payload" "jsonb", "p_max_retries" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number"("prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"("prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"("prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_coupon_usage"("p_coupon_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_coupon_usage"("p_coupon_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_coupon_usage"("p_coupon_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."retry_jobs_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."retry_jobs_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."retry_jobs_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."low_stock_products" TO "anon";
GRANT ALL ON TABLE "public"."low_stock_products" TO "authenticated";
GRANT ALL ON TABLE "public"."low_stock_products" TO "service_role";



GRANT ALL ON TABLE "public"."notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_logs" TO "anon";
GRANT ALL ON TABLE "public"."payment_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_logs" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."retry_jobs" TO "anon";
GRANT ALL ON TABLE "public"."retry_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."retry_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."shipment_events" TO "anon";
GRANT ALL ON TABLE "public"."shipment_events" TO "authenticated";
GRANT ALL ON TABLE "public"."shipment_events" TO "service_role";



GRANT ALL ON TABLE "public"."tracking_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."tracking_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."tracking_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."shipment_health" TO "anon";
GRANT ALL ON TABLE "public"."shipment_health" TO "authenticated";
GRANT ALL ON TABLE "public"."shipment_health" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON TABLE "public"."sync_jobs" TO "anon";
GRANT ALL ON TABLE "public"."sync_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







