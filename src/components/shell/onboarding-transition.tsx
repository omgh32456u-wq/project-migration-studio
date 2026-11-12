
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { usePrefersReducedMotion } from './onboarding-growths'

/**
 * Direction-aware single-panel crossfade/slide for step content.
 *
 * The active children are always rendered directly from props so updates to
 * onboarding settings (language, theme, profile selections, etc.) stay live.
 * A ref keeps only the last rendered children for the short outgoing snapshot.
 *
 * - Forward: new content enters from 12px below; snapshot fades out.
 * - Backward: new content enters from 12px above.
 * - Reduced motion: instant swap, no timers, no transforms.
 * - The outgoing snapshot never intercepts pointer input.
 */
export function StepTransition({ stepKey, dir, children }: { stepKey: string | number; dir: 1 | -1; children: ReactNode }) {
  const reduced = usePrefersReducedMotion()
  const [snapshot, setSnapshot] = useState<{ key: string | number; node: ReactNode } | null>(null)
  const lastKey = useRef(stepKey)
  const previousNode = useRef(children)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (stepKey !== lastKey.current) {
      setSnapshot(reduced ? null : { key: lastKey.current, node: previousNode.current })
      lastKey.current = stepKey

      if (timer.current) clearTimeout(timer.current)
      if (!reduced) {
        timer.current = setTimeout(() => setSnapshot(null), 280)
      }
    }

    // Keep the latest rendered version of this step, including live selection
    // state, so the next transition snapshots the correct outgoing content.
    previousNode.current = children
  }, [stepKey, children, reduced])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const enter: CSSProperties = reduced
    ? {}
    : {
        animation: 'step-enter 260ms var(--ease-soft) both',
        ['--enter-from' as string]: dir === 1 ? '12px' : '-12px',
      }

  return (
    <div className="relative">
      {snapshot && (
        <div
          key={`snap-${snapshot.key}`}
          className="pointer-events-none absolute inset-0 z-10"
          style={{ animation: 'step-exit 180ms ease-out both' }}
        >
          {snapshot.node}
        </div>
      )}
      <div key={stepKey} style={enter}>
        {children}
      </div>
    </div>
  )
}