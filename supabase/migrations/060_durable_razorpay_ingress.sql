BEGIN;

CREATE FUNCTION public.ingest_razorpay_webhook(p_event_id TEXT,p_event_type TEXT,p_payload_hash TEXT,p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_event public.webhook_events%ROWTYPE; v_duplicate BOOLEAN:=FALSE;
BEGIN
  IF p_event_id IS NULL OR length(p_event_id) NOT BETWEEN 1 AND 200 OR p_payload_hash IS NULL
    OR p_payload_hash !~ '^[a-f0-9]{64}$' OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
    OR (p_event_type IS NOT NULL AND length(p_event_type)>100) THEN
    RAISE EXCEPTION 'Invalid verified webhook' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('razorpay_receipt:'||p_payload_hash,0));
  SELECT * INTO v_event FROM public.webhook_events WHERE source='razorpay' AND payload_hash=p_payload_hash LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.webhook_events(source,event_id,event_type,payload_hash,raw_payload,processing_status)
      VALUES('razorpay',p_event_id,p_event_type,p_payload_hash,p_payload,'verified')
      ON CONFLICT(source,event_id) WHERE event_id IS NOT NULL DO NOTHING RETURNING * INTO v_event;
    IF NOT FOUND THEN
      SELECT * INTO v_event FROM public.webhook_events WHERE source='razorpay' AND event_id=p_event_id FOR UPDATE;
      IF v_event.payload_hash IS DISTINCT FROM p_payload_hash THEN
        RAISE EXCEPTION 'Webhook event identity changed' USING ERRCODE='22023'; END IF;
      v_duplicate:=TRUE;
    END IF;
  ELSE v_duplicate:=TRUE;
  END IF;
  IF v_event.processing_status NOT IN ('processed','ignored','duplicate') THEN
    PERFORM public.enqueue_retry_job('razorpay_webhook',v_event.id::TEXT,jsonb_build_object('webhookId',v_event.id),10);
  END IF;
  RETURN jsonb_build_object('id',v_event.id,'duplicate',v_duplicate);
END; $$;

CREATE FUNCTION public.recover_razorpay_webhook_receipts(p_limit INT DEFAULT 50) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_event RECORD; v_count INT:=0;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid recovery limit' USING ERRCODE='22023'; END IF;
  FOR v_event IN SELECT w.id FROM public.webhook_events w WHERE w.source='razorpay'
    AND (w.processing_status IN ('verified','failed') OR (w.processing_status='processing' AND w.processing_lease_expires_at<=NOW()))
    AND NOT EXISTS(SELECT 1 FROM public.retry_jobs j WHERE j.job_type='razorpay_webhook' AND j.reference_id=w.id::TEXT AND j.status IN ('pending','processing','failed'))
    ORDER BY w.created_at LIMIT p_limit FOR UPDATE OF w SKIP LOCKED
  LOOP
    PERFORM public.enqueue_retry_job('razorpay_webhook',v_event.id::TEXT,jsonb_build_object('webhookId',v_event.id),10);
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END; $$;
CREATE INDEX webhook_events_razorpay_recovery_idx ON public.webhook_events(processing_status,processing_lease_expires_at,created_at) WHERE source='razorpay';
REVOKE ALL ON FUNCTION public.ingest_razorpay_webhook(TEXT,TEXT,TEXT,JSONB),public.recover_razorpay_webhook_receipts(INT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_razorpay_webhook(TEXT,TEXT,TEXT,JSONB),public.recover_razorpay_webhook_receipts(INT) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v59;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_contract JSONB:=public.get_runtime_schema_status_v59(); v_name TEXT; v_function REGPROCEDURE; v_ready BOOLEAN;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['public.ingest_razorpay_webhook(text,text,text,jsonb)','public.recover_razorpay_webhook_receipts(integer)'] LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL THEN v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||jsonb_build_array(v_name));
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE')
      OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||jsonb_build_array(v_name)); END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.webhook_events_razorpay_recovery_idx') AND indisvalid) THEN
    v_contract:=jsonb_set(v_contract,'{missing_indexes}',(v_contract->'missing_indexes')||'["webhook_events_razorpay_recovery_idx"]'::JSONB); END IF;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN v_contract||jsonb_build_object('contract_version',60,'ready',v_ready AND v_contract->>'migration_version'='060');
END; $$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v59() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v59() TO service_role;
COMMIT;
