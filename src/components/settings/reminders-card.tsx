
import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Notice } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { useToast } from '@/components/providers/toast-provider'
import {
  defaultReminderConfig,
  loadReminderConfig,
  notificationsSupported,
  saveReminderConfig,
  showReminderNotification,
  type ReminderConfig,
} from '@/lib/reminders'
import type { MealSlot } from '@/lib/types'
import { SettingsSection } from './settings-section'

type Permission = NotificationPermission | 'unsupported'

export function RemindersCard() {
  const { i18n, mealName } = useStore()
  const { t } = i18n
  const toast = useToast()
  const [config, setConfig] = useState<ReminderConfig>(defaultReminderConfig)
  const [permission, setPermission] = useState<Permission>('default')

  useEffect(() => {
    setConfig(loadReminderConfig())
    setPermission(notificationsSupported() ? Notification.permission : 'unsupported')
  }, [])

  const apply = (next: ReminderConfig) => {
    setConfig(next)
    saveReminderConfig(next)
  }

  const toggleAll = async (enabled: boolean) => {
    if (!enabled) return apply({ ...config, enabled: false })
    let result = permission
    if (result === 'default') {
      result = await Notification.requestPermission()
      setPermission(result)
    }
    if (result === 'granted') apply({ ...config, enabled: true })
  }

  const updateMeal = (slot: MealSlot, patch: { enabled?: boolean; time?: string }) =>
    apply({ ...config, meals: config.meals.map((m) => (m.slot === slot ? { ...m, ...patch } : m)) })

  const sendTest = async () => {
    const ok = await showReminderNotification(t('reminders.notifyTitle'), t('reminders.testBody'), 'mizano-reminder-test')
    if (!ok) toast({ message: t('reminders.testFailed'), tone: 'error' })
  }

  const active = config.enabled && permission === 'granted'

  return (
    <SettingsSection id="reminders" title={t('reminders.title')} description={t('reminders.hint')}>
      {permission === 'unsupported' ? (
        <Notice icon={<Info />}>{t('reminders.unsupported')}</Notice>
      ) : (
        <>
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm font-medium">{t('reminders.enable')}</span>
            <Switch checked={active} disabled={permission === 'denied'} onCheckedChange={(v) => void toggleAll(v)} />
          </label>
          {permission === 'denied' && <Notice icon={<Info />}>{t('reminders.denied')}</Notice>}
          {active && (
            <>
              <ul className="flex flex-col divide-y border-t">
                {config.meals.map((m) => (
                  <li key={m.slot} className="flex min-h-12 items-center justify-between gap-3 py-2">
                    <label className="flex items-center gap-3 text-sm">
                      <Switch checked={m.enabled} onCheckedChange={(enabled) => updateMeal(m.slot, { enabled })} />
                      {mealName(m.slot)}
                    </label>
                    <input
                      type="time"
                      dir="ltr"
                      aria-label={t('reminders.time', { meal: mealName(m.slot) })}
                      value={m.time}
                      disabled={!m.enabled}
                      onChange={(e) => e.target.value && updateMeal(m.slot, { time: e.target.value })}
                      className="h-10 rounded-lg border border-input bg-card px-2 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50"
                    />
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="self-start" onClick={() => void sendTest()}>
                {t('reminders.test')}
              </Button>
            </>
          )}
          <Notice icon={<Info />}>{t('reminders.limits')}</Notice>
        </>
      )}
    </SettingsSection>
  )
}
