/**
 * Account model shared by the sign-in UI, Mizo access and the profile editor.
 *
 * No sign-in service is connected in this build, so the app uses `unconfiguredAuthClient`, which
 * never creates sessions. A real client (e.g. Lovable Cloud) implements `AuthClient`; the UI only
 * talks to this interface. Age is deliberately not part of any account or access rule.
 */

export interface AccountUser {
  id: string
  email: string | null
  /** Full name from the identity provider (e.g. Google), used only to prefill the name prompt. */
  providerName: string | null
}

export type AccountState = { status: 'guest' } | { status: 'signed_in'; user: AccountUser }

export type AuthMode = 'sign_up' | 'sign_in'

export type AuthErrorCode =
  | 'not_configured'
  | 'invalid_email'
  | 'missing_password'
  | 'weak_password'
  | 'invalid_credentials'
  | 'email_taken'
  | 'network'
  | 'rate_limited'
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
}

export const unconfiguredAuthClient: AuthClient = {
  configured: false,
  signUpWithEmail: async () => ({ ok: false, error: 'not_configured' }),
  signInWithEmail: async () => ({ ok: false, error: 'not_configured' }),
  signInWithGoogle: async () => ({ ok: false, error: 'not_configured' }),
  signOut: async () => {},
}

export const MIN_PASSWORD_LENGTH = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Client-side checks before any request. Sign-in does not enforce the length rule (old passwords). */
export function validateEmailCredentials(mode: AuthMode, email: string, password: string): AuthErrorCode | null {
  if (!EMAIL_RE.test(email.trim())) return 'invalid_email'
  if (password === '') return 'missing_password'
  if (mode === 'sign_up' && password.length < MIN_PASSWORD_LENGTH) return 'weak_password'
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
