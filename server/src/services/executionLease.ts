import { adminSupabase } from '../lib/supabase/admin'
import { databaseError } from '../lib/databaseError'
import { AppError } from '../types'

export interface ExecutionLease {
  scope: string
  resourceId: string
  ownerToken: string
  fencingToken: number
}

export interface ExecutionLeaseGuard {
  type: 'retry_job' | 'razorpay_webhook'
  id: string
  token: string
}

interface ClaimedExecutionLease {
  scope: string
  resource_id: string
  owner_token: string
  fencing_token: number
}

export interface ExecutionLeaseHeartbeat {
  lease: ExecutionLease
  assertOwned: () => Promise<void>
  stop: () => Promise<void>
}

export function executionLeaseRpcArgs(lease: ExecutionLease): Record<string, unknown> {
  return {
    p_execution_scope: lease.scope,
    p_execution_resource_id: lease.resourceId,
    p_execution_owner_token: lease.ownerToken,
    p_execution_fencing_token: lease.fencingToken,
  }
}

export async function claimExecutionLease(
  scope: string,
  resourceId: string,
  leaseSeconds = 120,
  guard?: ExecutionLeaseGuard
): Promise<ExecutionLease | null> {
  const { data, error } = await adminSupabase.rpc('claim_operation_lease', {
    p_scope: scope,
    p_resource_id: resourceId,
    p_lease_seconds: leaseSeconds,
    p_guard_type: guard?.type ?? null,
    p_guard_id: guard?.id ?? null,
    p_guard_token: guard?.token ?? null,
  })
  if (error) {
    throw databaseError('execution_lease.claim', error, 'Operation could not be claimed', {
      code: 'EXECUTION_LEASE_UNAVAILABLE',
      statusCode: 503,
    })
  }

  const claimed = (Array.isArray(data) ? data[0] : data) as ClaimedExecutionLease | undefined
  if (!claimed) return null
  return {
    scope: claimed.scope,
    resourceId: claimed.resource_id,
    ownerToken: claimed.owner_token,
    fencingToken: Number(claimed.fencing_token),
  }
}

export function startExecutionLeaseHeartbeat(
  lease: ExecutionLease,
  options: { heartbeatMs?: number; leaseSeconds?: number } = {}
): ExecutionLeaseHeartbeat {
  const heartbeatMs = options.heartbeatMs ?? 30_000
  const leaseSeconds = options.leaseSeconds ?? 120
  let stopped = false
  let leaseLost = false
  let renewal: Promise<void> | null = null

  const renew = async (): Promise<void> => {
    if (stopped || leaseLost) return
    const { data, error } = await adminSupabase.rpc('renew_operation_lease', {
      p_scope: lease.scope,
      p_resource_id: lease.resourceId,
      p_owner_token: lease.ownerToken,
      p_fencing_token: lease.fencingToken,
      p_lease_seconds: leaseSeconds,
    })
    if (error || data !== true) leaseLost = true
  }

  const scheduleRenewal = (): void => {
    if (renewal || stopped || leaseLost) return
    renewal = renew().finally(() => {
      renewal = null
    })
  }

  const timer = setInterval(scheduleRenewal, heartbeatMs)
  timer.unref()

  return {
    lease,
    assertOwned: async () => {
      if (renewal) await renewal
      if (!leaseLost) await renew()
      if (leaseLost) {
        throw new AppError(409, 'EXECUTION_FENCED_OUT', 'Operation lease is no longer owned')
      }
    },
    stop: async () => {
      stopped = true
      clearInterval(timer)
      if (renewal) await renewal
    },
  }
}

export async function releaseExecutionLease(lease: ExecutionLease): Promise<boolean> {
  const { data, error } = await adminSupabase.rpc('release_operation_lease', {
    p_scope: lease.scope,
    p_resource_id: lease.resourceId,
    p_owner_token: lease.ownerToken,
    p_fencing_token: lease.fencingToken,
  })
  return !error && data === true
}

export async function withExecutionLease<T>(
  scope: string,
  resourceId: string,
  work: (heartbeat: ExecutionLeaseHeartbeat) => Promise<T>,
  options: {
    heartbeatMs?: number
    leaseSeconds?: number
    guard?: ExecutionLeaseGuard
  } = {}
): Promise<T> {
  const lease = await claimExecutionLease(scope, resourceId, options.leaseSeconds, options.guard)
  if (!lease) {
    throw new AppError(409, 'EXECUTION_ALREADY_CLAIMED', 'Operation is already being processed')
  }

  const heartbeat = startExecutionLeaseHeartbeat(lease, options)
  try {
    return await work(heartbeat)
  } finally {
    await heartbeat.stop()
    await releaseExecutionLease(lease)
  }
}
