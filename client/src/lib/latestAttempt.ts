export interface LatestAttemptGuard {
  begin: () => number
  isCurrent: (attempt: number) => boolean
  invalidate: () => void
}

export function createLatestAttemptGuard(): LatestAttemptGuard {
  let generation = 0

  return {
    begin: () => {
      generation += 1
      return generation
    },
    isCurrent: (attempt) => attempt === generation,
    invalidate: () => {
      generation += 1
    },
  }
}
