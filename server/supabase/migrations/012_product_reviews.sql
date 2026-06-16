-- Product reviews & comments
-- Only verified buyers (delivered + paid orders) may create reviews (enforced in app layer).
-- One review per (user, product). Upserts supported.
-- Public read for social proof. Admins can manage (delete).

CREATE TABLE IF NOT EXISTS product_reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  rating      INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_product_review UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id  ON product_reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id     ON product_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at  ON product_reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating      ON product_reviews (rating);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (social proof on product pages)
CREATE POLICY "reviews_select_public"
  ON product_reviews FOR SELECT
  USING (true);

-- Users may only insert their own (buyer verification done in app)
CREATE POLICY "reviews_insert_own"
  ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users may only update their own reviews
CREATE POLICY "reviews_update_own"
  ON product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "reviews_all_admin"
  ON product_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TRIGGER product_reviews_set_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
