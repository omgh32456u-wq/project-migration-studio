
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { GrowthState } from './onboarding-growths'
import { usePrefersReducedMotion } from './onboarding-growths'

/**
 * The Mizano growth plant — one original SVG, four cumulative reveal stages
 * (seed -> sprout -> growth -> bloom). Parts stay mounted; opacity/scale
 * transition via CSS, so the illustration never remounts or flashes.
 *
 * Geometry: ground line at y~200; the stem grows upward from the seed; leaves
 * are quadratic-curve silhouettes in the Mizano leaf idiom (same glyph family
 * as the BrandMark). Bloom tops the stem with the brand leaf shape.
 */

/** Cumulative visibility per growth state. */
const REVEAL: Record<GrowthState, { seed: boolean; stem: boolean; leavesLow: boolean; leavesMid: boolean; bloom: boolean }> = {
  seed: { seed: true, stem: false, leavesLow: false, leavesMid: false, bloom: false },
  sprout: { seed: true, stem: true, leavesLow: false, leavesMid: false, bloom: false },
  growth: { seed: true, stem: true, leavesLow: true, leavesMid: false, bloom: false },
  bloom: { seed: true, stem: true, leavesLow: true, leavesMid: true, bloom: true },
}

const part = (on: boolean, delayMs: number, reduced: boolean) => {
  const dur = reduced ? 0 : 700
  return {
    opacity: on ? 1 : 0,
    transform: on ? 'scale(1)' : 'scale(0.85)',
    transformOrigin: '200px 200px',
    transition: `opacity ${dur}ms var(--ease-soft) ${delayMs}ms, transform ${dur}ms var(--ease-soft) ${delayMs}ms`,
  } satisfies CSSProperties
}

export function OnboardingPlant({ state, className }: { state: GrowthState; className?: string }) {
  const reduced = usePrefersReducedMotion()
  const r = REVEAL[state]
  const stemDelay = reduced ? 0 : 80
  const leafDelay = reduced ? 0 : 240

  return (
    <svg viewBox="0 0 400 260" className={cn('overflow-visible', className)} aria-hidden>
      {/* Ground mound */}
      <path
        d="M130 205 Q200 198 270 205"
        style={part(r.seed, 0, reduced)}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Seed */}
      <ellipse cx="200" cy="196" rx="7" ry="11" style={part(r.seed, 0, reduced)} fill="currentColor" fillOpacity="0.55" />
      {/* Stem — grows upward from the seed */}
      <path
        d="M200 196 C196 164 196 130 200 92"
        style={part(r.stem, stemDelay, reduced)}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Sprout's first leaf pair, low on the stem */}
      <g style={part(r.leavesLow, leafDelay, reduced)}>
        <path d="M198 165 Q160 158 138 136 Q166 132 196 152 Z" fill="currentColor" fillOpacity="0.5" />
        <path d="M202 150 Q240 143 262 121 Q234 117 204 137 Z" fill="currentColor" fillOpacity="0.45" />
      </g>
      {/* Mid leaves for the growth stage */}
      <g style={part(r.leavesMid, leafDelay + 90, reduced)}>
        <path d="M198 125 Q158 112 142 84 Q176 86 199 112 Z" fill="currentColor" fillOpacity="0.65" />
        <path d="M202 110 Q242 97 258 69 Q224 71 201 97 Z" fill="currentColor" fillOpacity="0.55" />
      </g>
      {/* Bloom — the Mizano brand leaf tops the stem */}
      <g style={part(r.bloom, leafDelay + 180, reduced)}>
        <path d="M200 92 C185 66 187 44 201 24 C215 44 217 66 200 92 Z" fill="currentColor" fillOpacity="0.9" />
        <path
          d="M200 88 C192 70 192 52 200 34"
          fill="none"
          stroke="var(--background)"
          strokeOpacity="0.55"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="200" cy="112" r="3" fill="currentColor" fillOpacity="0.9" />
      </g>
    </svg>
  )
}