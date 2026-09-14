BEGIN;

UPDATE storage.buckets
SET
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::TEXT[]
WHERE id = 'images';

DROP POLICY IF EXISTS "images_insert_admin" ON storage.objects;
CREATE POLICY "images_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('products', 'categories', 'hero-slides', 'promo-banners')
    AND public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "images_update_admin" ON storage.objects;
CREATE POLICY "images_update_admin"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('products', 'categories', 'hero-slides', 'promo-banners')
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('products', 'categories', 'hero-slides', 'promo-banners')
    AND public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "images_delete_admin" ON storage.objects;
CREATE POLICY "images_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] IN ('products', 'categories', 'hero-slides', 'promo-banners')
    AND public.is_admin(auth.uid())
  );

COMMIT;
