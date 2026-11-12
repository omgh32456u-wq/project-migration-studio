import { useState, type ReactNode } from 'react'
import { Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { OnboardingPlant } from './onboarding-plant'
import { StepCard, StepHeader, type StepApi } from './onboarding-steps'

/** Brand-coloured icon tile (not the providers' own colours). */
function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', className)}>{children}</span>
}

/** Outline "G" drawn in the Mizano style, single colour via currentColor. */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M19.5 12.2h-7.2M19.5 12.2A7.5 7.5 0 1 1 17.3 6.7" />
    </svg>
  )
}

/**
 * Optional sign-in step. No auth backend exists in this build: providers show an honest "not available"
 * notice and keep the user here; guest access is the prominent primary path.
 */
export function AuthStep({ api, onSkip }: { api: StepApi; onSkip: () => void }) {
  const { t } = api
  const [attempted, setAttempted] = useState(false)
  const tryProvider = () => setAttempted(true)
  const describedBy = attempted ? 'auth-notice' : undefined

  return (
    <StepCard>
      <StepHeader title={t('app.name')} hint={t('auth.explain')} />

      <div className="flex shrink-0 flex-col gap-2">
        <Button variant="outline" size="lg" className="justify-start gap-3 ps-2" onClick={tryProvider} aria-describedby={describedBy}>
          <IconTile className="bg-primary text-primary-foreground">
            <GoogleGlyph />
          </IconTile>
          {t('auth.signin.google')}
        </Button>
        <Button variant="outline" size="lg" className="justify-start gap-3 ps-2" onClick={tryProvider} aria-describedby={describedBy}>
          <IconTile className="bg-brand-lime text-brand-lime-foreground">
            <Mail className="size-[18px]" strokeWidth={2.2} aria-hidden />
          </IconTile>
          {t('auth.signin.email')}
        </Button>
      </div>

      {attempted && (
        <p id="auth-notice" role="status" className="shrink-0 rounded-2xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {t('auth.unavailable')}
        </p>
      )}

      {/* Growth illustration fills spare height on phones only; hidden where space is tight or on desktop (shown in the side column). */}
      <div aria-hidden className="flex min-h-0 flex-1 items-center justify-center short:hidden roomy:hidden lg:hidden">
        <OnboardingPlant state="seed" className="h-full max-h-36 w-auto text-primary" />
      </div>

      <div className="mt-auto flex shrink-0 flex-col gap-2 roomy:mt-2">
        <Button size="lg" onClick={onSkip}>
          <UserRound aria-hidden />
          {t('auth.guest')}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          {t('onboarding.privacy')}
        </p>
      </div>
    </StepCard>
  )
}
