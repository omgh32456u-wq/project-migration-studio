
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface WheelItem {
  value: number
  label: string
  /** minor: ages 15–17 (amber). threshold: age 18 (adult, marked differently from minors). */
  tone?: 'minor' | 'threshold'
}

const ITEM_H = 40

/**
 * Draggable vertical wheel built on native scroll plus CSS scroll-snap.
 * Touch, pen, mouse and keyboard all work with no JS measurement.
 * EDGE_H padding lets the first and last rows center under the band
 * (half the viewport minus half a row).
 */
export function Wheel({
  items,
  value,
  onChange,
  label,
  disabled = false,
  rows = 4,
}: {
  items: WheelItem[]
  value: number
  onChange: (v: number) => void
  label: string
  disabled?: boolean
  /** Visible height in rows: 4 normally, 3 on short screens. */
  rows?: 3 | 4
}) {
  const viewportH = rows * ITEM_H
  const edgeH = viewportH / 2 - ITEM_H / 2
  const ref = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastEmitted = useRef(value)
  const index = Math.max(0, items.findIndex((i) => i.value === value))
  // Row currently under the centre band. Drives the highlight so it follows the finger while scrolling;
  // the value itself is only committed (onChange) once scrolling settles.
  const [liveIndex, setLiveIndex] = useState(index)
  useEffect(() => setLiveIndex(index), [index])
  const clampIndex = (top: number) => Math.min(Math.max(Math.round(top / ITEM_H), 0), items.length - 1)

  // Center the current value on mount and on external value changes.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = index * ITEM_H
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTo({ top: target })
    lastEmitted.current = value
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only pool or selection changes should recenter
  }, [index])

  // Debounced settle: only commit the selection after scrolling pauses,
  // so a fast fling never fires intermediate values.
  const handleScroll = () => {
    const now = ref.current
    if (now) setLiveIndex(clampIndex(now.scrollTop))
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const i = clampIndex(el.scrollTop)
      const v = items[i]?.value
      if (v !== undefined && v !== lastEmitted.current) {
        lastEmitted.current = v
        onChange(v)
      }
    }, 110)
  }

  // Keyboard: arrows step one item; PageUp/Down jump five.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    let delta = 0
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') delta = e.key === 'ArrowDown' ? 1 : -1
    else if (e.key === 'PageDown' || e.key === 'PageUp') delta = e.key === 'PageDown' ? 5 : -5
    else return
    e.preventDefault()
    const el = ref.current
    if (!el) return
    const i = Math.min(Math.max(Math.round(el.scrollTop / ITEM_H) + delta, 0), items.length - 1)
    el.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
  }

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
  }, [])

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('relative overflow-hidden rounded-2xl border bg-muted/40', disabled && 'pointer-events-none opacity-50')}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1.5 top-1/2 z-0 h-10 -translate-y-1/2 rounded-xl border border-border"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-card via-card/70 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-card via-card/70 to-transparent"
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="listbox"
        aria-label={label}
        className="relative z-10 scrollbar-none snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ height: viewportH, paddingTop: edgeH, paddingBottom: edgeH }}
      >
        {items.map((it, i) => {
          const selected = i === liveIndex
          return (
            <div
              key={it.value}
              role="option"
              aria-selected={selected}
              className={cn(
                'mx-1.5 flex h-10 snap-center items-center justify-center rounded-xl text-base tabular-nums transition-[color,background-color,box-shadow] duration-150',
                selected
                  ? it.tone === 'minor'
                    ? 'relative z-10 bg-minor-fill font-bold text-minor-fill-foreground shadow-soft'
                    : 'relative z-10 bg-primary font-bold text-primary-foreground shadow-soft'
                  : it.tone === 'minor'
                    ? 'font-medium text-minor'
                    : it.tone === 'threshold'
                      ? 'font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4'
                      : 'text-muted-foreground',
              )}
            >
              {it.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}