/**
 * The real `AuthClient`, backed by the project's connected Supabase Auth.
 *
 * The Supabase browser client is loaded lazily (never during SSR or module evaluation), and only the
 * public publishable key is ever used here. Sign-up and sign-in stay separate calls: sign-in never
 * creates an account and sign-up never signs into an existing one. Guest data is not touched.
 */
import type { AuthClient, AuthErrorCode, AuthMode, AccountUser, SignInResult, SignUpResult } from './account'

/** The small slice of a Supabase user this app reads. */
export interface SupabaseUserLike {
  id: string
  email?: string | null
  created_at?: string
  last_sign_in_at?: string | null
  identities?: unknown[] | null
  user_metadata?: Record<string, unknown> | null
}

interface AuthErrorLike {
  code?: string
  status?: number
  name?: string
  message?: string
}

type SessionLike = { user: SupabaseUserLike } | null

/** The subset of `supabase.auth` used, so tests can pass a fake. */
export interface SupabaseAuthLike {
  signUp(args: { email: string; password: string; options?: { emailRedirectTo?: string } }): Promise<{
    data: { user: SupabaseUserLike | null; session: SessionLike }
    error: AuthErrorLike | null
  }>
  signInWithPassword(args: { email: string; password: string }): Promise<{
    data: { user: SupabaseUserLike | null; session: SessionLike }
    error: AuthErrorLike | null
  }>
  signInWithOAuth(args: { provider: 'google'; options?: { redirectTo?: string } }): Promise<{ error: AuthErrorLike | null }>
  resend(args: { type: 'signup'; email: string; options?: { emailRedirectTo?: string } }): Promise<{ error: AuthErrorLike | null }>
  signOut(args?: { scope?: 'local' | 'global' | 'others' }): Promise<{ error: AuthErrorLike | null }>
  getSession(): Promise<{ data: { session: SessionLike } }>
  onAuthStateChange(cb: (event: string, session: SessionLike) => void): { data: { subscription: { unsubscribe(): void } } }
}

export interface SupabaseLike {
  auth: SupabaseAuthLike
}

/** Map a Supabase Auth error to the app's codes. Unknown accounts and wrong passwords share one code. */
export function mapAuthError(error: AuthErrorLike | null | undefined): AuthErrorCode {
  if (!error) return 'unknown'
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return 'network'
  switch (error.code) {
    case 'invalid_credentials':
    case 'user_not_found':
      return 'invalid_credentials'
    case 'email_exists':
    case 'user_already_exists':
    case 'identity_already_exists':
      return 'email_taken'
    case 'weak_password':
      return 'weak_password'
    case 'email_address_invalid':
      return 'invalid_email'
    case 'email_not_confirmed':
      return 'email_not_confirmed'
    case 'signup_disabled':
      return 'signup_disabled'
    case 'email_provider_disabled':
    case 'provider_disabled':
    case 'oauth_provider_not_supported':
      return 'provider_disabled'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'rate_limited'
  }
  if (error.status === 429) return 'rate_limited'
  if (error.name === 'TypeError' || /fetch|network/i.test(error.message ?? '')) return 'network'
  return 'unknown'
}

const TEN_MINUTES = 10 * 60 * 1000

export function toAccountUser(u: SupabaseUserLike): AccountUser {
  const meta = u.user_metadata ?? {}
  const name = typeof meta['full_name'] === 'string' ? meta['full_name'] : typeof meta['name'] === 'string' ? meta['name'] : null
  return { id: u.id, email: u.email ?? null, providerName: name }
}

/** A first sign-in shortly after the account was created (registration, or confirming the email). */
export function isFreshAccount(u: SupabaseUserLike): boolean {
  if (!u.created_at || !u.last_sign_in_at) return false
  return Date.parse(u.last_sign_in_at) - Date.parse(u.created_at) < TEN_MINUTES
}

function origin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

export interface SupabaseAuthOptions {
  /** Returns the Supabase client. Defaults to a lazy import of the generated browser client. */
  load?: () => Promise<SupabaseLike>
  /** Whether the Google provider is switched on in Supabase. `null` means it could not be checked. */
  googleEnabled?: () => Promise<boolean | null>
}

async function loadBrowserClient(): Promise<SupabaseLike> {
  const { supabase } = await import('@/integrations/supabase/client')
  return supabase as unknown as SupabaseLike
}

/** Reads the public auth settings, which say which providers are switched on. No secret is involved. */
async function checkGoogleEnabled(): Promise<boolean | null> {
  try {
    const { supabase } = await import('@/integrations/supabase/client')
    const { authUrl, supabaseKey } = supabase as unknown as { authUrl?: URL; supabaseKey?: string }
    if (!authUrl || !supabaseKey) return null
    const res = await fetch(`${authUrl.href.replace(/\/$/, '')}/settings`, { headers: { apikey: supabaseKey } })
    if (!res.ok) return null
    const body = (await res.json()) as { external?: Record<string, boolean> }
    return Boolean(body.external?.['google'])
  } catch {
    return null
  }
}

