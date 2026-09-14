import { supabase } from './supabase'
import type { UploadImageResult } from '../types/admin'

const BUCKET = 'images'
const MAX_SIZE = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export async function uploadImage(
  file: File,
  folder: 'products' | 'categories' | 'hero-slides' | 'promo-banners'
): Promise<UploadImageResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Use a JPEG, PNG, WebP, or AVIF image')
  }

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
    // Common errors: bucket not found, permission, etc.
    throw new Error(error.message || 'Failed to upload image')
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return {
    url: data.publicUrl,
    path,
    fileName,
  }
}

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
    throw new Error('Refusing to delete a file outside the managed image folders')
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(error.message || 'Failed to delete image')
}

export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${BUCKET}/`)
}
