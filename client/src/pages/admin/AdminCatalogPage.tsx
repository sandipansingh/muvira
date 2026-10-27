import React, { useEffect, useRef, useState } from 'react'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { Pagination } from '../../components/common/Pagination'
import { Dropdown } from '../../components/ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import { uploadImage } from '../../lib/storage'
import {
  attachUploadedProductImage,
  pendingProductImages,
} from '../../lib/services/admin/catalogMedia.service'
import { AdminProductEditor } from '../../components/admin/AdminProductEditor'
import { AdminCategoryEditor } from '../../components/admin/AdminCategoryEditor'
import type { Category } from '../../lib/types/category'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { slugify } from '../../lib/utils/slug'

export const AdminCatalogPage: React.FC = () => {
  const { showToast } = useToast()
  const [products, setProducts] = useState<ProductDetail[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [pendingImages, setPendingImages] = useState(pendingProductImages)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(false)
  const categoryUploadRef = useRef<{
    fingerprint: string
    image: Awaited<ReturnType<typeof uploadImage>>
  } | null>(null)
  const categoryAttemptRef = useRef<{ slug: string; imageUrl?: string } | null>(null)

  const loadCatalog = async () => {
    setLoading(true)
    setError(null)
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        adminApiService.getProducts({ page, limit: 20 }),
        adminApiService.getCategoriesList(),
      ])
      if (!productResponse.success) throw new Error(productResponse.error.message)
      if (!categoryResponse.success) throw new Error(categoryResponse.error.message)
      setProducts(productResponse.data)
      setCategories(categoryResponse.data)
      setTotalPages(productResponse.pagination.totalPages)
      if (!categoryId && categoryResponse.data[0]) setCategoryId(categoryResponse.data[0].id)
      if (shouldScrollRef.current) {
        resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        shouldScrollRef.current = false
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Catalog data is unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCatalog()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    const refresh = () => setPendingImages(pendingProductImages())
    window.addEventListener('catalog-media-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('catalog-media-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const createProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const image = form.get('image')
    let createdId: string | null = null
    setBusy(true)
    try {
      const response = await adminApiService.createProduct({
        name: String(form.get('name') ?? '').trim(),
        categoryId,
        pricePaisa: Math.round(Number(form.get('price')) * 100),
        sku: String(form.get('sku') ?? '').trim() || undefined,
        stock: Number(form.get('stock')),
        isActive: true,
        isFeatured: false,
      })
      if (!response.success) throw new Error(response.error.message)
      createdId = response.data.id
      formElement.reset()
      if (image instanceof File && image.size > 0) {
        const uploaded = await uploadImage(image, 'products')
        await attachUploadedProductImage({
          ...uploaded,
          productId: response.data.id,
          altText: response.data.name,
          isPrimary: true,
          sortOrder: 0,
        })
      }
      showToast('Product created.', 'success')
      await loadCatalog()
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'Product could not be created.'
      const message = createdId ? `Product saved. ${detail}` : detail
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const createCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const image = form.get('image')
    let uploaded: Awaited<ReturnType<typeof uploadImage>> | null = null
    setBusy(true)
    try {
      const name = String(form.get('name') ?? '').trim()
      const slug = slugify(name)
      const previous = categoryAttemptRef.current
      if (previous) {
        const existing = await adminApiService.getCategoriesList()
        if (!existing.success)
          throw new Error(
            'Check the saved categories before retrying. The uploaded image is preserved.'
          )
        if (
          existing.data.some(
            (category) =>
              category.slug === previous.slug && category.imageUrl === (previous.imageUrl ?? '')
          )
        ) {
          categoryAttemptRef.current = null
          categoryUploadRef.current = null
          formElement.reset()
          showToast('Category creation verified.', 'success')
          await loadCatalog()
          return
        }
      }
      if (image instanceof File && image.size > 0) {
        const fingerprint = `${image.name}:${image.size}:${image.lastModified}:${image.type}`
        uploaded =
          categoryUploadRef.current?.fingerprint === fingerprint
            ? categoryUploadRef.current.image
            : await uploadImage(image, 'categories')
        categoryUploadRef.current = { fingerprint, image: uploaded }
      }
      categoryAttemptRef.current = { slug, imageUrl: uploaded?.url }
      const response = await adminApiService.createCategory({
        name,
        slug,
        imageUrl: uploaded?.url,
        isActive: true,
        showInNavbar: form.get('navbar') === 'on',
      })
      if (!response.success) throw new Error(response.error.message)
      categoryAttemptRef.current = null
      categoryUploadRef.current = null
      formElement.reset()
      showToast('Category created.', 'success')
      await loadCatalog()
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'Category could not be created.'
      const message = uploaded
        ? `${detail} Uploaded image preserved; retry checks existing categories first.`
        : detail
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={resultsContainerRef} className="space-y-8 scroll-mt-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Catalog' },
        ]}
      />
      <div>
        <h1 className="admin-page-title">Catalog</h1>
        <p className="mt-2 text-ink">
          Create products and categories, then manage live stock and visibility.
        </p>
      </div>
      {error && <p className="rounded-card bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      {pendingImages.length > 0 && (
        <section className="panel space-y-3 p-5" aria-label="Preserved image uploads">
          <h3 className="heading text-xl">Image attachments to check</h3>
          <p className="text-ink">
            These uploads are preserved. Check existing references before retrying the same
            attachment.
          </p>
          {pendingImages.map((image) => (
            <div key={image.path} className="flex flex-wrap items-center gap-3">
              <a href={image.url} target="_blank" rel="noreferrer" className="text-primary">
                {image.fileName}
              </a>
              <button
                type="button"
                disabled={busy}
                className="button-secondary"
                onClick={() =>
                  void runProductUpdate(async () => {
                    await attachUploadedProductImage(image)
                    return { success: true }
                  }, 'Image attachment verified.')
                }
              >
                Check image attachment
              </button>
            </div>
          ))}
        </section>
      )}
      {editingProduct && (
        <AdminProductEditor
          key={editingProduct.id}
          product={editingProduct}
          categories={categories}
          onSaved={loadCatalog}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {editingCategory && (
        <AdminCategoryEditor
          key={editingCategory.id}
          category={editingCategory}
          onSaved={loadCatalog}
          onClose={() => setEditingCategory(null)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={createProduct} className="panel space-y-4 p-5">
          <h3 className="heading text-xl">New product</h3>
          <label className="block space-y-2 text-sm text-ink">
            <span>Product name</span>
            <input
              name="name"
              required
              placeholder="Product name"
              className="w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
          <Dropdown
            label="Product category"
            value={categoryId}
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            onChange={setCategoryId}
            placeholder="Choose category"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-2 text-sm text-ink">
              <span>Price ₹</span>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Price ₹"
                className="w-full rounded-xl border border-line px-4 py-2 text-base"
              />
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>Stock</span>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                required
                placeholder="Stock"
                className="w-full rounded-xl border border-line px-4 py-2 text-base"
              />
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>SKU</span>
              <input
                name="sku"
                placeholder="SKU"
                className="w-full rounded-xl border border-line px-4 py-2 text-base"
              />
            </label>
          </div>
          <label className="block space-y-2 text-sm text-ink">
            <span>Product image</span>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="w-full text-base text-ink"
            />
          </label>
          <button type="submit" disabled={busy || !categoryId} className="button-primary">
            Create product
          </button>
        </form>

        <form onSubmit={createCategory} className="panel space-y-4 p-5">
          <h3 className="heading text-xl">New category</h3>
          <label className="block space-y-2 text-sm text-ink">
            <span>Category name</span>
            <input
              name="name"
              required
              placeholder="Category name"
              className="w-full rounded-xl border border-line px-4 py-2 text-base"
            />
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>Category image</span>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="w-full text-base text-ink"
            />
          </label>
          <button type="submit" disabled={busy} className="button-primary">
            Create category
          </button>
          <label className="flex items-center gap-2 text-ink">
            <input type="checkbox" name="navbar" />
            Show in navigation (maximum five)
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className="button-secondary"
                disabled={busy}
                aria-label={`Edit category ${category.name}`}
                onClick={() => setEditingCategory(category)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </form>
      </div>

      {loading && <div className="h-48 animate-pulse rounded-card bg-surface" />}
      {!loading && products.length === 0 && (
        <p className="panel p-6 text-sm text-ink">No products found.</p>
      )}
      {!loading && products.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-paper">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface text-ink">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Featured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 text-ink">
                    <span className="block font-semibold">{product.name}</span>
                    <span className="text-xs text-muted">{product.sku || 'No SKU'}</span>
                    <button
                      type="button"
                      disabled={busy}
                      className="mt-2 block text-primary"
                      aria-label={`Edit product ${product.name}`}
                      onClick={() => setEditingProduct(product)}
                    >
                      Edit product
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-4 py-3">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        const stock = Number(new FormData(event.currentTarget).get('stock'))
                        void runProductUpdate(
                          async () => adminApiService.updateStock(product.id, stock),
                          'Stock updated.'
                        )
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="stock"
                        aria-label={`${product.name} stock`}
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={product.stock}
                        className="w-24 rounded-lg border border-line px-3 py-1 text-base"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="button-secondary px-3 py-1 text-xs"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runProductUpdate(
                          () =>
                            adminApiService.updateProduct(product.id, {
                              isActive: !product.isActive,
                            }),
                          product.isActive ? 'Product hidden.' : 'Product published.'
                        )
                      }
                      className="button-secondary px-3 py-1 text-xs"
                    >
                      {product.isActive ? 'Published' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runProductUpdate(
                          () =>
                            adminApiService.updateProduct(product.id, {
                              isFeatured: !product.isFeatured,
                            }),
                          'Featured status updated.'
                        )
                      }
                      className="button-secondary px-3 py-1 text-xs"
                    >
                      {product.isFeatured ? 'Featured' : 'Standard'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(nextPage) => {
          shouldScrollRef.current = true
          setPage(nextPage)
        }}
      />
    </div>
  )

  async function runProductUpdate(
    action: () => Promise<{ success: boolean; error?: { message: string } }>,
    message: string
  ) {
    setBusy(true)
    try {
      const response = await action()
      if (!response.success) throw new Error(response.error?.message ?? 'Catalog update failed.')
      showToast(message, 'success')
      await loadCatalog()
    } catch (reason) {
      const actionError = reason instanceof Error ? reason.message : 'Catalog update failed.'
      setError(actionError)
      showToast(actionError, 'error')
    } finally {
      setBusy(false)
    }
  }
}

export default AdminCatalogPage
