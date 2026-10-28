import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AdminPageHeader, AdminStatus, AdminTable } from '../../components/admin/AdminWorkspace'
import { Dropdown } from '../../components/ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type {
  CommerceFailureItem,
  CommerceFailureKind,
  DiagnosticSummary,
  NotificationDeliverySummary,
  RetryJob,
  WebhookFailureItem,
} from '../../types/admin'
import type { ApiPaginatedResponse } from '../../lib/types/common'
import { Pagination } from '../../components/common/Pagination'
import { formatDate, formatPrice } from '../../lib/utils/format'
import { FailureActionDialog } from '../../components/admin/FailureActionDialog'
import { Modal } from '../../components/common/Modal'
import './AdminSettingsRecovery.css'

type CommerceAction = 'reconcile' | 'recheck' | 'release'
type RecoveryQueue = 'retry' | 'webhooks' | 'commerce' | 'email'
type RecoveryDetail =
  | { queue: 'retry'; item: RetryJob }
  | { queue: 'webhooks'; item: WebhookFailureItem }
  | { queue: 'commerce'; item: CommerceFailureItem }
  | { queue: 'email'; item: NotificationDeliverySummary }

interface RecoveryRow {
  detail: RecoveryDetail
  label: string
  reference: string
  status: string
  attempts?: string
  timestamp: string
  error: string | null
}

const recoveryQueues: Array<{ value: RecoveryQueue; label: string }> = [
  { value: 'retry', label: 'Retry jobs' },
  { value: 'webhooks', label: 'Webhook failures' },
  { value: 'commerce', label: 'Commerce integrity' },
  { value: 'email', label: 'Email delivery' },
]

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
    loadedBy: typeof load | null
    refresh: number
    revision: number
  }>({
    data: [],
    loading: true,
    error: null,
    total: 0,
    totalPages: 1,
    loadedBy: null,
    refresh: -1,
    revision: -1,
  })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setState((current) => ({
      ...current,
      data: [],
      loading: true,
      error: null,
      loadedBy: load,
      refresh,
      revision,
    }))
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
          loadedBy: load,
          refresh,
          revision,
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
  return {
    ...state,
    loading:
      state.loading ||
      state.loadedBy !== load ||
      state.refresh !== refresh ||
      state.revision !== revision,
    reload: () => setRevision((current) => current + 1),
  }
}

function QueueFooter({
  queue,
  page,
  onPageChange,
  scope,
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
  scope: string
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
    <div className="admin-recovery-pagination">
      <p className="text-sm text-ink">
        {queue.total.toLocaleString('en-IN')} {scope} · Page {page} of {queue.totalPages}
      </p>
      <Pagination currentPage={page} totalPages={queue.totalPages} onPageChange={onPageChange} />
    </div>
  )
}

