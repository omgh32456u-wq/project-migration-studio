/**
 * The contract between the Mizo chat screen and the Mizo text endpoint (`/api/public/mizo/chat`).
 * Shared by browser and server, so it holds no secrets and no provider details.
 */

/**
 * Bump when the consent wording changes in a way people must agree to again.
 * Planned v2 (Mizo memory): bump only when the server actually accepts memories and the consent copy discloses it.
 */
export const MIZO_CONSENT_VERSION = 1

/** How much recent chat goes with each question (one turn = one question + one answer). */
export const MIZO_CONTEXT_TURNS = 10
export const MIZO_MAX_MESSAGE_CHARS = 2000
export const MIZO_MAX_CONTEXT_CHARS = 12000

export type MizoLocale = 'en' | 'ar'

/** Mizo memory bounds, enforced by the app when choosing and again by the server when reading. */
export const MIZO_MEMORY_CATEGORIES = ['preference', 'food', 'goal', 'routine', 'other'] as const
export type MizoMemoryCategory = (typeof MIZO_MEMORY_CATEGORIES)[number]
export const MIZO_MAX_MEMORY_CHARS = 200
export const MIZO_MAX_REQUEST_MEMORIES = 5
export const MIZO_MAX_REQUEST_MEMORY_CHARS = 800

/** A saved memory as sent: category and approved wording only (no ids, dates or account data). */
export interface MizoWireMemory {
  category: MizoMemoryCategory
  content: string
}

export interface MizoWireMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Everything the app sends. Nothing else (no email, profile, photos, weight or food logs). */
export interface MizoChatRequest {
  locale: MizoLocale
  consentVersion: number
  messages: MizoWireMessage[]
  /** Only the saved memories relevant to this question (bounded); omitted when there are none. */
  memories?: MizoWireMemory[]
}

/** Every failure the endpoint or the app can report. The screen maps each to a localized message. */
export type MizoErrorCode =
  | 'unauthenticated'
  | 'invalid_request'
  | 'consent_required'
  | 'daily_limit'
  | 'concurrent_limit'
  | 'burst_limit'
  | 'provider_not_configured'
  | 'usage_unavailable'
  | 'provider_auth'
  | 'provider_forbidden'
  | 'provider_rate_limited'
  | 'provider_quota'
  | 'provider_bad_request'
  | 'provider_unavailable'
  | 'provider_malformed'
  | 'timeout'
  | 'offline'
  | 'network'
  | 'unavailable'
  | 'unknown'

export interface MizoErrorBody {
  error: { code: MizoErrorCode; resetsAt?: string }
}

/**
 * Server-sent events on success:
 * - `meta`  `{ usedToday, dailyLimit, resetsAt }` once, before any text
 * - `delta` `{ text }` for each piece of the answer
 * - `done`  `{}` when the answer is complete
 * - `error` `{ code }` if the answer breaks off after it started
 */
export type MizoStreamEvent =
  | { type: 'meta'; usedToday: number; dailyLimit: number; resetsAt: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; code: MizoErrorCode }

/** Keeps the last `turns` turns and drops the oldest messages until the text fits the character budget. */
export function boundContext<T extends { content: string }>(messages: T[], turns = MIZO_CONTEXT_TURNS, maxChars = MIZO_MAX_CONTEXT_CHARS): T[] {
  const recent = messages.slice(-turns * 2)
  let total = recent.reduce((n, m) => n + m.content.length, 0)
  let start = 0
  while (total > maxChars && start < recent.length - 1) {
    total -= recent[start].content.length
    start++
  }
  return recent.slice(start)
}
