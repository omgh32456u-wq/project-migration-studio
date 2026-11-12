import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Decorative tile; the item name next to it is the accessible label. */
export function FoodIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground', className)} aria-hidden>
      <Icon className="size-[18px]" />
    </span>
  )
}
