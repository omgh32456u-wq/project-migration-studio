
import { Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AlertTriangle, BookOpen, CalendarDays, ChartColumn, Settings } from 'lucide-react'
import { BrandMark } from '@/components/common/brand-mark'
import { useStore } from '@/components/providers/app-store'
import type { MessageKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Onboarding } from './onboarding'

const NAV: { href: '/' | '/foods' | '/progress' | '/settings'; label: MessageKey; icon: typeof CalendarDays }[] = [
  { href: '/', label: 'nav.today', icon: CalendarDays },
  { href: '/foods', label: 'nav.foods', icon: BookOpen },
  { href: '/progress', label: 'nav.progress', icon: ChartColumn },
  { href: '/settings', label: 'nav.settings', icon: Settings },
]

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function AppShell({ children }: { children: ReactNode }) {
  const store = useStore()
  const pathname = useLocation({ select: (l) => l.pathname })
  const { t } = store.i18n

  if (store.status === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status" aria-live="polite">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-[28%] bg-primary/25 motion-reduce:hidden" aria-hidden />
          <BrandMark className="relative size-16 shadow-lift" />
        </div>
        <p className="animate-fade-in text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (store.status === 'error' || store.status === 'blocked' || store.status === 'stale') {
    const message = store.status === 'blocked' ? 'data.blocked' : store.status === 'stale' ? 'data.versionChanged' : 'common.error'
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
        <AlertTriangle className={cn('size-8', store.status === 'error' ? 'text-destructive' : 'text-warning')} aria-hidden />
        <p className="max-w-sm text-sm">{t(message)}</p>
        <button type="button" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow" onClick={() => window.location.reload()}>
          {t(store.status === 'error' ? 'common.retry' : 'data.reload')}
        </button>
      </div>
    )
  }

  if (!store.settings.profile.onboarded) return <Onboarding />

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-e bg-card/70 px-4 py-7 backdrop-blur-md lg:flex">
        <div className="flex items-center gap-3 px-2">
          <BrandMark className="size-10" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-base font-semibold tracking-tight">{t('app.name')}</span>
            <span className="truncate text-xs text-muted-foreground">{t('onboarding.privacy')}</span>
          </div>
        </div>
        <nav aria-label={t('nav.main')} className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                to={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200',
                  active ? 'bg-accent text-accent-foreground shadow-soft' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {active && <span className="absolute inset-y-2.5 start-0 w-1 rounded-full bg-primary" aria-hidden />}
                <Icon className="size-5" aria-hidden />
                {t(label)}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!store.persistent && (
          <div role="alert" className="flex items-center gap-2 bg-warning px-4 py-2 text-xs font-medium text-warning-foreground">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {t('data.notPersistent')}
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      <nav
        aria-label={t('nav.main')}
        className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-3xl shadow-lift lg:hidden"
      >
        <ul className="grid grid-cols-4 p-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  to={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium transition-all duration-200 active:scale-95',
                    active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-5 transition-transform duration-200', active && 'scale-110')} aria-hidden />
                  {t(label)}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
