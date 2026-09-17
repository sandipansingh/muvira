const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const { createClient } = require('../server/node_modules/@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_TEST_URL
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const shouldRun = Boolean(supabaseUrl && serviceRoleKey)

function serviceClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

test(
  'database fencing rejects an in-flight stale worker after concurrent reclaim',
  { skip: !shouldRun },
  async (context) => {
    const workerA = serviceClient()
    const workerB = serviceClient()
    const suffix = crypto.randomUUID()
    const raceResource = `race-${suffix}`
    const claimResource = `claim-${suffix}`
    const guardedResource = `guarded-${suffix}`
    const webhookResource = `webhook-${suffix}`
    const staleReference = `stale-${suffix}`
    const currentReference = `current-${suffix}`
    const guardedReference = `guarded-stale-${suffix}`
    const webhookReference = `webhook-stale-${suffix}`
    const webhookId = crypto.randomUUID()
    let retryJobId

    context.after(async () => {
      await workerA
        .from('operational_alerts')
        .delete()
        .in('reference_id', [staleReference, currentReference, guardedReference, webhookReference])
      await workerA
        .from('operation_leases')
        .delete()
        .in('resource_id', [raceResource, claimResource, guardedResource, webhookResource])
      if (retryJobId) await workerA.from('retry_jobs').delete().eq('id', retryJobId)
      await workerA.from('webhook_events').delete().eq('id', webhookId)
    })

    const simultaneousClaims = await Promise.all([
      workerA.rpc('claim_operation_lease', {
        p_scope: 'integration_test',
        p_resource_id: claimResource,
        p_lease_seconds: 30,
      }),
      workerB.rpc('claim_operation_lease', {
        p_scope: 'integration_test',
        p_resource_id: claimResource,
        p_lease_seconds: 30,
      }),
    ])
    assert.equal(
      simultaneousClaims.filter((result) => !result.error && result.data?.length === 1).length,
      1
    )

    const firstClaim = await workerA.rpc('claim_operation_lease', {
      p_scope: 'integration_test',
      p_resource_id: raceResource,
      p_lease_seconds: 30,
    })
    assert.ifError(firstClaim.error)
    assert.equal(firstClaim.data.length, 1)
    const leaseA = firstClaim.data[0]

    const handlerStarted = deferred()
    const allowStaleWrite = deferred()
    const staleHandler = (async () => {
      handlerStarted.resolve()
      await allowStaleWrite.promise
      return workerA.rpc('persist_operational_alert_fenced', {
        p_execution_scope: 'integration_test',
        p_execution_resource_id: raceResource,
        p_execution_owner_token: leaseA.owner_token,
        p_execution_fencing_token: leaseA.fencing_token,
        p_alert_type: 'fencing_integration_stale',
        p_severity: 'critical',
        p_source: 'integration_test',
        p_reference_id: staleReference,
        p_message: 'A stale worker must not persist this alert',
        p_details: {},
        p_order_id: null,
        p_webhook_event_id: null,
      })
    })()

    await handlerStarted.promise
    const { error: expireError } = await workerB
      .from('operation_leases')
      .update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('scope', 'integration_test')
      .eq('resource_id', raceResource)
    assert.ifError(expireError)

    const secondClaim = await workerB.rpc('claim_operation_lease', {
      p_scope: 'integration_test',
      p_resource_id: raceResource,
      p_lease_seconds: 30,
    })
    assert.ifError(secondClaim.error)
    assert.equal(secondClaim.data.length, 1)
    const leaseB = secondClaim.data[0]
    assert.ok(Number(leaseB.fencing_token) > Number(leaseA.fencing_token))

    allowStaleWrite.resolve()
    const staleResult = await staleHandler
    assert.equal(staleResult.error?.code, '55P03')

    const { count: staleCount, error: staleCountError } = await workerA
      .from('operational_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('reference_id', staleReference)
    assert.ifError(staleCountError)
    assert.equal(staleCount, 0)

    const currentResult = await workerB.rpc('persist_operational_alert_fenced', {
      p_execution_scope: 'integration_test',
      p_execution_resource_id: raceResource,
      p_execution_owner_token: leaseB.owner_token,
      p_execution_fencing_token: leaseB.fencing_token,
      p_alert_type: 'fencing_integration_current',
      p_severity: 'critical',
      p_source: 'integration_test',
      p_reference_id: currentReference,
      p_message: 'The current worker may persist this alert',
      p_details: {},
      p_order_id: null,
      p_webhook_event_id: null,
    })
    assert.ifError(currentResult.error)
    assert.ok(currentResult.data)

    const enqueuedJob = await workerA.rpc('enqueue_retry_job', {
      p_job_type: 'shiprocket_persist',
      p_reference_id: `guard-${suffix}`,
      p_payload: { orderId: suffix },
      p_max_retries: 5,
    })
    assert.ifError(enqueuedJob.error)
    retryJobId = enqueuedJob.data

    const claimedJobs = await workerA.rpc('claim_retry_jobs', {
      p_limit: 100,
      p_lease_seconds: 30,
    })
    assert.ifError(claimedJobs.error)
    const guardedJob = claimedJobs.data.find((job) => job.id === retryJobId)
    assert.ok(guardedJob)

    const guardedClaim = await workerA.rpc('claim_operation_lease', {
      p_scope: 'retry_job_effect',
      p_resource_id: guardedResource,
      p_lease_seconds: 30,
      p_guard_type: 'retry_job',
      p_guard_id: retryJobId,
      p_guard_token: guardedJob.lease_token,
    })
    assert.ifError(guardedClaim.error)
    assert.equal(guardedClaim.data.length, 1)
    const guardedLease = guardedClaim.data[0]

    const { error: expireJobError } = await workerB
      .from('retry_jobs')
      .update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('id', retryJobId)
    assert.ifError(expireJobError)
    const reclaimedJobs = await workerB.rpc('claim_retry_jobs', {
      p_limit: 100,
      p_lease_seconds: 30,
    })
    assert.ifError(reclaimedJobs.error)
    const reclaimedJob = reclaimedJobs.data.find((job) => job.id === retryJobId)
    assert.ok(reclaimedJob)
    assert.notEqual(reclaimedJob.lease_token, guardedJob.lease_token)

    const guardedStaleResult = await workerA.rpc('persist_operational_alert_fenced', {
      p_execution_scope: 'retry_job_effect',
      p_execution_resource_id: guardedResource,
      p_execution_owner_token: guardedLease.owner_token,
      p_execution_fencing_token: guardedLease.fencing_token,
      p_alert_type: 'fencing_parent_guard_stale',
      p_severity: 'critical',
      p_source: 'integration_test',
      p_reference_id: guardedReference,
      p_message: 'A worker with a reclaimed parent job must not persist this alert',
      p_details: {},
      p_order_id: null,
      p_webhook_event_id: null,
    })
    assert.equal(guardedStaleResult.error?.code, '55P03')

    const { count: guardedStaleCount, error: guardedStaleCountError } = await workerA
      .from('operational_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('reference_id', guardedReference)
    assert.ifError(guardedStaleCountError)
    assert.equal(guardedStaleCount, 0)

    const webhookInsert = await workerA.from('webhook_events').insert({
      id: webhookId,
      source: 'razorpay',
      event_id: `event-${suffix}`,
      event_type: 'payment.captured',
      payload_hash: `hash-${suffix}`,
      raw_payload: { event: 'payment.captured' },
      processing_status: 'verified',
    })
    assert.ifError(webhookInsert.error)
    const webhookClaim = await workerA.rpc('claim_razorpay_webhook', {
      p_webhook_id: webhookId,
      p_lease_seconds: 30,
    })
    assert.ifError(webhookClaim.error)
    assert.equal(webhookClaim.data.length, 1)
    const firstWebhook = webhookClaim.data[0]

    const webhookEffectClaim = await workerA.rpc('claim_operation_lease', {
      p_scope: 'checkout_payment',
      p_resource_id: webhookResource,
      p_lease_seconds: 30,
      p_guard_type: 'razorpay_webhook',
      p_guard_id: webhookId,
      p_guard_token: firstWebhook.processing_token,
    })
    assert.ifError(webhookEffectClaim.error)
    const webhookEffectLease = webhookEffectClaim.data[0]

    const { error: expireWebhookError } = await workerB
      .from('webhook_events')
      .update({ processing_lease_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('id', webhookId)
    assert.ifError(expireWebhookError)
    const reclaimedWebhook = await workerB.rpc('claim_razorpay_webhook', {
      p_webhook_id: webhookId,
      p_lease_seconds: 30,
    })
    assert.ifError(reclaimedWebhook.error)
    assert.equal(reclaimedWebhook.data.length, 1)
    assert.notEqual(reclaimedWebhook.data[0].processing_token, firstWebhook.processing_token)

    const webhookStaleResult = await workerA.rpc('persist_operational_alert_fenced', {
      p_execution_scope: 'checkout_payment',
      p_execution_resource_id: webhookResource,
      p_execution_owner_token: webhookEffectLease.owner_token,
      p_execution_fencing_token: webhookEffectLease.fencing_token,
      p_alert_type: 'fencing_webhook_guard_stale',
      p_severity: 'critical',
      p_source: 'integration_test',
      p_reference_id: webhookReference,
      p_message: 'A worker with a reclaimed webhook must not persist this alert',
      p_details: {},
      p_order_id: null,
      p_webhook_event_id: null,
    })
    assert.equal(webhookStaleResult.error?.code, '55P03')

    const { count: webhookStaleCount, error: webhookStaleCountError } = await workerA
      .from('operational_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('reference_id', webhookReference)
    assert.ifError(webhookStaleCountError)
    assert.equal(webhookStaleCount, 0)
  }
)
