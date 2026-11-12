/** Runs async tasks one at a time, in call order. A failed task does not block later ones. */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve()
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(() => task())
    tail = run.catch(() => undefined)
    return run
  }
}

/**
 * Serializes read-modify-write updates of a single value so that rapid consecutive
 * updates each build on the previous result instead of a stale render-time copy.
 * The current value only advances after `persist` succeeds.
 */
export function createSerialUpdater<T>(initial: T, persist: (next: T) => Promise<void>) {
  let current = initial
  const enqueue = createSerialQueue()
  return {
    update(fn: (value: T) => T): Promise<T> {
      return enqueue(async () => {
        const next = fn(current)
        await persist(next)
        current = next
        return next
      })
    },
    /** Replaces the base value, e.g. after the value was reloaded from storage. */
    reset(value: T) {
      current = value
    },
    current: () => current,
  }
}
