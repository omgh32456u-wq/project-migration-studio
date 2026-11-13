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
 * - `outline`: the same M as contours only (interior empty), two separate halves; `animated` makes the halves
 *   trade places around their shared hinge for loading states.
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
 * The halves' shared joint, as a transform-origin inside {@link OUTLINE_VIEWBOX}: x = 512.25 (midway between the two
 * arch centres, on the shared middle leg) and y = 327 (where the two outer contours meet at the top of that leg).
 * Turning either arch 180° around the vertical line through it lands that arch exactly in the other arch's place;
 * every rotation of either half pivots on this point, so the halves stay joined there.
 */
const ARCH_CENTRE = (179 + 558) / 2
const JOINT_Y = 450.5 - Math.sqrt(189.5 ** 2 - (ARCH_SHIFT / 2) ** 2)
export const HINGE_ORIGIN = `${((ARCH_CENTRE + ARCH_SHIFT / 2 - 160) / 704) * 100}% ${((JOINT_Y - 242) / 540) * 100}%`

/**
 * Contour M built from two separate arch elements, one per half (lime behind, white in front, as in the logo).
 * Each arch's band is painted with --mark-fill (the surface colour, default the page background) so whatever is
 * behind it is hidden exactly like in the logo while the interior still reads as empty.
 * When animated, each half turns on its own around the shared joint in 3D: the left half swings forward over the
 * joint to the right while the right half swings back to the left, slightly later, leaning apart as they pass, so
 * they trade places, rest briefly as an M, and repeat — a full 360° each per loop. Only one half is ever edge-on,
 * and only in passing. Runs only under motion-safe; reduced motion keeps the static outline. Transform-only (compositor).
 */
function OutlineMark({ className, animated }: { className?: string; animated: boolean }) {
  const half = 'absolute inset-0 block size-full overflow-visible'
  return (
    <span
      aria-hidden
      data-animated={animated || undefined}
      className={cn(
        'relative inline-block aspect-[704/540] h-9 shrink-0 select-none',
        animated && 'motion-safe:[perspective:250px] motion-safe:[transform-style:preserve-3d]',
        className,
      )}
    >
      <svg
        viewBox={OUTLINE_VIEWBOX}
        data-half="lime"
        focusable="false"
        className={cn(half, animated && 'motion-safe:animate-m-half-b')}
        style={{ transformOrigin: HINGE_ORIGIN }}
        strokeLinejoin="round"
      >
        <g transform={`translate(${ARCH_SHIFT} 0)`}>
          <path d={ARCH_PATH} fill="var(--mark-fill)" stroke="var(--mark-b-edge)" strokeWidth={36} />
          <path d={ARCH_PATH} fill="none" stroke="var(--mark-b)" strokeWidth={20} />
        </g>
      </svg>
      <svg
        viewBox={OUTLINE_VIEWBOX}
        data-half="white"
        focusable="false"
        className={cn(half, animated && 'motion-safe:animate-m-half-a')}
        style={{ transformOrigin: HINGE_ORIGIN }}
        strokeLinejoin="round"
      >
        <path d={ARCH_PATH} fill="var(--mark-fill)" stroke="var(--mark-a)" strokeWidth={22} />
      </svg>
    </span>
  )
}
