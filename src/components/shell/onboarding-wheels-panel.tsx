import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/components/providers/app-store'
import { dayStartToTime, parseTimeInput } from '@/lib/nutrition-day'
import type { MessageKey } from '@/lib/i18n'
import { Wheel, type WheelItem } from './onboarding-wheel'
import { SexSelect, ActivitySelect } from './onboarding-pickers'
import { StepActions, StepCard, StepHeader, type StepApi } from './onboarding-steps'

const AGE_MIN = 15
const AGE_MAX = 100
const HEIGHT_MIN = 120
const HEIGHT_MAX = 220
const WEIGHT_MIN = 30
const WEIGHT_MAX = 200
const PRESENT_AGE = 25
const PRESENT_H = 170
const PRESENT_W = 70

/** Age wheel colouring: 15–17 amber (minor), 18 marked as the adult threshold, others neutral. */
export function ageTone(age: number): WheelItem['tone'] {
  return age < 18 ? 'minor' : age === 18 ? 'threshold' : undefined
}

/** 3 wheel rows on short viewports, 4 otherwise. Starts at 4 (SSR/first paint) and corrects after mount. */
function useWheelRows(): 3 | 4 {
  const [rows, setRows] = useState<3 | 4>(4)
  useEffect(() => {
    const mq = window.matchMedia('(max-height: 719px)')
    const update = () => setRows(mq.matches ? 3 : 4)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return rows
}

function Label({ children, aside }: { children: string; aside?: string }) {
  return (
    <span className="flex min-w-0 items-baseline justify-between gap-2 text-xs font-medium text-muted-foreground">
      <span className="truncate">{children}</span>
      {aside && <span className="truncate font-semibold text-primary">{aside}</span>}
    </span>
  )
}

/**
 * Profile step (last step): age/height/weight wheels, sex, activity and the day-start time.
 * Laid out to fit without scrolling: one column normally, two columns on short landscape screens.
 */
export function ProfileWheelsPanel({ api }: { api: StepApi }) {
  const { t, settings, onSetProfile, finish } = api
  const { fmtNum } = useStore().i18n
  const rows = useWheelRows()
  const profile = settings.profile
  const age = profile.age
  const under18 = age !== null && age < 18
  const lt = (k: string) => t(k as MessageKey)

  const ages: WheelItem[] = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => {
    const a = AGE_MIN + i
    return { value: a, label: fmtNum(a), tone: ageTone(a) }
  })
  const heights: WheelItem[] = Array.from({ length: HEIGHT_MAX - HEIGHT_MIN + 1 }, (_, i) => ({
    value: HEIGHT_MIN + i,
    label: fmtNum(HEIGHT_MIN + i),
  }))
  const weights: WheelItem[] = []
  for (let w = WEIGHT_MIN * 10; w <= WEIGHT_MAX * 10; w += 5) weights.push({ value: w, label: fmtNum(w / 10, 1) })

  const commitAge = (a: number) => onSetProfile({ age: a, ageGroup: a >= 18 ? 'adult' : 'under18' })
  const commitHeight = (h: number) => onSetProfile({ heightCm: h })
  const commitWeight = (w: number) => onSetProfile({ weightKg: Math.round(w) / 10 })
  const dayStart = (className: string) => (
    <label className={'items-center justify-between gap-3 rounded-2xl bg-muted px-3 py-1.5 ' + className}>
      <span className="min-w-0 text-sm font-medium">{t('onboarding.dayStart.short')}</span>
      <input
        type="time"
        dir="ltr"
        value={dayStartToTime(settings.dayStartMinutes)}
        onChange={(e) => {
          const m = parseTimeInput(e.target.value)
          if (m !== null) api.setDayStart(m)
        }}
        className="h-10 w-32 shrink-0 rounded-lg border border-input bg-card px-2 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      />
    </label>
  )
  const actions = (className: string) => (
    <div className={className}>
      <StepActions api={api} onBack={() => api.setStep(1)}>
        <Button variant="outline" size="lg" onClick={() => finish()}>
          {t('common.skip')}
        </Button>
        <Button size="lg" className="flex-1" onClick={() => finish()}>
          {t('onboarding.finish')}
        </Button>
      </StepActions>
    </div>
  )
  const heightLabel = t('settings.height', { unit: t('unit.cm') })
  const weightLabel = t('settings.weight', { unit: t('unit.kg') })

  return (
    <StepCard>
      <StepHeader title={t('onboarding.profile')} hint={t('onboarding.profile.hint2')} className="landscape-short:hidden" />

      <div className="flex min-h-0 flex-col gap-3 landscape-short:grid landscape-short:grid-cols-2 landscape-short:gap-5">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <Label>{t('settings.age')}</Label>
              <Wheel items={ages} value={age ?? PRESENT_AGE} onChange={commitAge} label={t('settings.age')} rows={rows} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label>{heightLabel}</Label>
              <Wheel items={heights} value={profile.heightCm ?? PRESENT_H} onChange={commitHeight} label={heightLabel} rows={rows} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label>{weightLabel}</Label>
              <Wheel items={weights} value={Math.round((profile.weightKg ?? PRESENT_W) * 10)} onChange={commitWeight} label={weightLabel} rows={rows} />
            </div>
          </div>
          {under18 && (
            <p role="status" className="rounded-xl border border-minor/40 px-3 py-1.5 text-xs font-medium text-minor">
              {t('onboarding.age.under18')}
            </p>
          )}
          {/* On short landscape screens the day-start row sits under the wheels to balance the columns. */}
          {dayStart('hidden landscape-short:flex')}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label>{t('settings.sex')}</Label>
            <SexSelect value={profile.sex} onChange={(s) => onSetProfile({ sex: s })} t={lt} />
          </div>
          <div className="flex flex-col gap-1">
            <Label aside={profile.activity ? t(`activity.${profile.activity}` as MessageKey) : undefined}>{t('settings.activity')}</Label>
            <ActivitySelect value={profile.activity} onChange={(a) => onSetProfile({ activity: a })} t={lt} />
          </div>
          {dayStart('flex landscape-short:hidden')}
          {/* Short landscape: actions sit in this column so both columns fit the height. */}
          {actions('hidden landscape-short:flex')}
        </div>
      </div>

      {actions('mt-auto flex roomy:mt-2 landscape-short:hidden')}
    </StepCard>
  )
}
