import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseAuthClient, isRegistered, toAccountUser, mapAuthError, takeAuthRedirectError, type SupabaseAuthLike } from '@/lib/supabase-auth'

const user = { id: 'u1', email: 'me@x.co', identities: [{}], user_metadata: { full_name: 'Omar M' } }

function fakeAuth(over: Partial<SupabaseAuthLike> = {}): SupabaseAuthLike {
  return {
    signUp: vi.fn(async () => ({ data: { user, session: null }, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: { code: 'invalid_credentials', status: 400 } })),
    signInWithOAuth: vi.fn(async () => ({ error: null })),
    resend: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
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
    expect(await clientFor(auth).signUpWithEmail('me@x.co', 'Mizano#2026')).toMatchObject({ ok: true, needsConfirmation: true })
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'me@x.co', password: 'Mizano#2026' }))
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })
  it('reports an existing address (no identities) instead of signing into it', async () => {
    const auth = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: { ...user, identities: [] }, session: null }, error: null })) })
    expect(await clientFor(auth).signUpWithEmail('me@x.co', 'Mizano#2026')).toMatchObject({ ok: false, error: 'email_taken' })
  })
  it('is signed in only when a real session comes back', async () => {
    const auth = fakeAuth({ signUp: vi.fn(async () => ({ data: { user, session: { user } }, error: null })) })
    expect(await clientFor(auth).signUpWithEmail('me@x.co', 'Mizano#2026')).toMatchObject({
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
    expect(await client.restore?.()).toMatchObject({ id: 'u1', email: 'me@x.co', providerName: 'Omar M' })
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

describe('profile metadata', () => {
  it('reads the chosen name and prompt flag, and saves them with updateUser', async () => {
    const { toAccountUser } = await import('@/lib/supabase-auth')
    expect(toAccountUser({ id: 'a', user_metadata: { display_name: ' Omar ', name_prompt_done: true } })).toMatchObject({ displayName: 'Omar', namePromptDone: true })
    const updateUser = vi.fn(async () => ({ error: null }))
    const client = createSupabaseAuthClient({ load: async () => ({ auth: { updateUser } as unknown as SupabaseAuthLike }) })
    expect(await client.updateProfile!({ displayName: 'Omar' })).toEqual({ ok: true })
    expect(updateUser).toHaveBeenCalledWith({ data: { name_prompt_done: true, name_prompt_pending: false, display_name: 'Omar' } })
  })
})

describe('registration marker', () => {
  const g = (meta: Record<string, unknown> = {}, providers = ['google']) => ({ id: 'g', app_metadata: { providers }, user_metadata: { full_name: 'Sara Ali', ...meta } })
  it('a brand-new Google-only user is not registered, whatever the timestamps', () => {
    expect(isRegistered({ ...g(), created_at: '2026-01-01T10:00:00Z', last_sign_in_at: '2026-01-01T10:00:01Z' })).toBe(false)
    expect(isRegistered({ ...g(), created_at: '2026-01-01T10:00:00Z', last_sign_in_at: '2026-03-01T10:00:00Z' })).toBe(false)
    expect(toAccountUser(g()).needsRegistration).toBe(true)
  })
  it('the marker, or legacy metadata this app wrote, counts as registered; Google names alone do not', () => {
    expect(isRegistered(g({ mizano_registered: true }))).toBe(true)
    expect(isRegistered(g({ name_prompt_done: true }))).toBe(true)
    expect(isRegistered(g({ display_name: 'Sara' }))).toBe(true)
    expect(isRegistered(g({ display_name: '  ', name: 'Sara' }))).toBe(false)
  })
  it('email accounts (including email linked with Google) are never gated', () => {
    expect(isRegistered(g({}, ['email']))).toBe(true)
    expect(isRegistered(g({}, ['email', 'google']))).toBe(true)
    expect(isRegistered({ id: 'x', identities: [{ provider: 'google' }] })).toBe(false)
  })
  it('email sign-up writes the marker and the pending name prompt flag', async () => {
    const auth = fakeAuth()
    await clientFor(auth).signUpWithEmail('me@x.co', 'Mizano#2026')
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ data: { mizano_registered: true, name_prompt_pending: true } }) }))
    expect(toAccountUser({ id: 'e', user_metadata: { name_prompt_pending: true } }).namePromptPending).toBe(true)
  })
  it('completeRegistration writes the marker, and reports a failed write', async () => {
    const auth = fakeAuth()
    expect(await clientFor(auth).completeRegistration!('Sara')).toEqual({ ok: true })
    expect(auth.updateUser).toHaveBeenCalledWith({ data: { mizano_registered: true, name_prompt_done: true, name_prompt_pending: false, display_name: 'Sara' } })
    const failing = fakeAuth({ updateUser: vi.fn(async () => ({ error: { name: 'AuthRetryableFetchError', status: 0 } })) })
    expect(await clientFor(failing).completeRegistration!('')).toEqual({ ok: false, error: 'network' })
  })
  it('remembers the pressed button across the redirect, and forgets it when the redirect fails', async () => {
    sessionStorage.clear()
    const c = clientFor(fakeAuth())
    await c.signInWithGoogle('sign_in')
    expect(c.googleIntent!()).toBe('sign_in')
    c.clearGoogleIntent!()
    expect(c.googleIntent!()).toBeNull()
    const bad = clientFor(fakeAuth({ signInWithOAuth: vi.fn(async () => ({ error: { code: 'x', status: 500 } })) }))
    await bad.signInWithGoogle('sign_up')
    expect(bad.googleIntent!()).toBeNull()
  })
})
