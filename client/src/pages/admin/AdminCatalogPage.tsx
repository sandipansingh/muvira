import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import {
  AdminPageHeader,
  AdminSearch,
  AdminState,
  AdminStatus,
  AdminTable,
  AdminResultCount,
} from '../../components/admin/AdminWorkspace'
import { AdminDialog } from '../../components/admin/AdminDialog'
import { AdminInventoryPanel } from '../../components/admin/AdminInventoryPanel'
import { useAdminList } from '../../lib/hooks/useAdminList'
import { StoreImage } from '../../components/common/StoreImage'
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
import type { AdminCategoryInput } from '../../types/admin'
import type { Category } from '../../lib/types/category'
import type { ProductDetail } from '../../lib/types/product'
import { formatPrice } from '../../lib/utils/format'
import { slugify } from '../../lib/utils/slug'

interface CategoryCreationAttempt {
  input: AdminCategoryInput
  fingerprint: string | null
}

async function categoryCreationExists(attempt: CategoryCreationAttempt) {
  const existing = await adminApiService.getCategoriesList()
  if (!existing.success)
    throw new Error('Check the saved categories before retrying. The uploaded image is preserved.')
  const category = existing.data.find((item) => item.slug === attempt.input.slug)
  if (!category) return false
  if (
    category.name !== attempt.input.name ||
    category.imageUrl !== (attempt.input.imageUrl ?? '')
  ) {
    throw new Error(
      'A category with this slug already exists. Edit the saved category before retrying.'
    )
  }
  return true
}

