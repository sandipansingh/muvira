BEGIN;

CREATE OR REPLACE FUNCTION public.get_product_review_summaries(p_product_ids UUID[])
RETURNS TABLE (
  product_id UUID,
  rating NUMERIC,
  review_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    product_reviews.product_id,
    ROUND(AVG(product_reviews.rating)::NUMERIC, 1) AS rating,
    COUNT(*) AS review_count
  FROM public.product_reviews
  WHERE product_reviews.product_id = ANY(p_product_ids)
  GROUP BY product_reviews.product_id;
$$;

REVOKE ALL ON FUNCTION public.get_product_review_summaries(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_review_summaries(UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.get_product_review_summaries(UUID[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_review_summaries(UUID[]) TO service_role;

COMMIT;
