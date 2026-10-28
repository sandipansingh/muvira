import React, { useEffect, useId, useState } from 'react'
import { adminApiService } from '../../lib/services/admin/admin.service'
import { uploadImage } from '../../lib/storage'
import type { Category } from '../../lib/types/category'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { useToast } from '../../context/ToastContext'
import { AdminDialogActions } from './AdminDialog'

export function AdminCategoryEditor({
  category,
  onSaved,
  onClose,
  embedded = false,
  onBusyChange,
}: {
  category: Category
  onSaved: () => Promise<void>
  onClose: () => void
  embedded?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const formId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState(category.imageUrl)
  const { showToast } = useToast()
  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])
  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setBusy(true)
    setError(null)
    setWarning(null)
    let committed = false
    try {
      const file = form.get('image')
      let url = imageUrl
      if (file instanceof File && file.size > 0) {
        url = (await uploadImage(file, 'categories')).url
        setImageUrl(url)
        const input = formElement.elements.namedItem('image')
        if (input instanceof HTMLInputElement) input.value = ''
      }
      const response = await adminApiService.updateCategory(category.id, {
        name: String(form.get('name')).trim(),
        slug: String(form.get('slug')).trim(),
        description: String(form.get('description')),
        imageUrl: url.trim() || null,
        sortOrder: Number(form.get('sortOrder')),
        isActive: form.get('active') === 'on',
        showInNavbar: form.get('navbar') === 'on',
      })
      if (!response.success) throw new Error(response.error.message)
      committed = true
      showToast('Category saved.', 'success')
      await onSaved()
      onClose()
    } catch (reason) {
      if (committed) {
        const detail = reason instanceof Error ? reason.message : 'Catalog refresh failed.'
        const message = `Category saved. ${detail} Refresh the catalog to see the latest changes.`
        setWarning(message)
        showToast(message, 'info')
        return
      }
      setError(
        reason instanceof Error
          ? reason.message
          : 'Category update failed. Any upload is preserved.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={embedded ? 'admin-editor space-y-4' : 'panel space-y-4 p-5'}>
      {!embedded && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="heading text-xl">Edit category</h3>
          <button type="button" className="button-secondary" disabled={busy} onClick={onClose}>
            Close category editor
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
        <fieldset className="contents" disabled={busy}>
          <label>
            Category name
            <Input name="name" required defaultValue={category.name} maxLength={200} />
          </label>
          <label>
            Category slug
            <Input
              name="slug"
              required
              pattern={'[a-z0-9\\-]+'}
              defaultValue={category.slug}
              maxLength={200}
            />
          </label>
          <label className="sm:col-span-2">
            Category description
            <Textarea
              name="description"
              defaultValue={category.description}
              maxLength={2000}
              rows={4}
            />
          </label>
          <label>
            Category image URL
            <Input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
          </label>
          <label>
            Replace category image (up to 8 MiB)
            <Input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
          </label>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={category.name}
              className="h-24 w-24 rounded-lg object-cover sm:col-span-2"
            />
          )}
          <label>
            Category display order
            <Input
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={category.sortOrder}
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={category.isActive ?? true} />
            Category published
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="navbar" defaultChecked={category.showInNavbar ?? false} />
            Show category in navigation
          </label>
          <p className="text-sm text-ink sm:col-span-2">
            Up to five published categories can appear in navigation. Other categories remain
            available in the catalog.
          </p>
          <AdminDialogActions>
            <button type="submit" form={formId} className="button-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save category'}
            </button>
          </AdminDialogActions>
        </fieldset>
      </form>
    </section>
  )
}
