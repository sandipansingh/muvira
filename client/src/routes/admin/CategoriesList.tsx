import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApiService } from '../../lib/api/admin'
import type { Category } from '../../types/category'
import { useToast } from '../../hooks/useToast'
import Card, { CardContent } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Dialog from '../../components/ui/Dialog'
import Skeleton from '../../components/ui/Skeleton'
import ErrorState from '../../components/shared/ErrorState'
import Pagination from '../../components/ui/Pagination'
import { Plus, Pencil, EyeOff, Eye, Upload } from 'lucide-react'
import { uploadImage } from '../../lib/storage'
import { slugify } from '../../lib/slug'

export const CategoriesList: React.FC = () => {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sync inputs with URL params
  const page = parseInt(searchParams.get('page') || '1', 10)

  // Modal Dialog states
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [showInNavbar, setShowInNavbar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await adminApiService.getCategories({ page, limit: 20 })
    if (res.success) {
      setCategories(res.data)
      setPagination(res.pagination)
    } else {
      setError(res.error.message || 'Failed to fetch categories.')
    }
    setLoading(false)
  }, [page])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const updateParam = (key: string, value: string) => {
    const updated = new URLSearchParams(searchParams)
    if (value === '') {
      updated.delete(key)
    } else {
      updated.set(key, value)
    }
    setSearchParams(updated)
  }

  const handleOpenAdd = () => {
    setEditId(null)
    setName('')
    setSlug('')
    setSlugTouched(false)
    setDescription('')
    setImageUrl('')
    setSortOrder(categories.length.toString())
    setIsActive(true)
    setShowInNavbar(false)
    setModalOpen(true)
  }

  const handleOpenEdit = (cat: Category) => {
    setEditId(cat.id)
    setName(cat.name)
    setSlug(cat.slug || '')
    setSlugTouched(true)
    setDescription(cat.description)
    setImageUrl(cat.imageUrl)
    setSortOrder(cat.sortOrder.toString())
    setIsActive(cat.isActive ?? true)
    setShowInNavbar(cat.showInNavbar ?? false)
    setModalOpen(true)
  }

  // Upload category tile image from device
  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadImage(file, 'categories')
      setImageUrl(result.url)
      showToast('Image uploaded', 'success')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    // Ensure we always have a valid slug for create (and allow updating on edit)
    const finalSlug = (slug || slugify(name)).trim()

    if (!name || !finalSlug || !description || !imageUrl) {
      showToast('Please fill in all mandatory fields.', 'error')
      return
    }

    setSaving(true)
    let res
    const payload = {
      name,
      slug: finalSlug,
      description,
      imageUrl,
      sortOrder: parseInt(sortOrder, 10),
      isActive,
      showInNavbar,
    }

    if (editId) {
      res = await adminApiService.updateCategory(editId, payload)
    } else {
      res = await adminApiService.createCategory(payload)
    }
    setSaving(false)

    if (res.success) {
      showToast(editId ? 'Category updated' : 'Category created', 'success')
      setModalOpen(false)
      fetchCategories()
    } else {
      showToast(res.error.message || 'Operation failed', 'error')
    }
  }

  const handleToggleActive = async (cat: Category) => {
    const currentlyActive = cat.isActive !== false
    const action = currentlyActive ? 'deactivate' : 'activate'
    if (!confirm(`Are you sure you want to ${action} category "${cat.name}"?`)) return

    let res
    if (currentlyActive) {
      res = await adminApiService.deleteCategory(cat.id)
    } else {
      res = await adminApiService.updateCategory(cat.id, { isActive: true })
    }
    if (res.success) {
      showToast(`Category "${cat.name}" ${action}d.`, 'success')
      fetchCategories()
    } else {
      showToast(res.error.message || `Failed to ${action} category.`, 'error')
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor">
            Category Management
          </h2>
          <p className="text-xs text-secondary500 tracking-wide mt-1">
            Configure collections, image tiles, description tags, and sort orders.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenAdd}
          className="text-xs md:text-sm py-2 px-4 flex items-center gap-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* TABLE */}
      <Card className="border border-secondary200 shadow-sm">
        <CardContent className="p-0">
          {error ? (
            <ErrorState message={error} onRetry={fetchCategories} />
          ) : loading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-xs md:text-sm text-secondary500">
              No categories found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tile</TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Slug Url</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Navbar</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div className="w-12 h-12 bg-lightgrayColor border border-secondary200 rounded overflow-hidden shrink-0">
                          <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-darkColor leading-none">{cat.name}</p>
                        <p className="text-[10px] text-secondary500 truncate max-w-[200px] mt-1.5 leading-snug">
                          {cat.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs font-normal text-secondary600">
                        {cat.slug}
                      </TableCell>
                      <TableCell className="font-medium text-secondary700">
                        {cat.sortOrder}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cat.isActive !== false ? 'success' : 'neutral'}>
                          {cat.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cat.showInNavbar ? 'success' : 'neutral'}>
                          {cat.showInNavbar ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-3.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="text-secondary500 hover:text-darkColor p-1 transition-colors focus:outline-none"
                            title="Edit Category"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(cat)}
                            className="text-secondary500 hover:text-darkColor p-1 transition-colors focus:outline-none"
                            title={cat.isActive !== false ? 'Deactivate' : 'Activate'}
                          >
                            {cat.isActive !== false ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={(pageVal) => updateParam('page', pageVal.toString())}
      />

      {/* DIALOG FOR CREATE/EDIT */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Category' : 'Create Category'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name *"
            value={name}
            onChange={(e) => {
              const val = e.target.value.slice(0, 200)
              setName(val)
              if (!editId && !slugTouched) {
                setSlug(slugify(val).slice(0, 200))
              }
            }}
            placeholder="E.g. Solid Wood Furniture"
            required
            maxLength={200}
          />

          <Input
            label="Slug *"
            value={slug}
            onChange={(e) => {
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, 200)
              )
              if (!editId) setSlugTouched(true)
            }}
            placeholder="solid-wood-furniture"
            required
            maxLength={200}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-secondary700">
                Category Tile Image *
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-secondary300 hover:bg-lightgrayColor text-secondary700">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCategoryImageUpload}
                  disabled={uploading || saving}
                  className="hidden"
                />
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Upload from device'}
              </label>
            </div>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... (or upload above)"
              required
            />
            {imageUrl && (
              <div className="w-16 h-16 mt-1 rounded border border-secondary200 overflow-hidden bg-lightgrayColor">
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <Input
            label="Sort Order Value *"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
            required
          />

          <Textarea
            label="Collection Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief tagline description..."
            rows={3}
            required
            maxLength={2000}
          />

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-primaryBg"
            />
            <span className="text-xs font-semibold text-secondary600">Category is Active</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={showInNavbar}
              onChange={(e) => setShowInNavbar(e.target.checked)}
              className="w-4 h-4 accent-primaryBg"
            />
            <span className="text-xs font-semibold text-secondary600">
              Show in Navbar (Maximum 5)
            </span>
          </label>

          <Button
            type="submit"
            loading={saving || uploading}
            disabled={uploading}
            className="w-full py-2.5"
          >
            {editId ? 'Save Changes' : 'Create Category Collection'}
          </Button>
        </form>
      </Dialog>
    </div>
  )
}

export default CategoriesList
