import { Check } from 'lucide-react'
import type { ActivityLevel, Sex } from '@/lib/types'
import { cn } from '@/lib/utils'

type T = (k: string) => string

/** Shared look for a selected chip: solid brand fill + check, readable in both themes. */
const chipBase =
  'relative flex items-center justify-center rounded-2xl border-2 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
const chipOn = 'border-primary bg-primary text-primary-foreground shadow-soft'
const chipOff = 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted'

export function SexSelect({ value, onChange, t }: { value: Sex; onChange: (s: Sex) => void; t: T }) {
  const options: { value: Sex; symbol: string }[] = [
    { value: 'male', symbol: '\u2642' },
    { value: 'female', symbol: '\u2640' },
    { value: 'unspecified', symbol: '\u2013' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('settings.sex')}>
      {options.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(chipBase, 'min-h-11 gap-1.5 px-1.5 py-1 text-[13px] leading-tight sm:text-sm', selected ? chipOn : chipOff)}
          >
            {selected ? <Check className="size-4 shrink-0" aria-hidden /> : <span aria-hidden className="text-base leading-none text-muted-foreground">{o.symbol}</span>}
            <span className="line-clamp-2 text-center">{t('settings.sex.' + o.value)}</span>
          </button>
        )
      })}
    </div>
  )
}

const ACTIVITIES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

/**
 * Activity as a compact 5-level row (one line instead of five) so the profile step fits without scrolling.
 * Each level shows rising bars; the selected level is a filled chip and its name is shown by the caller.
 */
export function ActivitySelect({ value, onChange, t }: { value: ActivityLevel | null; onChange: (a: ActivityLevel) => void; t: T }) {
  return (
    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t('settings.activity')}>
      {ACTIVITIES.map((a, i) => {
        const selected = value === a
        return (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t('activity.' + a)}
            title={t('activity.' + a)}
            onClick={() => onChange(a)}
            className={cn(chipBase, 'h-11 items-end gap-[3px] pb-2.5', selected ? chipOn : chipOff)}
          >
            {Array.from({ length: 5 }, (_, b) => (
              <span
                key={b}
                aria-hidden
                className={cn('w-1 rounded-full', b <= i ? (selected ? 'bg-primary-foreground' : 'bg-primary') : selected ? 'bg-primary-foreground/30' : 'bg-border')}
                style={{ height: 6 + b * 3 }}
              />
            ))}
          </button>
        )
      })}
    </div>
  )
}
