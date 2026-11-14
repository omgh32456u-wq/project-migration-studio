import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AuthPanel } from '@/components/account/auth-panel'
import type { AuthMode } from '@/lib/account'
import { StepCard, StepHeader, type StepApi } from './onboarding-steps'

/**
 * Optional account step: distinct sign-up and sign-in views inside this one step (no extra steps).
 * Guest stays a first-class path; a successful sign-in also moves on.
 */
export function AuthStep({ api, onSkip }: { api: StepApi; onSkip: () => void }) {
  const { t } = api
  const [mode, setMode] = useState<AuthMode>('sign_up')

  return (
    <StepCard>
      <AuthPanel
        fill
        mode={mode}
        onModeChange={setMode}
        onGuest={onSkip}
        renderHeader={(title, hint) => <StepHeader title={title} hint={hint} />}
        note={
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            {t('onboarding.privacy')}
          </p>
        }
      />
    </StepCard>
  )
}
