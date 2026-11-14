/**
 * Account model shared by the sign-in UI, Mizo access and the profile editor.
 *
 * The app's real client is the Supabase one in `supabase-auth.ts`; `unconfiguredAuthClient` never
 * creates sessions and is the safe default (and what tests use). The UI only talks to `AuthClient`.
 * Age is deliberately not part of any account or access rule.
 */

export interface AccountUser {
  id: string
  email: string | null
  /** Full name from the identity provider (e.g. Google), used only to prefill the name prompt. */
  providerName: string | null
  /** Name the user chose in Mizano, saved in the account's metadata. */
  displayName?: string | null
  /** The name prompt was answered or skipped once; it is never asked again for this account. */
  namePromptDone?: boolean
  /** Email sign-up asked for the optional name prompt; cleared once it is answered or skipped. */
  namePromptPending?: boolean
  /** A Google-only account that has not finished Mizano registration. It never enters the app until it does. */
  needsRegistration?: boolean
}

export type AccountState = { status: 'guest' } | { status: 'signed_in'; user: AccountUser }

export type AuthMode = 'sign_up' | 'sign_in'

export type AuthErrorCode =
  | 'not_configured'
  | 'invalid_email'
  | 'missing_password'
  | 'weak_password'
  | 'password_mismatch'
  | 'invalid_credentials'
  | 'email_taken'
  | 'network'
  | 'rate_limited'
  | 'email_not_confirmed'
  | 'signup_disabled'
  | 'provider_disabled'
  | 'oauth_failed'
  | 'link_expired'
  | 'unknown'

export type SignUpResult =
  | { ok: true; needsConfirmation: true }
  | { ok: true; needsConfirmation: false; user: AccountUser }
  | { ok: false; error: AuthErrorCode }

export type SignInResult = { ok: true; user: AccountUser } | { ok: false; error: AuthErrorCode }

export interface AuthClient {
  /** False when no sign-in service is connected; every call then returns `not_configured`. */
  readonly configured: boolean
  /** Creates a new account. Never signs into an existing one. */
  signUpWithEmail(email: string, password: string): Promise<SignUpResult>
  /** Signs into an existing account. Never creates one. */
  signInWithEmail(email: string, password: string): Promise<SignInResult>
  /** Starts the Google redirect. `mode` is the user's stated intent (see AGENTS.md on its limits). */
  signInWithGoogle(mode: AuthMode): Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  signOut(): Promise<void>
  /** Sends the sign-up confirmation email again. */
  resendConfirmation?(email: string): Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  /** The saved session's user on app start (works offline), or null. */
  restore?(): Promise<AccountUser | null>
  /** Identity changes from outside a direct call (email link, Google redirect, another tab). */
  subscribe?(listener: (change: AuthChange) => void): () => void
  /** Saves profile fields to the signed-in account's metadata. */
  updateProfile?(data: { displayName?: string; namePromptDone?: boolean }): Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  /** Writes the durable registration-complete marker (and the optional name) to the account. */
  completeRegistration?(displayName: string): Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  /** The button (Sign in / Sign up) pressed before the last Google redirect on this tab, if known. Wording only. */
  googleIntent?(): AuthMode | null
  clearGoogleIntent?(): void
}

export type AuthChange =
  | { type: 'signed_in'; user: AccountUser }
  | { type: 'updated'; user: AccountUser }
  | { type: 'signed_out' }

export const unconfiguredAuthClient: AuthClient = {
  configured: false,
  signUpWithEmail: async () => ({ ok: false, error: 'not_configured' }),
  signInWithEmail: async () => ({ ok: false, error: 'not_configured' }),
  signInWithGoogle: async () => ({ ok: false, error: 'not_configured' }),
  signOut: async () => {},
}

export const MIN_PASSWORD_LENGTH = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/** New-account password rules, in the order they are shown. Sign-in never applies them. */
export const PASSWORD_RULES = ['length', 'upper', 'lower', 'number', 'special'] as const
export type PasswordRule = (typeof PASSWORD_RULES)[number]

/**
 * Which rules a password meets. Letters and digits are ASCII only (A–Z, a–z, 0–9). Any other
 * non-whitespace character counts as special, including Unicode symbols, Arabic letters and Arabic-Indic digits.
 */
export function passwordChecks(password: string): Record<PasswordRule, boolean> {
  return {
    length: [...password].length >= MIN_PASSWORD_LENGTH,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9\s]/.test(password),
  }
}

export function meetsPasswordRules(password: string): boolean {
  return Object.values(passwordChecks(password)).every(Boolean)
}

export type PasswordStrength = 'none' | 'weak' | 'medium' | 'strong'

/** Strength from the rules met: strong needs all five; 3–4 is medium; 1–2 is weak. */
export function passwordStrength(password: string): PasswordStrength {
  if (password === '') return 'none'
  const met = Object.values(passwordChecks(password)).filter(Boolean).length
  if (met === PASSWORD_RULES.length) return 'strong'
  return met >= 3 ? 'medium' : 'weak'
}

/** Sign-up submit is allowed only when every check passes and no request is running. */
export function canSubmitSignUp(email: string, password: string, confirm: string, busy = false): boolean {
  return !busy && isValidEmail(email) && meetsPasswordRules(password) && confirm !== '' && confirm === password
}

/**
 * Client-side checks before any request. Sign-in only needs a valid email and a non-empty password,
 * so passwords created before the sign-up rules still work. Sign-up needs every rule and a match.
 */
export function validateEmailCredentials(mode: AuthMode, email: string, password: string, confirm?: string): AuthErrorCode | null {
  if (!isValidEmail(email)) return 'invalid_email'
  if (password === '') return 'missing_password'
  if (mode === 'sign_up') {
    if (!meetsPasswordRules(password)) return 'weak_password'
    if (confirm !== password) return 'password_mismatch'
  }
  return null
}

/** Mizo needs an account. Any signed-in user may open it, whatever their age. */
export function mizoAccess(account: AccountState): 'open' | 'needs_account' {
  return account.status === 'signed_in' ? 'open' : 'needs_account'
}

/** First word of a provider's full name, for the "What should we call you?" prefill. */
export function firstNameFrom(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? ''
}

/** One or two letters for the avatar fallback. */
export function initialsFor(name: string, email: string | null): string {
  const source = name.trim() || (email ?? '').split('@')[0] || ''
  const chars = [...source.trim()]
  return chars.length ? chars[0].toLocaleUpperCase() : ''
}
