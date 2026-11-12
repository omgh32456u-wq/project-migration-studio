
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { Wheel, type WheelItem } from './onboarding-wheel'
import { SexSelect, ActivitySelect } from './onboarding-pickers'
import type { StepApi } from './onboarding-steps'
import type { MessageKey } from '@/lib/i18n'

/**
 * Consolidated profile step: age/height/weight wheels, sex, activity.
 * Replaces the old age-group step and the old adult ProfileForm step.
 * Units are no longer part of onboarding (metric default; Imperial in Settings).
 * Every field stays optional: untouched wheels keep null values, and the
 * Skip action finishes onboarding without saving any example value.
 */

const AGE_MIN = 15
const AGE_MAX = 100
const HEIGHT_MIN = 120
const HEIGHT_MAX = 220
const WEIGHT_MIN = 30
const WEIGHT_MAX = 200

const PRESENT_AGE = 25
const PRESENT_H = 170
const PRESENT_W = 70

export function ProfileWheelsStep({ api }: { api: StepApi }) {
  const { t, settings, onSetProfile, finish } = api
  const { fmtNum } = useStore().i18n
  const profile = settings.profile
  const age = profile.age
  const under18 = age !== null && age < 18

  const ages: WheelItem[] = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => {
    const a = AGE_MIN + i
    return {
      value: a,
      label: fmtNum(a),
      tone: a < 18 ? 'text-warning' : a === 18 ? 'text-primary' : undefined,
    }
  })
  const heights: WheelItem[] = Array.from({ length: HEIGHT_MAX - HEIGHT_MIN + 1 }, (_, i) => ({
    value: HEIGHT_MIN + i,
    label: fmtNum(HEIGHT_MIN + i) + ' cm',
  }))
  const weights: WheelItem[] = []
  for (let w = WEIGHT_MIN * 10; w <= WEIGHT_MAX * 10; w += 5) {
    weights.push({ value: w, label: fmtNum(w / 10, 1) })
  }

  // Wheels show a presentable position for null values, but only commit
  // the value once the user actually scrolls. This keeps Skip clean.
  const commitAge = (a: number) => onSetProfile({ age: a, ageGroup: a >= 18 ? 'adult' : 'under18' })
  const commitHeight = (h: number) => onSetProfile({ heightCm: h })
  const commitWeight = (w: number) => onSetProfile({ weightKg: Math.round(w) / 10 })

  return (
    <section className="flex flex-1 flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:gap-6 sm:p-7">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{t('onboarding.profile')}</h1>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t('onboarding.profile.hint2')}</p>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t('settings.age')}</span>
          <Wheel items={ages} value={age ?? PRESENT_AGE} onChange={commitAge} label={t('settings.age')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t('settings.height', { unit: t('unit.cm') })}</span>
          <Wheel
            items={heights}
            value={profile.heightCm ?? PRESENT_H}
            onChange={commitHeight}
            label={t('settings.height', { unit: t('unit.cm') })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t('settings.weight', { unit: t('unit.kg') })}</span>
          <Wheel
            items={weights}
            value={Math.round((profile.weightKg ?? PRESENT_W) * 10)}
            onChange={commitWeight}
            label={t('settings.weight', { unit: t('unit.kg') })}
          />
        </div>
      </div>

      {under18 && <Notice>{t('onboarding.age.under18')}</Notice>}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t('settings.sex')}</span>
        <SexSelect value={profile.sex} onChange={(s) => onSetProfile({ sex: s })} t={(k) => t(k as MessageKey)} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t('settings.activity')}</span>
        <ActivitySelect value={profile.activity} onChange={(a) => onSetProfile({ activity: a })} t={(k) => t(k as MessageKey)} />
      </div>

      <div className="mt-auto flex gap-2 pt-2">
        <Button variant="outline" size="lg" onClick={() => finish()}>
          {t('common.skip')}
        </Button>
        <Button size="lg" className="flex-1" onClick={() => finish()}>
          {t('onboarding.finish')}
        </Button>
      </div>
    </section>
  )
}