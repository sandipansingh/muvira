import React, { useEffect, useRef, useState } from 'react'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { Pagination } from '../../components/common/Pagination'
import { Dropdown } from '../../components/ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import { deleteStorageFile, uploadImage } from '../../lib/storage'
import type { Category } from '../../lib/types/category'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'

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
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(false)

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

  const createProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const image = form.get('image')
    let uploaded: Awaited<ReturnType<typeof uploadImage>> | null = null
    setBusy(true)
    try {
      if (image instanceof File && image.size > 0) uploaded = await uploadImage(image, 'products')
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

      if (uploaded) {
        const imageResponse = await adminApiService.uploadProductImages(response.data.id, [
          uploaded.url,
        ])
        if (!imageResponse.success) {
          await deleteStorageFile(uploaded.path)
          uploaded = null
          showToast('Product saved, but its image could not be attached.', 'error')
        }
      }
      formElement.reset()
      showToast('Product created.', 'success')
      await loadCatalog()
    } catch (reason) {
      if (uploaded) await deleteStorageFile(uploaded.path).catch(() => undefined)
      const message = reason instanceof Error ? reason.message : 'Product could not be created.'
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
      if (image instanceof File && image.size > 0) uploaded = await uploadImage(image, 'categories')
      const response = await adminApiService.createCategory({
        name: String(form.get('name') ?? '').trim(),
        imageUrl: uploaded?.url,
        isActive: true,
        showInNavbar: true,
      })
      if (!response.success) throw new Error(response.error.message)
      formElement.reset()
      showToast('Category created.', 'success')
      await loadCatalog()
    } catch (reason) {
      if (uploaded) await deleteStorageFile(uploaded.path).catch(() => undefined)
      const message = reason instanceof Error ? reason.message : 'Category could not be created.'
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
        <h2 className="heading text-2xl">Catalog</h2>
        <p className="mt-2 text-ink">
          Create products and categories, then manage live stock and visibility.
        </p>
      </div>
      {error && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={createProduct} className="panel space-y-4 p-5">
          <h3 className="heading text-xl">New product</h3>
          <input
            name="name"
            required
            placeholder="Product name"
            className="w-full rounded-xl border border-line px-4 py-2 text-base"
          />
          <Dropdown
            value={categoryId}
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            onChange={setCategoryId}
            placeholder="Choose category"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="Price ₹"
              className="rounded-xl border border-line px-4 py-2 text-base"
            />
            <input
              name="stock"
              type="number"
              min="0"
              step="1"
              required
              placeholder="Stock"
              className="rounded-xl border border-line px-4 py-2 text-base"
            />
            <input
              name="sku"
              placeholder="SKU"
              className="rounded-xl border border-line px-4 py-2 text-base"
            />
          </div>
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="w-full text-base text-ink"
          />
          <button type="submit" disabled={busy || !categoryId} className="button-primary">
            Create product
          </button>
        </form>

        <form onSubmit={createCategory} className="panel space-y-4 p-5">
          <h3 className="heading text-xl">New category</h3>
          <input
            name="name"
            required
            placeholder="Category name"
            className="w-full rounded-xl border border-line px-4 py-2 text-base"
          />
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="w-full text-base text-ink"
          />
          <button type="submit" disabled={busy} className="button-primary">
            Create category
          </button>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.id} className="status-badge">
                {category.name}
              </span>
            ))}
          </div>
        </form>
      </div>

      {loading && <div className="h-48 animate-pulse rounded-3xl bg-surface" />}
      {!loading && products.length === 0 && (
        <p className="panel p-6 text-sm text-ink">No products found.</p>
      )}
      {!loading && products.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
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
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {formatPrice(product.salePrice ?? product.price)}
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
