import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, TextInput } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { firstNameFrom, type AccountUser, type AuthErrorCode } from '@/lib/account'
import { MAX_DISPLAY_NAME } from '@/lib/defaults'

export type RegistrationStep = 'not_found' | 'complete'

/**
 * Required step for a Google account that has not finished Mizano registration. It cannot be dismissed:
 * the user finishes (name stays optional) or cancels, which signs out on this device only.
 */
export function RegistrationDialog({
  state,
  onCreate,
  onFinish,
  onCancel,
}: {
  state: { user: AccountUser; step: RegistrationStep } | null
  onCreate: () => void
  onFinish: (name: string) => Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  onCancel: () => Promise<void>
}) {
  const { t } = useStore().i18n
  return (
    <Dialog open={state !== null} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        {state?.step === 'not_found' && (
          <div className="flex flex-col gap-4">
            <DialogHeader className="items-center text-center">
              <DialogTitle>{t('account.register.notFoundTitle')}</DialogTitle>
              <DialogDescription>{t('account.register.notFoundBody')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => void onCancel()}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={onCreate}>
                {t('account.register.create')}
              </Button>
            </DialogFooter>
          </div>
        )}
        {state?.step === 'complete' && <CompleteForm key={state.user.id} user={state.user} onFinish={onFinish} onCancel={onCancel} />}
      </DialogContent>
    </Dialog>
  )
}

function CompleteForm({
  user,
  onFinish,
  onCancel,
}: {
  user: AccountUser
  onFinish: (name: string) => Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  onCancel: () => Promise<void>
}) {
  const { t } = useStore().i18n
  const [name, setName] = useState(user.displayName || firstNameFrom(user.providerName))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthErrorCode | null>(null)
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (busy) return
        setBusy(true)
        setError(null)
        void onFinish(name.trim().slice(0, MAX_DISPLAY_NAME)).then((r) => {
          setBusy(false)
          if (!r.ok) setError(r.error)
        })
      }}
    >
      <DialogHeader className="items-center text-center">
        <DialogTitle>{t('account.register.title')}</DialogTitle>
        <DialogDescription>{t('account.register.hint')}</DialogDescription>
      </DialogHeader>
      <Field label={t('account.name')}>
        {({ id }) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_DISPLAY_NAME} autoComplete="given-name" placeholder={t('account.namePlaceholder')} />}
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`auth.error.${error === 'network' ? 'network' : 'unknown'}`)}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void onCancel()}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={busy}>
          {t('account.register.finish')}
        </Button>
      </DialogFooter>
    </form>
  )
}
