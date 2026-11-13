import logo from '@/assets/mizano-logo.png.asset.json'
import markLight from '@/assets/mizano-m-light.png.asset.json'
import markDark from '@/assets/mizano-m-dark.png.asset.json'
import { cn } from '@/lib/utils'

/**
 * Mizano brand mark, cut from the official logo artwork (never redrawn).
 * - `mark` (default): the standalone two-arch M for in-app placements. Light theme uses the deep-green arch
 *   with the lime arch outlined in green; dark theme uses the original white + lime arches.
 * - `tile`: the full square app-icon artwork, only where a square app icon is appropriate.
 * Logos are never mirrored in RTL.
 */
export function BrandMark({ className, variant = 'mark' }: { className?: string; variant?: 'mark' | 'tile' }) {
  const base = 'size-9 shrink-0 select-none object-contain'
  if (variant === 'tile') {
    return <img src={logo.url} alt="" aria-hidden draggable={false} width={256} height={256} className={cn(base, 'rounded-[24%]', className)} />
  }
  return (
    <span aria-hidden className={cn(base, 'relative inline-block', className)}>
      <img src={markLight.url} alt="" draggable={false} width={256} height={196} className="absolute inset-0 size-full object-contain dark:hidden" />
      <img src={markDark.url} alt="" draggable={false} width={256} height={196} className="absolute inset-0 hidden size-full object-contain dark:block" />
    </span>
  )
}
