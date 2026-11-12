import { DEFAULT_DAY_START_MINUTES, normalizeDayStart } from './nutrition-day'
import type { Settings } from './types'

export function createId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}_${uuid}` : uuid
}

export function defaultSettings(): Settings {
  return {
    locale: 'en',
    theme: 'system',
    profile: {
      onboarded: false,
      ageGroup: 'unspecified',
      age: null,
      sex: 'unspecified',
      heightCm: null,
      weightKg: null,
      activity: null,
      units: 'metric',
      trackWeight: false,
    },
    targets: {
      enabled: false,
      kcal: null,
      proteinPct: 20,
      carbsPct: 50,
      fatPct: 30,
    },
    mealNames: {},
    favorites: [],
    dayStartMinutes: DEFAULT_DAY_START_MINUTES,
  }
}

/** Merges stored (possibly older) settings onto defaults so new fields always exist. */
export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  const d = defaultSettings()
  if (!raw) return d
  return {
    ...d,
    ...raw,
    profile: { ...d.profile, ...(raw.profile ?? {}) },
    targets: { ...d.targets, ...(raw.targets ?? {}) },
    mealNames: { ...(raw.mealNames ?? {}) },
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((x) => typeof x === 'string') : [],
    // Settings saved before this field existed (and any invalid value) keep the midnight day boundary.
    dayStartMinutes: normalizeDayStart(raw.dayStartMinutes),
  }
}

export const PREFS_STORAGE_KEY = 'tmm:prefs'
