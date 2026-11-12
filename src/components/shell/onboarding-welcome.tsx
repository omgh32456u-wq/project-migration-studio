
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/common/controls'
import { OptionCard } from './onboarding-options'
import type { StepApi } from './onboarding-steps'

export function WelcomePanel({ api }: { api: StepApi }) {
  const { t } = api
  const Next = api.dir === 'rtl' ? ArrowLeft : ArrowRight
  return (
    <section className="flex flex-1 flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:gap-6 sm:p-7">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{t('onboarding.welcome')}</h1>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t('onboarding.intro')}</p>
      </header>
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t('settings.language')}</h2>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2" role="radiogroup" aria-label={t('settings.language')}>
          <OptionCard value="en" checked={api.settings.locale === 'en'} label="English" hint="LTR" radioLabel={t('settings.language')} onChange={(v) => api.setPref({ locale: v as 'en' | 'ar' })} lang="en" />
          <OptionCard value="ar" checked={api.settings.locale === 'ar'} label="العربية" hint="RTL" radioLabel={t('settings.language')} onChange={(v) => api.setPref({ locale: v as 'en' | 'ar' })} lang="ar" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t('settings.theme')}</h2>
        <Segmented label={t('settings.theme')} value={api.settings.theme} onChange={(v) => api.setPref({ theme: v })} options={[{ value: 'light', label: t('settings.theme.light') }, { value: 'dark', label: t('settings.theme.dark') }, { value: 'system', label: t('settings.theme.system') }]} />
      </div>
      <div className="mt-auto flex gap-2 pt-2">
        <Button size="lg" className="flex-1" onClick={api.next}>
          {t('common.next')}
          <Next aria-hidden />
        </Button>
      </div>
    </section>
  )
}