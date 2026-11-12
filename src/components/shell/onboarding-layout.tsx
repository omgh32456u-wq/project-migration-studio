
import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { BrandMark } from '@/components/common/brand-mark'
import { useStore } from '@/components/providers/app-store'
import { OnboardingProgress } from './onboarding-progress'
import { OnboardingPlant } from './onboarding-plant'
import { OnboardingIntro } from './onboarding-intro'
import { OnboardingStyles } from './onboarding-styles'
import type { GrowthState } from './onboarding-growths'

/**
 * Responsive onboarding shell.
 * - Mobile/tablet: botanical visual band above the content, safe-area aware.
 * - Desktop (lg+): two-column grid with the full-height visual column.
 * The shell stays mounted across steps; only the content area transitions.
 */
export function OnboardingLayout({
  step,
  total,
  growth,
  children,
}: {
  step: number
  total: number
  growth: GrowthState
  children: ReactNode
}) {
  const { t } = useStore().i18n
  const stepLabel = t('onboarding.step', { n: step + 1, total })

  return (
    <main
      style={{
        backgroundImage:
          'radial-gradient(46rem 30rem at 100% 100%, color-mix(in oklch, var(--primary) 6%, transparent), transparent 70%), radial-gradient(38rem 26rem at 0% 0%, color-mix(in oklch, var(--primary) 4%, transparent), transparent 70%), radial-gradient(120rem 60rem at 50% 118%, color-mix(in oklch, var(--hero-from) 14%, transparent), transparent 72%)',
      }}
      className="relative flex min-h-dvh flex-col lg:grid lg:grid-cols-[0.95fr_1.05fr]"
    >
      <OnboardingIntro />

      <header className="surface-hero relative flex min-h-[30dvh] shrink-0 flex-col overflow-hidden rounded-b-3xl md:min-h-[34dvh] lg:hidden">
        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-8 md:max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark className="size-11" />
              <div className="flex flex-col">
                <span className="text-base font-semibold tracking-tight">{t('app.name')}</span>
                <span className="text-xs text-hero-muted">{stepLabel}</span>
              </div>
            </div>
            <OnboardingProgress step={step} total={total} onHero />
          </div>
          <div className="flex flex-1 items-end justify-center">
            <OnboardingPlant state={growth} className="h-24 w-auto text-hero-foreground sm:h-32 md:h-40" />
          </div>
        </div>
      </header>

      <aside className="surface-hero relative hidden min-h-dvh flex-col overflow-hidden p-10 lg:flex">
        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col xl:max-w-md">
          <div className="flex items-center gap-3">
            <BrandMark className="size-12" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
              <span className="text-xs text-hero-muted">{stepLabel}</span>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center py-10">
            <OnboardingPlant state={growth} className="h-72 w-auto text-hero-foreground xl:h-80" />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-hero-muted">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            {t('onboarding.privacy')}
          </p>
        </div>
      </aside>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-xl sm:px-6 md:pt-7 lg:max-w-lg lg:justify-center lg:px-8 lg:pb-10 lg:pt-10">
        <div className="hidden flex-col gap-3 lg:flex">
          <OnboardingProgress step={step} total={total} />
        </div>
        {children}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground lg:hidden">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          {t('onboarding.privacy')}
        </p>
      </div>
      <OnboardingStyles />
    </main>
  )
}