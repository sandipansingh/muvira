BEGIN;

CREATE FUNCTION public.get_dashboard_analytics(p_period TEXT DEFAULT 'week', p_now TIMESTAMPTZ DEFAULT NOW())
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  v_local TIMESTAMP;
  v_start TIMESTAMP;
  v_shift INTERVAL;
  v_step INTERVAL;
  v_unit TEXT;
  v_start_at TIMESTAMPTZ;
  v_previous_start TIMESTAMPTZ;
  v_previous_end TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  IF p_period IS NULL OR p_period NOT IN ('day','week','month','year') OR p_now IS NULL OR NOT isfinite(p_now) THEN
    RAISE EXCEPTION 'Invalid analytics period or clock' USING ERRCODE='22023';
  END IF;
  v_local := p_now AT TIME ZONE 'Asia/Kolkata';
  v_start := CASE p_period
    WHEN 'day' THEN date_trunc('day',v_local)
    WHEN 'week' THEN date_trunc('day',v_local)-INTERVAL '6 days'
    WHEN 'month' THEN date_trunc('day',v_local)-INTERVAL '29 days'
    ELSE date_trunc('month',v_local)-INTERVAL '11 months' END;
  v_shift := CASE p_period WHEN 'day' THEN INTERVAL '1 day' WHEN 'week' THEN INTERVAL '7 days' WHEN 'month' THEN INTERVAL '30 days' ELSE INTERVAL '12 months' END;
  v_unit := CASE p_period WHEN 'day' THEN 'hour' WHEN 'year' THEN 'month' ELSE 'day' END;
  v_step := CASE v_unit WHEN 'hour' THEN INTERVAL '1 hour' WHEN 'month' THEN INTERVAL '1 month' ELSE INTERVAL '1 day' END;
  v_start_at := v_start AT TIME ZONE 'Asia/Kolkata';
  v_previous_start := (v_start-v_shift) AT TIME ZONE 'Asia/Kolkata';
  v_previous_end := (v_local-v_shift) AT TIME ZONE 'Asia/Kolkata';

  WITH captured AS MATERIALIZED (
    SELECT id,razorpay_payment_id,amount_paisa,currency,captured_at,refunded_amount_paisa
    FROM public.payments WHERE status IN ('captured','refunded')
  ), refund_source AS MATERIALIZED (
    SELECT * FROM public.provider_operations
    WHERE provider='razorpay' AND operation_type IN ('full_refund','partial_refund') AND state='provider_succeeded'
  ), refund_groups AS (
    SELECT provider_operation_id, (array_agg(payment_id))[1] AS payment_id,
      MIN(amount_paisa) AS amount_paisa, MIN(currency) AS currency,
      MIN(provider_target_id) AS target_id, MIN(provider_completed_at) AS confirmed_at,
      bool_or(local_applied_at IS NOT NULL) AS locally_applied,
      COUNT(DISTINCT ROW(payment_id,amount_paisa,currency,provider_target_id)) AS identities,
      bool_and(provider_completed_at IS NOT NULL AND isfinite(provider_completed_at)) AS valid_times
    FROM refund_source WHERE NULLIF(BTRIM(provider_operation_id),'') IS NOT NULL GROUP BY provider_operation_id
  ), refunds AS MATERIALIZED (
    SELECT r.* FROM refund_groups r JOIN captured p ON p.id=r.payment_id
    WHERE r.identities=1 AND r.valid_times AND r.currency='INR' AND p.currency=r.currency
      AND r.target_id=p.razorpay_payment_id AND r.amount_paisa>0 AND r.amount_paisa<=p.amount_paisa
  ), events AS MATERIALIZED (
    SELECT captured_at AS occurred_at, amount_paisa::BIGINT AS collected, 0::BIGINT AS refunded, 0::BIGINT AS orders
    FROM captured WHERE captured_at IS NOT NULL AND isfinite(captured_at) AND currency='INR'
    UNION ALL
    SELECT confirmed_at,0::BIGINT,amount_paisa::BIGINT,0::BIGINT FROM refunds
    UNION ALL
    SELECT created_at,0::BIGINT,0::BIGINT,1::BIGINT FROM public.orders
  ), windows AS (
    SELECT 'current' AS name,v_start_at AS start_at,p_now AS end_at
    UNION ALL SELECT 'previous',v_previous_start,v_previous_end
  ), summaries AS (
    SELECT w.name, jsonb_build_object(
      'collected_paisa',COALESCE(SUM(e.collected),0),
      'refunded_paisa',COALESCE(SUM(e.refunded),0),
      'net_paisa',COALESCE(SUM(e.collected-e.refunded),0),
      'orders_placed',COALESCE(SUM(e.orders),0)
    ) AS summary FROM windows w LEFT JOIN events e ON e.occurred_at>=w.start_at AND e.occurred_at<w.end_at GROUP BY w.name
  ), bucket_bounds AS (
    SELECT point AT TIME ZONE 'Asia/Kolkata' AS start_at,
      LEAST((point+v_step) AT TIME ZONE 'Asia/Kolkata',p_now) AS end_at
    FROM generate_series(v_start,v_local,v_step) AS point WHERE point<v_local
  ), bucket_values AS (
    SELECT b.start_at,b.end_at,COALESCE(SUM(e.collected),0) AS collected_paisa,
      COALESCE(SUM(e.refunded),0) AS refunded_paisa,
      COALESCE(SUM(e.collected-e.refunded),0) AS net_paisa,
      COALESCE(SUM(e.orders),0) AS orders_placed
    FROM bucket_bounds b LEFT JOIN events e ON e.occurred_at>=b.start_at AND e.occurred_at<b.end_at GROUP BY b.start_at,b.end_at
  ), applied_refunds AS (
    SELECT payment_id,SUM(amount_paisa) AS amount_paisa FROM refunds WHERE locally_applied GROUP BY payment_id
  ), quality AS (
    SELECT
      (SELECT COUNT(*) FROM captured WHERE captured_at IS NULL OR NOT isfinite(captured_at)) AS missing_capture_timestamps,
      (SELECT COUNT(*) FROM refund_source s WHERE NOT EXISTS(SELECT 1 FROM refunds r WHERE r.provider_operation_id=s.provider_operation_id)) AS invalid_refund_events,
      (SELECT COUNT(*) FROM captured WHERE currency<>'INR') AS excluded_currency_events,
      (SELECT COALESCE(SUM(GREATEST(p.refunded_amount_paisa-COALESCE(r.amount_paisa,0),0)),0) FROM captured p LEFT JOIN applied_refunds r ON p.id=r.payment_id) AS unattributed_refunds_paisa
  )
  SELECT jsonb_build_object(
    'period',p_period,'timezone','Asia/Kolkata','currency','INR','as_of',p_now,
    'start_at',v_start_at,'end_at',p_now,'bucket_unit',v_unit,
    'summary',(SELECT summary FROM summaries WHERE name='current'),
    'previous',jsonb_build_object('start_at',v_previous_start,'end_at',v_previous_end,'summary',(SELECT summary FROM summaries WHERE name='previous')),
    'buckets',COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.start_at) FROM bucket_values b),'[]'::JSONB),
    'data_quality',to_jsonb(q)||jsonb_build_object('incomplete',q.missing_capture_timestamps>0 OR q.invalid_refund_events>0 OR q.excluded_currency_events>0 OR q.unattributed_refunds_paisa>0)
  ) INTO v_result FROM quality q;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_dashboard_analytics(TEXT,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics(TEXT,TIMESTAMPTZ) TO service_role;

CREATE INDEX payments_reporting_capture_idx ON public.payments(captured_at) WHERE status IN ('captured','refunded');
CREATE INDEX provider_operations_reporting_refund_idx ON public.provider_operations(provider_operation_id,provider_completed_at)
  WHERE provider='razorpay' AND operation_type IN ('full_refund','partial_refund') AND state='provider_succeeded';

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v56;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_contract JSONB:=public.get_runtime_schema_status_v56(); v_function REGPROCEDURE; v_name TEXT; v_ready BOOLEAN;
BEGIN
  v_function:=to_regprocedure('public.get_dashboard_analytics(text,timestamp with time zone)');
  IF v_function IS NULL THEN
    v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||'["public.get_dashboard_analytics(text,timestamp with time zone)"]'::JSONB);
  ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE') OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
    v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||'["public.get_dashboard_analytics(text,timestamp with time zone)"]'::JSONB);
  END IF;
  FOREACH v_name IN ARRAY ARRAY['payments_reporting_capture_idx','provider_operations_reporting_refund_idx'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.'||v_name) AND indisvalid) THEN
      v_contract:=jsonb_set(v_contract,'{missing_indexes}',(v_contract->'missing_indexes')||jsonb_build_array(v_name));
    END IF;
  END LOOP;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN v_contract||jsonb_build_object('contract_version',57,'ready',v_ready AND v_contract->>'migration_version'='057');
END;
$$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v56() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v56() TO service_role;

COMMIT;
