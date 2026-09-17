import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { Dropdown } from '../../components/ui/Dropdown'
import { useToast } from '../../context/ToastContext'
import { adminApiService } from '../../lib/services/admin/admin.service'
import type {
  CommerceFailureItem,
  NotificationDeliverySummary,
  RetryJob,
  WebhookFailureItem,
} from '../../types/admin'
import { formatDate } from '../../lib/utils/format'

export const AdminFailuresPage: React.FC = () => {
  const { showToast } = useToast()
  const [retryStatus, setRetryStatus] = useState('dead')
  const [retryJobs, setRetryJobs] = useState<RetryJob[]>([])
  const [deliveries, setDeliveries] = useState<NotificationDeliverySummary[]>([])
  const [commerceFailures, setCommerceFailures] = useState<CommerceFailureItem[]>([])
  const [webhookFailures, setWebhookFailures] = useState<WebhookFailureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadFailures = async () => {
    setLoading(true)
    setError(null)
    try {
      const [jobsResponse, deliveriesResponse, commerceResponse, webhooksResponse] =
        await Promise.all([
          adminApiService.getRetryJobs(1, retryStatus),
          adminApiService.getNotificationDeliveries(1),
          adminApiService.getCommerceFailures(),
          adminApiService.getWebhookFailures(1),
        ])
      if (!jobsResponse.success) throw new Error(jobsResponse.error.message)
      if (!deliveriesResponse.success) throw new Error(deliveriesResponse.error.message)
      if (!commerceResponse.success) throw new Error(commerceResponse.error.message)
      if (!webhooksResponse.success) throw new Error(webhooksResponse.error.message)
      setRetryJobs(jobsResponse.data)
      setDeliveries(
        deliveriesResponse.data.filter((delivery) =>
          ['failed', 'dead', 'processing'].includes(delivery.status)
        )
      )
      setCommerceFailures(commerceResponse.data)
      setWebhookFailures(webhooksResponse.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failure queues are unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFailures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryStatus])

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
      {loading && <div className="h-48 animate-pulse rounded-3xl bg-surface" />}

      {!loading && (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="heading text-xl">Retry jobs</h3>
              <Dropdown
                value={retryStatus}
                onChange={setRetryStatus}
                options={[
                  { value: 'dead', label: 'Dead jobs' },
                  { value: 'failed', label: 'Failed jobs' },
                  { value: 'pending', label: 'Pending jobs' },
                ]}
              />
            </div>
            {retryJobs.length === 0 ? (
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
          </section>

          <section className="space-y-4">
            <h3 className="heading text-xl">Failed webhooks</h3>
            {webhookFailures.length === 0 ? (
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
                    <p className="mt-2 text-xs text-muted">
                      Updated {formatDate(webhook.updatedAt)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="heading text-xl">Commerce integrity</h3>
            {commerceFailures.length === 0 ? (
              <p className="panel p-5 text-sm text-ink">
                No unresolved payment, invoice, or outbox failures.
              </p>
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
                    <p className="mt-2 text-xs text-muted">
                      Updated {formatDate(failure.updatedAt)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="heading text-xl">Email delivery</h3>
            {deliveries.length === 0 ? (
              <p className="panel p-5 text-sm text-ink">
                No failed or stuck email deliveries in the latest page.
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
                      {delivery.providerMessageId
                        ? ` · Provider ID ${delivery.providerMessageId}`
                        : ''}
                    </p>
                    {delivery.lastError && (
                      <p className="mt-2 text-sm text-danger">{delivery.lastError}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default AdminFailuresPage
