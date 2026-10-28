BEGIN;

CREATE TABLE public.checkout_preparations (
  request_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  dispatch_state TEXT NOT NULL DEFAULT 'initialized'
    CHECK (dispatch_state IN ('initialized', 'dispatched', 'ready', 'review')),
  provider_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX checkout_preparations_user_idx ON public.checkout_preparations(user_id, created_at DESC);
ALTER TABLE public.checkout_preparations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_preparations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.checkout_preparations TO service_role;
CREATE TRIGGER checkout_preparations_updated_at BEFORE UPDATE ON public.checkout_preparations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE FUNCTION public.active_checkout_ids(p_user_id UUID) RETURNS UUID[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_ids UUID[];
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Customer is required' USING ERRCODE='22023'; END IF;
  SELECT COALESCE(array_agg(o.id ORDER BY o.created_at), ARRAY[]::UUID[]) INTO v_ids
  FROM public.orders o WHERE o.user_id=p_user_id AND o.status='pending' AND o.payment_status='pending'
    AND (EXISTS(SELECT 1 FROM public.inventory_reservations r WHERE r.order_id=o.id AND r.status='reserved')
      OR EXISTS(SELECT 1 FROM public.retained_checkout_cases c WHERE c.order_id=o.id AND c.state='active'));
  RETURN v_ids;
END; $$;

CREATE FUNCTION public.prepare_checkout_session(
  p_user_id UUID, p_request_id UUID, p_request_fingerprint TEXT, p_checkout JSONB, p_order_prefix TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_preparation public.checkout_preparations%ROWTYPE; v_ids UUID[]; v_initialized JSONB;
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL OR p_request_fingerprint IS NULL
    OR p_request_fingerprint !~ '^[a-f0-9]{64}$' OR p_checkout IS NULL
    OR jsonb_typeof(p_checkout)<>'object' OR p_order_prefix IS NULL OR length(p_order_prefix) NOT BETWEEN 1 AND 10
    OR p_checkout - ARRAY['address_id','coupon_code','shipping_method','billing_same_as_shipping','billing','notes'] <> '{}'::JSONB
  THEN RAISE EXCEPTION 'Invalid checkout preparation' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout:'||p_user_id::TEXT,0));
  SELECT * INTO v_preparation FROM public.checkout_preparations WHERE request_id=p_request_id;
  IF FOUND THEN
    IF v_preparation.user_id<>p_user_id THEN RAISE EXCEPTION 'Checkout request not found' USING ERRCODE='P0002'; END IF;
    IF v_preparation.request_fingerprint<>p_request_fingerprint THEN
      RETURN jsonb_build_object('conflict','CHECKOUT_REQUEST_CONFLICT');
    END IF;
    RETURN jsonb_build_object('order_id',v_preparation.order_id,'created',FALSE);
  END IF;
  v_ids:=public.active_checkout_ids(p_user_id);
  IF cardinality(v_ids)>1 THEN RETURN jsonb_build_object('conflict','MULTIPLE_ACTIVE_CHECKOUTS'); END IF;
  IF cardinality(v_ids)=1 THEN
    RETURN jsonb_build_object('conflict','CHECKOUT_ALREADY_ACTIVE','order_id',v_ids[1]);
  END IF;
  v_initialized:=public.initialize_checkout(p_user_id,(p_checkout->>'address_id')::UUID,
    p_checkout->>'coupon_code',COALESCE(p_checkout->>'shipping_method','standard'),
    COALESCE((p_checkout->>'billing_same_as_shipping')::BOOLEAN,TRUE),p_checkout->'billing',
    p_checkout->>'notes',p_order_prefix);
  INSERT INTO public.checkout_preparations(request_id,user_id,order_id,request_fingerprint)
  VALUES(p_request_id,p_user_id,(v_initialized->'order'->>'id')::UUID,p_request_fingerprint);
  RETURN jsonb_build_object('order_id',v_initialized->'order'->>'id','created',TRUE);
END; $$;

CREATE FUNCTION public.claim_checkout_dispatch(
  p_order_id UUID, p_execution_scope TEXT, p_execution_resource_id TEXT,
  p_execution_owner_token UUID, p_execution_fencing_token BIGINT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_order_id IS NULL OR p_execution_scope IS DISTINCT FROM 'checkout_payment'
    OR p_execution_resource_id IS DISTINCT FROM p_order_id::TEXT THEN
    RAISE EXCEPTION 'Invalid checkout dispatch' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  UPDATE public.checkout_preparations SET dispatch_state='dispatched' WHERE order_id=p_order_id AND dispatch_state='initialized';
  RETURN FOUND;
END; $$;

CREATE FUNCTION public.complete_checkout_preparation(
  p_user_id UUID, p_order_id UUID, p_provider_order_id TEXT,
  p_execution_scope TEXT, p_execution_resource_id TEXT,
  p_execution_owner_token UUID, p_execution_fencing_token BIGINT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_user_id IS NULL OR p_order_id IS NULL OR p_provider_order_id IS NULL
    OR p_provider_order_id !~ '^order_[A-Za-z0-9]+$' OR length(p_provider_order_id)>100
    OR p_execution_scope IS DISTINCT FROM 'checkout_payment' OR p_execution_resource_id IS DISTINCT FROM p_order_id::TEXT THEN
    RAISE EXCEPTION 'Invalid prepared provider order' USING ERRCODE='22023'; END IF;
  PERFORM public.assert_execution_lease(p_execution_scope,p_execution_resource_id,p_execution_owner_token,p_execution_fencing_token);
  PERFORM 1 FROM public.checkout_preparations WHERE order_id=p_order_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkout not found' USING ERRCODE='P0002'; END IF;
  PERFORM public.attach_razorpay_order(p_user_id,p_order_id,p_provider_order_id);
  UPDATE public.checkout_preparations SET dispatch_state='ready',provider_order_id=p_provider_order_id WHERE order_id=p_order_id;
END; $$;

-- A dispatched request may have created an order even when its response was lost.
CREATE OR REPLACE FUNCTION public.expire_abandoned_checkouts(p_limit INT DEFAULT 100) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order RECORD; v_count INT:=0;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid expiry limit' USING ERRCODE='22023'; END IF;
  FOR v_order IN SELECT o.id FROM public.orders o
    WHERE o.status='pending' AND o.payment_status='pending' AND o.checkout_expires_at<NOW()
      AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.order_id=o.id AND NULLIF(BTRIM(p.razorpay_order_id),'') IS NOT NULL)
      AND NOT EXISTS(SELECT 1 FROM public.checkout_preparations c WHERE c.order_id=o.id
        AND c.dispatch_state IN ('dispatched','review') AND c.created_at+INTERVAL '24 hours'>NOW())
    ORDER BY o.checkout_expires_at LIMIT p_limit FOR UPDATE OF o SKIP LOCKED
  LOOP
    IF public.fail_checkout(v_order.id,'Checkout expired before a usable provider order was returned') THEN v_count:=v_count+1; END IF;
  END LOOP;
  RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION public.active_checkout_ids(UUID), public.prepare_checkout_session(UUID,UUID,TEXT,JSONB,TEXT),
  public.claim_checkout_dispatch(UUID,TEXT,TEXT,UUID,BIGINT),public.complete_checkout_preparation(UUID,UUID,TEXT,TEXT,TEXT,UUID,BIGINT),
  public.expire_abandoned_checkouts(INT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.active_checkout_ids(UUID), public.prepare_checkout_session(UUID,UUID,TEXT,JSONB,TEXT),
  public.claim_checkout_dispatch(UUID,TEXT,TEXT,UUID,BIGINT),public.complete_checkout_preparation(UUID,UUID,TEXT,TEXT,TEXT,UUID,BIGINT),
  public.expire_abandoned_checkouts(INT) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v52;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_contract JSONB:=public.get_runtime_schema_status_v52(); v_name TEXT; v_function REGPROCEDURE; v_ready BOOLEAN;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['public.active_checkout_ids(uuid)','public.prepare_checkout_session(uuid,uuid,text,jsonb,text)',
    'public.claim_checkout_dispatch(uuid,text,text,uuid,bigint)','public.complete_checkout_preparation(uuid,uuid,text,text,text,uuid,bigint)'] LOOP
    v_function:=to_regprocedure(v_name);
    IF v_function IS NULL THEN v_contract:=jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions')||jsonb_build_array(v_name));
    ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE')
      OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants')||jsonb_build_array(v_name));
    END IF;
  END LOOP;
  IF to_regclass('public.checkout_preparations') IS NULL THEN
    v_contract:=jsonb_set(v_contract,'{missing_relations}',(v_contract->'missing_relations')||'["checkout_preparations"]'::JSONB);
  ELSE
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.checkout_preparations'::REGCLASS) THEN
      v_contract:=jsonb_set(v_contract,'{invalid_rls_relations}',(v_contract->'invalid_rls_relations')||'["checkout_preparations"]'::JSONB);
    END IF;
    IF has_table_privilege('anon','public.checkout_preparations','SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('authenticated','public.checkout_preparations','SELECT,INSERT,UPDATE,DELETE') THEN
      v_contract:=jsonb_set(v_contract,'{invalid_relation_grants}',(v_contract->'invalid_relation_grants')||'["checkout_preparations"]'::JSONB);
    END IF;
  END IF;
  SELECT NOT EXISTS(SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value<>'[]'::JSONB) INTO v_ready;
  RETURN v_contract||jsonb_build_object('contract_version',53,'ready',v_ready AND v_contract->>'migration_version'='053');
END; $$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v52() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(),public.get_runtime_schema_status_v52() TO service_role;
COMMIT;
