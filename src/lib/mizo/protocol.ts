/**
 * The contract between the Mizo chat screen and the Mizo text endpoint (`/api/public/mizo/chat`).
 * Shared by browser and server, so it holds no secrets and no provider details.
 */

/** Bump when the consent wording changes in a way people must agree to again. */
export const MIZO_CONSENT_VERSION = 1

/** How much recent chat goes with each question (one turn = one question + one answer). */
export const MIZO_CONTEXT_TURNS = 10
export const MIZO_MAX_MESSAGE_CHARS = 2000
export const MIZO_MAX_CONTEXT_CHARS = 12000

export type MizoLocale = 'en' | 'ar'

export interface MizoWireMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Everything the app sends. Nothing else (no email, profile, photos, weight or food logs). */
export interface MizoChatRequest {
  locale: MizoLocale
  consentVersion: number
  messages: MizoWireMessage[]
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
