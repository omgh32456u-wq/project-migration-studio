
import { useState } from 'react'
import { Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/components/providers/app-store'

/**
 * Optional sign-in step shown once before the main onboarding steps.
 * No auth backend exists in this build: providers show an honest "not
 * available" notice and keep the user on this step; guest access is the
 * prominent primary path. Nothing about the local app is gated on sign-in.
 */
export function AuthStep({ onSkip }: { onSkip: () => void }) {
  const { t } = useStore().i18n
  const [attempted, setAttempted] = useState(false)

  const tryProvider = () => setAttempted(true)

  return (
    <section className="flex flex-1 flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft sm:gap-6 sm:p-7">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{t('app.name')}</h1>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t('auth.explain')}</p>
      </header>

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="lg" onClick={tryProvider} aria-describedby={attempted ? 'auth-notice' : undefined}>
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              fill="currentColor"
              d="M21.35 11.1H12v2.8h5.35c-.25 1.3-1.7 3.8-5.35 3.8-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.85 0 3.1.8 3.8 1.45l2.6-2.5C16.6 2.55 14.5 1.7 12 1.7 6.85 1.7 2.7 5.85 2.7 11s4.15 9.3 9.3 9.3c5.4 0 8.95-3.8 8.95-9.15 0-.6-.05-1.05-.6-1.05Z"
            />
          </svg>
          {t('auth.signin.google')}
        </Button>
        <Button variant="outline" size="lg" onClick={tryProvider} aria-describedby={attempted ? 'auth-notice' : undefined}>
          <Mail aria-hidden />
          {t('auth.signin.email')}
        </Button>
      </div>

      {attempted && (
        <p id="auth-notice" role="status" className="rounded-2xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {t('auth.unavailable')}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <Button size="lg" onClick={onSkip}>
          <UserRound aria-hidden />
          {t('auth.guest')}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          {t('onboarding.privacy')}
        </p>
      </div>
    </section>
  )
}