import { useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { flushSync } from 'react-dom'
import { BrandMark } from '@/components/common/brand-mark'
import { cn } from '@/lib/utils'
import type { Translator } from '@/lib/i18n'
import type { Locale, Settings, ThemePref } from '@/lib/types'
import { OnboardingIntro } from './onboarding-intro'
import { OnboardingProgress } from './onboarding-progress'

type SetPref = (patch: Partial<{ locale: Locale; theme: ThemePref }>) => void

/** Compact EN/AR switch. Each option is a 44px-tall target; the active one is a filled chip. */
function LanguageSwitch({ locale, onChange, label }: { locale: Locale; onChange: (l: Locale) => void; label: string }) {
  const opts: { value: Locale; text: string; name: string }[] = [
    { value: 'en', text: 'EN', name: 'English' },
    { value: 'ar', text: 'AR', name: 'العربية' },
  ]
  return (
    <div role="radiogroup" aria-label={label} dir="ltr" className="flex h-11 items-center rounded-full border bg-muted p-1">
      {opts.map((o) => {
        const active = locale === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.name}
            lang={o.value}
            onClick={() => !active && onChange(o.value)}
            className={cn(
              'h-9 min-w-11 rounded-full px-3 text-xs font-semibold tracking-wide transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              active ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.text}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Circular theme button: Sun in light theme, Moon in dark theme. The new theme is revealed by a quick
 * circular ripple from the button (View Transitions API); falls back to an instant swap when the API is
 * missing or the user prefers reduced motion. The class is applied synchronously inside the transition so
 * the snapshot captures it; the store then persists the same value.
 */
function ThemeToggle({ theme, onChange, t }: { theme: ThemePref; onChange: (th: ThemePref) => void; t: Translator['t'] }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [theme])

  const toggle = () => {
    const root = document.documentElement
    const next: ThemePref = root.classList.contains('dark') ? 'light' : 'dark'
    const apply = () => {
      root.classList.toggle('dark', next === 'dark')
      root.style.colorScheme = next
      flushSync(() => setDark(next === 'dark'))
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    if (!doc.startViewTransition || reduced || !ref.current) {
      apply()
    } else {
      const r = ref.current.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
      const vt = doc.startViewTransition(apply)
      vt.ready
        .then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
          )
        })
        .catch(() => undefined)
    }
    onChange(next)
  }

  const label = t(dark ? 'theme.toLight' : 'theme.toDark')
  return (
    <button
      ref={ref}
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-card text-foreground shadow-soft transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {dark ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
    </button>
  )
}

/** Persistent onboarding header: brand, step progress, language, theme and sound controls. */
export function OnboardingHeader({
  step,
  total,
  settings,
  setPref,
  t,
}: {
  step: number
  total: number
  settings: Settings
  setPref: SetPref
  t: Translator['t']
}) {
  return (
    <header className="flex shrink-0 flex-col gap-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5 lg:invisible">
          <BrandMark className="size-10" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-semibold tracking-tight">{t('app.name')}</span>
            <span className="truncate text-xs text-muted-foreground">{t('onboarding.step', { n: step + 1, total })}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitch locale={settings.locale} onChange={(locale) => setPref({ locale })} label={t('settings.language')} />
          <ThemeToggle theme={settings.theme} onChange={(theme) => setPref({ theme })} t={t} />
          <OnboardingIntro />
        </div>
      </div>
      <OnboardingProgress step={step} total={total} />
    </header>
  )
}
