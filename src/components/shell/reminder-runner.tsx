
import { useEffect, useRef } from 'react'
import { useStore } from '@/components/providers/app-store'
import { dueReminders, loadReminderConfig, markFired, notificationsSupported, saveReminderConfig, showReminderNotification } from '@/lib/reminders'

const CHECK_INTERVAL_MS = 30_000

/** Checks for due reminders only while the app is open; browsers give web apps no reliable background timer. */
export function ReminderRunner() {
  const { i18n, mealName } = useStore()
  const latest = useRef({ t: i18n.t, mealName })
  latest.current = { t: i18n.t, mealName }

  useEffect(() => {
    if (!notificationsSupported()) return
    const tick = () => {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const config = loadReminderConfig()
      const due = dueReminders(config, now)
      if (!due.length) return
      saveReminderConfig(markFired(config, due, now))
      const { t, mealName: name } = latest.current
      for (const slot of due) {
        void showReminderNotification(t('reminders.notifyTitle'), t('reminders.notifyBody', { meal: name(slot) }), `mizano-reminder-${slot}`)
      }
    }
    tick()
    const id = window.setInterval(tick, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  return null
}
