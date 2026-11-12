
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Scale, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, Field, Notice, NumberInput, TextInput } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { compareKeys, isDateKey } from '@/lib/dates'
import { kgToLb, lbToKg, parseLocaleNumber } from '@/lib/nutrition'

export function WeightCard() {
  const store = useStore()
  const run = useAction()
  const { t, fmtNum, fmtDate } = store.i18n
  const imperial = store.settings.profile.units === 'imperial'
  const unit = t(imperial ? 'unit.lb' : 'unit.kg')
  const [date, setDate] = useState(store.today)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(() => [...store.weights].sort((a, b) => compareKeys(a.date, b.date)), [store.weights])
  const show = (kg: number) => fmtNum(imperial ? kgToLb(kg) : kg, 1)

  if (!store.settings.profile.trackWeight) {
    return (
      <Notice icon={<Scale />}>
        {t('weight.disabled')}{' '}
        <Link to="/settings" hash="profile" className="font-medium text-primary underline-offset-2 hover:underline">
          {t('settings.title')}
        </Link>
      </Notice>
    )
  }

  const submit = () => {
    const n = parseLocaleNumber(value)
    const kg = n === null ? null : imperial ? lbToKg(n) : n
    if (kg === null || kg < 20 || kg > 400) return setError(t('weight.error'))
    if (!isDateKey(date)) return setError(t('common.invalidNumber'))
    setError(null)
    void run(() => store.addWeight(date, kg), { success: t('weight.saved') }).then(() => setValue(''))
  }

  return (
    <Card className="flex flex-col gap-4 p-5" aria-labelledby="weight-title">
      <h2 id="weight-title" className="flex items-center gap-2 text-sm font-semibold">
        <Scale className="size-4 text-muted-foreground" aria-hidden />
        {t('weight.title')}
      </h2>

      <form
        className="flex flex-wrap items-end gap-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label={t('weight.value', { unit })} error={error} className="w-36">
          {({ id, describedBy, invalid }) => (
            <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={value} onChange={(e) => setValue(e.target.value)} />
          )}
        </Field>
        <Field label={t('add.date')}>
          {({ id }) => <TextInput id={id} type="date" value={date} max={store.today} onChange={(e) => setDate(e.target.value)} className="w-auto" />}
        </Field>
        <Button type="submit" size="lg">
          {t('weight.add')}
        </Button>
      </form>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('weight.empty')}</p>
      ) : (
        <>
          {sorted.length >= 2 ? <WeightSparkline points={sorted.map((w) => w.kg)} label={t('weight.chart')} /> : <p className="text-xs text-muted-foreground">{t('progress.notEnough')}</p>}
          <ul className="flex flex-col divide-y rounded-xl border">
            {[...sorted].reverse().slice(0, 14).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                <span>{fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="flex items-center gap-1">
                  <span className="font-medium tabular-nums">
                    {show(w.kg)} {unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => void run(() => store.deleteWeight(w.id), { success: t('weight.deleted'), undo: () => store.addWeight(w.date, w.kg) })}
                    aria-label={`${t('common.delete')}: ${fmtDate(w.date, { day: 'numeric', month: 'long' })}`}
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

function WeightSparkline({ points, label }: { points: number[]; label: string }) {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * 100},${36 - ((p - min) / span) * 32}`).join(' ')
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-20 w-full rtl:-scale-x-100" role="img" aria-label={label}>
        <polyline points={coords} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="stroke-primary" />
      </svg>
    </figure>
  )
}
