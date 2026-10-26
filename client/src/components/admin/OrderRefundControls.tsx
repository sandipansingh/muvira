import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Modal } from '../common/Modal'
import { adminApiService } from '../../lib/services/admin/admin.service'
import { refundIntentStore, type RefundIntent } from '../../lib/services/refundIntent.store'
import type { OrderDetail } from '../../lib/types/order'
import { formatPrice } from '../../lib/utils/format'
import { ApiError } from '../../lib/api/client'

export function OrderRefundControls({
  order,
  refresh,
}: {
  order: OrderDetail
  refresh: () => Promise<void>
}) {
  const { user } = useAuth()
  const [intent, setIntent] = useState<RefundIntent | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState<'refund' | 'cancel' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const balances = order.refundBalances
  const operation =
    intent &&
    order.providerOperations?.find((row) =>
      row.business_key.endsWith(`:${intent.refund_intent_id}`)
    )
  const pendingProvider = order.providerOperations?.some(
    (row) => !row.local_applied_at && row.state !== 'provider_failed'
  )
  const refundable =
    hydrated &&
    !intent &&
    !pendingProvider &&
    !balances?.requires_review &&
    (balances?.refundable_paisa ?? 0) > 0
  const cancellable =
    Boolean(order.shiprocketOrderId) &&
    ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivery_failed'].includes(
      order.status
    ) &&
    !order.providerOperations?.some(
      (row) => row.provider === 'shiprocket' && row.state !== 'provider_failed'
    )

  useEffect(() => {
    let active = true
    setHydrated(false)
    setIntent(null)
    if (!user) return
    void refundIntentStore
      .load(user.id, order.id)
      .then((saved) => {
        if (active) {
          setIntent(saved)
          setHydrated(true)
        }
      })
      .catch((reason) => {
        if (active) setError(reason.message)
      })
    return () => {
      active = false
    }
  }, [user, order.id])

  useEffect(() => {
    if (!user || !intent || !operation?.local_applied_at) return
    let active = true
    void refundIntentStore
      .acknowledge(user.id, order.id, intent.refund_intent_id)
      .then(() => {
        if (active) setIntent(null)
      })
      .catch((reason) => {
        if (active) setError(reason.message)
      })
    return () => {
      active = false
    }
  }, [user, order.id, intent, operation])

  const submitRefund = async () => {
    if (!user) return
    setBusy(true)
    setError(null)
    setConfirmation(null)
    let submitted = intent
    try {
      const saved =
        intent ??
        (await refundIntentStore.claim(user.id, order.id, {
          amount_paisa: Math.round(Number(amount) * 100),
          reason: reason.trim(),
        }))
      if (!saved) throw new Error('Refund intent could not be saved.')
      setIntent(saved)
      submitted = saved
      const result =
        operation && operation.state !== 'prepared'
          ? await adminApiService.reconcileProviderOperation(operation.id, saved.reason)
          : await adminApiService.refundOrder(order.id, saved, user.id)
      if (!result.success) throw new Error(result.error.message)
      await refresh()
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === 'REFUND_INTENT_REJECTED' && submitted) {
        await refundIntentStore.acknowledge(user.id, order.id, submitted.refund_intent_id)
        setIntent(null)
      }
      setError(
        reason instanceof Error
          ? reason.message
          : 'Refund outcome is uncertain. Recover the saved intent.'
      )
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    setBusy(true)
    setError(null)
    setConfirmation(null)
    try {
      const result = await adminApiService.cancelShiprocketOrder(order.id, reason.trim())
      if (!result.success) throw new Error(result.error.message)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Cancellation needs reconciliation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel space-y-4 p-5">
      <h3 className="heading text-xl">Refunds and cancellation</h3>
      {balances && (
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          {[
            ['Captured', balances.captured_paisa],
            ['Refunded', balances.refunded_paisa],
            ['Reserved / pending', balances.reserved_paisa],
            ['Available to refund', balances.refundable_paisa],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted">{label}</dt>
              <dd>{formatPrice(Number(value))}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-sm text-ink">
        Cancellation and refund are separate stages. The remaining balance is refunded after
        Shiprocket confirms cancellation and any earlier refund is reconciled.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {intent ? (
        <div className="space-y-2">
          <p>
            Saved refund: {formatPrice(intent.amount_paisa)} · {intent.reason} ·{' '}
            {operation?.local_applied_at
              ? 'Completed'
              : (operation?.state.replaceAll('_', ' ') ?? 'Outcome not confirmed')}
          </p>
          <button
            type="button"
            disabled={
              busy || operation?.state === 'provider_failed' || operation?.state === 'manual_review'
            }
            onClick={() => void submitRefund()}
            className="button-secondary"
          >
            Recover saved refund
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            Refund amount ₹
            <input
              aria-label="Refund amount ₹"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-paper p-3 text-base"
            />
          </label>
          <button
            type="button"
            disabled={!refundable || busy}
            onClick={() => setAmount(String((balances?.refundable_paisa ?? 0) / 100))}
            className="text-primary"
          >
            Use remaining balance
          </button>
          <label className="block text-sm">
            Required reason
            <textarea
              aria-label="Refund or cancellation reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={3}
              maxLength={1000}
              className="mt-1 w-full rounded-xl border border-line bg-paper p-3 text-base"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                busy ||
                !refundable ||
                reason.trim().length < 3 ||
                !Number.isFinite(Number(amount)) ||
                Number(amount) <= 0 ||
                Math.round(Number(amount) * 100) > (balances?.refundable_paisa ?? 0)
              }
              onClick={() => setConfirmation('refund')}
              className="button-primary"
            >
              Review refund
            </button>
            <button
              type="button"
              disabled={busy || !cancellable || reason.trim().length < 3}
              onClick={() => setConfirmation('cancel')}
              className="button-secondary"
            >
              Review cancellation
            </button>
          </div>
        </div>
      )}
      {order.providerOperations?.map((row) => (
        <p key={row.id} className="text-sm">
          {row.operation_type.replaceAll('_', ' ')}:{' '}
          {row.local_applied_at ? 'Completed' : row.state.replaceAll('_', ' ')}
          {row.amount_paisa ? ` · ${formatPrice(row.amount_paisa)}` : ''}
        </p>
      ))}
      <Link className="text-sm text-primary underline" to="/admin/failures">
        View provider diagnostics
      </Link>
      <Modal
        isOpen={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title={confirmation === 'refund' ? 'Confirm refund' : 'Confirm cancellation'}
      >
        <div className="space-y-4 p-6">
          <p>
            {confirmation === 'refund'
              ? `Refund ${formatPrice(Math.round(Number(amount) * 100))}?`
              : 'Request cancellation and refund the remaining balance after confirmation?'}
          </p>
          <p>{reason}</p>
          <button
            type="button"
            className="button-primary"
            disabled={busy}
            onClick={() => void (confirmation === 'refund' ? submitRefund() : cancel())}
          >
            Confirm {confirmation}
          </button>
        </div>
      </Modal>
    </section>
  )
}
