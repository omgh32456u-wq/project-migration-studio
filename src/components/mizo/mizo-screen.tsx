import { Bot, LogIn, Sparkles, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AvatarButton } from '@/components/account/account-avatar'
import { useAccount } from '@/components/account/account-provider'
import { Card, PageHeader } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { mizoAccess } from '@/lib/account'

/**
 * Mizo destination. Guests see a sign-up / sign-in prompt; any signed-in user (any age) sees the
 * assistant's space. No assistant service exists yet, so it is an honest empty state — no fake answers.
 */
export function MizoScreen() {
  const { t } = useStore().i18n
  const account = useAccount()
  const access = mizoAccess(account.account)

  return (
    <div className="flex flex-col">
      <PageHeader title={t('mizo.title')} actions={<AvatarButton className="lg:hidden" />} />
      <Card className="mx-auto flex w-full max-w-xl animate-rise flex-col items-center gap-4 px-6 py-10 text-center sm:px-10" data-mizo={access}>
        <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground ring-8 ring-accent/40" aria-hidden>
          {access === 'open' ? <Sparkles className="size-7" /> : <Bot className="size-7" />}
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-balance">{t(access === 'open' ? 'mizo.empty.title' : 'mizo.gate.title')}</h2>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t(access === 'open' ? 'mizo.empty.body' : 'mizo.gate.body')}</p>
        </div>
        {access === 'needs_account' && (
          <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-sm sm:flex-row">
            <Button size="lg" className="sm:flex-1" onClick={() => account.openAccount('sign_up')}>
              <UserPlus aria-hidden />
              {t('auth.toSignUp')}
            </Button>
            <Button size="lg" variant="outline" className="sm:flex-1" onClick={() => account.openAccount('sign_in')}>
              <LogIn aria-hidden />
              {t('auth.toSignIn')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
