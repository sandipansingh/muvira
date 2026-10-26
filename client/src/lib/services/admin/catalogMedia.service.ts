import { adminApiService } from './admin.service'
import type { UploadImageResult } from '../../../types/admin'

export interface PendingProductImage extends UploadImageResult {
  productId: string
  altText: string
  isPrimary: boolean
  sortOrder: number
}

const KEY = 'muvira:pending-product-images:v1'

export function pendingProductImages(): PendingProductImage[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PendingProductImage[]
  } catch {
    return []
  }
}

function persist(images: PendingProductImage[]) {
  localStorage.setItem(KEY, JSON.stringify(images))
  window.dispatchEvent(new Event('catalog-media-change'))
}

export async function attachUploadedProductImage(image: PendingProductImage): Promise<void> {
  const pending = pendingProductImages()
  const retry = pending.some((item) => item.path === image.path)
  if (!retry) persist([...pending, image])
  // Check existing references before issuing a retry. The API also deduplicates by product + URL.
  try {
    const product = await adminApiService.getProduct(image.productId)
    if (!product.success && retry) throw new Error('Product references are unavailable.')
    if (product.success && product.data.images.some((item) => item.url === image.url)) {
      persist(pendingProductImages().filter((item) => item.path !== image.path))
      return
    }
  } catch {
    if (retry)
      throw new Error(
        'Image references could not be checked. Upload preserved; try checking again later.'
      )
    // The original upload remains recorded while its attachment outcome is unknown.
  }
  const response = await adminApiService.uploadProductImages(image.productId, [image.url], image)
  if (!response.success) throw new Error(response.error.message)
  persist(pendingProductImages().filter((item) => item.path !== image.path))
}
