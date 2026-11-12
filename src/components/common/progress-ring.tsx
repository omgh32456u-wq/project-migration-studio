import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Circular progress used by the Today hero. The arc starts at 12 o'clock and runs clockwise in LTR,
 * counter-clockwise in RTL (so progress reads in the direction of the script).
 * `value` is clamped to [0, max]; the caller decides colours via `trackClassName` / `arcClassName`.
 */
export function ProgressRing({
  value,
  max,
  size = 132,
  stroke = 10,
  trackClassName = 'stroke-muted',
  arcClassName = 'stroke-energy',
  className,
  children,
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  trackClassName?: string
  arcClassName?: string
  className?: string
  children?: ReactNode
}) {
  const box = 120
  const r = (box - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${box} ${box}`} className="size-full -rotate-90 rtl:rotate-90 rtl:scale-x-[-1]" aria-hidden>
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={cn('transition-[stroke-dashoffset] duration-700 ease-soft', arcClassName)}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  )
}
