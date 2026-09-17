import { z } from 'zod'
import { adminSupabase } from '../lib/supabase/admin'
import { sanitizePostgrestError } from '../lib/databaseError'
import type { SanitizedPostgrestError } from '../types'

export const RUNTIME_SCHEMA_CONTRACT_VERSION = 40
const CACHE_TTL_MS = 15_000

const contractSchema = z.object({
  contract_version: z.number().int(),
  migration_version: z.string().nullable(),
  ready: z.boolean(),
  missing_relations: z.array(z.string()),
  missing_columns: z.array(z.string()),
  missing_functions: z.array(z.string()),
  invalid_relation_grants: z.array(z.string()),
  invalid_function_grants: z.array(z.string()),
  missing_constraints: z.array(z.string()),
  invalid_rls_relations: z.array(z.string()),
  missing_indexes: z.array(z.string()),
  invalid_storage_capabilities: z.array(z.string()),
})

export type RuntimeSchemaContract = z.infer<typeof contractSchema>

export interface RuntimeSchemaStatus {
  ready: boolean
  contract: RuntimeSchemaContract | null
  error?: SanitizedPostgrestError
}

let cachedStatus: RuntimeSchemaStatus | null = null
let cachedAt = 0
let inFlight: Promise<RuntimeSchemaStatus> | null = null

async function fetchRuntimeSchemaStatus(): Promise<RuntimeSchemaStatus> {
  try {
    const { data, error } = await adminSupabase.rpc('get_runtime_schema_status')
    if (error) return { ready: false, contract: null, error: sanitizePostgrestError(error) }

    const parsed = contractSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ready: false,
        contract: null,
        error: {
          code: 'INVALID_SCHEMA_CONTRACT',
          message: 'Runtime schema contract returned an invalid response',
          details: parsed.error.issues.map((issue) => issue.path.join('.')).join(', '),
          hint: null,
        },
      }
    }

    const ready =
      parsed.data.ready && parsed.data.contract_version === RUNTIME_SCHEMA_CONTRACT_VERSION
    return { ready, contract: parsed.data }
  } catch (error) {
    return { ready: false, contract: null, error: sanitizePostgrestError(error) }
  }
}

export async function getRuntimeSchemaStatus(options?: {
  forceRefresh?: boolean
}): Promise<RuntimeSchemaStatus> {
  const now = Date.now()
  if (!options?.forceRefresh && cachedStatus && now - cachedAt < CACHE_TTL_MS) {
    return cachedStatus
  }

  if (!inFlight) {
    inFlight = fetchRuntimeSchemaStatus().then((status) => {
      cachedStatus = status
      cachedAt = Date.now()
      inFlight = null
      return status
    })
  }

  return inFlight
}

export function clearRuntimeSchemaStatusCache(): void {
  cachedStatus = null
  cachedAt = 0
  inFlight = null
}
