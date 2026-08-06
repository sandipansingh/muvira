import { supabase } from '../supabase'

export interface UploadImageResult {
  url: string
  path: string
  fileName: string
}

const BUCKET = 'images'

/**
 * Uploads an image file to Supabase storage under a specified folder.
 * Enforces image MIME type check and 8MB maximum file size.
 */
export async function uploadImage(
  file: File,
  folder: 'products' | 'categories' | 'hero-slides' | 'promo-banners'
): Promise<UploadImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }

  const MAX_SIZE = 8 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    throw new Error('Image is too large (max 8MB)')
  }

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`
  const path = `${folder}/${fileName}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    throw new Error(error.message || 'Failed to upload image')
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return {
    url: data.publicUrl,
    path,
    fileName,
  }
}

/**
 * Deletes a file from Supabase storage by path or public URL.
 */
export async function deleteStorageFile(pathOrUrl: string): Promise<void> {
  if (!pathOrUrl) return

  let path = pathOrUrl
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = pathOrUrl.indexOf(marker)
  if (idx !== -1) {
    path = pathOrUrl.substring(idx + marker.length)
  }

  if (
    !path.startsWith('products/') &&
    !path.startsWith('categories/') &&
    !path.startsWith('hero-slides/') &&
    !path.startsWith('promo-banners/')
  ) {
    return
  }

  await supabase.storage.from(BUCKET).remove([path])
}

/**
 * Checks whether a URL is a valid Supabase storage URL.
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${BUCKET}/`)
}
