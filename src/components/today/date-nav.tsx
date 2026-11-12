
import { useRef } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/components/providers/app-store'
import { addDays, dateRange, isDateKey, startOfWeek } from '@/lib/dates'
import { weekStartFor } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function DateNav() {
  const { selectedDate, setSelectedDate, today, i18n, logsByDate } = useStore()
  const { t, fmtDate, dir, locale } = i18n
  const inputRef = useRef<HTMLInputElement>(null)
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight

  const relative =
    selectedDate === today
      ? t('date.today')
      : selectedDate === addDays(today, -1)
        ? t('date.yesterday')
        : selectedDate === addDays(today, 1)
          ? t('date.tomorrow')
          : fmtDate(selectedDate, { weekday: 'long' })

  const week = dateRange(startOfWeek(selectedDate, weekStartFor(locale)), 7)

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="glass flex items-center gap-1 rounded-2xl p-1 shadow-soft">
        <button
          type="button"
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-muted active:scale-95"
          aria-label={t('date.prev')}
        >
          <Prev className="size-5" aria-hidden />
        </button>
        <div className="relative flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            onClick={() => {
              const el = inputRef.current
              if (!el) return
              if (typeof el.showPicker === 'function') {
                try {
                  el.showPicker()
                  return
                } catch {
                  /* fall through to focus */
                }
              }
              el.focus()
            }}
            className="flex min-h-11 min-w-0 flex-col items-center rounded-xl px-4 py-1 transition-colors hover:bg-muted"
            aria-label={`${t('date.pick')}: ${fmtDate(selectedDate, { dateStyle: 'full' })}`}
          >
            <span className="flex items-center gap-1.5 text-base font-semibold">
              <CalendarDays className="size-4 text-primary" aria-hidden />
              {relative}
            </span>
            <span className="text-xs text-muted-foreground">{fmtDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </button>
          <input
            ref={inputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => isDateKey(e.target.value) && setSelectedDate(e.target.value)}
            className="pointer-events-none absolute inset-0 opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>
        {selectedDate !== today && (
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/70"
            aria-label={t('date.goToday')}
          >
            {t('date.today')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-muted active:scale-95"
          aria-label={t('date.next')}
        >
          <Next className="size-5" aria-hidden />
        </button>
      </div>

      {/* Week strip: jump between days; a dot marks days that already have entries. */}
      <ol className="grid grid-cols-7 gap-1.5">
        {week.map((key) => {
          const selected = key === selectedDate
          const logged = (logsByDate.get(key)?.length ?? 0) > 0
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setSelectedDate(key)}
                aria-pressed={selected}
                aria-label={fmtDate(key, { dateStyle: 'full' })}
                className={cn(
                  'relative flex w-full flex-col items-center gap-0.5 rounded-2xl py-2 transition-all duration-200 active:scale-95',
                  selected ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-card/70 text-foreground hover:bg-accent',
                  !selected && key === today && 'ring-1 ring-primary/50',
                )}
              >
                <span className={cn('text-[11px] font-medium', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {fmtDate(key, { weekday: 'short' })}
                </span>
                <span className="text-sm font-semibold tabular-nums">{fmtDate(key, { day: 'numeric' })}</span>
                <span
                  className={cn('size-1 rounded-full transition-opacity', selected ? 'bg-primary-foreground' : 'bg-primary', logged ? 'opacity-100' : 'opacity-0')}
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
