import { useRef, useState } from 'react'
import { Camera, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { initialsFor } from '@/lib/account'
import { imageFileToAvatar } from '@/lib/avatar'
import { MAX_DISPLAY_NAME } from '@/lib/defaults'
import { useAccount } from './account-provider'

/** Display name + photo for the signed-in account. Saved on this device (no cloud photo storage yet). */
export function ProfileEditor({ onDone }: { onDone: () => void }) {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  const { account, signOut } = useAccount()
  const saved = store.settings.account
  const [name, setName] = useState(saved.displayName)
  const [avatar, setAvatar] = useState<string | null>(saved.avatar)
  const [photoError, setPhotoError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  if (account.status !== 'signed_in') return null
  const initial = initialsFor(name, account.user.email)

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void run(
          () => store.updateSettings((s) => ({ ...s, account: { userId: account.user.id, displayName: name.trim().slice(0, MAX_DISPLAY_NAME), avatar } })),
          { success: t('account.saved') },
        ).then(onDone)
      }}
    >
      <div className="flex items-center gap-4">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-2xl font-semibold" aria-hidden>
          {avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : initial}
        </span>
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-sm font-medium">{t('account.photo')}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Camera aria-hidden />
              {t('account.photo.choose')}
            </Button>
            {avatar && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAvatar(null)}>
                <Trash2 aria-hidden />
                {t('account.photo.remove')}
              </Button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{photoError ? t('account.photo.error') : t('account.photo.note')}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              setAvatar(await imageFileToAvatar(file))
              setPhotoError(false)
            } catch {
              setPhotoError(true)
            }
          }}
        />
      </div>
      <Field label={t('account.name')}>
        {({ id }) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_DISPLAY_NAME} autoComplete="given-name" />}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="submit" size="lg">
          {t('common.save')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            void signOut().then(onDone)
          }}
        >
          <LogOut aria-hidden />
          {t('account.signOut')}
        </Button>
      </div>
    </form>
  )
}
