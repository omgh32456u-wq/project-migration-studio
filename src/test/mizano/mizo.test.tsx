import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib/i18n'
import { defaultSettings } from '@/lib/defaults'
import type { AccountState, AuthClient } from '@/lib/account'
import { MemoryChatStore, type ChatStore, type MizoConversation } from '@/lib/mizo/chat-store'

const store = { status: 'ready' as const, settings: defaultSettings(), i18n: createTranslator('en'), updateSettings: vi.fn(async () => {}) }
vi.mock('@/components/providers/app-store', () => ({ useStore: () => store }))
vi.mock('@/components/providers/use-action', () => ({ useAction: () => (fn: () => Promise<unknown>) => fn() }))

const { AccountProvider } = await import('@/components/account/account-provider')
const { MizoScreen } = await import('@/components/mizo/mizo-screen')

const client: AuthClient = {
  configured: true,
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(async () => {}),
} as unknown as AuthClient

const conv = (userId: string, text: string): MizoConversation => ({
  userId,
  updatedAt: '2026-11-14T00:00:00.000Z',
  messages: [{ id: 'm1', role: 'user', text, createdAt: '2026-11-14T00:00:00.000Z' }],
})
const signedIn = (id: string): AccountState => ({ status: 'signed_in', user: { id, email: `${id}@x.co`, providerName: null } })
const renderMizo = (account: AccountState, chatStore: ChatStore) =>
  render(
    <AccountProvider client={client} initialAccount={account}>
      <MizoScreen chatStore={chatStore} />
    </AccountProvider>,
  )

describe('Mizo chat store', () => {
  it('keeps each account separate and refuses an empty account id', async () => {
    const s = new MemoryChatStore()
    await s.save(conv('a', 'from a'))
    expect((await s.load('b')).messages).toEqual([])
    expect((await s.load('a')).messages[0].text).toBe('from a')
    await expect(s.load('')).rejects.toThrow()
    await s.remove('a')
    expect((await s.load('a')).messages).toEqual([])
  })
})

describe('Mizo screen', () => {
  it('never mounts the chat or reads history for guests', () => {
    const s = new MemoryChatStore()
    const load = vi.spyOn(s, 'load')
    const { container } = renderMizo({ status: 'guest' }, s)
    expect(container.querySelector('[data-mizo-workspace]')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    expect(load).not.toHaveBeenCalled()
  })

  it("shows only the signed-in account's own chat", async () => {
    const s = new MemoryChatStore()
    await s.save(conv('alice', 'alice secret'))
    renderMizo(signedIn('bob'), s)
    expect(await screen.findByText("Hi, I'm Mizo")).toBeInTheDocument()
    expect(screen.queryByText('alice secret')).toBeNull()
  })

  it('keeps Send unavailable with an honest note and never invents a reply', async () => {
    renderMizo(signedIn('u1'), new MemoryChatStore())
    const box = await screen.findByRole('textbox')
    fireEvent.change(box, { target: { value: 'hello' } })
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByText(/isn't connected yet/)).toBeInTheDocument()
  })

  it('deletes the chat only after confirmation', async () => {
    const s = new MemoryChatStore()
    await s.save(conv('u1', 'my question'))
    await s.save(conv('other', 'keep me'))
    renderMizo(signedIn('u1'), s)
    expect(await screen.findByText('my question')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete chat' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect((await s.load('u1')).messages).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Delete chat' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('my question')).toBeNull())
    expect((await s.load('u1')).messages).toEqual([])
    expect((await s.load('other')).messages).toHaveLength(1)
  })
})
