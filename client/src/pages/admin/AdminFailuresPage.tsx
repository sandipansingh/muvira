import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { Dropdown } from '../../components/ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type {
  CommerceFailureItem,
  CommerceFailureKind,
  DiagnosticSummary,
  RetryJob,
} from '../../types/admin'
import type { ApiPaginatedResponse } from '../../lib/types/common'
import { Pagination } from '../../components/common/Pagination'
import { formatDate } from '../../lib/utils/format'
import { FailureActionDialog } from '../../components/admin/FailureActionDialog'

type CommerceAction = 'reconcile' | 'recheck' | 'release'

const commerceKinds: Array<{ value: CommerceFailureKind; label: string }> = [
  { value: 'outbox', label: 'Outbox events' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'payment_reconciliation', label: 'Payment reconciliation' },
  { value: 'operational_alert', label: 'Operational alerts' },
  { value: 'provider_operation', label: 'Provider operations' },
  { value: 'retained_checkout', label: 'Retained checkouts' },
  { value: 'late_capture_watch', label: 'Late capture watches' },
  { value: 'cancellation_refund', label: 'Cancellation refunds' },
]

function useQueuePage<T>(load: () => Promise<ApiPaginatedResponse<T>>, refresh: number) {
  const [state, setState] = useState<{
    data: T[]
    loading: boolean
    error: string | null
    total: number
    totalPages: number
  }>({ data: [], loading: true, error: null, total: 0, totalPages: 1 })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, data: [], loading: true, error: null }))
    void load()
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        setState({
          data: response.data,
          loading: false,
          error: null,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        })
      })
      .catch((reason) => {
        if (active)
          setState((current) => ({
            ...current,
            loading: false,
            error: reason instanceof Error ? reason.message : 'Queue unavailable.',
          }))
      })
    return () => {
      active = false
    }
  }, [load, refresh, revision])
  return { ...state, reload: () => setRevision((current) => current + 1) }
}

function QueueFooter({
  queue,
  page,
  onPageChange,
}: {
  queue: {
    loading: boolean
    error: string | null
    total: number
    totalPages: number
    reload: () => void
  }
  page: number
  onPageChange: (page: number) => void
}) {
  if (queue.loading)
    return (
      <p role="status" className="panel p-5 text-ink">
        Loading queue…
      </p>
    )
  if (queue.error)
    return (
      <div className="panel space-y-3 p-5">
        <p role="alert" className="text-danger">
          {queue.error}
        </p>
        <button type="button" className="button-secondary" onClick={queue.reload}>
          Reload queue
        </button>
      </div>
    )
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">
        {queue.total} records · Page {page} of {Math.max(queue.totalPages, page)}
      </p>
      <Pagination
        currentPage={page}
        totalPages={Math.max(queue.totalPages, page)}
        onPageChange={onPageChange}
      />
    </div>
  )
}

