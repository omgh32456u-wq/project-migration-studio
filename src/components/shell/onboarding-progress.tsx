
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useStore } from '@/components/providers/app-store'

/**
 * Screen-reader progress ("Step N of M") plus a compact visual indicator.
 * `onHero` swaps the visual palette for use on the deep-fern gradient panels;
 * the announcement is theme-agnostic. Rendered only after mount so the live
 * region exists before steps change (and so SSR/client markup match).
 */
export function OnboardingProgress({ step, total, onHero = false }: { step: number; total: number; onHero?: boolean }) {
  const { t } = useStore().i18n
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <>
      {mounted && (
        <p className="sr-only" aria-live="polite">
          {t('onboarding.step', { n: step + 1, total })}
        </p>
      )}
      <div className="flex w-full gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => {
          const active = i === step
          const done = i < step
          return (
            <span
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-300',
                active ? 'w-2 opacity-100' : 'opacity-40',
                active ? (onHero ? 'bg-hero-energy' : 'bg-primary') : done ? (onHero ? 'bg-hero-energy/70' : 'bg-primary/70') : onHero ? 'bg-hero-track' : 'bg-border',
              )}
            />
          )
        })}
      </div>
    </>
  )
}