BEGIN;
ALTER TABLE public.retry_jobs DROP CONSTRAINT retry_jobs_job_type_check;
ALTER TABLE public.retry_jobs ADD CONSTRAINT retry_jobs_job_type_check CHECK(job_type IN ('tracking_sync','webhook_process','label_generate','invoice_generate','shiprocket_persist','razorpay_webhook','cancellation_refund','shiprocket_webhook'));
ALTER TABLE public.orders ADD COLUMN shipping_observed_at TIMESTAMPTZ;
ALTER TABLE public.webhook_events ADD COLUMN shipping_match_attempts INT NOT NULL DEFAULT 0 CHECK(shipping_match_attempts>=0);
CREATE INDEX shipping_receipts_unfinished_idx ON public.webhook_events(created_at,id) WHERE source='shiprocket' AND processing_status<>'processed';

CREATE FUNCTION public.is_forward_shipping_transition(p_from TEXT,p_to TEXT) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
  SELECT CASE
    WHEN p_from IN ('pending','cancelled','refunded','delivered','returned','lost','damaged') THEN false
    WHEN p_from=p_to THEN false
    WHEN p_from='rto' THEN p_to='returned'
    WHEN p_to IN ('rto','returned','lost','damaged') THEN true
    WHEN p_from='delivery_failed' THEN p_to IN ('shipped','out_for_delivery','delivered')
    WHEN p_to='delivery_failed' THEN p_from IN ('processing','shipped','out_for_delivery')
    ELSE coalesce(array_position(ARRAY['confirmed','processing','shipped','out_for_delivery','delivered'],p_to),0)>
      coalesce(array_position(ARRAY['confirmed','processing','shipped','out_for_delivery','delivered'],p_from),99)
  END
$$;

CREATE FUNCTION public.accept_shipping_webhook(p_payload_hash TEXT,p_payload JSONB) RETURNS public.webhook_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_event public.webhook_events%ROWTYPE;
BEGIN
  IF p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$' OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
    OR nullif(btrim(p_payload->>'current_status'),'') IS NULL THEN RAISE EXCEPTION 'Invalid webhook receipt' USING ERRCODE='22023'; END IF;
  INSERT INTO public.webhook_events(source,event_type,payload_hash,raw_payload,processing_status)
    VALUES('shiprocket',p_payload->>'current_status',p_payload_hash,p_payload,'verified')
    ON CONFLICT(payload_hash) DO NOTHING;
  SELECT * INTO STRICT v_event FROM public.webhook_events WHERE payload_hash=p_payload_hash FOR UPDATE;
  IF v_event.source<>'shiprocket' OR v_event.raw_payload<>p_payload THEN RAISE EXCEPTION 'Receipt identity conflict' USING ERRCODE='23505'; END IF;
  IF v_event.processing_status<>'processed' AND v_event.shipping_match_attempts<10 THEN
    PERFORM public.enqueue_retry_job('shiprocket_webhook',v_event.id::TEXT,jsonb_build_object('webhookId',v_event.id),10);
  END IF;
  RETURN v_event;
END; $$;

