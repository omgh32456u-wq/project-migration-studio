
import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Field, NativeSelect, Notice, NumberInput, Segmented } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { ADULT_AGE, CM_PER_IN, kgToLb, lbToKg, MIN_AGE, parseLocaleNumber } from '@/lib/nutrition'
import type { ActivityLevel, AgeGroup, Profile, Sex } from '@/lib/types'
import { cn } from '@/lib/utils'

const ACTIVITIES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

const trim1 = (n: number) => String(Math.round(n * 10) / 10)

export function ProfileForm({
  initial,
  onSubmit,
  submitSlot,
  showAgeGroup = true,
  className,
}: {
  initial: Profile
  onSubmit: (p: Profile) => void
  submitSlot: (submit: () => void) => ReactNode
  showAgeGroup?: boolean
  className?: string
}) {
  const { i18n } = useStore()
  const { t } = i18n
  const imperial = initial.units === 'imperial'
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(initial.ageGroup)
  const [age, setAge] = useState(initial.age !== null ? String(initial.age) : '')
  const [sex, setSex] = useState<Sex>(initial.sex)
  const [height, setHeight] = useState(initial.heightCm !== null ? trim1(imperial ? initial.heightCm / CM_PER_IN : initial.heightCm) : '')
  const [weight, setWeight] = useState(initial.weightKg !== null ? trim1(imperial ? kgToLb(initial.weightKg) : initial.weightKg) : '')
  const [activity, setActivity] = useState<ActivityLevel | ''>(initial.activity ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    const errs: Record<string, string> = {}
    const parse = (raw: string) => (raw.trim() === '' ? null : parseLocaleNumber(raw))
    const ageN = parse(age)
    const hN = parse(height)
    const wN = parse(weight)
    // Ages 15–17 and adults enter the same details; only the allowed age range differs.
    const known = ageGroup !== 'unspecified'
    const [minAge, maxAge] = ageGroup === 'under18' ? [MIN_AGE, ADULT_AGE - 1] : [ADULT_AGE, 100]
    if (known && age.trim() !== '' && (ageN === null || ageN < minAge || ageN > maxAge || !Number.isInteger(ageN)))
      errs.age = t(ageGroup === 'under18' ? 'settings.ageErrorTeen' : 'settings.ageError')
    const heightCm = hN === null ? null : imperial ? hN * CM_PER_IN : hN
    if (height.trim() !== '' && (heightCm === null || heightCm < 50 || heightCm > 250)) errs.height = t('common.invalidNumber')
    const weightKg = wN === null ? null : imperial ? lbToKg(wN) : wN
    if (weight.trim() !== '' && (weightKg === null || weightKg < 20 || weightKg > 400)) errs.weight = t('weight.error')
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSubmit({
      ...initial,
      ageGroup,
      age: known ? ageN : null,
      sex: known ? sex : initial.sex,
      heightCm: heightCm === null ? null : Math.round(heightCm * 10) / 10,
      weightKg: weightKg === null ? null : Math.round(weightKg * 10) / 10,
      activity: known && activity ? activity : known ? null : initial.activity,
    })
  }

  return (
    <form
      className={cn('flex flex-col gap-4', className)}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      noValidate
    >
      {showAgeGroup && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t('settings.ageGroup')}</span>
          <Segmented
            label={t('settings.ageGroup')}
            value={ageGroup}
            onChange={setAgeGroup}
            options={(['adult', 'under18', 'unspecified'] as const).map((v) => ({ value: v, label: t(`settings.age.${v}`) }))}
          />
        </div>
      )}
      {ageGroup === 'under18' && (
        <p role="note" className="rounded-xl border border-minor/40 px-3 py-1.5 text-xs text-minor">
          {t('onboarding.age.under18')}
        </p>
      )}
      {ageGroup === 'unspecified' && <Notice icon={<Info />}>{t('targets.ageUnknown')}</Notice>}

      {ageGroup !== 'unspecified' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.age')} error={errors.age}>
            {({ id, describedBy, invalid }) => (
              <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
            )}
          </Field>
          <Field label={t('settings.sex')}>
            {({ id }) => (
              <NativeSelect id={id} value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                {(['female', 'male', 'unspecified'] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`settings.sex.${s}`)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label={t('settings.activity')} className="sm:col-span-2">
            {({ id }) => (
              <NativeSelect id={id} value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel | '')}>
                <option value="">{t('activity.none')}</option>
                {ACTIVITIES.map((a) => (
                  <option key={a} value={a}>
                    {t(`activity.${a}`)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {ageGroup !== 'unspecified' && (
          <Field label={t('settings.height', { unit: t(imperial ? 'unit.in' : 'unit.cm') })} error={errors.height}>
            {({ id, describedBy, invalid }) => (
              <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={height} onChange={(e) => setHeight(e.target.value)} />
            )}
          </Field>
        )}
        <Field label={t('settings.weight', { unit: t(imperial ? 'unit.lb' : 'unit.kg') })} error={errors.weight} hint={t('common.optional')}>
          {({ id, describedBy, invalid }) => (
            <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={weight} onChange={(e) => setWeight(e.target.value)} />
          )}
        </Field>
      </div>
      {submitSlot(submit)}
    </form>
  )
}