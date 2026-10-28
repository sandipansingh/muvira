BEGIN;

ALTER TABLE public.orders ADD COLUMN courier_id BIGINT CHECK (courier_id > 0);
ALTER TABLE public.provider_operations DROP CONSTRAINT provider_operations_operation_type_check;
ALTER TABLE public.provider_operations ADD CONSTRAINT provider_operations_operation_type_check CHECK (
  operation_type IN ('full_refund','partial_refund','cancel_order','cancel_shipment','create_order','assign_awb','schedule_pickup','ndr_action'));
ALTER TABLE public.provider_operations DROP CONSTRAINT provider_operations_provider_target_type_check;
ALTER TABLE public.provider_operations ADD CONSTRAINT provider_operations_provider_target_type_check CHECK (
  provider_target_type IN ('payment','order','awb','merchant_order','shipment'));
ALTER TABLE public.provider_operations DROP CONSTRAINT provider_operations_request_shape;
ALTER TABLE public.provider_operations ADD CONSTRAINT provider_operations_request_shape CHECK (
  (provider='razorpay' AND operation_type IN ('full_refund','partial_refund') AND payment_id IS NOT NULL AND provider_target_type='payment' AND amount_paisa IS NOT NULL AND currency IS NOT NULL)
  OR (provider='shiprocket' AND payment_id IS NULL AND amount_paisa IS NULL AND currency IS NULL AND (
    (operation_type='cancel_order' AND provider_target_type='order') OR
    (operation_type IN ('cancel_shipment','ndr_action') AND provider_target_type='awb') OR
    (operation_type='create_order' AND provider_target_type='merchant_order') OR
    (operation_type IN ('assign_awb','schedule_pickup') AND provider_target_type='shipment'))));

