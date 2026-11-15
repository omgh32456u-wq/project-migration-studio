import { useEffect, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/components/providers/app-store'
import type { AuthMode } from '@/lib/account'
import { useAccount } from './account-provider'
import { AuthPanel } from './auth-panel'
import { ProfileEditor } from './profile-editor'

/** Centred account panel (sign up / sign in for guests, profile for signed-in users). */
export function AccountSheet({ open, mode, onOpenChange }: { open: boolean; mode: AuthMode; onOpenChange: (o: boolean) => void }) {
  const { t } = useStore().i18n
  const { account } = useAccount()
  const [current, setCurrent] = useState<AuthMode>(mode)
  useEffect(() => {
    if (open) setCurrent(mode)
  }, [open, mode])

  const frame = (title: string, description: ReactNode, body: ReactNode) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sm:max-w-md" closeLabel={t('common.close')}>
        <DialogHeader className="pe-8">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && body}
      </DialogContent>
    </Dialog>
  )

  if (account.status === 'signed_in') {
    return frame(
      t('account.title'),
      account.user.email ? t('account.signedInAs', { email: account.user.email }) : null,
      <ProfileEditor onDone={() => onOpenChange(false)} />,
    )
  }
  return frame(
    t(current === 'sign_up' ? 'auth.signup.title' : 'auth.signin.title'),
    t(current === 'sign_up' ? 'auth.signup.hint' : 'auth.signin.hint'),
    <AuthPanel key={current} mode={current} onModeChange={setCurrent} />,
  )
}
