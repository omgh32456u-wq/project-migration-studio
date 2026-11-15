import { DEFAULT_DAY_START_MINUTES, normalizeDayStart } from './nutrition-day'
import type { AccountProfile, Settings } from './types'

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
    account: { userId: null, displayName: '', avatar: null },
  }
}

export const MAX_DISPLAY_NAME = 40
/** ~300 KB of base64 is far above a 256 px JPEG; anything larger is not one of ours. */
export const MAX_AVATAR_CHARS = 400_000

export function normalizeAccountProfile(raw: unknown): AccountProfile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof AccountProfile, unknown>>
  const avatar = typeof r.avatar === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(r.avatar) && r.avatar.length <= MAX_AVATAR_CHARS ? r.avatar : null
  return {
    userId: typeof r.userId === 'string' && r.userId ? r.userId : null,
    displayName: typeof r.displayName === 'string' ? r.displayName.trim().slice(0, MAX_DISPLAY_NAME) : '',
    avatar,
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
    // Settings saved before accounts existed get an empty profile; bad values are dropped, never thrown.
    account: normalizeAccountProfile(raw.account),
  }
}

export const PREFS_STORAGE_KEY = 'tmm:prefs'
