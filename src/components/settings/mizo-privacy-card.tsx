import { useEffect, useState } from 'react'
import { useAccount } from '@/components/account/account-provider'
import { useStore } from '@/components/providers/app-store'
import { Switch } from '@/components/ui/switch'
import { consentGranted } from '@/components/mizo/mizo-workspace'
import { sharedChatStore, type ChatStore, type MizoConsent } from '@/lib/mizo/chat-store'
import { MIZO_CONSENT_VERSION } from '@/lib/mizo/protocol'
import { SettingsSection } from './settings-section'

/** Signed-in only: shows and changes this account's on-device Mizo sharing consent. */
export function MizoPrivacyCard({ store }: { store?: ChatStore }) {
  const { account } = useAccount()
  if (account.status !== 'signed_in') return null
  return <MizoPrivacyForm key={account.user.id} userId={account.user.id} store={store} />
}

function MizoPrivacyForm({ userId, store }: { userId: string; store?: ChatStore }) {
  const { t } = useStore().i18n
  const [consent, setConsent] = useState<MizoConsent | null | undefined>(undefined)
  const [error, setError] = useState(false)
  const getStore = () => (store ? Promise.resolve(store) : sharedChatStore())

  useEffect(() => {
    let live = true
    ;(store ? Promise.resolve(store) : sharedChatStore())
      .then((s) => s.loadConsent(userId))
      .then((c) => live && setConsent(c))
      .catch(() => live && setConsent(null))
    return () => {
      live = false
    }
  }, [store, userId])

  const change = async (granted: boolean) => {
    const record: MizoConsent = { userId, version: MIZO_CONSENT_VERSION, granted, updatedAt: new Date().toISOString() }
    try {
      await (await getStore()).saveConsent(record)
      setConsent(record)
      setError(false)
    } catch {
      setError(true)
    }
  }

  return (
    <SettingsSection id="mizo-privacy" title={t('settings.mizo.title')}>
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('settings.mizo.share')}</span>
          <span className="text-xs leading-relaxed text-muted-foreground">{t('mizo.consent.body')}</span>
          <span className="text-xs leading-relaxed text-muted-foreground">{t('mizo.consent.notSent')}</span>
        </span>
        <Switch checked={consentGranted(consent ?? null)} disabled={consent === undefined} onCheckedChange={(v) => void change(v)} />
      </label>
      {error && <p className="text-xs text-destructive" role="alert">{t('mizo.error.history')}</p>}
    </SettingsSection>
  )
}
