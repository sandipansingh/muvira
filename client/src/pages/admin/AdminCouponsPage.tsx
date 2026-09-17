import React, { useEffect, useRef, useState } from 'react'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        <h2 className="heading text-2xl">Coupons</h2>
        <p className="mt-2 text-ink">
          Create real discount rules and deactivate promotions immediately.
        </p>
      </div>
      {error && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
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

      {loading && <div className="h-40 animate-pulse rounded-3xl bg-surface" />}
      {!loading && coupons.length === 0 && (
        <p className="panel p-6 text-sm text-ink">No coupons found.</p>
      )}
      {!loading && coupons.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
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
                        onClick={() => void editCoupon(coupon)}
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

  async function editCoupon(coupon: Coupon) {
    const rawValue = window.prompt(
      coupon.discountType === 'fixed' ? 'Discount amount in rupees' : 'Discount percentage',
      coupon.discountType === 'fixed'
        ? String(coupon.discountValue / 100)
        : String(coupon.discountValue)
    )
    if (rawValue === null) return
    const value = Number(rawValue)
    if (!Number.isFinite(value) || value <= 0) {
      showToast('Enter a positive discount value.', 'error')
      return
    }

    const rawMinimum = window.prompt(
      'Minimum order amount in rupees',
      String(coupon.minOrderAmount / 100)
    )
    if (rawMinimum === null) return
    const minimum = Number(rawMinimum)
    if (!Number.isFinite(minimum) || minimum < 0) {
      showToast('Enter a valid minimum order amount.', 'error')
      return
    }

    setBusy(true)
    try {
      const response = await adminApiService.updateCoupon(coupon.id, {
        discountValue:
          coupon.discountType === 'fixed' ? Math.round(value * 100) : Math.round(value),
        minOrderAmount: Math.round(minimum * 100),
      })
      if (!response.success) throw new Error(response.error.message)
      showToast(`${coupon.code} updated.`, 'success')
      await loadCoupons()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Coupon could not be updated.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }
}

export default AdminCouponsPage
