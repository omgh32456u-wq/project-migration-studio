import { useId } from 'react'
import logo from '@/assets/mizano-logo.png.asset.json'
import markLight from '@/assets/mizano-m-light.png.asset.json'
import markDark from '@/assets/mizano-m-dark.png.asset.json'
import { cn } from '@/lib/utils'

/**
 * One arch of the official M, measured from the 1024px logo artwork (outer radius 189.5, inner 98, leg 91.5,
 * round foot caps). The M is two identical arches sharing the middle leg; the lime arch sits behind the white one,
 * shifted right by {@link ARCH_SHIFT}. Used as a contour (stroke only) for the outline mark.
 */
export const ARCH_PATH =
  'M179 716.5V450.5A189.5 189.5 0 0 1 558 450.5V716.5A45.75 45.75 0 0 1 466.5 716.5V450.5A98 98 0 0 0 270.5 450.5V716.5A45.75 45.75 0 0 1 179 716.5Z'
export const ARCH_SHIFT = 287.5
/** Crop of the 1024 artwork around the M; its horizontal centre (x=512) is the shared middle leg — the turn axis. */
export const OUTLINE_VIEWBOX = '160 242 704 540'

/**
 * Mizano brand mark, from the official logo artwork (never redrawn).
 * - `mark` (default): the standalone two-arch M for in-app placements. Light theme uses the deep-green arch
 *   with the lime arch outlined in green; dark theme uses the original white + lime arches.
 * - `tile`: the full square app-icon artwork, only where a square app icon is appropriate.
 * - `outline`: the same M as contours only (interior unfilled); `animated` turns it for loading states.
 * Logos are never mirrored in RTL.
 */
export function BrandMark({
  className,
  variant = 'mark',
  animated = false,
}: {
  className?: string
  variant?: 'mark' | 'tile' | 'outline'
  animated?: boolean
}) {
  const base = 'size-9 shrink-0 select-none object-contain'
  if (variant === 'tile') {
    return <img src={logo.url} alt="" aria-hidden draggable={false} width={256} height={256} className={cn(base, 'rounded-[24%]', className)} />
  }
  if (variant === 'outline') return <OutlineMark className={className} animated={animated} />
  return (
    <span aria-hidden className={cn(base, 'relative inline-block', className)}>
      <img src={markLight.url} alt="" draggable={false} width={256} height={196} className="absolute inset-0 size-full object-contain dark:hidden" />
      <img src={markDark.url} alt="" draggable={false} width={256} height={196} className="absolute inset-0 hidden size-full object-contain dark:block" />
    </span>
  )
}

/**
 * Contour M. The lime arch's contour is masked out wherever the white arch covers it, so the two halves meet
 * exactly as in the logo (joined at the top of the shared leg). Colours come from the --mark-* theme tokens.
 * When animated, the whole plane turns 360° around the shared leg, so the halves swap sides and never separate;
 * the turn runs only under motion-safe (reduced motion keeps the static outline) and is a single compositor transform.
 */
function OutlineMark({ className, animated }: { className?: string; animated: boolean }) {
  const id = 'mzm' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg
      viewBox={OUTLINE_VIEWBOX}
      aria-hidden
      focusable="false"
      data-animated={animated || undefined}
      className={cn('block h-9 w-auto shrink-0 select-none overflow-visible', animated && 'motion-safe:animate-m-turn', className)}
      fill="none"
      strokeLinejoin="round"
    >
      <defs>
        <path id={`${id}-arch`} d={ARCH_PATH} />
        <mask id={`${id}-under`} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
          <rect width="1024" height="1024" fill="white" />
          <use href={`#${id}-arch`} fill="black" />
        </mask>
      </defs>
      <g mask={`url(#${id}-under)`} transform={`translate(${ARCH_SHIFT} 0)`}>
        <use href={`#${id}-arch`} stroke="var(--mark-b-edge)" strokeWidth={36} />
        <use href={`#${id}-arch`} stroke="var(--mark-b)" strokeWidth={20} />
      </g>
      <use href={`#${id}-arch`} stroke="var(--mark-a)" strokeWidth={22} />
    </svg>
  )
}
