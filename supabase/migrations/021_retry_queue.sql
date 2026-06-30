-- 021: Retry Queue
-- DB-backed job queue for failed operations that need retry.
-- Workers (cron jobs or manual retry) pick up pending items and process them.
-- After max_retries, items move to 'dead' status for manual inspection.

CREATE TABLE IF NOT EXISTS retry_jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type      TEXT        NOT NULL CHECK (job_type IN ('webhook_process', 'tracking_sync', 'notification', 'label_generate', 'invoice_generate')),
  reference_id  TEXT,       -- e.g. order_id, awb_code for tracing
  payload       JSONB       NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  retry_count   INTEGER     NOT NULL DEFAULT 0,
  max_retries   INTEGER     NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workers fetch: pending jobs, ordered by next_retry_at, limit batch size
CREATE INDEX IF NOT EXISTS idx_retry_jobs_pending
  ON retry_jobs (status, next_retry_at)
  WHERE status = 'pending';

-- For diagnostics: show recent failures
CREATE INDEX IF NOT EXISTS idx_retry_jobs_failed
  ON retry_jobs (status, created_at DESC)
  WHERE status IN ('failed', 'dead');

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION retry_jobs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS retry_jobs_set_updated_at_trigger ON retry_jobs;
CREATE TRIGGER retry_jobs_set_updated_at_trigger
  BEFORE UPDATE ON retry_jobs
  FOR EACH ROW EXECUTE FUNCTION retry_jobs_set_updated_at();

-- Helper function: enqueue a retry job
CREATE OR REPLACE FUNCTION enqueue_retry_job(
  p_job_type TEXT,
  p_reference_id TEXT,
  p_payload JSONB,
  p_max_retries INTEGER DEFAULT 5
)
RETURNS UUID
LANGUAGE plpgsql
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
