import { BrandMark } from '@/components/common/brand-mark'
import { cn } from '@/lib/utils'

/**
 * Shared app-loading presentation: the turning outline M with a screen-reader status label.
 * Use for true app-loading states only (not button spinners or progress bars).
 */
export function LoadingMark({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex items-center justify-center motion-safe:animate-fade-in', className)}>
      <BrandMark variant="outline" animated className="h-16" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
