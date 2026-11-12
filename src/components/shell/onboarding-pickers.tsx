
import type { ActivityLevel, Sex } from '@/lib/types'
import { cn } from '@/lib/utils'

type T = (k: string) => string

export function SexSelect({ value, onChange, t }: { value: Sex; onChange: (s: Sex) => void; t: T }) {
  const options: { value: Sex; symbol: string; accent: string }[] = [
    { value: 'male', symbol: '\u2642', accent: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { value: 'female', symbol: '\u2640', accent: 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400' },
    { value: 'unspecified', symbol: '\u00b7', accent: 'border-primary bg-accent text-accent-foreground' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('settings.sex')}>
      {options.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            className={cn(
              'flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-sm font-medium transition-colors',
              selected ? o.accent : 'border-border hover:bg-muted',
            )}
          >
            <span aria-hidden className="text-lg leading-none">
              {o.symbol}
            </span>
            {t('settings.sex.' + o.value)}
          </button>
        )
      })}
    </div>
  )
}

const ACTIVITIES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

export function ActivitySelect({ value, onChange, t }: { value: ActivityLevel | null; onChange: (a: ActivityLevel) => void; t: T }) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={t('settings.activity')}>
      {ACTIVITIES.map((a, i) => {
        const selected = value === a
        const hue = 8 + (i / (ACTIVITIES.length - 1)) * 120
        return (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            aria-pressed={selected}
            className={cn(
              'flex h-11 items-center rounded-2xl border px-4 text-start text-sm font-medium transition-colors',
              selected ? 'border-primary text-accent-foreground' : 'border-border text-foreground hover:bg-muted',
            )}
            style={selected ? { background: 'oklch(0.75 0.16 ' + hue.toFixed(0) + ' / 0.22)' } : undefined}
          >
            {t('activity.' + a)}
          </button>
        )
      })}
    </div>
  )
}