-- 
-- sales_campaigns
-- 

CREATE TABLE IF NOT EXISTS sales_campaigns (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  description           TEXT,
  banner_image_url      TEXT,
  discount_percentage   INT         CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active             BOOLEAN     NOT NULL DEFAULT FALSE,
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_dates_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON sales_campaigns (is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates     ON sales_campaigns (starts_at, ends_at);

-- Row-Level Security 
ALTER TABLE sales_campaigns ENABLE ROW LEVEL SECURITY;

-- Anyone can view active campaigns (used for public-facing banners)
CREATE POLICY "campaigns_select_public"
  ON sales_campaigns FOR SELECT
  USING (is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW());

-- Admins can view all (including future/inactive)
CREATE POLICY "campaigns_select_admin"
  ON sales_campaigns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "campaigns_insert_admin"
  ON sales_campaigns FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "campaigns_update_admin"
  ON sales_campaigns FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "campaigns_delete_admin"
  ON sales_campaigns FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON sales_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