export function createSupabaseAuthClient(opts: SupabaseAuthOptions = {}): AuthClient {
  const load = opts.load ?? loadBrowserClient
  const googleEnabled = opts.googleEnabled ?? checkGoogleEnabled
  const guard = async <T>(fn: (auth: SupabaseAuthLike) => Promise<T>, fail: (e: AuthErrorCode) => T): Promise<T> => {
    try {
      return await fn((await load()).auth)
    } catch (e) {
      return fail(mapAuthError(e as AuthErrorLike))
    }
  }

  return {
    configured: true,

    signUpWithEmail: (email, password) =>
      guard<SignUpResult>(
        async (auth) => {
          const { data, error } = await auth.signUp({ email, password, options: { emailRedirectTo: origin() } })
          if (error) return { ok: false, error: mapAuthError(error) }
          // With email confirmation on, an address that already has an account comes back with no identities.
          if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, error: 'email_taken' }
          if (!data.session || !data.user) return { ok: true, needsConfirmation: true }
          return { ok: true, needsConfirmation: false, user: toAccountUser(data.user) }
        },
        (error) => ({ ok: false, error }),
      ),

    signInWithEmail: (email, password) =>
      guard<SignInResult>(
        async (auth) => {
          const { data, error } = await auth.signInWithPassword({ email, password })
          if (error) return { ok: false, error: mapAuthError(error) }
          if (!data.session || !data.user) return { ok: false, error: 'unknown' }
          return { ok: true, user: toAccountUser(data.user) }
        },
        (error) => ({ ok: false, error }),
      ),

    // Google creates an account on first use whichever button was pressed; `mode` only sets the wording.
    signInWithGoogle: (_mode: AuthMode) =>
      guard<{ ok: true } | { ok: false; error: AuthErrorCode }>(
        async (auth) => {
          if ((await googleEnabled()) === false) return { ok: false, error: 'provider_disabled' }
          const { error } = await auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin() } })
          return error ? { ok: false, error: mapAuthError(error) } : { ok: true }
        },
        (error) => ({ ok: false, error }),
      ),

    resendConfirmation: (email) =>
      guard<{ ok: true } | { ok: false; error: AuthErrorCode }>(
        async (auth) => {
          const { error } = await auth.resend({ type: 'signup', email, options: { emailRedirectTo: origin() } })
          return error ? { ok: false, error: mapAuthError(error) } : { ok: true }
        },
        (error) => ({ ok: false, error }),
      ),

    // Local scope: works offline and only ends the session on this device.
    signOut: async () => {
      try {
        await (await load()).auth.signOut({ scope: 'local' })
      } catch {
        /* the local session is cleared either way */
      }
    },

    restore: async () => {
      try {
        const { data } = await (await load()).auth.getSession()
        return data.session ? toAccountUser(data.session.user) : null
      } catch {
        return null
      }
    },

    subscribe: (listener) => {
      let stop: (() => void) | null = null
      let cancelled = false
      void load()
        .then((client) => {
          if (cancelled) return
          const { data } = client.auth.onAuthStateChange((event, session) => {
            // Only identity changes; token refreshes and the initial event are ignored.
            if (event === 'SIGNED_IN' && session) listener({ type: 'signed_in', user: toAccountUser(session.user), fresh: isFreshAccount(session.user) })
            else if (event === 'USER_UPDATED' && session) listener({ type: 'updated', user: toAccountUser(session.user) })
            else if (event === 'SIGNED_OUT') listener({ type: 'signed_out' })
          })
          stop = () => data.subscription.unsubscribe()
        })
        .catch(() => {})
      return () => {
        cancelled = true
        stop?.()
      }
    },
  }
}

/** Reads an OAuth / email-link error that Supabase put in the address after a redirect, and removes it. */
export function takeAuthRedirectError(): AuthErrorCode | null {
  if (typeof window === 'undefined') return null
  const { hash, search, pathname } = window.location
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const query = new URLSearchParams(search)
  const code = params.get('error_code') ?? query.get('error_code')
  const err = params.get('error') ?? query.get('error')
  if (!err && !code) return null
  for (const k of ['error', 'error_code', 'error_description']) query.delete(k)
  const rest = query.toString()
  window.history.replaceState(window.history.state, '', pathname + (rest ? `?${rest}` : ''))
  if (code === 'otp_expired') return 'link_expired'
  if (code === 'provider_disabled' || code === 'validation_failed') return 'provider_disabled'
  return 'oauth_failed'
}
