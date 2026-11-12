
import { useEffect, useState } from 'react'

/**
 * Growth states of the onboarding botanical illustration, in growth order.
 * The plant is one coherent SVG; these are the cumulative reveal stages of its parts.
 */
export type GrowthState = 'seed' | 'sprout' | 'growth' | 'bloom'

export const GROWTH_STATES: readonly GrowthState[] = ['seed', 'sprout', 'growth', 'bloom'] as const

/**
 * Maps onboarding progress to a growth state.
 *
 * Verified against tests/onboarding-growth.test.ts:
 * - 4-step (adult) flow:  seed, sprout, growth, bloom (step 3), bloom (step 4 = completion).
 * - 3-step flow:          seed, sprout, bloom (step 2), bloom (step 3 = completion).
 * - The last interactive step (total-1) is always bloom in both flows; earlier
 *   interior steps spread evenly across sprout/growth. Pure function of
 *   (step, total): language/theme changes can never affect it.
 */
export function growthState(step: number, totalSteps: number): GrowthState {
  const total = Math.max(1, Math.min(totalSteps, GROWTH_STATES.length))
  if (step <= 0) return 'seed'
  if (step >= total - 1) return 'bloom'
  // Interior steps 1..total-2 spread across states 1..2 (sprout, growth).
  const interiorStates = GROWTH_STATES.length - 2
  const idx = 1 + Math.floor(((step - 1) * interiorStates) / Math.max(1, total - 2))
  return GROWTH_STATES[Math.min(idx, interiorStates)]
}

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