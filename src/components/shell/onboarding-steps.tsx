import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Translator } from '@/lib/i18n'
import type { Locale, Profile, Settings, ThemePref } from '@/lib/types'

export interface StepApi {
  step: number
  dir: 'ltr' | 'rtl'
  settings: Settings
  t: Translator['t']
  setPref: (patch: Partial<{ locale: Locale; theme: ThemePref }>) => void
  setDayStart: (dayStartMinutes: number) => void
  onSetProfile: (patch: Partial<Profile>) => void
  setStep: (n: number) => void
  finish: (profile?: Profile) => void
  next: () => void
}

/**
 * Step card. Fills the remaining height on phones (actions pinned to the bottom) and becomes an
 * auto-height, vertically centred card when there is room (tablet/desktop).
 */
export function StepCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4 rounded-3xl border bg-card p-5 shadow-soft sm:p-7 short:gap-3 short:p-4 roomy:flex-none',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function StepHeader({ title, hint, className }: { title: string; hint?: string; className?: string }) {
  return (
    <header className={cn('flex shrink-0 flex-col gap-1.5', className)}>
      <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl short:text-lg">{title}</h1>
      {hint && <p className="text-sm leading-relaxed text-pretty text-muted-foreground tiny:hidden">{hint}</p>}
    </header>
  )
}

/** Bottom action row; arrows flip for RTL. */
export function StepActions({ api, children, onBack }: { api: StepApi; children: ReactNode; onBack?: () => void }) {
  const Back = api.dir === 'rtl' ? ArrowRight : ArrowLeft
  return (
    <div className="mt-auto flex w-full shrink-0 gap-2 pt-1 roomy:mt-2">
      {onBack && (
        <Button variant="outline" size="lg" className="w-12 px-0" onClick={onBack} aria-label={api.t('common.back')}>
          <Back aria-hidden />
        </Button>
      )}
      {children}
    </div>
  )
}

export function NextArrow({ dir }: { dir: 'ltr' | 'rtl' }) {
  const Next = dir === 'rtl' ? ArrowLeft : ArrowRight
  return <Next aria-hidden />
}
