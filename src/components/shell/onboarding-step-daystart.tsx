
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DayStartField } from '@/components/settings/day-start-field'
import type { StepApi } from './onboarding-steps'

export function DayStartStep({ api }: { api: StepApi }) {
  const { t, dir } = api
  const Next = dir === 'rtl' ? ArrowLeft : ArrowRight
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft
  return (
    <section className="flex flex-1 flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:gap-6 sm:p-7">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{t('onboarding.dayStart')}</h1>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t('onboarding.dayStart.hint')}</p>
      </header>
      <DayStartField value={api.settings.dayStartMinutes} onChange={(m) => void api.setDayStart(m)} />
      <div className="mt-auto flex gap-2 pt-2">
        <Button variant="outline" size="lg" onClick={() => api.setStep(1)} aria-label={t('common.back')}>
          <Back aria-hidden />
        </Button>
        <Button size="lg" className="flex-1" onClick={api.next}>
          {t('common.next')}
          <Next aria-hidden />
        </Button>
      </div>
    </section>
  )
}