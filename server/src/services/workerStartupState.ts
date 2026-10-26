export type WorkerStartupStatus = 'idle' | 'checking' | 'waiting' | 'running' | 'stopped'

export function createWorkerStartup<Timer>(dependencies: {
  inspect: () => Promise<boolean>
  start: () => void
  schedule: (work: () => Promise<void>, delay: number) => Timer
  cancel: (timer: Timer) => void
}) {
  let state: WorkerStartupStatus = 'idle'
  let failures = 0
  let timer: Timer | undefined
  let inFlight: Promise<boolean> | null = null

  async function attempt(): Promise<boolean> {
    state = 'checking'
    try {
      const ready = await dependencies.inspect()
      if ((state as WorkerStartupStatus) === 'stopped') return false
      if (ready) {
        dependencies.start()
        state = 'running'
        return true
      }
    } catch {
      // A failed schema check or scheduler startup follows the same retry policy.
    }
    if ((state as WorkerStartupStatus) === 'stopped') return false
    state = 'waiting'
    failures += 1
    timer = dependencies.schedule(
      async () => {
        timer = undefined
        await ensureStarted()
      },
      Math.min(60_000, 1000 * 2 ** Math.min(failures - 1, 6))
    )
    return false
  }

  function ensureStarted(): Promise<boolean> {
    if (state === 'running') return Promise.resolve(true)
    if (state === 'stopped') return Promise.resolve(false)
    if (inFlight) return inFlight
    if (timer !== undefined) return Promise.resolve(false)
    inFlight = attempt().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  return {
    ensureStarted,
    status: () => state,
    stop() {
      state = 'stopped'
      if (timer !== undefined) dependencies.cancel(timer)
      timer = undefined
    },
  }
}
