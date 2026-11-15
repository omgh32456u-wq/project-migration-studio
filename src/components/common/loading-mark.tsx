import { BrandMark } from '@/components/common/brand-mark'
import { cn } from '@/lib/utils'

/**
 * Shared app-loading presentation: the outline M whose halves trade places, with the localized status message
 * visible directly below it. The whole block is one polite live region, so the message is announced once.
 * Use for true app-loading states only (not button spinners or progress bars); future Mizo loading reuses it.
 * An empty label keeps the line's height so nothing shifts when the message arrives.
 */
export function LoadingMark({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-5 px-6 text-center motion-safe:animate-fade-in sm:gap-6', className)}
    >
      <BrandMark variant="outline" animated className="h-16 motion-safe:[perspective:190px] sm:h-20 sm:motion-safe:[perspective:240px]" />
      <p className="min-h-5 text-sm font-medium text-muted-foreground sm:min-h-6 sm:text-base">{label}</p>
    </div>
  )
}