function readPage(params: URLSearchParams, key: string) {
  const page = Number(params.get(key) ?? 1)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

export const AdminFailuresPage: React.FC = () => {
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()
  const retryStatus = ['dead', 'failed', 'pending'].includes(params.get('retry_status') ?? '')
    ? params.get('retry_status')!
    : 'dead'
  const commerceKind =
    commerceKinds.find((kind) => kind.value === params.get('commerce_kind'))?.value ?? 'outbox'
  const retryPage = readPage(params, 'retry_page')
  const webhookPage = readPage(params, 'webhook_page')
  const notificationPage = readPage(params, 'notification_page')
  const commercePageKey = `commerce_${commerceKind}_page`
  const commercePage = readPage(params, commercePageKey)
  const [refresh, setRefresh] = useState(0)
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const scrollTarget = useRef<string | null>(null)
  const retryQueue = useQueuePage(
    useCallback(
      () => adminApiService.getRetryJobs(retryPage, retryStatus),
      [retryPage, retryStatus]
    ),
    refresh
  )
  const webhookQueue = useQueuePage(
    useCallback(() => adminApiService.getWebhookFailures(webhookPage), [webhookPage]),
    refresh
  )
  const notificationQueue = useQueuePage(
    useCallback(
      () => adminApiService.getNotificationDeliveries(notificationPage, 'failures'),
      [notificationPage]
    ),
    refresh
  )
  const commerceQueue = useQueuePage(
    useCallback(
      () => adminApiService.getCommerceFailures(commercePage, commerceKind),
      [commercePage, commerceKind]
    ),
    refresh
  )
  const retryJobs = retryQueue.data
  const deliveries = notificationQueue.data
  const commerceFailures = commerceQueue.data
  const webhookFailures = webhookQueue.data
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    failure: CommerceFailureItem
    action: CommerceAction
  } | null>(null)

  const loadFailures = () => setRefresh((current) => current + 1)
  const updateQuery = (changes: Record<string, string>, target: string) => {
    scrollTarget.current = target
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) next.set(key, value)
      return next
    })
  }

  useEffect(() => {
    let active = true
    setSummaryError(null)
    void adminApiService
      .getDiagnosticSummary()
      .then((response) => {
        if (!active) return
        if (!response.success) throw new Error(response.error.message)
        setSummary(response.data)
      })
      .catch((reason) => {
        if (active)
          setSummaryError(
            reason instanceof Error ? reason.message : 'Diagnostic summary unavailable.'
          )
      })
    return () => {
      active = false
    }
  }, [refresh])

  useEffect(() => {
    const target = scrollTarget.current
    const waiting =
      target === 'retry-results'
        ? retryQueue.loading
        : target === 'webhook-results'
          ? webhookQueue.loading
          : target === 'notification-results'
            ? notificationQueue.loading
            : commerceQueue.loading
    if (target && !waiting) {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      scrollTarget.current = null
    }
  }, [retryQueue.loading, webhookQueue.loading, notificationQueue.loading, commerceQueue.loading])

  const retryJob = async (job: RetryJob) => {
    setBusyId(job.id)
    try {
      const response = await adminApiService.retryJob(job.id)
      if (!response.success) throw new Error(response.error.message)
      showToast('Retry job requeued.', 'success')
      await loadFailures()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Retry job could not be requeued.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const runCommerceAction = async (
    failure: CommerceFailureItem,
    action: CommerceAction,
    reason: string
  ) => {
    setBusyId(failure.id)
    try {
      const response =
        action === 'reconcile'
          ? await adminApiService.reconcileProviderOperation(failure.id, reason)
          : await adminApiService.resolveRetainedCheckout(
              failure.orderId ?? failure.id,
              action,
              reason
            )
      if (!response.success) throw new Error(response.error.message)
      showToast(`Commerce action ${action} completed.`, 'success')
      setPendingAction(null)
      await loadFailures()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Commerce action failed.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Failures' },
        ]}
      />
      <div>
        <h2 className="heading text-2xl">Failure queues</h2>
        <p className="mt-2 text-ink">
          Actionable retry, payment, invoice, outbox, and email delivery failures.
        </p>
      </div>
      {error && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">{error}</p>}
      <section className="panel space-y-2 p-5" aria-label="Diagnostic summary">
        <h3 className="heading text-xl">Recovery workers</h3>
        {summary && (
          <>
            <p className="text-ink">Worker state: {summary.workerState}</p>
            <p className="text-ink">
              Overdue late capture watches: {summary.overdueLateCaptureWatches}
            </p>
            <p className="text-ink">
              Pending cancellation refunds: {summary.pendingCancellationRefunds}
            </p>
          </>
        )}
        {summaryError && (
          <p role="alert" className="text-danger">
            {summaryError}
          </p>
        )}
        {!summary && !summaryError && <p role="status">Loading diagnostic summary…</p>}
        <button type="button" className="button-secondary" onClick={loadFailures}>
          Refresh diagnostics
        </button>
      </section>
      <section id="retry-results" aria-label="Retry jobs" className="space-y-4 scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="heading text-xl">Retry jobs</h3>
          <Dropdown
            value={retryStatus}
            aria-label="Retry job status"
            onChange={(status) =>
              updateQuery({ retry_status: status, retry_page: '1' }, 'retry-results')
            }
            options={[
              { value: 'dead', label: 'Dead jobs' },
              { value: 'failed', label: 'Failed jobs' },
              { value: 'pending', label: 'Pending jobs' },
            ]}
          />
        </div>
        {retryQueue.loading || retryQueue.error ? null : retryJobs.length === 0 ? (
          <p className="panel p-5 text-sm text-ink">No {retryStatus} retry jobs.</p>
        ) : (
          <div className="space-y-3">
            {retryJobs.map((job) => (
              <article
                key={job.id}
                className="panel flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-semibold text-ink">{job.jobType}</p>
                  <p className="mt-1 text-xs text-muted">
                    {job.referenceId ?? job.id} · attempt {job.retryCount}/{job.maxRetries}
                  </p>
                  {job.lastError && <p className="mt-2 text-sm text-danger">{job.lastError}</p>}
                </div>
                {['dead', 'failed'].includes(job.status) && (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() => void retryJob(job)}
                    className="button-secondary"
                  >
                    Retry
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
        <QueueFooter
          queue={retryQueue}
          page={retryPage}
          onPageChange={(page) => updateQuery({ retry_page: String(page) }, 'retry-results')}
        />
      </section>

      <section id="webhook-results" aria-label="Failed webhooks" className="space-y-4 scroll-mt-6">
        <h3 className="heading text-xl">Failed webhooks</h3>
        {webhookQueue.loading || webhookQueue.error ? null : webhookFailures.length === 0 ? (
          <p className="panel p-5 text-sm text-ink">No failed webhook deliveries.</p>
        ) : (
          <div className="space-y-3">
            {webhookFailures.map((webhook) => (
              <article key={webhook.id} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {webhook.eventType ?? 'Unknown webhook event'}
                  </p>
                  <span className="status-badge">{webhook.source}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {webhook.eventId ?? webhook.id} · retries {webhook.retryCount}
                </p>
                {webhook.lastError && (
                  <p className="mt-2 text-sm text-danger">{webhook.lastError}</p>
                )}
                <p className="mt-2 text-xs text-muted">Updated {formatDate(webhook.updatedAt)}</p>
              </article>
            ))}
          </div>
        )}
        <QueueFooter
          queue={webhookQueue}
          page={webhookPage}
          onPageChange={(page) => updateQuery({ webhook_page: String(page) }, 'webhook-results')}
        />
      </section>

      <section
        id="commerce-results"
        aria-label="Commerce integrity"
        className="space-y-4 scroll-mt-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="heading text-xl">Commerce integrity</h3>
          <Dropdown
            aria-label="Commerce failure kind"
            value={commerceKind}
            onChange={(kind) => updateQuery({ commerce_kind: kind }, 'commerce-results')}
            options={commerceKinds}
          />
        </div>
        {commerceQueue.loading || commerceQueue.error ? null : commerceFailures.length === 0 ? (
          <p className="panel p-5 text-sm text-ink">No unresolved failures in this queue.</p>
        ) : (
          <div className="space-y-3">
            {commerceFailures.map((failure) => (
              <article key={`${failure.kind}-${failure.id}`} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{failure.label}</p>
                  <span className="status-badge">{failure.kind.replaceAll('_', ' ')}</span>
                </div>
                {failure.orderId && (
                  <Link
                    to={`/admin/orders/${failure.orderId}`}
                    className="mt-2 block text-sm text-ink underline hover:text-primary"
                  >
                    Open order
                  </Link>
                )}
                {failure.lastError && (
                  <p className="mt-2 text-sm text-danger">{failure.lastError}</p>
                )}
                {failure.state && (
                  <p className="mt-2 text-xs text-muted">
                    State: {failure.state}
                    {failure.amountPaisa != null
                      ? ` · ${failure.currency ?? 'INR'} ${(failure.amountPaisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : ''}
                  </p>
                )}
                {failure.kind === 'provider_operation' && (
                  <div className="mt-2 space-y-2 text-xs text-muted">
                    <p>
                      Target: {failure.targetType} {failure.target} · Business key:{' '}
                      {failure.businessKey}
                    </p>
                    <p>
                      Attempts: {failure.dispatchAttempts} dispatch /{' '}
                      {failure.reconciliationAttempts} reconcile
                      {failure.localCompletionPending ? ' · Local completion pending' : ''}
                    </p>
                    <button
                      type="button"
                      disabled={busyId === failure.id}
                      onClick={() => setPendingAction({ failure, action: 'reconcile' })}
                      className="button-secondary mt-1"
                    >
                      Reconcile
                    </button>
                  </div>
                )}
                {failure.kind === 'retained_checkout' && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-muted">
                      Deadline {formatDate(failure.deadlineAt)} · Extension {failure.extensionCount}
                      /96 · {failure.escalation} · Last verified{' '}
                      {formatDate(failure.lastVerifiedAt)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === failure.id}
                        onClick={() => setPendingAction({ failure, action: 'recheck' })}
                        className="button-secondary"
                      >
                        Recheck
                      </button>
                      <button
                        type="button"
                        disabled={busyId === failure.id}
                        onClick={() => setPendingAction({ failure, action: 'release' })}
                        className="button-secondary"
                      >
                        Release inventory
                      </button>
                    </div>
                  </div>
                )}
                {failure.kind === 'late_capture_watch' && (
                  <div className="mt-3 space-y-2 text-sm text-ink">
                    <p>
                      Next check:{' '}
                      {failure.nextCheckAt ? formatDate(failure.nextCheckAt) : 'Not scheduled'} ·
                      Checks: {failure.checkAttempts} · Failed checks: {failure.failedChecks}
                    </p>
                    <p>
                      Last check:{' '}
                      {failure.lastCheckedAt ? formatDate(failure.lastCheckedAt) : 'Not checked'}
                    </p>
                    {failure.lastCheckError && (
                      <p className="text-danger">{failure.lastCheckError}</p>
                    )}
                  </div>
                )}
                {failure.kind === 'cancellation_refund' && (
                  <div className="mt-3 space-y-2 text-sm text-ink">
                    <p>Reference: {failure.referenceId ?? failure.id}</p>
                    <p>
                      Next retry:{' '}
                      {failure.nextRetryAt ? formatDate(failure.nextRetryAt) : 'Not scheduled'}
                    </p>
                  </div>
                )}
                <p className="mt-2 text-xs text-muted">Updated {formatDate(failure.updatedAt)}</p>
              </article>
            ))}
          </div>
        )}
        <QueueFooter
          queue={commerceQueue}
          page={commercePage}
          onPageChange={(page) =>
            updateQuery({ [commercePageKey]: String(page) }, 'commerce-results')
          }
        />
      </section>

      <section
        id="notification-results"
        aria-label="Email delivery"
        className="space-y-4 scroll-mt-6"
      >
        <h3 className="heading text-xl">Email delivery</h3>
        {notificationQueue.loading || notificationQueue.error ? null : deliveries.length === 0 ? (
          <p className="panel p-5 text-sm text-ink">
            No failed or stuck email deliveries on this page.
          </p>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <article key={delivery.id} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{delivery.eventType}</p>
                  <span className="status-badge">{delivery.status}</span>
                </div>
                <Link
                  to={`/admin/orders/${delivery.orderId}`}
                  className="mt-2 block text-sm text-ink underline hover:text-primary"
                >
                  Open order
                </Link>
                <p className="mt-2 text-xs text-muted">
                  Attempts: {delivery.attempts}
                  {delivery.providerMessageId ? ` · Provider ID ${delivery.providerMessageId}` : ''}
                </p>
                {delivery.lastError && (
                  <p className="mt-2 text-sm text-danger">{delivery.lastError}</p>
                )}
              </article>
            ))}
          </div>
        )}
        <QueueFooter
          queue={notificationQueue}
          page={notificationPage}
          onPageChange={(page) =>
            updateQuery({ notification_page: String(page) }, 'notification-results')
          }
        />
      </section>
      <FailureActionDialog
        isOpen={pendingAction !== null}
        title={
          pendingAction?.action === 'release'
            ? 'Release retained checkout'
            : pendingAction?.action === 'recheck'
              ? 'Recheck retained checkout'
              : 'Reconcile provider operation'
        }
        description="This action is audited. Describe why you are performing it."
        confirmLabel={pendingAction?.action === 'release' ? 'Release' : 'Reconcile'}
        isSubmitting={pendingAction ? busyId === pendingAction.failure.id : false}
        onClose={() => {
          if (!busyId) setPendingAction(null)
        }}
        onConfirm={(reason) => {
          if (pendingAction) {
            void runCommerceAction(pendingAction.failure, pendingAction.action, reason)
          }
        }}
      />
    </div>
  )
}

export default AdminFailuresPage
