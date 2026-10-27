import React, { useEffect, useRef, useState } from 'react'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { Pagination } from '../../components/common/Pagination'
import { Modal } from '../../components/common/Modal'
import { Dropdown } from '../../components/ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type { Coupon } from '../../lib/types/coupon'
import { formatDate, formatPrice } from '../../lib/utils/format'

export const AdminCouponsPage: React.FC = () => {
  const { showToast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [discountType, setDiscountType] = useState('percentage')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(false)

  const loadCoupons = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await adminApiService.getCoupons({ page, limit: 20 })
      if (!response.success) throw new Error(response.error.message)
      setCoupons(response.data)
      setTotalPages(response.pagination.totalPages)
      if (shouldScrollRef.current) {
        resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        shouldScrollRef.current = false
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Coupons are unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCoupons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const createCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
    <div ref={resultsContainerRef} className="space-y-8 scroll-mt-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Coupons' },
        ]}
      />
      <div>
        <h1 className="admin-page-title">Coupons</h1>
        <p className="mt-2 text-ink">
          Create real discount rules and deactivate promotions immediately.
        </p>
      </div>
      {error && <p className="rounded-card bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      <form onSubmit={createCoupon} className="panel grid gap-4 p-5 lg:grid-cols-3">
        <h3 className="heading text-xl lg:col-span-3">New coupon</h3>
        <input
          name="code"
          required
          minLength={3}
          placeholder="Coupon code"
          className="rounded-xl border border-line px-4 py-2 text-base uppercase"
        />
        <input
          name="description"
          placeholder="Description"
          className="rounded-xl border border-line px-4 py-2 text-base"
        />
        <Dropdown
          value={discountType}
          onChange={setDiscountType}
          options={[
            { value: 'percentage', label: 'Percentage' },
            { value: 'fixed', label: 'Fixed rupees' },
          ]}
        />
        <input
          name="value"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder={discountType === 'fixed' ? 'Discount ₹' : 'Discount %'}
          className="rounded-xl border border-line px-4 py-2 text-base"
        />
        <input
          name="minimum"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
          required
          placeholder="Minimum order ₹"
          className="rounded-xl border border-line px-4 py-2 text-base"
        />
        <input
          name="usageLimit"
          type="number"
          min="1"
          step="1"
          placeholder="Usage limit (optional)"
          className="rounded-xl border border-line px-4 py-2 text-base"
        />
        <button type="submit" disabled={busy} className="button-primary lg:col-span-3 lg:w-fit">
          Create coupon
        </button>
      </form>

      {loading && <div className="h-40 animate-pulse rounded-card bg-surface" />}
      {!loading && coupons.length === 0 && (
        <p className="panel p-6 text-sm text-ink">No coupons found.</p>
      )}
      {!loading && coupons.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-paper">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface text-ink">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Minimum</th>
                <th className="px-4 py-3">Valid until</th>
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
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(nextPage) => {
          shouldScrollRef.current = true
          setPage(nextPage)
        }}
      />
      <Modal
        isOpen={editingCoupon !== null}
        onClose={() => {
          if (!busy) setEditingCoupon(null)
        }}
        title={editingCoupon ? `Edit ${editingCoupon.code}` : 'Edit coupon'}
      >
        {editingCoupon && (
          <form key={editingCoupon.id} onSubmit={saveCoupon} className="space-y-5">
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
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy} className="button-primary">
                {busy ? 'Saving…' : 'Save coupon'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditingCoupon(null)}
                className="button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
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
