import { supabase } from './supabase';

export interface UploadImageResult {
  url: string;
  path: string;
  fileName: string;
}

/**
 * Uploads an image file to Supabase Storage.
 *
 * REQUIRED SETUP (one time in Supabase Dashboard):
 *  - Create a bucket named: "images"
 *  - Make the bucket PUBLIC (or use public URLs via getPublicUrl)
 *
 * Recommended Storage RLS policies (paste in SQL editor):
 *
 *   create policy "Public can read images"
 *   on storage.objects for select
 *   using ( bucket_id = 'images' );
 *
 *   create policy "Authenticated can upload images"
 *   on storage.objects for insert
 *   to authenticated
 *   with check ( bucket_id = 'images' );
 *
 *   -- (Optional) allow update/delete for owners or admins
 *   create policy "Authenticated can delete own images"
 *   on storage.objects for delete
 *   to authenticated
 *   using ( bucket_id = 'images' );
 *
 * Folders used: products/, categories/, campaigns/
 */
const BUCKET = 'images';

export async function uploadImage(
  file: File,
  folder: 'products' | 'categories' | 'campaigns'
): Promise<UploadImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Limit ~8MB client side
  const MAX_SIZE = 8 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Image is too large (max 8MB)');
  }

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
  const path = `${folder}/${fileName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    // Common errors: bucket not found, permission, etc.
    throw new Error(error.message || 'Failed to upload image');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    fileName,
  };
}

/**
 * Deletes a file from Supabase Storage given its storage path.
 * Safe to call with non-storage URLs (no-op).
 */
export async function deleteStorageFile(pathOrUrl: string): Promise<void> {
  if (!pathOrUrl) return;

  // Extract path if a full public URL was passed
  let path = pathOrUrl;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = pathOrUrl.indexOf(marker);
  if (idx !== -1) {
    path = pathOrUrl.substring(idx + marker.length);
  }

  // Only attempt delete if it looks like one of our paths
  if (!path.startsWith('products/') && !path.startsWith('categories/') && !path.startsWith('campaigns/')) {
    return;
  }

  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Helper to check if a URL is hosted in our Supabase storage bucket.
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${BUCKET}/`);
}