function readPage(params: URLSearchParams, key: string) {
  const page = Number(params.get(key) ?? 1)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

function readQueue(params: URLSearchParams, hash: string): RecoveryQueue {
  const selected = recoveryQueues.find((queue) => queue.value === params.get('queue'))
  if (selected) return selected.value
  const legacyQueues: Record<string, RecoveryQueue> = {
    '#retry-results': 'retry',
    '#webhook-results': 'webhooks',
    '#commerce-results': 'commerce',
    '#notification-results': 'email',
  }
  return legacyQueues[hash] ?? (params.has('commerce_kind') ? 'commerce' : 'retry')
}

function DetailFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function CommerceDetails({ failure }: { failure: CommerceFailureItem }) {
  return (
    <>
      <dl className="admin-recovery-facts">
        <DetailFact label="Kind">{failure.kind.replaceAll('_', ' ')}</DetailFact>
        <DetailFact label="Reference">{failure.id}</DetailFact>
        {failure.orderId && <DetailFact label="Order">{failure.orderId}</DetailFact>}
        {failure.state && (
          <DetailFact label="State">
            <AdminStatus status={failure.state} />
          </DetailFact>
        )}
        {failure.amountPaisa != null && (
          <DetailFact label="Amount">
            {!failure.currency || failure.currency === 'INR'
              ? formatPrice(failure.amountPaisa)
              : `${failure.currency} ${(failure.amountPaisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </DetailFact>
        )}
        <DetailFact label="Updated">{formatDate(failure.updatedAt)}</DetailFact>
      </dl>
      {failure.kind === 'provider_operation' && (
        <section className="admin-recovery-detail-section">
          <h3>Provider operation</h3>
          <dl className="admin-recovery-facts">
            <DetailFact label="Provider">{failure.provider}</DetailFact>
            <DetailFact label="Operation">{failure.operationType.replaceAll('_', ' ')}</DetailFact>
            <DetailFact label="Provider status">
              {failure.providerStatus ?? 'Not available'}
            </DetailFact>
            <DetailFact label="Target">
              {failure.targetType} {failure.target}
            </DetailFact>
            <DetailFact label="Business key">{failure.businessKey}</DetailFact>
            <DetailFact label="Attempts">
              {failure.dispatchAttempts} dispatch / {failure.reconciliationAttempts} reconcile
            </DetailFact>
          </dl>
          {failure.localCompletionPending && (
            <p className="text-warning">Local completion pending</p>
          )}
        </section>
      )}
      {failure.kind === 'retained_checkout' && (
        <section className="admin-recovery-detail-section">
          <h3>Retained checkout</h3>
          <dl className="admin-recovery-facts">
            <DetailFact label="Deadline">{formatDate(failure.deadlineAt)}</DetailFact>
            <DetailFact label="Extensions">{failure.extensionCount}/96</DetailFact>
            <DetailFact label="Escalation">{failure.escalation}</DetailFact>
            <DetailFact label="Last verified">{formatDate(failure.lastVerifiedAt)}</DetailFact>
            <DetailFact label="Provider status">{failure.providerStatus}</DetailFact>
          </dl>
        </section>
      )}
      {failure.kind === 'late_capture_watch' && (
        <section className="admin-recovery-detail-section">
          <h3>Late capture schedule</h3>
          <dl className="admin-recovery-facts">
            <DetailFact label="Provider target">{failure.target}</DetailFact>
            <DetailFact label="Next check">
              {failure.nextCheckAt ? formatDate(failure.nextCheckAt) : 'Not scheduled'}
            </DetailFact>
            <DetailFact label="Last check">
              {failure.lastCheckedAt ? formatDate(failure.lastCheckedAt) : 'Not checked'}
            </DetailFact>
          </dl>
          <p>
            Checks: {failure.checkAttempts} · Failed checks: {failure.failedChecks}
          </p>
          {failure.lastCheckError && <p className="text-danger">{failure.lastCheckError}</p>}
        </section>
      )}
      {failure.kind === 'cancellation_refund' && (
        <dl className="admin-recovery-facts">
          <DetailFact label="Retry reference">{failure.referenceId ?? failure.id}</DetailFact>
          <DetailFact label="Next retry">
            {failure.nextRetryAt ? formatDate(failure.nextRetryAt) : 'Not scheduled'}
          </DetailFact>
        </dl>
      )}
    </>
  )
}

function RecoveryDetails({ detail }: { detail: RecoveryDetail }) {
  const item = detail.item
  return (
    <div className="admin-recovery-detail">
      {item.lastError && (
        <section className="admin-recovery-error">
          <h3>Last reported issue</h3>
          <p>{item.lastError}</p>
        </section>
      )}
      {detail.queue === 'commerce' ? (
        <CommerceDetails failure={detail.item} />
      ) : (
        <dl className="admin-recovery-facts">
          <DetailFact label="Reference">{detail.item.id}</DetailFact>
          {detail.queue === 'retry' && (
            <>
              <DetailFact label="Job reference">
                {detail.item.referenceId ?? 'Not available'}
              </DetailFact>
              <DetailFact label="Status">
                <AdminStatus status={detail.item.status} />
              </DetailFact>
              <DetailFact label="Attempts">
                {detail.item.retryCount}/{detail.item.maxRetries}
              </DetailFact>
              <DetailFact label="Next retry">
                {detail.item.nextRetryAt ? formatDate(detail.item.nextRetryAt) : 'Not scheduled'}
              </DetailFact>
              <DetailFact label="Created">{formatDate(detail.item.createdAt)}</DetailFact>
            </>
          )}
          {detail.queue === 'webhooks' && (
            <>
              <DetailFact label="Source">{detail.item.source}</DetailFact>
              <DetailFact label="Event ID">{detail.item.eventId ?? 'Not available'}</DetailFact>
              <DetailFact label="Retries">{detail.item.retryCount}</DetailFact>
              <DetailFact label="Updated">{formatDate(detail.item.updatedAt)}</DetailFact>
            </>
          )}
          {detail.queue === 'email' && (
            <>
              <DetailFact label="Order">{detail.item.orderId}</DetailFact>
              <DetailFact label="Status">
                <AdminStatus status={detail.item.status} />
              </DetailFact>
              <DetailFact label="Attempts">{detail.item.attempts}</DetailFact>
              <DetailFact label="Provider ID">
                {detail.item.providerMessageId ?? 'Not available'}
              </DetailFact>
              <DetailFact label="Available">
                {detail.item.availableAt ? formatDate(detail.item.availableAt) : 'Not scheduled'}
              </DetailFact>
              <DetailFact label="Sent">
                {detail.item.sentAt ? formatDate(detail.item.sentAt) : 'Not sent'}
              </DetailFact>
              <DetailFact label="Created">{formatDate(detail.item.createdAt)}</DetailFact>
            </>
          )}
        </dl>
      )}
    </div>
  )
}

export const AdminFailuresPage: React.FC = () => {
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const activeQueue = readQueue(params, location.hash)
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
  const [summaryLoading, setSummaryLoading] = useState(true)
  const scrollTarget = useRef<RecoveryQueue | null>(null)
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
  const [selected, setSelected] = useState<RecoveryDetail | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    failure: CommerceFailureItem
    action: CommerceAction
  } | null>(null)

  const queues = {
    retry: retryQueue,
    webhooks: webhookQueue,
    commerce: commerceQueue,
    email: notificationQueue,
  }
  const pages = {
    retry: retryPage,
    webhooks: webhookPage,
    commerce: commercePage,
    email: notificationPage,
  }
  const pageKeys = {
    retry: 'retry_page',
    webhooks: 'webhook_page',
    commerce: commercePageKey,
    email: 'notification_page',
  }
  const scopes = {
    retry: `${retryStatus} retry jobs`,
    webhooks: 'failed webhooks',
    commerce: (
      commerceKinds.find((kind) => kind.value === commerceKind)?.label ?? 'Outbox events'
    ).toLowerCase(),
    email: 'failed or stuck emails',
  }
  const queue = queues[activeQueue]
  const queueLabel = recoveryQueues.find((entry) => entry.value === activeQueue)!.label
  const page = pages[activeQueue]
  const pageKey = pageKeys[activeQueue]
  const loadFailures = () => setRefresh((current) => current + 1)
  const queryFor = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) next.set(key, value)
    return next
  }
  const updateQuery = (changes: Record<string, string>) => {
    scrollTarget.current = activeQueue
    setParams(queryFor({ queue: activeQueue, ...changes }))
  }

  useEffect(() => {
    setSelected(null)
    setPendingAction(null)
    setActionError(null)
  }, [location.key])

  useEffect(() => {
    let active = true
    setSummaryLoading(true)
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
      .finally(() => {
        if (active) setSummaryLoading(false)
      })
    return () => {
      active = false
    }
  }, [refresh])

  useEffect(() => {
    if (queue.loading) return
    if (scrollTarget.current === activeQueue) {
      document.getElementById('recovery-results')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
      scrollTarget.current = null
    }
    if (!queue.error && page > queue.totalPages) {
      const next = new URLSearchParams(params)
      next.set(pageKey, String(queue.totalPages))
      setParams(next, { replace: true })
    }
  }, [activeQueue, queue.loading, queue.error, queue.totalPages, page, params, setParams, pageKey])

  const retryJob = async (job: RetryJob) => {
    if (busyId) return
    setBusyId(job.id)
    setActionError(null)
    try {
      const response = await adminApiService.retryJob(job.id)
      if (!response.success) throw new Error(response.error.message)
      showToast('Retry job requeued.', 'success')
      setSelected(null)
      loadFailures()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Retry job could not be requeued.'
      setActionError(message)
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
    if (busyId) return
    setBusyId(failure.id)
    setActionError(null)
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
      setSelected(null)
      loadFailures()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Commerce action failed.'
      setActionError(message)
      showToast(message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const rows: RecoveryRow[] =
    activeQueue === 'retry'
      ? retryQueue.data.map((item) => ({
          detail: { queue: 'retry', item },
          label: item.jobType,
          reference: item.referenceId ?? item.id,
          status: item.status,
          attempts: `${item.retryCount}/${item.maxRetries}`,
          timestamp: item.createdAt,
          error: item.lastError,
        }))
      : activeQueue === 'webhooks'
        ? webhookQueue.data.map((item) => ({
            detail: { queue: 'webhooks', item },
            label: item.eventType ?? 'Unknown webhook event',
            reference: item.eventId ?? item.id,
            status: item.source,
            attempts: String(item.retryCount),
            timestamp: item.updatedAt,
            error: item.lastError,
          }))
        : activeQueue === 'commerce'
          ? commerceQueue.data.map((item) => ({
              detail: { queue: 'commerce', item },
              label: item.label,
              reference: item.orderId ?? item.id,
              status: item.state ?? item.kind.replaceAll('_', ' '),
              timestamp: item.updatedAt,
              error: item.lastError,
            }))
          : notificationQueue.data.map((item) => ({
              detail: { queue: 'email', item },
              label: item.eventType,
              reference: item.orderId,
              status: item.status,
              attempts: String(item.attempts),
              timestamp: item.createdAt,
              error: item.lastError,
            }))
  const detailTitle =
    selected?.queue === 'retry'
      ? selected.item.jobType
      : selected?.queue === 'commerce'
        ? selected.item.label
        : selected?.queue === 'webhooks'
          ? (selected.item.eventType ?? 'Unknown webhook event')
          : selected?.item.eventType
  const selectedOrderId =
    selected?.queue === 'commerce' || selected?.queue === 'email' ? selected.item.orderId : null

  return (
    <div className="space-y-6 admin-recovery-page">
      <AdminPageHeader
        title="Issues & recovery"
        description="Review failed work, check uncertain provider outcomes and retry supported operations."
        actions={
          <button type="button" className="button-secondary" onClick={loadFailures}>
            Refresh diagnostics
          </button>
        }
      />
      <section
        className="admin-recovery-summary"
        aria-label="Diagnostic summary"
        aria-busy={summaryLoading}
      >
        <dl>
          <div>
            <dt>Worker state</dt>
            <dd>
              {summaryLoading ? 'Loading…' : summaryError ? 'Unavailable' : summary?.workerState}
            </dd>
          </div>
          <div>
            <dt>Overdue late capture watches</dt>
            <dd>
              {summaryLoading || summaryError
                ? '—'
                : summary?.overdueLateCaptureWatches.toLocaleString('en-IN')}
            </dd>
          </div>
          <div>
            <dt>Pending cancellation refunds</dt>
            <dd>
              {summaryLoading || summaryError
                ? '—'
                : summary?.pendingCancellationRefunds.toLocaleString('en-IN')}
            </dd>
          </div>
        </dl>
        {summaryError && (
          <p role="alert" className="text-sm text-danger">
            {summaryError} Use Refresh diagnostics to try again.
          </p>
        )}
      </section>
      <nav className="admin-recovery-nav" aria-label="Recovery queues">
        {recoveryQueues.map((entry) => {
          const state = queues[entry.value]
          return (
            <Link
              key={entry.value}
              to={`?${queryFor({ queue: entry.value })}`}
              aria-current={activeQueue === entry.value ? 'page' : undefined}
              onClick={() => {
                scrollTarget.current = entry.value
              }}
            >
              <span>{entry.label}</span>
              <small>
                {state.loading
                  ? 'Loading…'
                  : state.error
                    ? 'Queue unavailable'
                    : `${state.total.toLocaleString('en-IN')} ${scopes[entry.value]}`}
              </small>
            </Link>
          )
        })}
      </nav>
      <section
        id="recovery-results"
        data-recovery-results
        aria-label={queueLabel}
        className="admin-recovery-results"
      >
        <div className="admin-recovery-results-heading">
          <div>
            <h2>{queueLabel}</h2>
            <p>{scopes[activeQueue].charAt(0).toUpperCase() + scopes[activeQueue].slice(1)}</p>
          </div>
          {activeQueue === 'retry' && (
            <Dropdown
              value={retryStatus}
              aria-label="Retry job status"
              onChange={(status) => updateQuery({ retry_status: status, retry_page: '1' })}
              options={[
                { value: 'dead', label: 'Dead jobs' },
                { value: 'failed', label: 'Failed jobs' },
                { value: 'pending', label: 'Pending jobs' },
              ]}
            />
          )}
          {activeQueue === 'commerce' && (
            <Dropdown
              value={commerceKind}
              aria-label="Commerce failure kind"
              onChange={(kind) => updateQuery({ commerce_kind: kind })}
              options={commerceKinds}
            />
          )}
        </div>
        {!queue.loading &&
          !queue.error &&
          (rows.length === 0 ? (
            <p className="admin-recovery-empty">No {scopes[activeQueue]}.</p>
          ) : (
            <AdminTable
              label={`${queueLabel} records`}
              headers={[
                'Issue & reference',
                activeQueue === 'webhooks' ? 'Source' : 'Status',
                ...(activeQueue === 'commerce' ? [] : ['Attempts']),
                activeQueue === 'retry' || activeQueue === 'email' ? 'Created' : 'Updated',
                'Details',
              ]}
            >
              {rows.map((row) => (
                <tr key={row.detail.item.id}>
                  <td>
                    <p className="admin-recovery-row-title">{row.label}</p>
                    <p className="admin-recovery-row-reference">{row.reference}</p>
                    {row.error && <p className="admin-recovery-row-error">{row.error}</p>}
                  </td>
                  <td>
                    <AdminStatus status={row.status} />
                  </td>
                  {activeQueue !== 'commerce' && <td>{row.attempts}</td>}
                  <td className="admin-recovery-timestamp">{formatDate(row.timestamp)}</td>
                  <td>
                    <button
                      type="button"
                      className="button-secondary"
                      aria-label={`View details for ${row.label}`}
                      onClick={() => {
                        setSelected(row.detail)
                        setActionError(null)
                      }}
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </AdminTable>
          ))}
        <QueueFooter
          queue={queue}
          page={page}
          scope={scopes[activeQueue]}
          onPageChange={(next) => updateQuery({ [pageKeys[activeQueue]]: String(next) })}
        />
      </section>
      <Modal
        isOpen={selected !== null}
        onClose={() => {
          if (!busyId && !pendingAction) setSelected(null)
        }}
        title={detailTitle}
        presentation="drawer"
        maxWidth="lg"
        footer={
          selected && (
            <div className="admin-recovery-drawer-footer">
              {selectedOrderId && (
                <Link to={`/admin/orders/${selectedOrderId}`} className="button-secondary">
                  Open order
                </Link>
              )}
              <div className="admin-recovery-drawer-actions">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={!!busyId}
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
                {selected.queue === 'retry' &&
                  ['dead', 'failed'].includes(selected.item.status) && (
                    <button
                      type="button"
                      className="button-primary"
                      disabled={!!busyId}
                      aria-busy={!!busyId}
                      onClick={() => {
                        if (selected.queue === 'retry') void retryJob(selected.item)
                      }}
                    >
                      {busyId ? 'Retrying…' : 'Retry'}
                    </button>
                  )}
                {selected.queue === 'commerce' && selected.item.kind === 'provider_operation' && (
                  <button
                    type="button"
                    className="button-primary"
                    disabled={!!busyId}
                    onClick={() => {
                      if (selected.queue === 'commerce')
                        setPendingAction({ failure: selected.item, action: 'reconcile' })
                    }}
                  >
                    Reconcile
                  </button>
                )}
                {selected.queue === 'commerce' && selected.item.kind === 'retained_checkout' && (
                  <>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={!!busyId}
                      onClick={() => {
                        if (selected.queue === 'commerce')
                          setPendingAction({ failure: selected.item, action: 'recheck' })
                      }}
                    >
                      Recheck
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={!!busyId}
                      onClick={() => {
                        if (selected.queue === 'commerce')
                          setPendingAction({ failure: selected.item, action: 'release' })
                      }}
                    >
                      Release inventory
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        }
      >
        {selected && <RecoveryDetails detail={selected} />}
        {actionError && (
          <p role="alert" className="mt-4 rounded-control bg-danger-soft p-3 text-sm text-danger">
            {actionError}
          </p>
        )}
      </Modal>
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
        error={actionError}
        confirmLabel={
          pendingAction?.action === 'release'
            ? 'Release'
            : pendingAction?.action === 'recheck'
              ? 'Recheck'
              : 'Reconcile'
        }
        isSubmitting={pendingAction ? busyId === pendingAction.failure.id : false}
        onClose={() => {
          if (!busyId) setPendingAction(null)
        }}
        onConfirm={(reason) => {
          if (pendingAction)
            void runCommerceAction(pendingAction.failure, pendingAction.action, reason)
        }}
      />
    </div>
  )
}

export default AdminFailuresPage
