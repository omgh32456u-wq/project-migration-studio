
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notice, Segmented } from '@/components/common/controls'
import { DayStartField } from '@/components/settings/day-start-field'
import { OptionCard } from './onboarding-options'
import type { Translator } from '@/lib/i18n'
import type { AgeGroup, Locale, Profile, Settings, ThemePref, UnitSystem } from '@/lib/types'

export interface StepApi {
  step: number
  dir: 'ltr' | 'rtl'
  settings: Settings
  t: Translator['t']
  setPref: (patch: Partial<{ locale: Locale; theme: ThemePref }>) => void
  setDayStart: (dayStartMinutes: number) => void
  onSetProfile: (patch: Partial<Profile>) => void
  setStep: (n: number) => void
  finish: (profile?: Profile) => void
  /** Advance: 0->1->2->3(adult)/finish(others). Implemented by the controller. */
  next: () => void
}

/** Step heading block, kept uniform across steps. */
function StepHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</h1>
      {hint && <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{hint}</p>}
    </header>
  )
}

/** Nav row pinned to the bottom of the panel. Arrows flip automatically for RTL. */
function StepActions({ api, showBack = true, label }: { api: StepApi; showBack?: boolean; label: string }) {
  const { t, dir, setStep, step } = api
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft
  const Next = dir === 'rtl' ? ArrowLeft : ArrowRight
  return (
    <div className="mt-auto flex gap-2 pt-2">
      {showBack && (
        <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} aria-label={t('common.back')}>
          <Back aria-hidden />
        </Button>
      )}
      <Button size="lg" className="flex-1" onClick={api.next}>
        {label}
        {label !== t('onboarding.finish') && <Next aria-hidden />}
      </Button>
    </div>
  )
}

/** Steps 1–3. Step 4 (adult profile) lives in onboarding-step-profile.tsx. */
export function StepPanel({ api }: { api: StepApi }) {
  const { t, settings, step } = api
  const adult = settings.profile.ageGroup === 'adult'

  return (
    <section className="flex flex-1 flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:gap-6 sm:p-7">
      {step === 0 && (
        <>
          <StepHeader title={t('onboarding.welcome')} hint={t('onboarding.intro')} />
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">{t('settings.language')}</h2>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2" role="radiogroup" aria-label={t('settings.language')}>
              {(
                [
                  ['en', 'English', 'LTR'],
                  ['ar', 'العربية', 'RTL'],
                ] as const
              ).map(([value, label, hint]) => (
                <OptionCard
                  key={value}
                  value={value}
                  checked={settings.locale === value}
                  label={label}
                  hint={hint}
                  radioLabel={t('settings.language')}
                  onChange={(v) => api.setPref({ locale: v as Locale })}
                  lang={value}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">{t('settings.theme')}</h2>
            <Segmented
              label={t('settings.theme')}
              value={settings.theme}
              onChange={(v) => api.setPref({ theme: v })}
              options={(['light', 'dark', 'system'] as const).map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))}
            />
          </div>
          <StepActions api={api} showBack={false} label={t('common.next')} />
        </>
      )}

      {step === 1 && (
        <>
          <StepHeader title={t('onboarding.about')} hint={t('onboarding.about.hint')} />
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('settings.ageGroup')}>
            {(['adult', 'under18', 'unspecified'] as AgeGroup[]).map((g) => (
              <OptionCard
                key={g}
                value={g}
                checked={settings.profile.ageGroup === g}
                label={t(`settings.age.${g}`)}
                radioLabel={t('settings.ageGroup')}
                onChange={(v) => api.onSetProfile({ ageGroup: v as AgeGroup, ...(v !== 'adult' ? { age: null } : {}) })}
              />
            ))}
          </div>
          {settings.profile.ageGroup === 'under18' && <Notice icon={<ShieldCheck />}>{t('onboarding.minorNote')}</Notice>}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">{t('settings.units')}</h2>
            <Segmented
              label={t('settings.units')}
              value={settings.profile.units}
              onChange={(v: UnitSystem) => api.onSetProfile({ units: v })}
              options={(['metric', 'imperial'] as const).map((v) => ({ value: v, label: t(`settings.units.${v}`) }))}
            />
          </div>
          <StepActions api={api} label={t('common.next')} />
        </>
      )}

      {step === 2 && (
        <>
          <StepHeader title={t('onboarding.dayStart')} hint={t('onboarding.dayStart.hint')} />
          <DayStartField value={settings.dayStartMinutes} onChange={(m) => void api.setDayStart(m)} />
          <StepActions api={api} label={adult ? t('common.next') : t('onboarding.finish')} />
        </>
      )}
    </section>
  )
}