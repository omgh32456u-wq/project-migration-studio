import { Languages, UtensilsCrossed, WifiOff } from 'lucide-react'
import { BrandMark } from '@/components/common/brand-mark'
import { Button } from '@/components/ui/button'
import { NextArrow, StepActions, StepCard, StepHeader, type StepApi } from './onboarding-steps'

/** Welcome: what Mizano is. Language/theme live in the persistent header, not here. */
export function WelcomePanel({ api }: { api: StepApi }) {
  const { t } = api
  const points = [
    { icon: UtensilsCrossed, text: t('onboarding.point.foods') },
    { icon: Languages, text: t('onboarding.point.lang') },
    { icon: WifiOff, text: t('onboarding.point.offline') },
  ]
  return (
    <StepCard>
      <BrandMark className="mx-auto size-20 sm:size-24 short:hidden lg:hidden" />
      <StepHeader title={t('onboarding.welcome')} hint={t('onboarding.intro')} />
      <ul className="flex shrink-0 flex-col gap-2">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5 text-sm font-medium short:py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <StepActions api={api} onBack={() => api.setStep(0)}>
        <Button size="lg" className="flex-1" onClick={api.next}>
          {t('common.next')}
          <NextArrow dir={api.dir} />
        </Button>
      </StepActions>
    </StepCard>
  )
}
