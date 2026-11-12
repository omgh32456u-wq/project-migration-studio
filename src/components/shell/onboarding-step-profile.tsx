
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/settings/profile-form'
import type { StepApi } from './onboarding-steps'

/** Step 4 — optional adult profile. Preserves ProfileForm behavior exactly. */
export function ProfileStep({ api }: { api: StepApi }) {
  const { t, settings } = api
  return (
    <section className="flex flex-1 flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:gap-6 sm:p-7">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{t('onboarding.profile')}</h1>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t('onboarding.profile.hint')}</p>
      </header>
      <ProfileForm
        initial={settings.profile}
        showAgeGroup={false}
        className="flex-1"
        onSubmit={(p) => api.finish(p)}
        submitSlot={() => (
          <div className="mt-auto flex gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => api.finish()}>
              {t('common.skip')}
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              {t('onboarding.finish')}
            </Button>
          </div>
        )}
      />
    </section>
  )
}