CREATE TABLE public.shipping_operation_requests (
  operation_id UUID PRIMARY KEY REFERENCES public.provider_operations(id) ON DELETE CASCADE,
  request JSONB NOT NULL CHECK (jsonb_typeof(request)='object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_operation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipping_operation_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.shipping_operation_requests TO service_role;
CREATE FUNCTION public.freeze_shipping_request() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'Shipping requests are immutable' USING ERRCODE='22023'; END; $$;
CREATE TRIGGER shipping_request_immutable BEFORE UPDATE ON public.shipping_operation_requests FOR EACH ROW EXECUTE FUNCTION public.freeze_shipping_request();
REVOKE ALL ON FUNCTION public.freeze_shipping_request() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.assert_fulfillment_mutation_allowed(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,p_order_id UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  IF p_execution_scope IS DISTINCT FROM 'fulfillment_order' OR p_execution_resource_id IS DISTINCT FROM p_order_id::TEXT THEN
    RAISE EXCEPTION 'Invalid fulfillment lease' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.payment_status<>'paid' OR v_order.status NOT IN ('confirmed','processing')
    OR NOT EXISTS (SELECT 1 FROM public.payments WHERE order_id=p_order_id AND status='captured' AND currency='INR'
      AND amount_paisa=v_order.total_amount_paisa AND refunded_amount_paisa=0 AND razorpay_payment_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Paid captured order awaiting fulfillment required' USING ERRCODE='22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.provider_operations WHERE order_id=p_order_id AND
    (provider='razorpay' OR operation_type IN ('cancel_order','cancel_shipment')) AND local_applied_at IS NULL
    AND state<>'provider_failed') THEN
    RAISE EXCEPTION 'Conflicting provider operation freezes fulfillment' USING ERRCODE='55P03'; END IF;
END; $$;

CREATE FUNCTION public.prepare_shipping_operation(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_order_id UUID,p_operation_type TEXT,p_request JSONB,p_cause TEXT,p_corrected_attempt UUID DEFAULT NULL
) RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE; v_operation public.provider_operations%ROWTYPE; v_prior public.provider_operations%ROWTYPE;
  v_generation TEXT; v_key TEXT; v_hash TEXT; v_target TEXT; v_type TEXT;
BEGIN
  IF p_order_id IS NULL OR p_operation_type IS NULL OR p_operation_type NOT IN ('create_order','assign_awb','schedule_pickup','ndr_action')
    OR p_request IS NULL OR jsonb_typeof(p_request)<>'object' OR jsonb_typeof(p_request->'wire') IS DISTINCT FROM 'object'
    OR p_cause IS NULL OR length(btrim(p_cause)) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'Invalid shipping intent' USING ERRCODE='22023'; END IF;
  IF p_operation_type='ndr_action' THEN
    IF p_execution_scope IS DISTINCT FROM 'fulfillment_order' OR p_execution_resource_id IS DISTINCT FROM p_order_id::TEXT THEN
      RAISE EXCEPTION 'Invalid fulfillment lease' USING ERRCODE='22023'; END IF;
    PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
    SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
    IF NOT FOUND OR v_order.payment_status<>'paid' OR v_order.status<>'delivery_failed' OR v_order.awb_code IS NULL
      OR p_request->>'episode_id' IS NULL OR p_request->>'request_id' IS NULL
      OR (p_request->'wire'->>'action') NOT IN ('re-attempt','return')
      OR p_request->'wire'->>'comments' IS NULL OR length(btrim(p_request->'wire'->>'comments')) NOT BETWEEN 3 AND 1000
      OR EXISTS (SELECT 1 FROM public.provider_operations WHERE order_id=p_order_id AND local_applied_at IS NULL AND state<>'provider_failed'
        AND (provider='razorpay' OR operation_type IN ('cancel_order','cancel_shipment'))) THEN
      RAISE EXCEPTION 'NDR episode is not actionable' USING ERRCODE='22023'; END IF;
  ELSE
    PERFORM public.assert_fulfillment_mutation_allowed(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,p_order_id);
    SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
  END IF;
  v_generation:=coalesce(v_order.shiprocket_order_id::TEXT,'new')||':'||coalesce(v_order.shipment_id::TEXT,'unassigned');
  v_type:=CASE p_operation_type WHEN 'create_order' THEN 'merchant_order' WHEN 'ndr_action' THEN 'awb' ELSE 'shipment' END;
  v_target:=CASE p_operation_type WHEN 'create_order' THEN p_request->'wire'->>'order_id' WHEN 'ndr_action' THEN v_order.awb_code ELSE v_order.shipment_id::TEXT END;
  IF v_target IS NULL OR (p_operation_type='create_order' AND v_order.shiprocket_order_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Shipping target is invalid' USING ERRCODE='22023'; END IF;
  v_key:=p_order_id::TEXT||':'||v_generation||':'||coalesce(p_request->>'episode_id','default');
  v_hash:=encode(extensions.digest(p_request::TEXT,'sha256'),'hex');
  SELECT * INTO v_prior FROM public.provider_operations WHERE order_id=p_order_id AND operation_type=p_operation_type
    AND provider_generation=v_generation AND (p_operation_type<>'ndr_action' OR business_key=v_key) ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND AND (p_corrected_attempt IS NULL OR v_prior.state<>'provider_failed') THEN
    IF v_prior.request_hash<>v_hash THEN RAISE EXCEPTION 'Shipping intent is frozen; review the existing operation' USING ERRCODE='23505'; END IF;
    RETURN v_prior;
  END IF;
  IF p_corrected_attempt IS NOT NULL THEN
    IF v_prior.id IS NULL OR v_prior.state<>'provider_failed' OR v_prior.request_hash=v_hash THEN
      RAISE EXCEPTION 'Only a definitively rejected request permits a corrected attempt' USING ERRCODE='22023'; END IF;
    v_key:=v_key||':'||p_corrected_attempt::TEXT;
  END IF;
  INSERT INTO public.provider_operations(provider,operation_type,business_key,order_id,provider_target_type,provider_target_id,provider_generation,request_hash,idempotency_key,cause)
    VALUES('shiprocket',p_operation_type,v_key,p_order_id,v_type,v_target,v_generation,v_hash,'muvira-'||replace(gen_random_uuid()::TEXT,'-',''),btrim(p_cause))
    RETURNING * INTO v_operation;
  INSERT INTO public.shipping_operation_requests(operation_id,request) VALUES(v_operation.id,p_request);
  RETURN v_operation;
END; $$;

CREATE FUNCTION public.claim_shipping_operation(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_order_id UUID,p_fulfillment_owner_token UUID,p_fulfillment_fencing_token BIGINT,p_operation_id UUID
) RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE; v_op public.provider_operations%ROWTYPE;
BEGIN
  IF p_execution_scope IS DISTINCT FROM 'provider_operation' OR p_execution_resource_id IS DISTINCT FROM p_operation_id::TEXT THEN
    RAISE EXCEPTION 'Invalid operation lease' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease('fulfillment_order',p_order_id::TEXT,p_fulfillment_owner_token,p_fulfillment_fencing_token);
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  SELECT * INTO v_op FROM public.provider_operations WHERE id=p_operation_id AND order_id=p_order_id FOR UPDATE;
  IF NOT FOUND OR v_op.operation_type NOT IN ('create_order','assign_awb','schedule_pickup','ndr_action') OR v_op.state<>'prepared' THEN
    RAISE EXCEPTION 'Shipping operation is not dispatchable' USING ERRCODE='55P03'; END IF;
  IF v_op.operation_type<>'ndr_action' THEN
    PERFORM public.assert_fulfillment_mutation_allowed('fulfillment_order',p_order_id::TEXT,p_fulfillment_owner_token,p_fulfillment_fencing_token,p_order_id);
  ELSIF v_order.status<>'delivery_failed' OR v_order.payment_status<>'paid' THEN
    RAISE EXCEPTION 'NDR is no longer actionable' USING ERRCODE='22023';
  END IF;
  IF v_op.provider_generation IS DISTINCT FROM coalesce(v_order.shiprocket_order_id::TEXT,'new')||':'||coalesce(v_order.shipment_id::TEXT,'unassigned')
    OR (v_op.operation_type='ndr_action' AND v_order.awb_code IS DISTINCT FROM v_op.provider_target_id) THEN
    RAISE EXCEPTION 'Shipping generation changed' USING ERRCODE='22023'; END IF;
  UPDATE public.provider_operations SET state='dispatching',dispatch_attempts=dispatch_attempts+1,dispatch_started_at=now() WHERE id=p_operation_id RETURNING * INTO v_op;
  RETURN v_op;
END; $$;

CREATE FUNCTION public.finalize_shipping_operation(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_order_id UUID,p_fulfillment_owner_token UUID,p_fulfillment_fencing_token BIGINT,p_operation_id UUID
) RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE; v_op public.provider_operations%ROWTYPE; v_request JSONB; v_result JSONB;
BEGIN
  IF p_execution_scope IS DISTINCT FROM 'provider_operation' OR p_execution_resource_id IS DISTINCT FROM p_operation_id::TEXT THEN
    RAISE EXCEPTION 'Invalid operation lease' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease('fulfillment_order',p_order_id::TEXT,p_fulfillment_owner_token,p_fulfillment_fencing_token);
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  SELECT * INTO v_op FROM public.provider_operations WHERE id=p_operation_id AND order_id=p_order_id FOR UPDATE;
  IF NOT FOUND OR v_op.operation_type NOT IN ('create_order','assign_awb','schedule_pickup','ndr_action') OR v_op.state<>'provider_succeeded' THEN
    RAISE EXCEPTION 'Shipping success is unconfirmed' USING ERRCODE='22023'; END IF;
  IF v_op.local_applied_at IS NOT NULL THEN RETURN v_op; END IF;
  IF v_op.provider_generation IS DISTINCT FROM coalesce(v_order.shiprocket_order_id::TEXT,'new')||':'||coalesce(v_order.shipment_id::TEXT,'unassigned') THEN
    RAISE EXCEPTION 'Shipping generation changed; review required' USING ERRCODE='22023'; END IF;
  IF v_op.operation_type<>'ndr_action' THEN
    IF v_order.payment_status<>'paid' OR v_order.status IN ('pending','cancelled','refunded')
      OR NOT EXISTS(SELECT 1 FROM public.payments WHERE order_id=p_order_id AND status='captured' AND currency='INR'
        AND amount_paisa=v_order.total_amount_paisa AND refunded_amount_paisa=0 AND razorpay_payment_id IS NOT NULL)
      OR EXISTS(SELECT 1 FROM public.provider_operations WHERE order_id=p_order_id AND local_applied_at IS NULL AND state<>'provider_failed'
        AND (provider='razorpay' OR operation_type IN ('cancel_order','cancel_shipment')))
      OR (v_op.operation_type='create_order' AND v_order.status NOT IN ('confirmed','processing')) THEN
      RAISE EXCEPTION 'Shipping finalization payment or order conflict' USING ERRCODE='22023'; END IF;
  END IF;
  SELECT request INTO STRICT v_request FROM public.shipping_operation_requests WHERE operation_id=v_op.id;
  v_result:=v_op.response_metadata;
  IF v_op.operation_type='create_order' THEN
    IF (v_result->>'shiprocket_order_id') !~ '^[1-9][0-9]*$' OR (v_result->>'shipment_id') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Invalid shipping result' USING ERRCODE='22023'; END IF;
    UPDATE public.orders SET shiprocket_order_id=v_result->>'shiprocket_order_id',shipment_id=v_result->>'shipment_id',
      pickup_location=v_request->'wire'->>'pickup_location',package_weight_grams=round((v_request->'wire'->>'weight')::NUMERIC*1000),
      package_length_cm=(v_request->'wire'->>'length')::INT,package_breadth_cm=(v_request->'wire'->>'breadth')::INT,package_height_cm=(v_request->'wire'->>'height')::INT,
      fulfillment_status='partial',fulfillment_step='order_created',shiprocket_error=NULL,
      shiprocket_status='created',status='processing' WHERE id=p_order_id;
    IF v_order.status='confirmed' THEN
      INSERT INTO public.order_status_history(order_id,old_status,new_status,source,metadata) VALUES(p_order_id,'confirmed','processing','system',jsonb_build_object('provider_operation_id',v_op.id));
    END IF;
  ELSIF v_op.operation_type='assign_awb' THEN
    IF nullif(v_result->>'awb_code','') IS NULL OR (v_result->>'courier_id') !~ '^[1-9][0-9]*$' THEN RAISE EXCEPTION 'Invalid AWB result' USING ERRCODE='22023'; END IF;
    UPDATE public.orders SET awb_code=v_result->>'awb_code',courier_name=v_result->>'courier_name',courier_id=(v_result->>'courier_id')::BIGINT,
      fulfillment_status=CASE WHEN fulfillment_status IN ('fulfilled','exception') THEN fulfillment_status ELSE 'partial' END,
      fulfillment_step=CASE WHEN fulfillment_step IN ('pickup_scheduled','label_generated','manifest_generated','ready_for_pickup') THEN fulfillment_step ELSE 'awb_assigned' END WHERE id=p_order_id AND (awb_code IS NULL OR awb_code=v_result->>'awb_code');
    IF NOT FOUND THEN RAISE EXCEPTION 'AWB identity changed' USING ERRCODE='23505'; END IF;
  ELSIF v_op.operation_type='schedule_pickup' THEN
    UPDATE public.orders SET pickup_scheduled_date=(v_result->>'pickup_scheduled_date')::TIMESTAMPTZ,pickup_token_number=v_result->>'pickup_token_number',
      fulfillment_status=CASE WHEN fulfillment_status IN ('fulfilled','exception') THEN fulfillment_status ELSE 'partial' END,
      fulfillment_step=CASE WHEN fulfillment_step IN ('label_generated','manifest_generated','ready_for_pickup') THEN fulfillment_step ELSE 'pickup_scheduled' END WHERE id=p_order_id;
  ELSE
    IF v_order.awb_code IS DISTINCT FROM v_op.provider_target_id THEN RAISE EXCEPTION 'NDR identity changed' USING ERRCODE='22023'; END IF;
  END IF;
  UPDATE public.provider_operations SET local_applied_at=now() WHERE id=v_op.id RETURNING * INTO v_op;
  RETURN v_op;
END; $$;

-- Legacy entry points cannot dispatch or finalize the new operation types.
ALTER FUNCTION public.claim_provider_operation_dispatch(TEXT,TEXT,UUID,BIGINT,UUID) RENAME TO claim_provider_operation_dispatch_v53;
CREATE FUNCTION public.claim_provider_operation_dispatch(p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,p_operation_id UUID)
RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order_id UUID;
BEGIN
  SELECT order_id INTO v_order_id FROM public.provider_operations WHERE id=p_operation_id AND operation_type IN ('full_refund','partial_refund','cancel_order','cancel_shipment');
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Unsupported operation dispatcher' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.orders WHERE id=v_order_id FOR UPDATE;
  RETURN public.claim_provider_operation_dispatch_v53(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,p_operation_id);
END; $$;
ALTER FUNCTION public.finalize_provider_operation(TEXT,TEXT,UUID,BIGINT,UUID,TEXT,TEXT,UUID,INTEGER,TEXT,TEXT) RENAME TO finalize_provider_operation_v53;
CREATE FUNCTION public.finalize_provider_operation(p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,p_operation_id UUID,p_provider_target_type TEXT,p_provider_target_id TEXT,p_payment_id UUID,p_amount_paisa INTEGER,p_currency TEXT,p_request_hash TEXT)
RETURNS public.provider_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order_id UUID;
BEGIN
  SELECT order_id INTO v_order_id FROM public.provider_operations WHERE id=p_operation_id AND operation_type IN ('full_refund','partial_refund','cancel_order','cancel_shipment');
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Unsupported operation finalizer' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.orders WHERE id=v_order_id FOR UPDATE;
  RETURN public.finalize_provider_operation_v53(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,p_operation_id,p_provider_target_type,p_provider_target_id,p_payment_id,p_amount_paisa,p_currency,p_request_hash);
END; $$;

-- Repair jobs can fill a missing identity, never replace one or move progress backwards.
ALTER FUNCTION public.apply_shiprocket_persistence_fenced(TEXT,TEXT,UUID,BIGINT,UUID,JSONB) RENAME TO apply_shiprocket_persistence_fenced_v53;
CREATE FUNCTION public.apply_shiprocket_persistence_fenced(p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,p_order_id UUID,p_persistence JSONB DEFAULT NULL)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE; v_key TEXT; v_steps TEXT[]:=ARRAY['idle','order_created','awb_assigned','pickup_scheduled','label_generated','manifest_generated','ready_for_pickup'];
BEGIN
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  SELECT * INTO STRICT v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF v_order.payment_status<>'paid' OR v_order.status NOT IN ('confirmed','processing') THEN RAISE EXCEPTION 'Stale fulfillment repair' USING ERRCODE='22023'; END IF;
  IF p_execution_scope='fulfillment_order' THEN
    PERFORM public.assert_fulfillment_mutation_allowed(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,p_order_id);
  ELSIF p_execution_scope<>'retry_job_effect' THEN RAISE EXCEPTION 'Invalid repair lease' USING ERRCODE='22023'; END IF;
  FOREACH v_key IN ARRAY ARRAY['shiprocket_order_id','shipment_id','awb_code'] LOOP
    IF p_persistence ? v_key AND to_jsonb(v_order)->>v_key IS NOT NULL AND (to_jsonb(v_order)->>v_key) IS DISTINCT FROM p_persistence->>v_key THEN
      RAISE EXCEPTION 'Stale shipping identity repair' USING ERRCODE='23505'; END IF;
  END LOOP;
  IF p_execution_scope='retry_job_effect' AND ((v_order.shiprocket_order_id IS NOT NULL AND NOT p_persistence ? 'shiprocket_order_id')
    OR (v_order.shipment_id IS NOT NULL AND NOT p_persistence ? 'shipment_id')) THEN
    RAISE EXCEPTION 'Repair is not bound to current generation' USING ERRCODE='22023'; END IF;
  IF coalesce(array_position(v_steps,p_persistence->>'fulfillment_step'),0)<coalesce(array_position(v_steps,v_order.fulfillment_step),0) THEN
    p_persistence:=p_persistence-'fulfillment_step'-'fulfillment_status'; END IF;
  IF v_order.label_generated THEN p_persistence:=p_persistence-'label_generated'; END IF;
  IF v_order.manifest_generated THEN p_persistence:=p_persistence-'manifest_generated'; END IF;
  p_persistence:=p_persistence-'shiprocket_status';
  RETURN public.apply_shiprocket_persistence_fenced_v53(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token,p_order_id,p_persistence);
END; $$;

CREATE FUNCTION public.guard_shipping_provider_conflicts() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.orders WHERE id=NEW.order_id FOR UPDATE;
  IF (NEW.provider='razorpay' OR NEW.operation_type IN ('cancel_order','cancel_shipment')) AND EXISTS(
    SELECT 1 FROM public.provider_operations WHERE order_id=NEW.order_id AND operation_type IN ('create_order','assign_awb','schedule_pickup','ndr_action')
      AND local_applied_at IS NULL AND state<>'provider_failed') THEN
    RAISE EXCEPTION 'Resolve the shipping operation before cancellation or refund' USING ERRCODE='55P03'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER provider_operations_shipping_conflicts BEFORE INSERT ON public.provider_operations FOR EACH ROW EXECUTE FUNCTION public.guard_shipping_provider_conflicts();
CREATE FUNCTION public.guard_shipping_order_terminal() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF (NEW.status IN ('cancelled','refunded') AND NEW.status IS DISTINCT FROM OLD.status) OR (NEW.payment_status='refunded' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    IF EXISTS(SELECT 1 FROM public.provider_operations WHERE order_id=NEW.id AND operation_type IN ('create_order','assign_awb','schedule_pickup','ndr_action')
      AND local_applied_at IS NULL AND state<>'provider_failed') THEN
      RAISE EXCEPTION 'Resolve the shipping operation before cancellation or refund' USING ERRCODE='55P03'; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_shipping_terminal_guard BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_shipping_order_terminal();
REVOKE ALL ON FUNCTION public.guard_shipping_provider_conflicts(),public.guard_shipping_order_terminal() FROM PUBLIC,anon,authenticated;

DO $$ DECLARE v_function REGPROCEDURE; BEGIN
  FOR v_function IN SELECT oid::REGPROCEDURE FROM pg_proc WHERE pronamespace='public'::REGNAMESPACE AND proname IN (
    'prepare_shipping_operation','claim_shipping_operation','finalize_shipping_operation','assert_fulfillment_mutation_allowed',
    'claim_provider_operation_dispatch','claim_provider_operation_dispatch_v53','finalize_provider_operation','finalize_provider_operation_v53',
    'apply_shiprocket_persistence_fenced','apply_shiprocket_persistence_fenced_v53') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',v_function);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_function);
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.claim_provider_operation_dispatch_v53(TEXT,TEXT,UUID,BIGINT,UUID),public.finalize_provider_operation_v53(TEXT,TEXT,UUID,BIGINT,UUID,TEXT,TEXT,UUID,INTEGER,TEXT,TEXT),public.apply_shiprocket_persistence_fenced_v53(TEXT,TEXT,UUID,BIGINT,UUID,JSONB) FROM service_role;

CREATE FUNCTION public.shipping_schema_status(p_contract JSONB,p_version INT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_name TEXT; v_function REGPROCEDURE; v_table REGCLASS; v_ready BOOLEAN;
BEGIN
  IF p_contract IS NULL OR jsonb_typeof(p_contract)<>'object' OR p_version IS NULL OR p_version NOT IN (54,55) THEN RAISE EXCEPTION 'Invalid shipping schema contract' USING ERRCODE='22023'; END IF;
  FOREACH v_name IN ARRAY ARRAY[
    'public.prepare_shipping_operation(text,text,uuid,bigint,uuid,text,jsonb,text,uuid)',
    'public.claim_shipping_operation(text,text,uuid,bigint,uuid,uuid,bigint,uuid)',
    'public.finalize_shipping_operation(text,text,uuid,bigint,uuid,uuid,bigint,uuid)',
    'public.assert_fulfillment_mutation_allowed(text,text,uuid,bigint,uuid)',
    'public.apply_shiprocket_persistence_fenced(text,text,uuid,bigint,uuid,jsonb)'
  ]||CASE WHEN p_version=55 THEN ARRAY[
    'public.accept_shipping_webhook(text,jsonb)','public.apply_shipping_observation(text,text,uuid,bigint,uuid,jsonb,text,text)',
    'public.finish_shipping_receipt(text,text,uuid,bigint,uuid,boolean)','public.is_forward_shipping_transition(text,text)'
  ] ELSE ARRAY[]::TEXT[] END LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL THEN p_contract:=jsonb_set(p_contract,'{missing_functions}',(p_contract->'missing_functions')||jsonb_build_array(v_name));
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE') OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      p_contract:=jsonb_set(p_contract,'{invalid_function_grants}',(p_contract->'invalid_function_grants')||jsonb_build_array(v_name)); END IF;
  END LOOP;
  v_table:=to_regclass('public.shipping_operation_requests');
  IF v_table IS NULL THEN p_contract:=jsonb_set(p_contract,'{missing_relations}',(p_contract->'missing_relations')||'["shipping_operation_requests"]'::JSONB);
  ELSE
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=v_table) THEN p_contract:=jsonb_set(p_contract,'{invalid_rls_relations}',(p_contract->'invalid_rls_relations')||'["shipping_operation_requests"]'::JSONB); END IF;
    IF has_table_privilege('anon',v_table,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',v_table,'SELECT,INSERT,UPDATE,DELETE') OR NOT has_table_privilege('service_role',v_table,'SELECT,INSERT,DELETE') THEN
      p_contract:=jsonb_set(p_contract,'{invalid_relation_grants}',(p_contract->'invalid_relation_grants')||'["shipping_operation_requests"]'::JSONB); END IF;
  END IF;
  FOREACH v_name IN ARRAY ARRAY['courier_id']||CASE WHEN p_version=55 THEN ARRAY['shipping_observed_at'] ELSE ARRAY[]::TEXT[] END LOOP
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name=v_name) THEN
      p_contract:=jsonb_set(p_contract,'{missing_columns}',(p_contract->'missing_columns')||jsonb_build_array('orders.'||v_name)); END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['shipping_request_immutable','provider_operations_shipping_conflicts','orders_shipping_terminal_guard'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname=v_name AND NOT tgisinternal AND tgenabled='O') THEN
      p_contract:=jsonb_set(p_contract,'{missing_constraints}',(p_contract->'missing_constraints')||jsonb_build_array(v_name)); END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.provider_operations'::REGCLASS AND conname='provider_operations_request_shape' AND convalidated AND pg_get_constraintdef(oid) LIKE '%ndr_action%') THEN
    p_contract:=jsonb_set(p_contract,'{missing_constraints}',(p_contract->'missing_constraints')||'["shipping_provider_request_shape"]'::JSONB); END IF;
  IF p_version=55 THEN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='webhook_events' AND column_name='shipping_match_attempts') THEN
      p_contract:=jsonb_set(p_contract,'{missing_columns}',(p_contract->'missing_columns')||'["webhook_events.shipping_match_attempts"]'::JSONB); END IF;
    IF to_regclass('public.shipping_receipts_unfinished_idx') IS NULL THEN
      p_contract:=jsonb_set(p_contract,'{missing_indexes}',(p_contract->'missing_indexes')||'["shipping_receipts_unfinished_idx"]'::JSONB); END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.retry_jobs'::REGCLASS AND conname='retry_jobs_job_type_check' AND convalidated AND pg_get_constraintdef(oid) LIKE '%shiprocket_webhook%') THEN
      p_contract:=jsonb_set(p_contract,'{missing_constraints}',(p_contract->'missing_constraints')||'["shipping_receipt_job_type"]'::JSONB); END IF;
  END IF;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(p_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN p_contract||jsonb_build_object('contract_version',p_version,'ready',v_ready AND p_contract->>'migration_version'=lpad(p_version::TEXT,3,'0'));
END; $$;
REVOKE ALL ON FUNCTION public.shipping_schema_status(JSONB,INT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_schema_status(JSONB,INT) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v53;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN RETURN public.shipping_schema_status(public.get_runtime_schema_status_v53(),54);
END; $$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v53() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v53() TO service_role;
COMMIT;
