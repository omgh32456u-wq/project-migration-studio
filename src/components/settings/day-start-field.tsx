
import { Field } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { dayStartToTime, parseTimeInput } from '@/lib/nutrition-day'

/** Start-of-day picker shared by onboarding and Settings. Shows the computed end of the 24-hour day underneath. */
export function DayStartField({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const { t, fmtTime } = useStore().i18n
  return (
    <div className="flex flex-col gap-3">
      <Field label={t('dayStart.label')} hint={t('dayStart.hint')}>
        {({ id, describedBy }) => (
          <input
            id={id}
            type="time"
            dir="ltr"
            aria-describedby={describedBy}
            value={dayStartToTime(value)}
            onChange={(e) => {
              const minutes = parseTimeInput(e.target.value)
              if (minutes !== null) onChange(minutes)
            }}
            className="h-11 w-full max-w-40 rounded-lg border border-input bg-card px-3 text-sm tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        )}
      </Field>
      <p className="text-xs text-muted-foreground">{t('dayStart.window', { start: fmtTime(value), end: fmtTime(value) })}</p>
    </div>
  )
}
