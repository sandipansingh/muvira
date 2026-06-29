-- 014: Add is_admin helper function and fix storage policies
-- This helps avoid "DatabaseInvalidObjectDefinition" errors caused by complex inline policy subqueries.
-- The function runs with elevated privileges (SECURITY DEFINER) and provides a clean, reusable admin check.

-- Create (or replace) the helper function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id
      AND role = 'admin'
  );
$$;

-- Grant execute to authenticated users (needed for RLS policy evaluation)
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon; -- safe because it only reveals admin status indirectly

-- ----------------------------------------------------------------------------
-- Re-create storage policies using the helper (more robust)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "images_select_public" ON storage.objects;
DROP POLICY IF EXISTS "images_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "images_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "images_delete_admin" ON storage.objects;

-- Public can read images
CREATE POLICY "images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Admin-only INSERT (with folder restriction)
CREATE POLICY "images_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('products', 'categories', 'hero-slides', 'promo-banners')
    AND public.is_admin(auth.uid())
  );

-- Admin-only UPDATE
CREATE POLICY "images_update_admin"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND public.is_admin(auth.uid())
  );

-- Admin-only DELETE (with folder restriction)
CREATE POLICY "images_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('products', 'categories', 'hero-slides', 'promo-banners')
    AND public.is_admin(auth.uid())
  );

-- Optional: Also fix the profiles admin select policy to use the helper (avoids self-referential issues)
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING ( public.is_admin(auth.uid()) );

-- Note: Other tables (products, categories, etc.) still use the inline pattern.
-- If you see the same schema error elsewhere, we can migrate them to use is_admin() as well.