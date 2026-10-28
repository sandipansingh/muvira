import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  AdminPageHeader,
  AdminResultCount,
  AdminState,
  AdminStatus,
} from '../../components/admin/AdminWorkspace'
import { AdminDialog, AdminDialogActions } from '../../components/admin/AdminDialog'
import { useAdminList } from '../../lib/hooks/useAdminList'
import { Pagination } from '../../components/common/Pagination'
import { Dropdown } from '../../components/ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { Coupon } from '../../lib/types/coupon'
import { formatDate, formatPrice } from '../../lib/utils/format'

export const AdminCouponsPage: React.FC = () => {
  const { showToast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [discountType, setDiscountType] = useState('percentage')
  const { page, update, changePage, resultsRef, scrollToResults } = useAdminList()
  const [creating, setCreating] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const requestId = useRef(0)

  const loadCoupons = useCallback(async () => {
    const request = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const response = await adminApiService.getCoupons({ page, limit: 20 })
      if (request !== requestId.current) return
      if (!response.success) throw new Error(response.error.message)
      if (page > Math.max(1, response.pagination.totalPages)) {
        update({ page: Math.max(1, response.pagination.totalPages) }, true)
        return
      }
      setTotal(response.pagination.total)
      setCoupons(response.data)
      setTotalPages(response.pagination.totalPages)
      scrollToResults()
    } catch (reason) {
      if (request === requestId.current)
        setError(reason instanceof Error ? reason.message : 'Coupons are unavailable.')
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [page, update, scrollToResults])

  useEffect(() => {
    void loadCoupons()
    return () => {
      requestId.current += 1
    }
  }, [loadCoupons])

  const createCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const normalizedDiscountType = discountType === 'fixed' ? 'fixed' : 'percentage'
    setBusy(true)
    try {
      const value = Number(form.get('value'))
      const minimumRupees = Number(form.get('minimum'))
      const response = await adminApiService.createCoupon({
        code: String(form.get('code') ?? '').trim(),
        description: String(form.get('description') ?? '').trim() || undefined,
        discountType: normalizedDiscountType,
        discountValue:
          normalizedDiscountType === 'fixed' ? Math.round(value * 100) : Math.round(value),
        minOrderAmountPaisa: Math.round(minimumRupees * 100),
        maxUses: Number(form.get('usageLimit')) || undefined,
        isActive: true,
      })
      if (!response.success) throw new Error(response.error.message)
      formElement.reset()
      setCreating(false)
      showToast('Coupon created.', 'success')
      await loadCoupons()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Coupon could not be created.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={resultsRef} className="space-y-8 scroll-mt-6">
      <AdminPageHeader
        title="Coupons"
        description="Manage discounts, usage limits and active promotions."
        actions={
          <button
            type="button"
            className="button-primary"
            onClick={() => setCreating(true)}
            disabled={loading || busy}
          >
            <Plus className="h-4 w-4" />
            Add coupon
          </button>
        }
      />
      {error && <AdminState error={error} onRetry={() => void loadCoupons()} />}
      {creating && (
        <AdminDialog title="Add coupon" onClose={() => setCreating(false)} busy={busy} wide>
          {error && (
            <p role="alert" className="mb-4 text-danger">
              {error}
            </p>
          )}{' '}
          <form
            id="admin-create-coupon-form"
            onSubmit={createCoupon}
            className="grid gap-4 sm:grid-cols-2"
          >
            <h3 className="heading text-xl lg:col-span-3">New coupon</h3>
            <label className="block space-y-2 text-sm text-ink">
              <span>Coupon code</span>
              <input
                name="code"
                required
                minLength={3}
                placeholder="Coupon code"
                className="w-full rounded-xl border border-line px-4 py-2 text-base uppercase"
              />
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>Description</span>
              <input
                name="description"
                placeholder="Description"
                className="w-full rounded-xl border border-line px-4 py-2 text-base"
              />
            </label>
            <Dropdown
              label="Discount type"
              value={discountType}
              onChange={setDiscountType}
              options={[
                { value: 'percentage', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed rupees' },
              ]}
            />
            <label className="block space-y-2 text-sm text-ink">
              <span>{discountType === 'fixed' ? 'Discount amount ₹' : 'Discount percentage'}</span>
              <input
                name="value"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder={discountType === 'fixed' ? 'Discount ₹' : 'Discount %'}
                className="w-full rounded-xl border border-line px-4 py-2 text-base"
              />
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>Minimum order amount ₹</span>
              <input
                name="minimum"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                required
                placeholder="Minimum order ₹"
                className="w-full rounded-xl border border-line px-4 py-2 text-base"
              />
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>Usage limit (optional)</span>
              <input
                name="usageLimit"
                type="number"
                min="1"
                step="1"
                placeholder="Usage limit (optional)"
                className="w-full rounded-xl border border-line px-4 py-2 text-base"
              />
            </label>
            <AdminDialogActions>
              <button
                type="submit"
                form="admin-create-coupon-form"
                disabled={busy}
                className="button-primary"
              >
                Create coupon
              </button>
            </AdminDialogActions>
          </form>
        </AdminDialog>
      )}

      {loading && <AdminState loading />}
      {!loading && !error && coupons.length === 0 && (
        <AdminState title="No coupons yet">Add a coupon to create your first promotion.</AdminState>
      )}
      {!loading && !error && coupons.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-paper">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface text-ink">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Minimum</th>
                <th className="px-4 py-3">Valid until</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {coupon.code}
                    <span className="block text-xs font-normal text-muted">
                      Used {coupon.timesUsed}
                      {coupon.usageLimit ? ` of ${coupon.usageLimit}` : ' times'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {coupon.discountType === 'fixed'
                      ? formatPrice(coupon.discountValue)
                      : `${coupon.discountValue}%`}
                  </td>
                  <td className="px-4 py-3 text-ink">{formatPrice(coupon.minOrderAmount)}</td>
                  <td className="px-4 py-3 text-muted">
                    {coupon.validUntil ? formatDate(coupon.validUntil) : 'No expiry'}
                  </td>
                  <td>
                    <AdminStatus status={coupon.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditError(null)
                          setEditingCoupon(coupon)
                        }}
                        className="button-secondary px-3 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleActive(coupon)}
                        className="button-secondary px-3 py-1 text-xs"
                      >
                        {coupon.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && (
        <div className="admin-list-footer">
          <AdminResultCount page={page} total={total} count={coupons.length} noun="coupons" />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={changePage} />
        </div>
      )}
      {editingCoupon && (
        <AdminDialog
          cancelLabel="Cancel"
          busy={busy}
          onClose={() => setEditingCoupon(null)}
          title={`Edit ${editingCoupon.code}`}
        >
          {editingCoupon && (
            <form
              id="admin-edit-coupon-form"
              key={editingCoupon.id}
              onSubmit={saveCoupon}
              className="space-y-5"
            >
              <label className="block space-y-2 text-sm">
                <span>
                  {editingCoupon.discountType === 'fixed'
                    ? 'Discount amount ₹'
                    : 'Discount percentage'}
                </span>
                <input
                  data-dialog-initial-focus
                  name="discount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={
                    editingCoupon.discountType === 'fixed'
                      ? editingCoupon.discountValue / 100
                      : editingCoupon.discountValue
                  }
                  className="w-full rounded-control border border-line bg-paper p-3 text-base"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span>Minimum order amount ₹</span>
                <input
                  name="minimum"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={editingCoupon.minOrderAmount / 100}
                  className="w-full rounded-control border border-line bg-paper p-3 text-base"
                />
              </label>
              {editError && (
                <p role="alert" className="text-sm text-danger">
                  {editError}
                </p>
              )}
              <AdminDialogActions>
                <button
                  type="submit"
                  form="admin-edit-coupon-form"
                  disabled={busy}
                  className="button-primary"
                >
                  {busy ? 'Saving…' : 'Save coupon'}
                </button>
              </AdminDialogActions>
            </form>
          )}
        </AdminDialog>
      )}
    </div>
  )

  async function toggleActive(coupon: Coupon) {
    setBusy(true)
    try {
      const response = coupon.isActive
        ? await adminApiService.deactivateCoupon(coupon.id)
        : await adminApiService.updateCoupon(coupon.id, { isActive: true })
      if (!response.success) throw new Error(response.error.message)
      showToast(`${coupon.code} ${coupon.isActive ? 'deactivated' : 'reactivated'}.`, 'success')
      await loadCoupons()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Coupon could not be deactivated.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function saveCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const coupon = editingCoupon
    if (!coupon || busy) return
    const form = new FormData(event.currentTarget)
    const value = Number(form.get('discount'))
    if (!Number.isFinite(value) || value <= 0) {
      setEditError('Enter a positive discount value.')
      return
    }

    const minimum = Number(form.get('minimum'))
    if (!Number.isFinite(minimum) || minimum < 0) {
      setEditError('Enter a valid minimum order amount.')
      return
    }

    setBusy(true)
    setEditError(null)
    try {
      const response = await adminApiService.updateCoupon(coupon.id, {
        discountValue:
          coupon.discountType === 'fixed' ? Math.round(value * 100) : Math.round(value),
        minOrderAmount: Math.round(minimum * 100),
      })
      if (!response.success) throw new Error(response.error.message)
      showToast(`${coupon.code} updated.`, 'success')
      setEditingCoupon(null)
      await loadCoupons()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Coupon could not be updated.'
      setEditError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }
}

export default AdminCouponsPage
