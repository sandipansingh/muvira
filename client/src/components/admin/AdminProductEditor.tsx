import React, { useEffect, useId, useRef, useState } from 'react'
import { adminApiService } from '../../lib/services/admin/admin.service'
import {
  attachUploadedProductImage,
  pendingProductImages,
} from '../../lib/services/admin/catalogMedia.service'
import { uploadImage } from '../../lib/storage'
import type { ProductDetail } from '../../lib/types/product'
import type { Category } from '../../lib/types/category'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Dropdown } from '../ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { Modal } from '../common/Modal'
import { AdminDialogActions } from './AdminDialog'

interface Props {
  product: ProductDetail
  categories: Category[]
  onSaved: () => Promise<void>
  onClose: () => void
  embedded?: boolean
  onBusyChange?: (busy: boolean) => void
}

export function AdminProductEditor({
  product: initial,
  categories,
  onSaved,
  onClose,
  embedded = false,
  onBusyChange,
}: Props) {
  const formId = useId()
  const [product, setProduct] = useState(initial)
  const [categoryId, setCategoryId] = useState(initial.category.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState(() =>
    pendingProductImages().some((image) => image.productId === initial.id)
  )
  const [removingImageId, setRemovingImageId] = useState<string | null>(null)
  const removeImageTrigger = useRef<HTMLButtonElement | null>(null)
  const { showToast } = useToast()
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)
  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])
  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  useEffect(() => {
    const update = () =>
      setPendingImage(pendingProductImages().some((image) => image.productId === product.id))
    window.addEventListener('catalog-media-change', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('catalog-media-change', update)
      window.removeEventListener('storage', update)
    }
  }, [product.id])

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true)
    setError(null)
    setWarning(null)
    let committed = false
    try {
      await action()
      committed = true
      showToast(message, 'success')
      const refreshed = await adminApiService.getProduct(product.id)
      if (!refreshed.success) throw new Error('Product refresh failed.')
      setProduct(refreshed.data)
      await onSaved()
    } catch (reason) {
      if (committed) {
        const detail = reason instanceof Error ? reason.message : 'Product refresh failed.'
        const warningMessage = `${message} ${detail} Refresh the catalog to see the latest changes.`
        setWarning(warningMessage)
        showToast(warningMessage, 'info')
        return
      }
      setError(reason instanceof Error ? reason.message : 'Product update failed.')
    } finally {
      setBusy(false)
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await run(async () => {
      const response = await adminApiService.updateProduct(product.id, {
        name: String(form.get('name')).trim(),
        slug: String(form.get('slug')).trim(),
        description: String(form.get('description')),
        shortDescription: String(form.get('shortDescription')),
        metaTitle: String(form.get('metaTitle')).trim(),
        metaDescription: String(form.get('metaDescription')).trim(),
        tags: String(form.get('seoKeywords'))
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        categoryId,
        pricePaisa: Math.round(Number(form.get('price')) * 100),
        compareAtPricePaisa:
          form.get('compareAtPrice') === ''
            ? null
            : Math.round(Number(form.get('compareAtPrice')) * 100),
        sku: String(form.get('sku')).trim(),
        weightGrams: Number(form.get('weight')),
        isActive: form.get('active') === 'on',
        isFeatured: form.get('featured') === 'on',
      })
      if (!response.success) throw new Error(response.error.message)
    }, 'Product saved.')
  }

  async function reorder(ids: string[]) {
    await run(async () => {
      const response = await adminApiService.reorderProductImages(product.id, ids)
      if (!response.success) throw new Error(response.error.message)
    }, 'Image order saved.')
  }

  return (
    <section
      className={embedded ? 'admin-editor space-y-5' : 'panel space-y-5 p-5'}
      aria-label="Product editor"
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="heading text-xl">Edit product</h3>
          <button type="button" disabled={busy} className="button-secondary" onClick={onClose}>
            Close editor
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-danger">
          {error}
        </p>
      )}
      {warning && (
        <p role="status" className="rounded-xl bg-surface p-3 text-warning">
          {warning}
        </p>
      )}
      <form id={formId} onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <fieldset disabled={busy} className="contents">
          <fieldset className="admin-editor-group">
            <legend>Product details</legend>{' '}
            <label>
              Product name
              <Input name="name" required defaultValue={product.name} maxLength={500} />
            </label>
            <label>
              Product slug
              <Input
                name="slug"
                required
                defaultValue={product.slug}
                pattern={'[a-z0-9\\-]+'}
                maxLength={300}
              />
            </label>
            <div>
              <Dropdown
                label="Product category"
                value={categoryId}
                onChange={setCategoryId}
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
            </div>
            <label>
              SKU
              <Input name="sku" defaultValue={product.sku} maxLength={100} />
            </label>
          </fieldset>
          <fieldset className="admin-editor-group">
            <legend>Pricing &amp; shipping</legend>{' '}
            <label>
              Price ₹
              <Input
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={product.price / 100}
              />
            </label>
            <label>
              Compare at price ₹
              <Input
                name="compareAtPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product.salePrice === null ? '' : product.salePrice / 100}
              />
            </label>
            <p className="text-sm text-ink">
              Stock at last refresh: {product.stock}. Manage the current quantity in the Inventory
              tab.
            </p>
            <label>
              Weight grams
              <Input
                name="weight"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={product.weightGrams ?? 0}
              />
            </label>
          </fieldset>
          <fieldset className="admin-editor-group">
            <legend>Description</legend>{' '}
            <label className="sm:col-span-2">
              Short description
              <Textarea
                name="shortDescription"
                defaultValue={product.shortDescription}
                maxLength={500}
              />
            </label>
            <label className="sm:col-span-2">
              Description
              <Textarea
                name="description"
                defaultValue={product.description}
                maxLength={10000}
                rows={8}
              />
            </label>
          </fieldset>
          <fieldset className="admin-editor-group">
            <legend>Visibility</legend>{' '}
            <label className="flex items-center gap-2">
              <input type="checkbox" name="active" defaultChecked={product.isActive} />
              Published
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="featured" defaultChecked={product.isFeatured} />
              Featured
            </label>
          </fieldset>
          <fieldset className="sm:col-span-2 grid gap-4 rounded-xl border border-line p-4">
            <legend className="px-1 font-sans">Search engine appearance</legend>
            <p id="seo-defaults-help" className="text-sm text-muted">
              Leave a field blank to use automatic catalog metadata. Aim for 50–60 characters in
              titles and 140–160 in descriptions.
            </p>
            <label>
              SEO title
              <Input
                name="metaTitle"
                defaultValue={product.metaTitle ?? ''}
                maxLength={200}
                aria-describedby="seo-defaults-help"
              />
            </label>
            <label>
              SEO description
              <Textarea
                name="metaDescription"
                defaultValue={product.metaDescription ?? ''}
                maxLength={500}
                rows={3}
                aria-describedby="seo-defaults-help"
              />
            </label>
            <label>
              SEO keywords
              <Input
                name="seoKeywords"
                defaultValue={(product.tags ?? []).join(', ')}
                aria-describedby="seo-keywords-help"
              />
            </label>
            <p id="seo-keywords-help" className="text-sm text-muted">
              Separate up to 20 relevant keywords with commas (100 characters each). Google ignores
              the keywords meta tag for ranking.
            </p>
          </fieldset>
          <AdminDialogActions>
            <button
              type="submit"
              form={formId}
              className="button-primary"
              disabled={busy || !categoryId}
            >
              {busy ? 'Saving…' : 'Save product'}
            </button>
          </AdminDialogActions>
        </fieldset>
      </form>
      <div className="space-y-4">
        <h4 className="heading text-lg">Product images</h4>
        <p className="text-sm text-ink">
          The first image is primary. Move images to set display order.
        </p>
        {images.length === 0 && <p className="text-ink">No images attached.</p>}
        {images.map((image, index) => (
          <div
            key={image.id}
            className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[80px_1fr]"
          >
            <img
              src={image.url}
              alt={image.altText}
              className="h-20 w-20 rounded-lg object-cover"
            />
            <div className="space-y-3">
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const alt = String(new FormData(event.currentTarget).get('alt'))
                  void run(async () => {
                    const response = await adminApiService.updateProductImage(
                      product.id,
                      image.id,
                      alt
                    )
                    if (!response.success)
                      throw new Error(response.error?.message ?? 'Image update failed.')
                  }, 'Image description saved.')
                }}
              >
                <label className="grow">
                  Image {index + 1} alt text
                  <Input name="alt" defaultValue={image.altText} maxLength={300} />
                </label>
                <button disabled={busy} className="button-secondary" type="submit">
                  Save alt text
                </button>
              </form>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="button-secondary text-danger"
                  onClick={(event) => {
                    removeImageTrigger.current = event.currentTarget
                    setRemovingImageId(image.id)
                  }}
                >
                  Remove image {index + 1}
                </button>
                <button
                  type="button"
                  disabled={busy || index === 0}
                  className="button-secondary"
                  onClick={() =>
                    void reorder([
                      image.id,
                      ...images.filter((item) => item.id !== image.id).map((item) => item.id),
                    ])
                  }
                >
                  {index === 0 ? 'Primary image' : 'Make primary'}
                </button>
                <button
                  type="button"
                  disabled={busy || index === 0}
                  className="button-secondary"
                  onClick={() => {
                    const ids = images.map((item) => item.id)
                    ;[ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!]
                    void reorder(ids)
                  }}
                >
                  Move image {index + 1} earlier
                </button>
                <button
                  type="button"
                  disabled={busy || index === images.length - 1}
                  className="button-secondary"
                  onClick={() => {
                    const ids = images.map((item) => item.id)
                    ;[ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!]
                    void reorder(ids)
                  }}
                >
                  Move image {index + 1} later
                </button>
              </div>
            </div>
          </div>
        ))}
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (busy || pendingImage) return
            const formElement = event.currentTarget
            const form = new FormData(formElement)
            const file = form.get('image')
            if (!(file instanceof File) || file.size === 0) return
            void run(async () => {
              const uploaded = await uploadImage(file, 'products')
              const input = formElement.elements.namedItem('image')
              if (input instanceof HTMLInputElement) input.value = ''
              await attachUploadedProductImage({
                ...uploaded,
                productId: product.id,
                altText: String(form.get('alt')),
                isPrimary: images.length === 0,
                sortOrder: images.length,
              })
            }, 'Image attached.')
          }}
        >
          <label className="block">
            Add product image (up to 8 MiB)
            <Input
              name="image"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={busy || pendingImage}
            />
          </label>
          <label className="block">
            New image alt text
            <Input name="alt" maxLength={300} disabled={busy} />
          </label>
          <button type="submit" className="button-secondary" disabled={busy || pendingImage}>
            Upload product image
          </button>
          {pendingImage && (
            <p role="status" className="text-warning">
              An image attachment is awaiting verification. Use Check image attachment in the
              catalog before uploading again.
            </p>
          )}
        </form>
      </div>
      <Modal
        presentation="drawer"
        isOpen={removingImageId !== null}
        onClose={() => {
          if (!busy) setRemovingImageId(null)
        }}
        title="Remove product image"
        restoreFocus={() => removeImageTrigger.current}
        footer={
          <div className="admin-dialog-actions">
            <button
              type="button"
              className="button-secondary"
              disabled={busy}
              onClick={() => setRemovingImageId(null)}
            >
              Keep image
            </button>
            <button
              type="button"
              className="button-secondary text-danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!removingImageId) return
                  const response = await adminApiService.deleteProductImage(
                    product.id,
                    removingImageId
                  )
                  if (!response.success) throw new Error(response.error.message)
                  setRemovingImageId(null)
                }, 'Image removed.')
              }
            >
              Remove image
            </button>
          </div>
        }
      >
        <p className="text-ink">
          Remove this image from {product.name}? The stored file will be preserved.
        </p>
      </Modal>
    </section>
  )
}
