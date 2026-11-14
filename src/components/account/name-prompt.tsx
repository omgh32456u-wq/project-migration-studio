import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, TextInput } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { MAX_DISPLAY_NAME } from '@/lib/defaults'

/** Asked once after a new account is created. Skipping leaves the name blank; the account still exists. */
export function NamePrompt({ open, prefill, onClose }: { open: boolean; prefill: string; onClose: () => void }) {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm" closeLabel={t('common.close')}>
        {open && (
          <NameForm
            key={prefill}
            prefill={prefill}
            onSkip={onClose}
            onSave={(name) =>
              void run(() => store.updateSettings((s) => ({ ...s, account: { ...s.account, displayName: name } })), { success: t('account.saved') }).then(onClose)
            }
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NameForm({ prefill, onSkip, onSave }: { prefill: string; onSkip: () => void; onSave: (name: string) => void }) {
  const { t } = useStore().i18n
  const [name, setName] = useState(prefill)
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSave(name.trim().slice(0, MAX_DISPLAY_NAME))
      }}
    >
      <DialogHeader className="items-center text-center">
        <DialogTitle>{t('account.namePrompt.title')}</DialogTitle>
        <DialogDescription>{t('account.namePrompt.hint')}</DialogDescription>
      </DialogHeader>
      <Field label={t('account.name')}>
        {({ id }) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_DISPLAY_NAME} autoComplete="given-name" autoFocus />}
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSkip}>
          {t('account.namePrompt.skip')}
        </Button>
        <Button type="submit">{t('common.save')}</Button>
      </DialogFooter>
    </form>
  )
}
