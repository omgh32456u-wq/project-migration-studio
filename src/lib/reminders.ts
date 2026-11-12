import { MEAL_SLOTS, type MealSlot } from './types'

/** Device-local on purpose: notification permission is per browser, so reminders are not part of backups. */
export const REMINDERS_STORAGE_KEY = 'mizano:reminders'
/** A reminder only fires if the app is open within this many minutes after its time, so late opens don't spam. */
export const REMINDER_WINDOW_MINUTES = 60

export interface MealReminder {
  slot: MealSlot
  enabled: boolean
  time: string
}

export interface ReminderConfig {
  enabled: boolean
  meals: MealReminder[]
  lastFired: Partial<Record<MealSlot, string>>
}

const DEFAULT_TIMES: Record<MealSlot, string> = { breakfast: '09:00', lunch: '14:00', dinner: '20:00', snacks: '17:00' }
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function defaultReminderConfig(): ReminderConfig {
  return {
    enabled: false,
    meals: MEAL_SLOTS.map((slot) => ({ slot, enabled: slot !== 'snacks', time: DEFAULT_TIMES[slot] })),
    lastFired: {},
  }
}

export function parseReminderConfig(raw: unknown): ReminderConfig {
  const base = defaultReminderConfig()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const meals = Array.isArray(r.meals) ? (r.meals as unknown[]) : []
  const lastFired = r.lastFired && typeof r.lastFired === 'object' ? (r.lastFired as Record<string, unknown>) : {}
  return {
    enabled: r.enabled === true,
    meals: base.meals.map((def) => {
      const found = meals.find((m): m is Record<string, unknown> => !!m && typeof m === 'object' && (m as Record<string, unknown>).slot === def.slot)
      if (!found) return def
      return {
        slot: def.slot,
        enabled: typeof found.enabled === 'boolean' ? found.enabled : def.enabled,
        time: typeof found.time === 'string' && TIME_RE.test(found.time) ? found.time : def.time,
      }
    }),
    lastFired: Object.fromEntries(
      MEAL_SLOTS.flatMap((slot) => {
        const v = lastFired[slot]
        return typeof v === 'string' && DATE_RE.test(v) ? [[slot, v]] : []
      }),
    ),
  }
}

export function loadReminderConfig(): ReminderConfig {
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY)
    return parseReminderConfig(raw ? JSON.parse(raw) : null)
  } catch {
    return defaultReminderConfig()
  }
}

export function saveReminderConfig(config: ReminderConfig) {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* storage unavailable; reminders simply won't persist */
  }
}

export function localDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function dueReminders(config: ReminderConfig, now: Date): MealSlot[] {
  if (!config.enabled) return []
  const today = localDateKey(now)
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  return config.meals
    .filter((m) => {
      if (!m.enabled || config.lastFired[m.slot] === today) return false
      const diff = minutesNow - toMinutes(m.time)
      return diff >= 0 && diff < REMINDER_WINDOW_MINUTES
    })
    .map((m) => m.slot)
}

export function markFired(config: ReminderConfig, slots: MealSlot[], now: Date): ReminderConfig {
  const today = localDateKey(now)
  const lastFired = { ...config.lastFired }
  for (const slot of slots) lastFired[slot] = today
  return { ...config, lastFired }
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Prefers the service worker (required on Android Chrome); falls back to the page-level constructor. */
export async function showReminderNotification(title: string, body: string, tag: string) {
  const options: NotificationOptions = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg) {
      await reg.showNotification(title, options)
      return true
    }
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}