export const AdminCatalogPage: React.FC = () => {
  const { showToast } = useToast()
  const [products, setProducts] = useState<ProductDetail[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const { page, params, update, changePage, resultsRef, scrollToResults, revision } = useAdminList()
  const tab =
    params.get('tab') === 'categories'
      ? 'categories'
      : params.get('tab') === 'inventory'
        ? 'inventory'
        : 'products'
  const query = params.get('q') || ''
  const categoryFilter = params.get('category') || ''
  const [search, setSearch] = useState(query)
  const [createMode, setCreateMode] = useState<'product' | 'category' | null>(null)
  const [total, setTotal] = useState(0)
  const [editorRevision, setEditorRevision] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [pendingImages, setPendingImages] = useState(pendingProductImages)
  const loadId = useRef(0)
  const categoryUploadRef = useRef<{
    fingerprint: string
    image: Awaited<ReturnType<typeof uploadImage>>
  } | null>(null)
  const categoryAttemptRef = useRef<CategoryCreationAttempt | null>(null)
  const [categoryRecovery, setCategoryRecovery] = useState<CategoryCreationAttempt | null>(null)
  const rememberCategoryAttempt = (attempt: CategoryCreationAttempt | null) => {
    categoryAttemptRef.current = attempt
    setCategoryRecovery(attempt)
  }

  const loadCatalog = useCallback(async () => {
    const request = ++loadId.current
    setLoading(true)
    setError(null)
    try {
      const categoryResponse = await adminApiService.getCategoriesList()
      if (request !== loadId.current) return
      if (!categoryResponse.success) throw new Error(categoryResponse.error.message)
      setCategories(categoryResponse.data)
      setCategoryId((current) => current || categoryResponse.data[0]?.id || '')
      if (
        tab === 'categories' &&
        page > Math.max(1, Math.ceil(categoryResponse.data.length / 20))
      ) {
        update({ page: Math.max(1, Math.ceil(categoryResponse.data.length / 20)) }, true)
        return
      }
      if (tab === 'products') {
        const productResponse = await adminApiService.getProducts({
          page,
          limit: 20,
          q: query || undefined,
          category: categoryFilter || undefined,
        })
        if (request !== loadId.current) return
        if (!productResponse.success) throw new Error(productResponse.error.message)
        if (page > Math.max(1, productResponse.pagination.totalPages)) {
          update({ page: Math.max(1, productResponse.pagination.totalPages) }, true)
          return
        }
        setProducts(productResponse.data)
        setTotal(productResponse.pagination.total)
        setTotalPages(productResponse.pagination.totalPages)
      }
      scrollToResults()
    } catch (reason) {
      if (request === loadId.current)
        setError(reason instanceof Error ? reason.message : 'Catalog data is unavailable.')
    } finally {
      if (request === loadId.current) setLoading(false)
    }
  }, [page, query, categoryFilter, tab, scrollToResults, update])

  useEffect(() => {
    void loadCatalog()
    return () => {
      loadId.current += 1
    }
  }, [loadCatalog, revision])
  useEffect(() => {
    setSearch(query)
  }, [query])

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
    if (busy) return
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
      setCreateMode(null)
      showToast('Product created.', 'success')
      await loadCatalog()
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'Product could not be created.'
      const message = createdId
        ? `Product saved. ${detail} Edit the saved product to manage its images.`
        : detail
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const createCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const image = form.get('image')
    let uploaded: Awaited<ReturnType<typeof uploadImage>> | null = null
    setBusy(true)
    try {
      const name = String(form.get('name') ?? '').trim()
      const slug = slugify(name)
      const fingerprint =
        image instanceof File && image.size > 0
          ? `${image.name}:${image.size}:${image.lastModified}:${image.type}`
          : null
      const previous = categoryAttemptRef.current
      if (previous) {
        const sameInput =
          previous.input.name === name &&
          previous.input.showInNavbar === (form.get('navbar') === 'on') &&
          previous.fingerprint === fingerprint
        if (await categoryCreationExists(previous)) {
          rememberCategoryAttempt(null)
          categoryUploadRef.current = null
          if (sameInput) {
            formElement.reset()
            setCreateMode(null)
            showToast('Category creation verified.', 'success')
            await loadCatalog()
            return
          }
        } else if (!sameInput) {
          throw new Error(
            'The earlier category creation still needs checking. Close this form and use Check and retry category creation before starting another attempt.'
          )
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
      const input: AdminCategoryInput = {
        name,
        slug,
        imageUrl: uploaded?.url,
        isActive: true,
        showInNavbar: form.get('navbar') === 'on',
      }
      rememberCategoryAttempt({ input, fingerprint })
      const response = await adminApiService.createCategory(input)
      if (!response.success) throw new Error(response.error.message)
      rememberCategoryAttempt(null)
      categoryUploadRef.current = null
      formElement.reset()
      setCreateMode(null)
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

  const retryCategoryCreation = async () => {
    const attempt = categoryAttemptRef.current
    if (!attempt || busy) return
    setBusy(true)
    setError(null)
    try {
      if (!(await categoryCreationExists(attempt))) {
        const response = await adminApiService.createCategory(attempt.input)
        if (!response.success) throw new Error(response.error.message)
      }
      rememberCategoryAttempt(null)
      categoryUploadRef.current = null
      showToast('Category creation verified.', 'success')
      await loadCatalog()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Category creation could not be verified. Its details are preserved.'
      )
    } finally {
      setBusy(false)
    }
  }

  const categoryPage = Math.min(page, Math.max(1, Math.ceil(categories.length / 20)))
  const searchProducts = (value: string) => {
    setSearch(value)
    update({ q: value.trim(), page: 1 })
  }
  const savedEditor = async () => {
    setEditorRevision((value) => value + 1)
    await loadCatalog()
  }
  return (
    <div ref={resultsRef} className="space-y-6 scroll-mt-6">
      <AdminPageHeader
        title="Catalog"
        description="Manage your products, categories and stock in one place."
        actions={
          tab !== 'inventory' && (
            <button
              type="button"
              className="button-primary"
              disabled={loading || busy || Boolean(error)}
              onClick={() => setCreateMode(tab === 'categories' ? 'category' : 'product')}
            >
              <Plus className="h-4 w-4" />
              {tab === 'categories' ? 'Add category' : 'Add product'}
            </button>
          )
        }
      />
      <div role="tablist" aria-label="Catalog sections" className="admin-tabs">
        {(['products', 'categories', 'inventory'] as const).map((value) => (
          <button
            key={value}
            id={`catalog-tab-${value}`}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls="catalog-panel"
            tabIndex={tab === value ? 0 : -1}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault()
                const tabs = ['products', 'categories', 'inventory']
                const index =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 2
                      : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3
                const next = tabs[index]!
                update({ tab: next, page: 1 })
                document.getElementById(`catalog-tab-${next}`)?.focus()
              }
            }}
            onClick={() => update({ tab: value, page: 1 })}
          >
            {value[0]!.toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      {error && !createMode && <AdminState error={error} onRetry={() => void loadCatalog()} />}
      {categoryRecovery && (
        <section className="panel space-y-3 p-5" aria-label="Category creation to check">
          <h2 className="heading">Category creation to check</h2>
          <p className="text-sm">
            An earlier attempt for <strong>{categoryRecovery.input.name}</strong> needs
            verification. Saved categories are checked before this attempt is retried.
          </p>
          {categoryRecovery.input.imageUrl && (
            <a
              href={categoryRecovery.input.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-primary"
            >
              View preserved category image
            </a>
          )}
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => void retryCategoryCreation()}
          >
            Check and retry category creation
          </button>
        </section>
      )}
      {pendingImages.length > 0 && (
        <section className="panel space-y-3 p-5" aria-label="Preserved image uploads">
          <h2 className="heading">Image attachments to check</h2>
          <p className="text-sm text-muted">
            Uploaded files are preserved. Check their attachment before uploading again.
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
      <div
        id="catalog-panel"
        role="tabpanel"
        aria-labelledby={`catalog-tab-${tab}`}
        className="space-y-5"
      >
        {tab === 'products' && (
          <>
            <div className="admin-filter-toolbar">
              <AdminSearch
                label="Search products"
                value={search}
                onChange={setSearch}
                onSearch={() => searchProducts(search)}
                clearLabel="Clear product search"
                onClear={() => searchProducts('')}
              />
              <Dropdown
                label="Category"
                aria-label="Filter product category"
                value={categoryFilter}
                options={[
                  { value: '', label: 'All categories' },
                  ...categories.map((category) => ({ value: category.id, label: category.name })),
                ]}
                onChange={(value) => update({ category: value, page: 1 })}
              />
            </div>
            {loading ? (
              <AdminState loading />
            ) : (
              !error &&
              (products.length === 0 ? (
                <AdminState title="No products found">
                  Try another search or category, or add your first product.
                </AdminState>
              ) : (
                <AdminTable
                  label="Products"
                  headers={[
                    'Product',
                    'Category',
                    'Price',
                    'Stock',
                    'Visibility',
                    'Featured',
                    'Actions',
                  ]}
                >
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-product-cell">
                          {product.images[0]?.url ? (
                            <StoreImage
                              src={product.images[0].url}
                              alt=""
                              className="admin-product-image"
                              loading="lazy"
                            />
                          ) : (
                            <span className="admin-product-image flex items-center justify-center text-xs text-muted">
                              No image
                            </span>
                          )}
                          <div>
                            <span className="admin-product-name" title={product.name}>
                              {product.name}
                            </span>
                            <span className="admin-product-meta">{product.sku || 'No SKU'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted">{product.category.name}</td>
                      <td className="admin-number">{formatPrice(product.price)}</td>
                      <td>
                        <span className="block font-semibold tabular-nums">{product.stock}</span>
                        {product.stock <= 10 && (
                          <span className="admin-product-meta">
                            {product.stock === 0 ? 'Out of stock' : 'Low stock'}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`${product.isActive ? 'Hide' : 'Publish'} ${product.name}`}
                          onClick={() =>
                            void runProductUpdate(
                              () =>
                                adminApiService.updateProduct(product.id, {
                                  isActive: !product.isActive,
                                }),
                              product.isActive ? 'Product hidden.' : 'Product published.'
                            )
                          }
                          className="min-h-11"
                        >
                          <AdminStatus status={product.isActive ? 'Published' : 'Hidden'} />
                        </button>
                      </td>
                      <td>
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
                          className="button-secondary"
                        >
                          {product.isFeatured ? 'Featured' : 'Standard'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={busy}
                          className="button-secondary"
                          aria-label={`Edit product ${product.name}`}
                          onClick={() => setEditingProduct(product)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit product
                        </button>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              ))
            )}
            {!loading && !error && (
              <div className="admin-list-footer">
                <AdminResultCount
                  page={page}
                  total={total}
                  count={products.length}
                  noun="products"
                />
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={changePage} />
              </div>
            )}
          </>
        )}
        {tab === 'categories' &&
          (loading ? (
            <AdminState loading />
          ) : (
            !error && (
              <>
                {categories.length === 0 ? (
                  <AdminState title="No categories yet">
                    Add a category to organize your products.
                  </AdminState>
                ) : (
                  <AdminTable
                    label="Categories"
                    headers={['Category', 'Storefront navigation', 'Visibility', 'Actions']}
                  >
                    {categories
                      .slice((categoryPage - 1) * 20, categoryPage * 20)
                      .map((category) => (
                        <tr key={category.id}>
                          <td>
                            <span className="font-semibold">{category.name}</span>
                            <span className="admin-product-meta">/{category.slug}</span>
                          </td>
                          <td>
                            {category.showInNavbar ? 'Shown in navigation' : 'Not in navigation'}
                          </td>
                          <td>
                            <AdminStatus status={category.isActive ? 'Active' : 'Hidden'} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="button-secondary"
                              disabled={busy}
                              aria-label={`Edit category ${category.name}`}
                              onClick={() => setEditingCategory(category)}
                            >
                              Edit category
                            </button>
                          </td>
                        </tr>
                      ))}
                  </AdminTable>
                )}
                <div className="admin-list-footer">
                  <AdminResultCount
                    page={categoryPage}
                    total={categories.length}
                    count={categories.slice((categoryPage - 1) * 20, categoryPage * 20).length}
                    noun="categories"
                  />
                  <Pagination
                    currentPage={categoryPage}
                    totalPages={Math.ceil(categories.length / 20)}
                    onPageChange={changePage}
                  />
                </div>
              </>
            )
          ))}
        {tab === 'inventory' && <AdminInventoryPanel categories={categories} />}
      </div>
      {createMode && (
        <AdminDialog
          title={createMode === 'product' ? 'Add product' : 'Add category'}
          onClose={() => setCreateMode(null)}
          busy={busy}
          wide
        >
          {error && (
            <p role="alert" className="mb-4 text-danger">
              {error}
            </p>
          )}
          {createMode === 'product' ? (
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
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
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
          ) : (
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
            </form>
          )}
        </AdminDialog>
      )}
      {editingProduct && (
        <AdminDialog title="Edit product" onClose={() => setEditingProduct(null)} busy={busy} wide>
          <AdminProductEditor
            embedded
            onBusyChange={setBusy}
            key={editingProduct.id}
            product={editingProduct}
            categories={categories}
            onSaved={savedEditor}
            onClose={() => setEditingProduct(null)}
          />
        </AdminDialog>
      )}
      {editingCategory && (
        <AdminDialog
          title="Edit category"
          onClose={() => setEditingCategory(null)}
          busy={busy}
          revision={editorRevision}
        >
          <AdminCategoryEditor
            embedded
            onBusyChange={setBusy}
            key={editingCategory.id}
            category={editingCategory}
            onSaved={savedEditor}
            onClose={() => setEditingCategory(null)}
          />
        </AdminDialog>
      )}
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
