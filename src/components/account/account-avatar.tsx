import { UserRound } from 'lucide-react'
import { useStore } from '@/components/providers/app-store'
import { initialsFor } from '@/lib/account'
import { cn } from '@/lib/utils'
import { useAccount } from './account-provider'

/** Circular avatar: photo, else initial, else a person icon (guests). Decorative. */
export function AccountAvatar({ className }: { className?: string }) {
  const { account } = useAccount()
  const { settings } = useStore()
  const signedIn = account.status === 'signed_in'
  const own = signedIn && settings.account.userId === account.user.id
  const photo = own ? settings.account.avatar : null
  const initial = signedIn ? initialsFor(own ? settings.account.displayName : '', account.user.email) : ''
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-semibold text-foreground',
        className,
      )}
    >
      {photo ? (
        <img src={photo} alt="" className="size-full object-cover" />
      ) : initial ? (
        initial
      ) : (
        <UserRound className="size-5 text-muted-foreground" />
      )}
    </span>
  )
}

/** Account entry point: guests open sign-up / sign-in, signed-in users their profile. */
export function AvatarButton({ className }: { className?: string }) {
  const { account, openAccount } = useAccount()
  const { t } = useStore().i18n
  return (
    <button
      type="button"
      data-account-avatar=""
      onClick={() => openAccount('sign_up')}
      aria-label={t(account.status === 'signed_in' ? 'account.open' : 'account.openGuest')}
      className={cn('rounded-full transition-transform active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none', className)}
    >
      <AccountAvatar />
    </button>
  )
}
