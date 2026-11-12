import logo from '@/assets/mizano-logo.png.asset.json'
import { cn } from '@/lib/utils'

/**
 * The Mizano logo (rounded green tile with the white/lime "m"), used only for real brand placements.
 * The artwork carries its own rounded tile, so no background or ring is added here.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt=""
      aria-hidden
      draggable={false}
      width={256}
      height={256}
      className={cn('size-9 shrink-0 select-none rounded-[24%] object-contain', className)}
    />
  )
}
