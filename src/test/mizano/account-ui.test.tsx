import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib/i18n'
import { defaultSettings } from '@/lib/defaults'
import type { AccountState, AuthChange, AuthClient, AuthMode, SignUpResult } from '@/lib/account'
import type { Settings } from '@/lib/types'

// Minimal store: real English strings, in-memory settings (no IndexedDB in jsdom).
const store = { status: 'ready' as const, settings: defaultSettings() as Settings, i18n: createTranslator('en'), updateSettings: vi.fn() }
store.updateSettings.mockImplementation(async (fn: (s: Settings) => Settings) => {
  store.settings = fn(store.settings)
})
vi.mock('@/components/providers/app-store', () => ({ useStore: () => store }))
vi.mock('@/components/providers/use-action', () => ({ useAction: () => (fn: () => Promise<unknown>) => fn() }))

const { AccountProvider } = await import('@/components/account/account-provider')
const { AuthPanel } = await import('@/components/account/auth-panel')
const { MizoScreen } = await import('@/components/mizo/mizo-screen')

function fakeClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    configured: true,
    signUpWithEmail: vi.fn(async () => ({ ok: true as const, needsConfirmation: true as const })),
    signInWithEmail: vi.fn(async () => ({ ok: false as const, error: 'invalid_credentials' as const })),
    signInWithGoogle: vi.fn(async () => ({ ok: true as const })),
    signOut: vi.fn(async () => {}),
    ...overrides,
  }
}

function Panel({ initial }: { initial: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initial)
  return <AuthPanel mode={mode} onModeChange={setMode} onGuest={() => {}} renderHeader={(title) => <h1>{title}</h1>} />
}

function fillEmail(email: string, password: string, confirm?: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  if (confirm !== undefined) fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirm } })
}

const STRONG = 'Mizano#2026'
const rule = (name: string) => document.querySelector(`[data-rule="${name}"]`) as HTMLElement

