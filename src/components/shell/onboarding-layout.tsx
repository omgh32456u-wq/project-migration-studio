import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { BrandMark } from '@/components/common/brand-mark'
import { useStore } from '@/components/providers/app-store'
import { OnboardingStyles } from './onboarding-styles'

/**
 * Onboarding shell. It is pinned to the visible viewport (fixed, h-dvh, overflow hidden) so no step ever
 * scrolls the page; steps compact themselves with the short/tiny/landscape-short variants instead.
 * - Phone/tablet: header on top, the step card below (filling the height on phones, centred on tablets).
 * - Desktop (lg+): a calm brand column on the start side, the header and step on the other.
 * Background is the plain theme background — no gradients.
 */
export function OnboardingLayout({ header, children }: { header: ReactNode; children: ReactNode }) {
  const { t } = useStore().i18n
  return (
    <main className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-background lg:flex-row">
      <aside className="hidden w-[min(40%,30rem)] shrink-0 flex-col border-e bg-card px-10 py-10 lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark className="size-11" />
          <span className="text-xl font-semibold tracking-tight">{t('app.name')}</span>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center py-8">
          <BrandMark className="size-40 max-h-full xl:size-48" />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          {t('onboarding.privacy')}
        </p>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] sm:gap-4 sm:px-6 sm:pt-[max(1rem,env(safe-area-inset-top))] lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-md sm:max-w-xl landscape-short:max-w-4xl lg:max-w-xl">{header}</div>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col sm:max-w-xl roomy:justify-center landscape-short:max-w-4xl lg:max-w-xl">
          {children}
        </div>
      </div>
      <OnboardingStyles />
    </main>
  )
}
