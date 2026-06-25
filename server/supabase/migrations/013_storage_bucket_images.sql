--
-- Storage bucket: "images"
-- Purpose: Store user-uploaded images for products, categories, and hero slides.
-- Bucket is public (images served via getPublicUrl / CDN).
-- Uploads, updates, and deletes are restricted to admin users only.
-- Client uploads use the authenticated Supabase session (anon key + user JWT).
--

-- Create the bucket (idempotent + update limits if changed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  8388608,  -- 8 MB (matches client-side MAX_SIZE in storage.ts)
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/svg+xml'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Row Level Security policies on storage.objects
-- (storage.objects RLS is enabled by default in Supabase projects)
-- ----------------------------------------------------------------------------

-- Drop existing policies if re-running this migration (makes it idempotent)
DROP POLICY IF EXISTS "images_select_public" ON storage.objects;
DROP POLICY IF EXISTS "images_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "images_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "images_delete_admin" ON storage.objects;

-- 1. Public read access (anyone, including unauthenticated visitors, can view images)
--    This powers the public getPublicUrl() used throughout the storefront.
CREATE POLICY "images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- 2. Admin-only uploads (INSERT)
--    - Must target the 'images' bucket
--    - Must be inside one of the allowed folders (prevents arbitrary paths)
--    - Requester must be an admin (checked against profiles table, same pattern as other tables)
CREATE POLICY "images_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('products', 'categories', 'hero-slides')
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- 3. Admin-only updates
CREATE POLICY "images_update_admin"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- 4. Admin-only deletes (used for cleanup when removing images from products/categories/hero)
CREATE POLICY "images_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('products', 'categories', 'hero-slides')
    AND EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
