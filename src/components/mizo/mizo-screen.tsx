import { LogIn, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AvatarButton } from '@/components/account/account-avatar'
import { useAccount } from '@/components/account/account-provider'
import { Card, PageHeader } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { mizoAccess } from '@/lib/account'
import type { ChatStore } from '@/lib/mizo/chat-store'
import type { MizoTransport } from '@/lib/mizo/client'
import { MizoGlyph, MizoWorkspace } from './mizo-workspace'

/**
 * Mizo destination. Guests only ever get the sign-up / sign-in invitation: the chat workspace and its
 * history are never mounted for them. Signed-in users of any supported age (15–17 included) get the
 * workspace, keyed by account id so switching accounts remounts it with that account's history only.
 */
export function MizoScreen({ chatStore, transport }: { chatStore?: ChatStore; transport?: MizoTransport }) {
  const { t } = useStore().i18n
  const account = useAccount()
  const access = mizoAccess(account.account)

  if (account.account.status === 'signed_in') {
    return (
      <div className="flex flex-col" data-mizo={access}>
        <PageHeader title={t('mizo.title')} actions={<AvatarButton className="lg:hidden" />} />
        <MizoWorkspace key={account.account.user.id} userId={account.account.user.id} store={chatStore} transport={transport} />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader title={t('mizo.title')} actions={<AvatarButton className="lg:hidden" />} />
      <Card className="mx-auto flex w-full max-w-xl animate-rise flex-col items-center gap-4 px-6 py-10 text-center sm:px-10" data-mizo={access}>
        <MizoGlyph />
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-balance">{t('mizo.gate.title')}</h2>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t('mizo.gate.body')}</p>
        </div>
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
      </Card>
    </div>
  )
}
