import { useEffect, useState } from 'react'

/**
 * Matches the OS reduced-motion preference, updated live. Returns false during SSR
 * and the first client render (before the effect runs) so server and client markup
 * agree — no hydration mismatch, and reduced-motion users simply skip entrance
 * animations on the first frame.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}