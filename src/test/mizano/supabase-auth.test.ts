import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseAuthClient, isFreshAccount, mapAuthError, takeAuthRedirectError, type SupabaseAuthLike } from '@/lib/supabase-auth'

const user = { id: 'u1', email: 'me@x.co', identities: [{}], user_metadata: { full_name: 'Omar M' } }

function fakeAuth(over: Partial<SupabaseAuthLike> = {}): SupabaseAuthLike {
  return {
    signUp: vi.fn(async () => ({ data: { user, session: null }, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: { code: 'invalid_credentials', status: 400 } })),
    signInWithOAuth: vi.fn(async () => ({ error: null })),
    resend: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    ...over,
  }
}
const clientFor = (auth: SupabaseAuthLike, googleEnabled: boolean | null = true) =>
  createSupabaseAuthClient({ load: async () => ({ auth }), googleEnabled: async () => googleEnabled })

describe('Supabase sign-up', () => {
  it('needs email confirmation when no session comes back, and is not signed in', async () => {
    const auth = fakeAuth()
    expect(await clientFor(auth).signUpWithEmail('me@x.co', 'Mizano#2026')).toEqual({ ok: true, needsConfirmation: true })
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'me@x.co', password: 'Mizano#2026' }))
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })
  it('reports an existing address (no identities) instead of signing into it', async () => {
    const auth = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: { ...user, identities: [] }, session: null }, error: null })) })
    expect(await clientFor(auth).signUpWithEmail('me@x.co', 'Mizano#2026')).toEqual({ ok: false, error: 'email_taken' })
  })
  it('is signed in only when a real session comes back', async () => {
    const auth = fakeAuth({ signUp: vi.fn(async () => ({ data: { user, session: { user } }, error: null })) })
    expect(await clientFor(auth).signUpWithEmail('me@x.co', 'Mizano#2026')).toEqual({
      ok: true,
      needsConfirmation: false,
      user: { id: 'u1', email: 'me@x.co', providerName: 'Omar M' },
    })
  })
})

describe('Supabase sign-in', () => {
  it('a wrong password or unknown account never creates an account', async () => {
    const auth = fakeAuth()
    expect(await clientFor(auth).signInWithEmail('new@x.co', 'whatever')).toEqual({ ok: false, error: 'invalid_credentials' })
    expect(auth.signUp).not.toHaveBeenCalled()
  })
  it('an unconfirmed account is reported as such', async () => {
    const auth = fakeAuth({ signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: { code: 'email_not_confirmed', status: 400 } })) })
    expect(await clientFor(auth).signInWithEmail('me@x.co', 'x')).toEqual({ ok: false, error: 'email_not_confirmed' })
  })
  it('maps network, rate-limit and unknown errors', () => {
    expect(mapAuthError({ name: 'AuthRetryableFetchError', status: 0 })).toBe('network')
    expect(mapAuthError({ code: 'over_email_send_rate_limit', status: 429 })).toBe('rate_limited')
    expect(mapAuthError({ status: 429 })).toBe('rate_limited')
    expect(mapAuthError({ code: 'user_already_exists' })).toBe('email_taken')
    expect(mapAuthError({ code: 'something_new', status: 500 })).toBe('unknown')
  })
  it('turns a thrown network failure into a network error', async () => {
    const client = createSupabaseAuthClient({ load: async () => Promise.reject(new TypeError('Failed to fetch')) })
    expect(await client.signInWithEmail('me@x.co', 'x')).toEqual({ ok: false, error: 'network' })
  })
})

describe('Supabase Google sign-in', () => {
  it('does not redirect when Google is switched off in Supabase', async () => {
    const auth = fakeAuth()
    expect(await clientFor(auth, false).signInWithGoogle('sign_in')).toEqual({ ok: false, error: 'provider_disabled' })
    expect(auth.signInWithOAuth).not.toHaveBeenCalled()
  })
  it('redirects back to this site when Google is on', async () => {
    const auth = fakeAuth()
    expect(await clientFor(auth, true).signInWithGoogle('sign_up')).toEqual({ ok: true })
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: window.location.origin } })
  })
})

describe('Supabase session', () => {
  it('restores a saved session and signs out only on this device', async () => {
    const auth = fakeAuth({ getSession: vi.fn(async () => ({ data: { session: { user } } })) })
    const client = clientFor(auth)
    expect(await client.restore?.()).toEqual({ id: 'u1', email: 'me@x.co', providerName: 'Omar M' })
    await client.signOut()
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
  it('passes on identity changes and ignores token refreshes', async () => {
    let cb: (e: string, s: { user: typeof user } | null) => void = () => {}
    const auth = fakeAuth({ onAuthStateChange: vi.fn((f) => ((cb = f), { data: { subscription: { unsubscribe: vi.fn() } } })) })
    const seen: string[] = []
    clientFor(auth).subscribe?.((c) => seen.push(c.type))
    await vi.waitFor(() => expect(auth.onAuthStateChange).toHaveBeenCalled())
    cb('INITIAL_SESSION', { user })
    cb('TOKEN_REFRESHED', { user })
    cb('SIGNED_IN', { user })
    cb('SIGNED_OUT', null)
    expect(seen).toEqual(['signed_in', 'signed_out'])
  })
  it('treats a first sign-in within ten minutes of creation as a new account', () => {
    expect(isFreshAccount({ id: 'a', created_at: '2026-01-01T10:00:00Z', last_sign_in_at: '2026-01-01T10:03:00Z' })).toBe(true)
    expect(isFreshAccount({ id: 'a', created_at: '2026-01-01T10:00:00Z', last_sign_in_at: '2026-01-05T10:00:00Z' })).toBe(false)
  })
})

describe('redirect errors', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))
  it('reads and removes an error left by Google or an email link', () => {
    window.history.replaceState(null, '', '/?tab=1#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid')
    expect(takeAuthRedirectError()).toBe('link_expired')
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?tab=1')
    expect(takeAuthRedirectError()).toBeNull()
  })
})
