BEGIN;

CREATE TABLE public.guest_cart_transfers (
  operation_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.guest_cart_transfers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_cart_transfers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.guest_cart_transfers TO service_role;

CREATE FUNCTION public.merge_guest_cart_item(p_operation_id UUID, p_user_id UUID, p_product_id UUID, p_quantity INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_existing public.guest_cart_transfers%ROWTYPE; v_result JSONB; v_item UUID;
BEGIN
  IF p_operation_id IS NULL OR p_user_id IS NULL OR p_product_id IS NULL OR p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid transfer input' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id) THEN
    RAISE EXCEPTION 'Invalid transfer account' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::TEXT, 0));
  SELECT * INTO v_existing FROM public.guest_cart_transfers WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_existing.user_id <> p_user_id OR v_existing.product_id <> p_product_id OR v_existing.quantity <> p_quantity THEN
      RAISE EXCEPTION 'Transfer operation conflicts with its original input' USING ERRCODE = '22023';
    END IF;
    RETURN v_existing.result;
  END IF;
  BEGIN
    v_item := public.add_cart_item_checked(p_user_id,p_product_id,p_quantity);
    v_result := jsonb_build_object('status','applied','cart_item_id',v_item);
  EXCEPTION WHEN SQLSTATE 'P0002' OR SQLSTATE 'P0001' OR SQLSTATE '22023' THEN
    v_result := jsonb_build_object('status','rejected','message',SQLERRM);
  END;
  INSERT INTO public.guest_cart_transfers(operation_id,user_id,product_id,quantity,result)
    VALUES(p_operation_id,p_user_id,p_product_id,p_quantity,v_result);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.merge_guest_cart_item(UUID,UUID,UUID,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_guest_cart_item(UUID,UUID,UUID,INTEGER) TO service_role;

ALTER FUNCTION public.get_runtime_schema_status() RENAME TO get_runtime_schema_status_v49;
CREATE FUNCTION public.get_runtime_schema_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_contract JSONB := public.get_runtime_schema_status_v49(); v_function REGPROCEDURE; v_column TEXT; v_relation REGCLASS := to_regclass('public.guest_cart_transfers');
BEGIN
  v_function := to_regprocedure('public.merge_guest_cart_item(uuid,uuid,uuid,integer)');
  IF v_function IS NULL THEN
    v_contract := jsonb_set(v_contract,'{missing_functions}',(v_contract->'missing_functions') || '["public.merge_guest_cart_item(uuid,uuid,uuid,integer)"]'::JSONB);
  ELSIF has_function_privilege('anon',v_function,'EXECUTE') OR has_function_privilege('authenticated',v_function,'EXECUTE') OR NOT has_function_privilege('service_role',v_function,'EXECUTE') THEN
    v_contract := jsonb_set(v_contract,'{invalid_function_grants}',(v_contract->'invalid_function_grants') || '["public.merge_guest_cart_item(uuid,uuid,uuid,integer)"]'::JSONB);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='guest_cart_transfers' AND c.relrowsecurity) THEN
    v_contract := jsonb_set(v_contract,'{missing_constraints}',(v_contract->'missing_constraints') || '["guest_cart_transfers_rls"]'::JSONB);
  END IF;
  IF v_relation IS NULL THEN
    v_contract := jsonb_set(v_contract,'{missing_relations}',COALESCE(v_contract->'missing_relations','[]'::JSONB) || '["guest_cart_transfers"]'::JSONB);
  ELSE
    FOREACH v_column IN ARRAY ARRAY['operation_id','user_id','product_id','quantity','result','created_at'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_relation AND attname=v_column AND attnum>0 AND NOT attisdropped AND attnotnull AND atttypid=to_regtype(CASE v_column WHEN 'quantity' THEN 'integer' WHEN 'result' THEN 'jsonb' WHEN 'created_at' THEN 'timestamptz' ELSE 'uuid' END)) THEN
        v_contract := jsonb_set(v_contract,'{missing_columns}',COALESCE(v_contract->'missing_columns','[]'::JSONB) || jsonb_build_array('guest_cart_transfers.' || v_column));
      END IF;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v_relation AND contype='p' AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=v_relation AND attname='operation_id')]::SMALLINT[]) THEN
      v_contract := jsonb_set(v_contract,'{missing_constraints}',v_contract->'missing_constraints' || '["guest_cart_transfers_operation_key"]'::JSONB);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=v_relation AND conname='guest_cart_transfers_quantity_check' AND contype='c' AND convalidated AND pg_get_constraintdef(oid)='CHECK (((quantity >= 1) AND (quantity <= 100)))') THEN
      v_contract := jsonb_set(v_contract,'{missing_constraints}',v_contract->'missing_constraints' || '["guest_cart_transfers_quantity_check"]'::JSONB);
    END IF;
    IF has_table_privilege('anon',v_relation,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_table_privilege('authenticated',v_relation,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_any_column_privilege('anon',v_relation,'SELECT,INSERT,UPDATE,REFERENCES') OR has_any_column_privilege('authenticated',v_relation,'SELECT,INSERT,UPDATE,REFERENCES')
      OR NOT has_table_privilege('service_role',v_relation,'SELECT') OR NOT has_table_privilege('service_role',v_relation,'INSERT') OR NOT has_table_privilege('service_role',v_relation,'UPDATE') OR NOT has_table_privilege('service_role',v_relation,'DELETE') THEN
      v_contract := jsonb_set(v_contract,'{invalid_relation_grants}',COALESCE(v_contract->'invalid_relation_grants','[]'::JSONB) || '["guest_cart_transfers"]'::JSONB);
    END IF;
  END IF;
  RETURN v_contract || jsonb_build_object('contract_version',50,'ready', NOT EXISTS (SELECT 1 FROM jsonb_each(v_contract) WHERE (key LIKE 'missing_%' OR key LIKE 'invalid_%') AND value <> '[]'::JSONB));
END;
$$;
REVOKE ALL ON FUNCTION public.get_runtime_schema_status(), public.get_runtime_schema_status_v49() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_runtime_schema_status(), public.get_runtime_schema_status_v49() TO service_role;
COMMIT;