function openSignUpEmail(client = fakeClient()) {
  render(
    <AccountProvider client={client}>
      <Panel initial="sign_up" />
    </AccountProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Sign up with email' }))
  return client
}

beforeEach(() => {
  store.settings = defaultSettings()
})

describe('auth entry', () => {
  it('lists Google, Apple, email and phone in order, with Apple and phone disabled', () => {
    render(
      <AccountProvider client={fakeClient()}>
        <Panel initial="sign_up" />
      </AccountProvider>,
    )
    const names = ['Sign up with Google', 'Sign up with Apple', 'Sign up with email', 'Sign up with phone number']
    const buttons = names.map((n) => screen.getByRole('button', { name: new RegExp(`^${n}`) }))
    for (let i = 1; i < buttons.length; i++) expect(buttons[i - 1].compareDocumentPosition(buttons[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(buttons.map((b) => (b as HTMLButtonElement).disabled)).toEqual([false, true, false, true])
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeInTheDocument()
  })

  it('signing in never creates an account, and an unknown account gets a privacy-safe message', async () => {
    const client = fakeClient()
    render(
      <AccountProvider client={client}>
        <Panel initial="sign_in" />
      </AccountProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    fillEmail('new@person.co', 'whatever1')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("don't match an account")
    expect(client.signInWithEmail).toHaveBeenCalledWith('new@person.co', 'whatever1')
    expect(client.signUpWithEmail).not.toHaveBeenCalled()
  })

  it('signing up only calls sign-up and shows the confirm-your-email state', async () => {
    const client = fakeClient()
    render(
      <AccountProvider client={client}>
        <Panel initial="sign_up" />
      </AccountProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign up with email' }))
    fillEmail('me@site.co', STRONG, STRONG)
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(client.signUpWithEmail).toHaveBeenCalledTimes(1)
    expect(client.signInWithEmail).not.toHaveBeenCalled()
  })

  it('without a sign-in service, Google says accounts are not switched on (no fake success)', async () => {
    render(
      <AccountProvider>
        <Panel initial="sign_up" />
      </AccountProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign up with Google' }))
    expect(await screen.findByRole('status')).toHaveTextContent("Accounts aren't switched on")
  })

  it('asks "What should we call you?" after a new account, prefilled from the Google name', async () => {
    const client = fakeClient({
      signUpWithEmail: vi.fn(async () => ({ ok: true as const, needsConfirmation: false as const, user: { id: 'u9', email: 'o@m.co', providerName: 'Omar Mohamed' } })),
    })
    render(
      <AccountProvider client={client}>
        <Panel initial="sign_up" />
      </AccountProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign up with email' }))
    fillEmail('o@m.co', STRONG, STRONG)
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'What should we call you?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Display name')).toHaveValue('Omar')
    expect(screen.getByLabelText('Display name')).toHaveAttribute('placeholder', 'Your name')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(store.settings.account).toEqual({ userId: 'u9', displayName: 'Omar', avatar: null }))
  })
})

describe('sign-up password form', () => {
  it('shows the Apple logo on the still-disabled Apple button', () => {
    render(
      <AccountProvider client={fakeClient()}>
        <Panel initial="sign_up" />
      </AccountProvider>,
    )
    const apple = screen.getByRole('button', { name: /^Sign up with Apple/ })
    expect(apple).toBeDisabled()
    expect(apple).toHaveTextContent('Coming later')
    expect(apple.querySelector('svg path')).not.toBeNull()
  })

  it('shows the email and password placeholders', () => {
    openSignUpEmail()
    expect(screen.getByLabelText('Email')).toHaveAttribute('placeholder', 'example@gmail.com')
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('placeholder', 'Enter your password')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('autocomplete', 'new-password')
  })

  it.each([
    ['length', 'Aa1!aaaa', 'Aa1!aaa'],
    ['upper', 'aaaa1!aA', 'aaaa1!aa'],
    ['lower', 'AAAA1!Aa', 'AAAA1!AA'],
    ['number', 'Aaaaa!a1', 'Aaaaa!aa'],
    ['special', 'Aaaaa1a!', 'Aaaaa1aa'],
  ])('updates the %s requirement live while typing', (name, passing, failing) => {
    openSignUpEmail()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: failing } })
    expect(rule(name).dataset.met).toBe('false')
    expect(rule(name)).toHaveTextContent(/^Not yet:/)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: passing } })
    expect(rule(name).dataset.met).toBe('true')
    expect(rule(name)).toHaveTextContent(/^Done:/)
  })

  it('rates strength weak, medium, then strong as rules are met', () => {
    openSignUpEmail()
    const password = screen.getByLabelText('Password')
    fireEvent.change(password, { target: { value: 'abc' } })
    expect(screen.getByText('Password strength: Weak')).toBeInTheDocument()
    fireEvent.change(password, { target: { value: 'abcdefgH' } })
    expect(screen.getByText('Password strength: Medium')).toBeInTheDocument()
    fireEvent.change(password, { target: { value: STRONG } })
    expect(screen.getByText('Password strength: Strong')).toBeInTheDocument()
  })

  it('shows live confirmation matching, with its own show/hide control', () => {
    openSignUpEmail()
    fillEmail('me@site.co', STRONG, 'Mizano#20')
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: STRONG } })
    expect(screen.getByText('Passwords match')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password confirmation' }))
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('keeps Create account disabled until email, every rule and a matching confirmation pass', async () => {
    const client = openSignUpEmail()
    const submit = () => screen.getByRole('button', { name: 'Create account' }) as HTMLButtonElement
    expect(submit().disabled).toBe(true)
    fillEmail('not-an-email', STRONG, STRONG)
    expect(submit().disabled).toBe(true)
    fillEmail('me@site.co', 'mizano#2026', 'mizano#2026')
    expect(submit().disabled).toBe(true)
    fillEmail('me@site.co', STRONG, '')
    expect(submit().disabled).toBe(true)
    fillEmail('me@site.co', STRONG, STRONG + 'x')
    expect(submit().disabled).toBe(true)
    fireEvent.click(submit())
    expect(client.signUpWithEmail).not.toHaveBeenCalled()
    fillEmail('me@site.co', STRONG, STRONG)
    expect(submit().disabled).toBe(false)
    fireEvent.click(submit())
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(client.signUpWithEmail).toHaveBeenCalledWith('me@site.co', STRONG)
  })

  it('disables Create account while the request is running', async () => {
    let release: () => void = () => {}
    const client = fakeClient({
      signUpWithEmail: vi.fn(() => new Promise<SignUpResult>((r) => (release = () => r({ ok: true as const, needsConfirmation: true as const })))),
    })
    openSignUpEmail(client)
    fillEmail('me@site.co', STRONG, STRONG)
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('button', { name: 'Please wait…' })).toBeDisabled()
    release()
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
  })
})

