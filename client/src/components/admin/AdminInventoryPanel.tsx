import React, { useEffect, useRef, useState } from 'react'
import { Pagination } from '../common/Pagination'
import { Dropdown } from '../ui/Dropdown'
import { AdminResultCount, AdminState, AdminStatus, AdminTable } from './AdminWorkspace'
import { useAdminList } from '../../lib/hooks/useAdminList'
import { adminApiService } from '../../lib/services/admin/admin.service'
import { useToast } from '../../context/ToastContext'
import type { Category } from '../../lib/types/category'
import type { InventoryItem } from '../../lib/types/dashboard'

export function AdminInventoryPanel({ categories }: { categories: Category[] }) {
  const { page, params, update, changePage, resultsRef, scrollToResults, revision, reload } =
    useAdminList('inventory_page')
  const lowStock = params.get('low_stock_only') === 'true'
  const category = params.get('inventory_category') || ''
  const [items, setItems] = useState<InventoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const pending = useRef(false)
  const { showToast } = useToast()
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void adminApiService
      .getInventory(page, 20, lowStock, category || undefined)
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        if (page > Math.max(1, response.pagination.totalPages)) {
          update({ inventory_page: Math.max(1, response.pagination.totalPages) }, true)
          return
        }
        setItems(response.data)
        setTotal(response.pagination.total)
        setTotalPages(response.pagination.totalPages)
        scrollToResults()
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Inventory is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, lowStock, category, revision, scrollToResults, update])

  async function saveStock(event: React.FormEvent<HTMLFormElement>, item: InventoryItem) {
    event.preventDefault()
    if (pending.current) return
    const value = Number(new FormData(event.currentTarget).get('stock'))
    if (!Number.isSafeInteger(value) || value < 0) {
      setSaveError('Enter a whole stock quantity of zero or more.')
      return
    }
    pending.current = true
    setBusyId(item.productId)
    setSaveError(null)
    try {
      const response = await adminApiService.updateStock(item.productId, value)
      if (!response.success) throw new Error(response.error.message)
      showToast(`Stock updated for ${item.productName}.`, 'success')
      reload()
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : 'Stock could not be saved. Your entered quantity is preserved.'
      )
    } finally {
      pending.current = false
      setBusyId(null)
    }
  }

  return (
    <div ref={resultsRef} className="space-y-5 scroll-mt-6">
      <div className="admin-filter-toolbar">
        <Dropdown
          label="Category"
          aria-label="Inventory category"
          value={category}
          options={[
            { value: '', label: 'All categories' },
            ...categories.map((item) => ({ value: item.id, label: item.name })),
          ]}
          onChange={(value) => update({ inventory_category: value, inventory_page: 1 })}
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={lowStock}
            onChange={(event) =>
              update({
                low_stock_only: event.target.checked ? 'true' : undefined,
                inventory_page: 1,
              })
            }
          />
          Low stock only
        </label>
        <p className="ml-auto text-xs text-muted">Low stock: 10 units or fewer</p>
      </div>
      <p className="text-sm text-muted">
        Set the current stock quantity, then save. Hidden products are included.
      </p>
      {saveError && (
        <p role="alert" className="rounded-control bg-danger-soft p-4 text-sm text-danger">
          {saveError}
        </p>
      )}
      {loading ? (
        <AdminState loading />
      ) : error ? (
        <AdminState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <AdminState title="No inventory matches these filters">
          Change the category or low-stock filter.
        </AdminState>
      ) : (
        <AdminTable
          label="Inventory"
          headers={['Product', 'SKU', 'Availability', 'Current quantity']}
        >
          {items.map((item) => (
            <tr key={item.productId}>
              <td className="font-semibold">{item.productName}</td>
              <td className="text-muted">{item.sku || 'No SKU'}</td>
              <td>
                <AdminStatus
                  status={
                    item.stock === 0 ? 'Out of stock' : item.isLowStock ? 'Low stock' : 'Available'
                  }
                />
              </td>
              <td>
                <form
                  key={`${item.productId}:${item.stock}`}
                  onSubmit={(event) => void saveStock(event, item)}
                  className="flex items-center gap-2"
                >
                  <input
                    aria-label={`${item.productName} stock`}
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={item.stock}
                    disabled={busyId !== null}
                    className="w-24 rounded-control border border-field-border px-3 py-2"
                  />
                  <button
                    type="submit"
                    className="button-secondary"
                    disabled={busyId !== null}
                    aria-busy={busyId === item.productId}
                  >
                    Save
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
      {!loading && !error && (
        <div className="admin-list-footer">
          <AdminResultCount page={page} total={total} count={items.length} noun="products" />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={changePage} />
        </div>
      )}
    </div>
  )
}
