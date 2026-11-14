import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib/i18n'
import { defaultSettings } from '@/lib/defaults'
import type { AccountState, AuthClient, AuthMode } from '@/lib/account'
import type { Settings } from '@/lib/types'

// Minimal store: real English strings, in-memory settings (no IndexedDB in jsdom).
const store = { settings: defaultSettings() as Settings, i18n: createTranslator('en'), updateSettings: vi.fn() }
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

function fillEmail(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
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
    fillEmail('me@site.co', 'longpassword')
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
    fillEmail('o@m.co', 'longpassword')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'What should we call you?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Display name')).toHaveValue('Omar')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(store.settings.account).toEqual({ userId: 'u9', displayName: 'Omar', avatar: null }))
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