CREATE FUNCTION public.apply_shipping_observation(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_order_id UUID,p_observation JSONB,p_target_status TEXT,p_source TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE; v_at TIMESTAMPTZ; v_changed BOOLEAN:=false; v_event JSONB; v_events JSONB;
  v_id TEXT; v_current TEXT; v_new_status TEXT; v_history_id UUID;
BEGIN
  IF p_order_id IS NULL OR p_observation IS NULL OR jsonb_typeof(p_observation)<>'object'
    OR p_source IS NULL OR p_source NOT IN ('webhook','cron_poll','manual') THEN RAISE EXCEPTION 'Invalid observation' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  IF (p_execution_scope='shipping_observation' AND p_execution_resource_id=p_order_id::TEXT) OR p_execution_scope='retry_job_effect' THEN NULL;
    ELSE RAISE EXCEPTION 'Invalid observation lease' USING ERRCODE='22023'; END IF;
  SELECT * INTO STRICT v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF ((p_observation->>'awbCode') IS NOT NULL AND (p_observation->>'awbCode') IS DISTINCT FROM v_order.awb_code)
    OR ((p_observation->>'shipmentId') IS NOT NULL AND (p_observation->>'shipmentId') IS DISTINCT FROM v_order.shipment_id::TEXT)
    OR ((p_observation->>'shiprocketOrderId') IS NOT NULL AND (p_observation->>'shiprocketOrderId') IS DISTINCT FROM v_order.shiprocket_order_id::TEXT)
    OR ((p_observation->>'merchantOrderId') IS NOT NULL AND (p_observation->>'merchantOrderId') IS DISTINCT FROM v_order.order_number AND NOT EXISTS(
      SELECT 1 FROM public.provider_operations WHERE order_id=p_order_id AND operation_type='create_order' AND local_applied_at IS NOT NULL
        AND provider_target_id=p_observation->>'merchantOrderId' AND response_metadata->>'shiprocket_order_id'=v_order.shiprocket_order_id::TEXT))
    OR num_nonnulls(p_observation->>'awbCode',p_observation->>'shipmentId',p_observation->>'shiprocketOrderId',p_observation->>'merchantOrderId')=0 THEN
    RAISE EXCEPTION 'Shipment observation identity mismatch' USING ERRCODE='22023'; END IF;
  v_at:=(p_observation->>'eventTime')::TIMESTAMPTZ;
  v_current:=p_observation->>'currentStatus';
  IF nullif(btrim(v_current),'') IS NULL THEN RAISE EXCEPTION 'Observation status missing' USING ERRCODE='22023'; END IF;
  v_events:=coalesce(p_observation->'events','[]'::JSONB)||jsonb_build_array(p_observation);
  FOR v_event IN SELECT value FROM jsonb_array_elements(v_events) LOOP
    v_id:=encode(extensions.digest(p_order_id::TEXT||':'||coalesce(v_order.shipment_id::TEXT,'none')||':'||coalesce(v_event->>'vendorEventId',v_event::TEXT),'sha256'),'hex');
    INSERT INTO public.shipment_events(order_id,shipment_id,status,location,remarks,event_time,raw_payload,payload_hash,vendor_event_id)
      VALUES(p_order_id,v_order.shipment_id,v_event->>'currentStatus',v_event->>'location',v_event->>'remarks',
        coalesce((v_event->>'eventTime')::TIMESTAMPTZ,'1970-01-01'::TIMESTAMPTZ),'{}'::JSONB,v_id,v_id) ON CONFLICT DO NOTHING;
  END LOOP;
  IF v_at IS NOT NULL AND (v_order.shipping_observed_at IS NULL OR v_at>v_order.shipping_observed_at)
    AND v_at<=now()+INTERVAL '5 minutes' AND v_order.payment_status='paid'
    AND v_order.status NOT IN ('pending','cancelled','refunded','delivered','returned','lost','damaged') THEN
    v_new_status:=CASE WHEN public.is_forward_shipping_transition(v_order.status,p_target_status) THEN p_target_status ELSE v_order.status END;
    -- A lower forward status cannot replace the raw customer-visible status either.
    IF p_target_status IS NULL OR p_target_status=v_order.status OR v_new_status<>v_order.status THEN
      UPDATE public.orders SET shiprocket_status=v_current,shipping_observed_at=v_at,status=v_new_status,
        courier_name=coalesce(nullif(p_observation->>'courierName',''),courier_name),
        tracking_url=CASE WHEN p_observation->>'trackingUrl' ~ '^https://' THEN p_observation->>'trackingUrl' ELSE tracking_url END,
        fulfillment_status=CASE WHEN v_new_status IN ('shipped','out_for_delivery','delivered','rto','returned') THEN 'fulfilled' WHEN v_new_status IN ('lost','damaged','delivery_failed') THEN 'exception' ELSE fulfillment_status END
        WHERE id=p_order_id;
      v_changed:=true;
      IF v_new_status<>v_order.status THEN
        INSERT INTO public.order_status_history(order_id,old_status,new_status,source,metadata) VALUES(p_order_id,v_order.status,v_new_status,
          CASE WHEN p_source='webhook' THEN 'webhook' ELSE 'polling_sync' END,jsonb_build_object('vendor_event_id',p_observation->>'vendorEventId')) RETURNING id INTO v_history_id;
        IF v_new_status IN ('shipped','out_for_delivery','delivered','cancelled','rto','returned','refunded','delivery_failed','lost','damaged') THEN
        INSERT INTO public.outbox_events(aggregate_type,aggregate_id,event_type,payload,deduplication_key)
          VALUES('order',p_order_id,'order.'||v_new_status,jsonb_build_object('order_id',p_order_id,'user_id',v_order.user_id,'order_number',v_order.order_number,'old_status',v_order.status,'new_status',v_new_status,'history_id',v_history_id),'shipping:'||p_order_id::TEXT||':'||(p_observation->>'vendorEventId'))
          ON CONFLICT(deduplication_key) DO NOTHING;
        END IF;
      END IF;
      IF v_order.awb_code IS NOT NULL THEN
        INSERT INTO public.tracking_snapshots(order_id,awb_code,shipment_id,courier_name,current_status,origin,destination,estimated_delivery_date,pickup_date,delivered_date,tracking_raw,sync_source)
          VALUES(p_order_id,v_order.awb_code,v_order.shipment_id,coalesce(p_observation->>'courierName',v_order.courier_name),v_current,
            p_observation->>'origin',p_observation->>'destination',(p_observation->>'estimatedDeliveryDate')::DATE,(p_observation->>'pickupDate')::TIMESTAMPTZ,
            CASE WHEN v_new_status='delivered' THEN coalesce((p_observation->>'deliveredDate')::TIMESTAMPTZ,v_at) ELSE NULL END,p_observation,p_source);
      END IF;
      IF v_new_status IN ('delivered','returned','rto','lost','damaged') THEN
        UPDATE public.provider_operations SET state='provider_succeeded',provider_status='tracking outcome: '||v_new_status,local_applied_at=now(),provider_completed_at=now()
          WHERE order_id=p_order_id AND operation_type='ndr_action' AND state='provider_pending' AND provider_target_id=v_order.awb_code
          AND provider_generation=v_order.shiprocket_order_id::TEXT||':'||v_order.shipment_id::TEXT;
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('applied',v_changed,'oldStatus',v_order.status,'newStatus',coalesce(v_new_status,v_order.status),'userId',v_order.user_id,'orderNumber',v_order.order_number);
END; $$;

CREATE FUNCTION public.finish_shipping_receipt(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_receipt_id UUID,p_matched BOOLEAN
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_execution_scope IS DISTINCT FROM 'retry_job_effect' OR p_receipt_id IS NULL OR p_matched IS NULL THEN
    RAISE EXCEPTION 'Invalid receipt completion' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  UPDATE public.webhook_events SET processing_status=CASE WHEN p_matched THEN 'processed' ELSE 'verified' END,
    processed_at=CASE WHEN p_matched THEN now() ELSE NULL END,shipping_match_attempts=shipping_match_attempts+CASE WHEN p_matched THEN 0 ELSE 1 END,
    error_message=CASE WHEN p_matched THEN NULL ELSE 'No matching shipment generation; bounded rematching scheduled' END
    WHERE id=p_receipt_id AND source='shiprocket' AND processing_status<>'processed';
END; $$;

DO $$ DECLARE v_function REGPROCEDURE; BEGIN
  FOR v_function IN SELECT oid::REGPROCEDURE FROM pg_proc WHERE pronamespace='public'::REGNAMESPACE AND proname IN ('is_forward_shipping_transition','accept_shipping_webhook','apply_shipping_observation','finish_shipping_receipt') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_function);
  END LOOP;
END; $$;
ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v54;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN RETURN public.shipping_schema_status(public.get_runtime_schema_status_v54(),55);
END; $$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v54() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v54() TO service_role;
COMMIT;
