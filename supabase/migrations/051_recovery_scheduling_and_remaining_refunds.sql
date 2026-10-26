BEGIN;

ALTER TABLE public.late_capture_watches
  ADD COLUMN next_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN check_attempts INTEGER NOT NULL DEFAULT 0 CHECK (check_attempts >= 0),
  ADD COLUMN failed_checks INTEGER NOT NULL DEFAULT 0 CHECK (failed_checks >= 0),
  ADD COLUMN last_check_error TEXT;
CREATE INDEX late_capture_watches_due_idx ON public.late_capture_watches(next_check_at, order_id)
  WHERE status IN ('open','manual_review');

CREATE FUNCTION public.begin_late_capture_check(
  p_execution_scope TEXT, p_execution_resource_id TEXT, p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT, p_order_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_order_id IS NULL OR p_execution_scope IS DISTINCT FROM 'checkout_payment'
    OR p_execution_resource_id IS DISTINCT FROM p_order_id::TEXT THEN
    RAISE EXCEPTION 'Watch lease identity is invalid' USING ERRCODE='22023';
  END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  UPDATE public.late_capture_watches
    SET check_attempts=check_attempts+1, last_checked_at=NOW(), next_check_at=(
      SELECT lease_expires_at FROM public.operation_leases
      WHERE scope=p_execution_scope AND resource_id=p_execution_resource_id
    )
    WHERE order_id=p_order_id AND status IN ('open','manual_review') AND next_check_at <= NOW();
  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.finish_late_capture_check(
  p_execution_scope TEXT, p_execution_resource_id TEXT, p_execution_owner_token UUID,
  p_execution_fencing_token BIGINT, p_order_id UUID, p_error TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_order_id IS NULL OR p_execution_scope IS DISTINCT FROM 'checkout_payment'
    OR p_execution_resource_id IS DISTINCT FROM p_order_id::TEXT THEN
    RAISE EXCEPTION 'Watch lease identity is invalid' USING ERRCODE='22023';
  END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  UPDATE public.late_capture_watches
    SET failed_checks=CASE WHEN p_error IS NULL THEN 0 ELSE failed_checks+1 END,
      last_check_error=LEFT(p_error,2000),
      next_check_at=NOW()+make_interval(secs=>CASE WHEN p_error IS NULL THEN 60 ELSE LEAST(3600,60*POWER(2,LEAST(failed_checks,6)))::INTEGER END)
    WHERE order_id=p_order_id AND status IN ('open','manual_review');
  RETURN FOUND;
END;
$$;

ALTER TABLE public.retry_jobs DROP CONSTRAINT retry_jobs_job_type_check;
ALTER TABLE public.retry_jobs ADD CONSTRAINT retry_jobs_job_type_check CHECK (
  job_type IN ('webhook_process','razorpay_webhook','tracking_sync','label_generate','invoice_generate','shiprocket_persist','cancellation_refund')
  OR (job_type='notification' AND status IN ('completed','dead'))
);
CREATE UNIQUE INDEX retry_jobs_cancellation_refund_unique ON public.retry_jobs(reference_id)
  WHERE job_type='cancellation_refund';

CREATE FUNCTION public.enqueue_cancellation_refund() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.provider='shiprocket' AND NEW.operation_type IN ('cancel_order','cancel_shipment')
    AND NEW.local_applied_at IS NOT NULL AND OLD.local_applied_at IS NULL THEN
    INSERT INTO public.retry_jobs(job_type,reference_id,payload)
    VALUES('cancellation_refund',NEW.id::TEXT,jsonb_build_object('orderId',NEW.order_id,'cancellationOperationId',NEW.id))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER provider_operations_cancellation_refund AFTER UPDATE OF local_applied_at ON public.provider_operations
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_cancellation_refund();

-- Recover cancellations already applied before the follow-up queue existed.
INSERT INTO public.retry_jobs(job_type,reference_id,payload)
SELECT 'cancellation_refund',op.id::TEXT,jsonb_build_object('orderId',op.order_id,'cancellationOperationId',op.id)
FROM public.provider_operations op JOIN public.payments payment ON payment.order_id=op.order_id
WHERE op.provider='shiprocket' AND op.local_applied_at IS NOT NULL
  AND payment.status='captured' AND payment.refunded_amount_paisa < payment.amount_paisa
ON CONFLICT DO NOTHING;

CREATE FUNCTION public.complete_late_capture_watch() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.provider='razorpay' AND NEW.local_applied_at IS NOT NULL THEN
    UPDATE public.late_capture_watches SET status='refunded',updated_at=NOW()
      WHERE provider_operation_id=NEW.id AND status<>'refunded';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER provider_operations_complete_watch AFTER UPDATE OF local_applied_at ON public.provider_operations
FOR EACH ROW EXECUTE FUNCTION public.complete_late_capture_watch();
UPDATE public.late_capture_watches watch SET status='refunded'
FROM public.provider_operations operation WHERE watch.provider_operation_id=operation.id AND operation.local_applied_at IS NOT NULL;
REVOKE ALL ON FUNCTION public.complete_late_capture_watch() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_late_capture_watch() TO service_role;

CREATE FUNCTION public.prepare_remaining_refund(p_order_id UUID,p_cause TEXT,p_cancellation_operation_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_payment public.payments%ROWTYPE; v_existing public.provider_operations%ROWTYPE;
  v_cancel public.provider_operations%ROWTYPE; v_key TEXT; v_amount INTEGER; v_hash TEXT;
BEGIN
  IF p_order_id IS NULL OR NULLIF(BTRIM(p_cause),'') IS NULL OR LENGTH(p_cause)>2000 THEN
    RAISE EXCEPTION 'Order and refund reason are required' USING ERRCODE='22023';
  END IF;
  IF p_cancellation_operation_id IS NOT NULL THEN
    SELECT * INTO v_cancel FROM public.provider_operations WHERE id=p_cancellation_operation_id;
    IF NOT FOUND OR v_cancel.order_id<>p_order_id OR v_cancel.provider<>'shiprocket'
      OR v_cancel.operation_type NOT IN ('cancel_order','cancel_shipment')
      OR v_cancel.local_applied_at IS NULL OR v_cancel.state<>'provider_succeeded' THEN
      RAISE EXCEPTION 'Confirmed cancellation is required' USING ERRCODE='22023';
    END IF;
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','complete','operation',NULL); END IF;
  v_key := CASE WHEN p_cancellation_operation_id IS NULL THEN 'remaining-refund:'||v_payment.id::TEXT ELSE 'cancellation-refund:'||p_cancellation_operation_id::TEXT END;
  SELECT * INTO v_existing FROM public.provider_operations WHERE provider='razorpay' AND operation_type='partial_refund' AND business_key=v_key;
  IF FOUND THEN
    IF v_existing.order_id<>p_order_id OR v_existing.payment_id<>v_payment.id OR v_existing.cause<>BTRIM(p_cause) THEN
      RAISE EXCEPTION 'Refund identity conflicts with its immutable request' USING ERRCODE='23505';
    END IF;
    RETURN jsonb_build_object('status','prepared','operation',to_jsonb(v_existing));
  END IF;
  IF v_payment.status='refunded' OR v_payment.refunded_amount_paisa=v_payment.amount_paisa THEN
    RETURN jsonb_build_object('status','complete','operation',NULL);
  END IF;
  IF v_payment.status<>'captured' OR v_payment.razorpay_payment_id IS NULL THEN
    RAISE EXCEPTION 'Captured payment required' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.provider_operations WHERE payment_id=v_payment.id AND provider='razorpay' AND local_applied_at IS NULL) THEN
    RETURN jsonb_build_object('status','waiting','operation',NULL);
  END IF;
  v_amount:=v_payment.amount_paisa-v_payment.refunded_amount_paisa;
  v_hash:=encode(extensions.digest(jsonb_build_object('payment_id',v_payment.id,'amount_paisa',v_amount,'currency',v_payment.currency,'business_key',v_key)::TEXT,'sha256'),'hex');
  SELECT * INTO v_existing FROM public.prepare_provider_operation('razorpay','partial_refund',v_key,p_order_id,v_payment.id,'payment',v_payment.razorpay_payment_id,v_amount,v_payment.currency,v_hash,BTRIM(p_cause));
  RETURN jsonb_build_object('status','prepared','operation',to_jsonb(v_existing));
END;
$$;

CREATE FUNCTION public.prepare_cancellation_refund_fenced(
  p_execution_scope TEXT,p_execution_resource_id TEXT,p_execution_owner_token UUID,p_execution_fencing_token BIGINT,
  p_order_id UUID,p_cause TEXT,p_cancellation_operation_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_execution_scope IS DISTINCT FROM 'retry_job_effect' OR p_cancellation_operation_id IS NULL THEN
    RAISE EXCEPTION 'Cancellation retry lease is required' USING ERRCODE='22023';
  END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  IF NOT EXISTS(SELECT 1 FROM public.retry_jobs WHERE id::TEXT=p_execution_resource_id AND job_type='cancellation_refund' AND reference_id=p_cancellation_operation_id::TEXT AND payload->>'orderId'=p_order_id::TEXT) THEN
    RAISE EXCEPTION 'Cancellation retry identity mismatch' USING ERRCODE='22023';
  END IF;
  RETURN public.prepare_remaining_refund(p_order_id,p_cause,p_cancellation_operation_id);
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_cancellation_refund_fenced(TEXT,TEXT,UUID,BIGINT,UUID,TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_cancellation_refund_fenced(TEXT,TEXT,UUID,BIGINT,UUID,TEXT,UUID) TO service_role;

CREATE FUNCTION public.defer_retry_job(p_job_id UUID,p_lease_token UUID,p_reason TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_job_id IS NULL OR p_lease_token IS NULL OR NULLIF(BTRIM(p_reason),'') IS NULL THEN
    RAISE EXCEPTION 'Job, lease and reason are required' USING ERRCODE='22023';
  END IF;
  UPDATE public.retry_jobs SET status='pending',next_retry_at=NOW()+INTERVAL '1 minute',last_error=LEFT(p_reason,2000),lease_token=NULL,claimed_at=NULL,lease_expires_at=NULL
  WHERE id=p_job_id AND job_type='cancellation_refund' AND status='processing' AND lease_token=p_lease_token AND lease_expires_at>NOW();
  RETURN FOUND;
END;
$$;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v50;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_contract JSONB:=public.get_runtime_schema_status_v50(); v_name TEXT; v_function REGPROCEDURE; v_ready BOOLEAN;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['next_check_at','check_attempts','failed_checks','last_checked_at','last_check_error'] LOOP
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='late_capture_watches' AND column_name=v_name) THEN
      v_contract:=jsonb_set(v_contract,'{missing_columns}',(v_contract->'missing_columns')||jsonb_build_array('late_capture_watches.'||v_name));
    END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['public.begin_late_capture_check(text,text,uuid,bigint,uuid)','public.finish_late_capture_check(text,text,uuid,bigint,uuid,text)','public.prepare_remaining_refund(uuid,text,uuid)','public.prepare_cancellation_refund_fenced(text,text,uuid,bigint,uuid,text,uuid)','public.defer_retry_job(uuid,uuid,text)','public.enqueue_cancellation_refund()','public.complete_late_capture_watch()'] LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL THEN
      v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||jsonb_build_array(v_name));
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE') OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||jsonb_build_array(v_name));
    END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['late_capture_watches_due_idx','retry_jobs_cancellation_refund_unique'] LOOP
    IF to_regclass('public.'||v_name) IS NULL THEN
      v_contract:=jsonb_set(v_contract,'{missing_indexes}',(v_contract->'missing_indexes')||jsonb_build_array(v_name));
    END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='provider_operations_cancellation_refund' AND NOT tgisinternal AND tgenabled='O') THEN
    v_contract:=jsonb_set(v_contract,'{missing_constraints}',(v_contract->'missing_constraints')||'["provider_operations_cancellation_refund"]'::JSONB);
  END IF;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN v_contract||jsonb_build_object('contract_version',51,'ready',v_ready AND v_contract->>'migration_version'='051');
END;
$$;

REVOKE ALL ON FUNCTION public.begin_late_capture_check(TEXT,TEXT,UUID,BIGINT,UUID),public.finish_late_capture_check(TEXT,TEXT,UUID,BIGINT,UUID,TEXT),public.prepare_remaining_refund(UUID,TEXT,UUID),public.defer_retry_job(UUID,UUID,TEXT),public.enqueue_cancellation_refund(),public.get_runtime_schema_status(),public.get_runtime_schema_status_v50() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_late_capture_check(TEXT,TEXT,UUID,BIGINT,UUID),public.finish_late_capture_check(TEXT,TEXT,UUID,BIGINT,UUID,TEXT),public.prepare_remaining_refund(UUID,TEXT,UUID),public.defer_retry_job(UUID,UUID,TEXT),public.enqueue_cancellation_refund(),public.get_runtime_schema_status(),public.get_runtime_schema_status_v50() TO service_role;
COMMIT;