describe('sign-in compatibility', () => {
  const openSignIn = (client = fakeClient()) => {
    render(
      <AccountProvider client={client}>
        <Panel initial="sign_in" />
      </AccountProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    return client
  }

  it('has no confirm field or requirements and accepts an old simple password', async () => {
    const client = openSignIn()
    expect(screen.queryByLabelText('Confirm password')).toBeNull()
    expect(document.querySelector('[data-rule]')).toBeNull()
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    fillEmail('old@user.co', 'abc')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(client.signInWithEmail).toHaveBeenCalledWith('old@user.co', 'abc'))
    expect(client.signUpWithEmail).not.toHaveBeenCalled()
  })

  it('only asks for a valid email and a non-empty password', async () => {
    const client = openSignIn()
    fillEmail('old@user.co', '')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your password.')).toBeInTheDocument()
    fillEmail('nope', 'abc')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(client.signInWithEmail).not.toHaveBeenCalled()
  })
})

describe('Mizo access', () => {
  const renderMizo = (initialAccount: AccountState) =>
    render(
      <AccountProvider client={fakeClient()} initialAccount={initialAccount}>
        <MizoScreen />
      </AccountProvider>,
    )

  it('shows guests a sign-up / sign-in prompt instead of the assistant', () => {
    const { container } = renderMizo({ status: 'guest' })
    expect(container.querySelector('[data-mizo]')?.getAttribute('data-mizo')).toBe('needs_account')
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('opens for a signed-in 16-year-old', () => {
    store.settings = { ...defaultSettings(), profile: { ...defaultSettings().profile, ageGroup: 'under18', age: 16 } }
    const { container } = renderMizo({ status: 'signed_in', user: { id: 'u1', email: 'teen@x.co', providerName: null } })
    expect(container.querySelector('[data-mizo]')?.getAttribute('data-mizo')).toBe('open')
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull()
  })
})

describe('session and guest data', () => {
  const user = { id: 'u9', email: 'me@x.co', providerName: null }

  it('restores a saved session on start, so Mizo opens without signing in again', async () => {
    const client = fakeClient({ restore: vi.fn(async () => user) })
    const { container } = render(
      <AccountProvider client={client}>
        <MizoScreen />
      </AccountProvider>,
    )
    await waitFor(() => expect(container.querySelector('[data-mizo]')?.getAttribute('data-mizo')).toBe('open'))
  })

  it('follows sign-in and sign-out events, and never touches guest food data or settings', async () => {
    let emit: (c: AuthChange) => void = () => {}
    const client = fakeClient({ subscribe: (l) => ((emit = l), () => {}) })
    store.settings = { ...defaultSettings(), dayStartMinutes: 240 }
    const before = { ...store.settings }
    const { container } = render(
      <AccountProvider client={client}>
        <MizoScreen />
      </AccountProvider>,
    )
    const state = () => container.querySelector('[data-mizo]')?.getAttribute('data-mizo')
    expect(state()).toBe('needs_account')
    act(() => emit({ type: 'signed_in', user, fresh: false }))
    await waitFor(() => expect(state()).toBe('open'))
    act(() => emit({ type: 'signed_out' }))
    await waitFor(() => expect(state()).toBe('needs_account'))
    // Only the on-device name/photo cache is keyed to the account; everything else is unchanged.
    const { account: _a, ...rest } = store.settings
    const { account: _b, ...restBefore } = before
    expect(rest).toEqual(restBefore)
  })

  it('signing in to an unconfirmed account shows "check your email" with a resend button', async () => {
    const resendConfirmation = vi.fn(async () => ({ ok: true as const }))
    const client = fakeClient({
      signInWithEmail: vi.fn(async () => ({ ok: false as const, error: 'email_not_confirmed' as const })),
      resendConfirmation,
    })
    render(
      <AccountProvider client={client}>
        <Panel initial="sign_in" />
      </AccountProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with email' }))
    fillEmail('me@x.co', 'old')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(client.signUpWithEmail).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }))
    await waitFor(() => expect(resendConfirmation).toHaveBeenCalledWith('me@x.co'))
  })

  it('shows a clear message when Google is not switched on, without leaving the app', async () => {
    const client = fakeClient({ signInWithGoogle: vi.fn(async () => ({ ok: false as const, error: 'provider_disabled' as const })) })
    render(
      <AccountProvider client={client}>
        <Panel initial="sign_in" />
      </AccountProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }))
    expect(await screen.findByText(/This sign-in option isn't switched on yet/)).toBeInTheDocument()
  })
})
