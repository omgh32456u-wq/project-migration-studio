
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, TextInput } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'

/** Small dialog asking for a single name (save meal / rename). */
export function NameDialog({
  open,
  onOpenChange,
  title,
  label,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  label: string
  initial: string
  onSubmit: (name: string) => void
}) {
  const { t } = useStore().i18n
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" closeLabel={t('common.close')}>
        {open && <NameForm key={initial} title={title} label={label} initial={initial} onSubmit={onSubmit} cancel={() => onOpenChange(false)} t={t} />}
      </DialogContent>
    </Dialog>
  )
}

function NameForm({
  title,
  label,
  initial,
  onSubmit,
  cancel,
  t,
}: {
  title: string
  label: string
  initial: string
  onSubmit: (name: string) => void
  cancel: () => void
  t: ReturnType<typeof useStore>['i18n']['t']
}) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return setError(t('common.nameRequired'))
        onSubmit(name.trim())
      }}
      noValidate
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Field label={label} error={error}>
        {({ id, describedBy, invalid }) => (
          <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        )}
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={cancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.save')}</Button>
      </DialogFooter>
    </form>
  )
}
