
import { useState } from 'react'
import { Info } from 'lucide-react'
import { AvatarButton } from '@/components/account/account-avatar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Field, Notice, PageHeader, Segmented, TextInput } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { MEAL_SLOTS, type MealSlot, type Profile } from '@/lib/types'
import { DataCard } from './data-card'
import { DayStartField } from './day-start-field'
import { ProfileForm } from './profile-form'
import { RemindersCard } from './reminders-card'

// Exact attribution requested by the owner; name and phone are identical in both locales and always LTR.
const CREDITS_NAME = 'Omar Elhady'
const CREDITS_PHONE = '01001246641'
import { SettingsSection } from './settings-section'
import { TargetsCard } from './targets-card'

export function SettingsScreen() {
  const { t } = useStore().i18n
  return (
    <div className="flex flex-col">
      <PageHeader title={t('settings.title')} actions={<AvatarButton className="lg:hidden" />} />
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          <PreferencesCard />
          <DayStartCard />
          <ProfileCard />
          <MealNamesCard />
          <RemindersCard />
        </div>
        <div className="flex flex-col gap-5">
          <TargetsCard />
          <DataCard />
          <SettingsSection id="about" title={t('about.title')}>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('about.body')}</p>
            <Notice icon={<Info />}>{t('about.install')}</Notice>
            <p className="flex flex-col items-center gap-0.5 text-center text-xs text-muted-foreground">
              <span>{t('about.createdBy')}</span>
              <span dir="ltr">{CREDITS_NAME}</span>
              <span dir="ltr" className="tabular-nums">
                {CREDITS_PHONE}
              </span>
            </p>
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}

function PreferencesCard() {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  const { settings } = store
  const update = (fn: Parameters<typeof store.updateSettings>[0]) => run(() => store.updateSettings(fn))

  return (
    <SettingsSection id="preferences" title={t('settings.preferences')}>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t('settings.language')}</span>
        <Segmented
          label={t('settings.language')}
          value={settings.locale}
          onChange={(locale) => update((s) => ({ ...s, locale }))}
          options={[
            { value: 'en', label: <span lang="en">English</span> },
            { value: 'ar', label: <span lang="ar">العربية</span> },
          ]}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t('settings.theme')}</span>
        <Segmented
          label={t('settings.theme')}
          value={settings.theme}
          onChange={(theme) => update((s) => ({ ...s, theme }))}
          options={(['light', 'dark', 'system'] as const).map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t('settings.units')}</span>
        <Segmented
          label={t('settings.units')}
          value={settings.profile.units}
          onChange={(units) => update((s) => ({ ...s, profile: { ...s.profile, units } }))}
          options={(['metric', 'imperial'] as const).map((v) => ({ value: v, label: t(`settings.units.${v}`) }))}
        />
      </div>
    </SettingsSection>
  )
}

function DayStartCard() {
  const store = useStore()
  const { t } = store.i18n
  return (
    <SettingsSection id="day-start" title={t('dayStart.title')}>
      {/* Re-mount when the saved value changes (e.g. saved in another tab) so the draft never goes stale. */}
      <DayStartForm key={store.settings.dayStartMinutes} saved={store.settings.dayStartMinutes} />
    </SettingsSection>
  )
}

function DayStartForm({ saved }: { saved: number }) {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  const [draft, setDraft] = useState(saved)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void run(() => store.updateSettings((s) => ({ ...s, dayStartMinutes: draft })), { success: t('settings.saved') })
      }}
    >
      <DayStartField value={draft} onChange={setDraft} />
      <Notice icon={<Info />}>{t('dayStart.settingsNote')}</Notice>
      <Button type="submit" size="lg" className="self-start" disabled={draft === saved}>
        {t('common.save')}
      </Button>
    </form>
  )
}

function ProfileCard() {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  const { profile } = store.settings

  const saveProfile = (p: Profile) =>
    run(
      () =>
        store.updateSettings((s) => ({
          ...s,
          profile: { ...p, onboarded: true },
          // Optional targets need a known age; age itself never blocks them.
          targets: p.ageGroup === 'unspecified' ? { ...s.targets, enabled: false } : s.targets,
        })),
      { success: t('settings.profileSaved') },
    )

  return (
    <SettingsSection id="profile" title={t('settings.profile')} description={t('settings.profile.hint')}>
      <ProfileForm
        key={`${profile.units}:${profile.ageGroup}:${profile.age}:${profile.heightCm}:${profile.weightKg}:${profile.activity}:${profile.sex}`}
        initial={profile}
        onSubmit={(p) => void saveProfile(p)}
        submitSlot={() => (
          <Button type="submit" size="lg" className="self-start">
            {t('common.save')}
          </Button>
        )}
      />
      <label className="flex min-h-11 items-center justify-between gap-3 border-t pt-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{t('settings.trackWeight')}</span>
          <span className="text-xs text-muted-foreground">{t('settings.trackWeight.hint')}</span>
        </span>
        <Switch
          checked={profile.trackWeight}
          onCheckedChange={(trackWeight) => void run(() => store.updateSettings((s) => ({ ...s, profile: { ...s.profile, trackWeight } })))}
        />
      </label>
    </SettingsSection>
  )
}

function MealNamesCard() {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  const [names, setNames] = useState<Partial<Record<MealSlot, string>>>(store.settings.mealNames)

  return (
    <SettingsSection id="meal-names" title={t('settings.mealNames')} description={t('settings.mealNames.hint')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const cleaned = Object.fromEntries(
            Object.entries(names)
              .map(([k, v]) => [k, (v ?? '').trim()])
              .filter(([, v]) => v),
          ) as Partial<Record<MealSlot, string>>
          void run(() => store.updateSettings((s) => ({ ...s, mealNames: cleaned })), { success: t('settings.saved') })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {MEAL_SLOTS.map((slot) => (
            <Field key={slot} label={t(`meal.${slot}`)}>
              {({ id }) => (
                <TextInput id={id} value={names[slot] ?? ''} placeholder={t(`meal.${slot}`)} maxLength={40} onChange={(e) => setNames((n) => ({ ...n, [slot]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
        <Button type="submit" size="lg" className="self-start">
          {t('common.save')}
        </Button>
      </form>
    </SettingsSection>
  )
}
