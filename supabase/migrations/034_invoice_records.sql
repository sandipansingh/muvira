BEGIN;

CREATE TABLE IF NOT EXISTS invoice_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  provider_reference TEXT,
  object_path TEXT,
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  generated_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invoice_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE invoice_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE invoice_records TO service_role;

DROP TRIGGER IF EXISTS invoice_records_set_updated_at ON invoice_records;
CREATE TRIGGER invoice_records_set_updated_at
  BEFORE UPDATE ON invoice_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', FALSE, 10485760, ARRAY['application/pdf']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION begin_invoice_generation(
  p_order_id UUID,
  p_provider_reference TEXT
)
RETURNS invoice_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record invoice_records%ROWTYPE;
BEGIN
  SELECT * INTO v_record
  FROM invoice_records
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_record.status = 'generating'
      AND v_record.updated_at > NOW() - INTERVAL '2 minutes' THEN
      RAISE EXCEPTION 'Invoice generation is already in progress' USING ERRCODE = '55P03';
    END IF;

    UPDATE invoice_records
    SET
      status = 'generating',
      provider_reference = p_provider_reference,
      attempts = attempts + 1,
      last_error = NULL
    WHERE order_id = p_order_id
    RETURNING * INTO v_record;
  ELSE
    INSERT INTO invoice_records (
      order_id,
      status,
      provider_reference,
      attempts,
      last_error
    ) VALUES (
      p_order_id,
      'generating',
      p_provider_reference,
      1,
      NULL
    )
    RETURNING * INTO v_record;
  END IF;

  RETURN v_record;
END;
$$;

REVOKE ALL ON FUNCTION begin_invoice_generation(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION begin_invoice_generation(UUID, TEXT) TO service_role;

COMMIT;
