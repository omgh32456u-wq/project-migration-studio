import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib/i18n'
import { defaultSettings } from '@/lib/defaults'
import type { AccountState, AuthClient } from '@/lib/account'
import { MemoryChatStore, titleFrom, type ChatStore, type MizoConversation } from '@/lib/mizo/chat-store'
import type { MizoTransport } from '@/lib/mizo/client'

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

const conv = (userId: string, text: string, id = `c-${userId}`, updatedAt = '2026-11-14T00:00:00.000Z'): MizoConversation => ({
  id,
  userId,
  title: titleFrom(text),
  titleSource: 'auto',
  kind: 'chat',
  createdAt: updatedAt,
  updatedAt,
  messages: [{ id: 'm1', role: 'user', text, createdAt: '2026-11-14T00:00:00.000Z' }],
})
const msgs = async (s: ChatStore, u: string) => (await s.list(u))[0]?.messages ?? []
const signedIn = (id: string): AccountState => ({ status: 'signed_in', user: { id, email: `${id}@x.co`, providerName: null } })
const consented = async (userId: string) => {
  const s = new MemoryChatStore()
  await s.saveConsent({ userId, version: 1, granted: true, updatedAt: '2026-11-14T00:00:00.000Z' })
  return s
}
const renderMizo = (account: AccountState, chatStore: ChatStore, transport?: MizoTransport) =>
  render(
    <AccountProvider client={client} initialAccount={account}>
      <MizoScreen chatStore={chatStore} transport={transport} />
    </AccountProvider>,
  )

describe('Mizo chat store', () => {
  it('keeps each account separate and refuses an empty account id', async () => {
    const s = new MemoryChatStore()
    await s.save(conv('a', 'from a'))
    expect(await s.list('b')).toEqual([])
    expect(await s.get('b', 'c-a')).toBeNull()
    await s.remove('b', 'c-a')
    await expect(s.save({ ...conv('b', 'steal'), id: 'c-a' })).rejects.toThrow()
    expect((await s.get('a', 'c-a'))?.messages[0].text).toBe('from a')
    await expect(s.list('')).rejects.toThrow()
    await s.remove('a', 'c-a')
    expect(await s.list('a')).toEqual([])
  })
})

describe('Mizo screen', () => {
  it('never mounts the chat or reads history for guests', () => {
    const s = new MemoryChatStore()
    const load = vi.spyOn(s, 'list')
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

  it('asks for consent first and sends nothing before opting in', async () => {
    const s = new MemoryChatStore()
    const transport = vi.fn<MizoTransport>()
    renderMizo(signedIn('u1'), s, transport)
    expect(await screen.findByRole('heading', { name: 'Before you chat with Mizo' })).toBeInTheDocument()
    expect(screen.getByText(/AshnaAI and the AI model providers/)).toBeInTheDocument()
    expect(screen.getByText(/email, photos, profile, weight and food logs are not sent/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(transport).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'I agree, turn on Mizo' }))
    expect(await screen.findByRole('textbox')).toBeInTheDocument()
    expect(await s.loadConsent('u1')).toMatchObject({ granted: true, version: 1 })
    expect(await s.loadConsent('other')).toBeNull()
  })

  it('streams a reply and saves both turns on this device only for that account', async () => {
    const s = await consented('u1')
    const transport = vi.fn<MizoTransport>(async ({ onDelta }) => {
      onDelta('Try ')
      onDelta('yogurt.')
      return { ok: true, usage: { usedToday: 1, dailyLimit: 15, resetsAt: '2026-11-15T00:00:00.000Z' } }
    })
    renderMizo(signedIn('u1'), s, transport)
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'snack?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Try yogurt.')).toBeInTheDocument()
    expect(screen.getByText('1 of 15 messages used today')).toBeInTheDocument()
    const sent = transport.mock.calls[0][0].request
    expect(sent).toEqual({ locale: 'en', consentVersion: 1, messages: [{ role: 'user', content: 'snack?' }] })
    const saved = (await msgs(s, 'u1'))
    expect(saved.map((m) => [m.role, m.text, m.status])).toEqual([['user', 'snack?', undefined], ['assistant', 'Try yogurt.', 'complete']])
    expect((await msgs(s, 'other'))).toEqual([])
  })

  it('retries a failed question without saving it twice', async () => {
    const s = await consented('u1')
    const transport = vi
      .fn<MizoTransport>()
      .mockResolvedValueOnce({ ok: false, code: 'provider_rate_limited', aborted: false, usage: null })
      .mockImplementationOnce(async ({ onDelta }) => (onDelta('Here you go'), { ok: true, usage: null }))
    renderMizo(signedIn('u1'), s, transport)
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'idea?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText(/very busy right now/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Here you go')).toBeInTheDocument()
    const saved = (await msgs(s, 'u1'))
    expect(saved.filter((m) => m.role === 'user')).toHaveLength(1)
    expect(saved).toHaveLength(2)
    expect(transport.mock.calls[1][0].request.messages).toEqual([{ role: 'user', content: 'idea?' }])
  })

  it('Stop keeps the partial reply, marked as stopped', async () => {
    const s = await consented('u1')
    const transport: MizoTransport = ({ onDelta, signal }) =>
      new Promise((resolve) => {
        onDelta('Partial answer')
        signal.addEventListener('abort', () => resolve({ ok: false, code: 'unknown', aborted: true, usage: null }))
      })
    renderMizo(signedIn('u1'), s, transport)
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'long one' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Mizo is writing…', { selector: 'span' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop reply' }))
    expect(await screen.findByText('You stopped this reply.')).toBeInTheDocument()
    expect((await msgs(s, 'u1')).at(-1)).toMatchObject({ role: 'assistant', text: 'Partial answer', status: 'stopped' })
  })

  it('turning sharing off hides the composer and sends nothing', async () => {
    const s = await consented('u1')
    const transport = vi.fn<MizoTransport>()
    renderMizo(signedIn('u1'), s, transport)
    fireEvent.click(await screen.findByRole('button', { name: 'Turn off sharing' }))
    expect(await screen.findByRole('heading', { name: 'Sharing with Mizo is off' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(await s.loadConsent('u1')).toMatchObject({ granted: false })
    expect(transport).not.toHaveBeenCalled()
  })

  it("never applies one account's consent to another", async () => {
    const s = await consented('alice')
    renderMizo(signedIn('bob'), s, vi.fn<MizoTransport>())
    expect(await screen.findByRole('heading', { name: 'Before you chat with Mizo' })).toBeInTheDocument()
  })

  it('shows the daily limit with its reset time', async () => {
    const s = await consented('u1')
    const transport = vi.fn<MizoTransport>(async () => ({ ok: false, code: 'daily_limit', resetsAt: '2026-11-15T00:00:00.000Z', aborted: false, usage: null }))
    renderMizo(signedIn('u1'), s, transport)
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText(/reached today's Mizo limit. It resets at/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })

  it('deletes the chat only after confirmation', async () => {
    const s = new MemoryChatStore()
    await s.save(conv('u1', 'my question'))
    await s.save(conv('other', 'keep me'))
    renderMizo(signedIn('u1'), s)
    expect(await screen.findByText('my question', { selector: 'p' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete chat' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull())
    expect((await msgs(s, 'u1'))).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Delete chat' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('my question', { selector: 'p' })).toBeNull())
    expect((await msgs(s, 'u1'))).toEqual([])
    expect((await msgs(s, 'other'))).toHaveLength(1)
  })
})

describe('Mizo conversations', () => {
  it('titles a chat from its first question, cut at a word', () => {
    expect(titleFrom('  what   should I eat\nmore')).toBe('what should I eat')
    expect(titleFrom('a'.repeat(30) + ' ' + 'b'.repeat(50))).toBe('a'.repeat(30) + '…')
    expect(Array.from(titleFrom('word '.repeat(20))).length).toBeLessThanOrEqual(41)
    expect(titleFrom('ماذا آكل على الفطار؟')).toBe('ماذا آكل على الفطار؟')
  })

  it('starts a new chat, keeps both, and sends only the open chat', async () => {
    const s = await consented('u1')
    await s.save(conv('u1', 'old question', 'old'))
    const transport = vi.fn<MizoTransport>(async ({ onDelta }) => (onDelta('ok'), { ok: true, usage: null }))
    renderMizo(signedIn('u1'), s, transport)
    expect(await screen.findByText('old question', { selector: 'p' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))
    await waitFor(() => expect(screen.queryByText('old question', { selector: 'p' })).toBeNull())
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'fresh topic' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('ok')).toBeInTheDocument()
    expect(transport.mock.calls[0][0].request.messages).toEqual([{ role: 'user', content: 'fresh topic' }])
    const list = await s.list('u1')
    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ title: 'fresh topic' })
    expect(await s.getActive('u1')).toBe(list[0].id)
    expect((await s.get('u1', 'old'))?.messages).toHaveLength(1)
  })

  it('restores the last open chat after leaving Mizo, and falls back when it is gone', async () => {
    const s = new MemoryChatStore()
    await s.save(conv('u1', 'first chat', 'a', '2026-11-14T00:00:00.000Z'))
    await s.save(conv('u1', 'newest chat', 'b', '2026-11-14T05:00:00.000Z'))
    await s.setActive('u1', 'a')
    const first = renderMizo(signedIn('u1'), s)
    expect(await screen.findByText('first chat', { selector: 'p' })).toBeInTheDocument()
    first.unmount()
    renderMizo(signedIn('u1'), s)
    expect(await screen.findByText('first chat', { selector: 'p' })).toBeInTheDocument()
    await s.remove('u1', 'a')
    cleanup()
    renderMizo(signedIn('u1'), s)
    expect(await screen.findByText('newest chat', { selector: 'p' })).toBeInTheDocument()
    await waitFor(async () => expect(await s.getActive('u1')).toBe('b'))
  })

  it('opens, renames and deletes one chat from the list without touching the others or consent', async () => {
    const s = await consented('u1')
    await s.save(conv('u1', 'keep this', 'a', '2026-11-14T00:00:00.000Z'))
    await s.save(conv('u1', 'remove this', 'b', '2026-11-14T05:00:00.000Z'))
    renderMizo(signedIn('u1'), s)
    expect(await screen.findByText('remove this', { selector: 'p' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Your chats' }))
    fireEvent.click(await screen.findByRole('button', { name: 'keep this' }))
    expect(await screen.findByText('keep this', { selector: 'p' })).toBeInTheDocument()
    await waitFor(async () => expect(await s.getActive('u1')).toBe('a'))
    fireEvent.click(screen.getByRole('button', { name: 'Your chats' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Rename keep this' }))
    fireEvent.change(await screen.findByRole('textbox', { name: 'Rename chat' }), { target: { value: 'Breakfast ideas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect(await s.get('u1', 'a')).toMatchObject({ title: 'Breakfast ideas', titleSource: 'manual' }))
    fireEvent.click(screen.getByRole('button', { name: 'Your chats' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete remove this' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect(await s.get('u1', 'b')).toBeNull())
    expect((await s.get('u1', 'a'))?.messages).toHaveLength(1)
    expect(await s.loadConsent('u1')).toMatchObject({ granted: true })
  })

  it('a reply still arriving after switching chats is saved to its own chat only', async () => {
    const s = await consented('u1')
    await s.save(conv('u1', 'other chat', 'other', '2026-11-13T00:00:00.000Z'))
    const transport: MizoTransport = ({ onDelta, signal }) =>
      new Promise((resolve) => {
        onDelta('half reply')
        signal.addEventListener('abort', () => resolve({ ok: false, code: 'unknown', aborted: true, usage: null }))
      })
    renderMizo(signedIn('u1'), s, transport)
    expect(await screen.findByText('other chat', { selector: 'p' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))
    await waitFor(() => expect(screen.queryByText('other chat', { selector: 'p' })).toBeNull())
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'slow question' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('half reply')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Your chats' }))
    fireEvent.click(await screen.findByRole('button', { name: 'other chat' }))
    expect(await screen.findByText('other chat', { selector: 'p' })).toBeInTheDocument()
    await waitFor(async () => expect((await s.list('u1')).find((c) => c.title === 'slow question')?.messages).toHaveLength(2))
    expect(screen.queryByText('half reply')).toBeNull()
    expect((await s.get('u1', 'other'))?.messages).toHaveLength(1)
    const slow = (await s.list('u1')).find((c) => c.title === 'slow question')!
    expect(slow.messages[1]).toMatchObject({ role: 'assistant', text: 'half reply', status: 'stopped' })
  })
})

describe('Mizo request building', () => {
  it('sends only role and text of the last 10 turns, nothing else', async () => {
    const { buildMizoRequest } = await import('@/lib/mizo/client')
    const history = Array.from({ length: 25 }, (_, i) => ({
      id: `m${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      text: `t${i}`,
      createdAt: '2026-11-14T00:00:00.000Z',
      status: 'complete' as const,
      replyTo: 'x',
    }))
    const req = buildMizoRequest(history, 'ar')
    expect(req.locale).toBe('ar')
    expect(req.consentVersion).toBe(1)
    expect(req.messages).toHaveLength(20)
    expect(req.messages[0]).toEqual({ role: 'assistant', content: 't5' })
    expect(req.messages.at(-1)).toEqual({ role: 'user', content: 't24' })
    expect(Object.keys(req).sort()).toEqual(['consentVersion', 'locale', 'messages'])
    for (const m of req.messages) expect(Object.keys(m).sort()).toEqual(['content', 'role'])
  })

  it('maps endpoint and connection failures', async () => {
    const { createMizoTransport } = await import('@/lib/mizo/client')
    const req = { locale: 'en' as const, consentVersion: 1, messages: [{ role: 'user' as const, content: 'hi' }] }
    const run = (f: typeof fetch, token: string | null = 't') => createMizoTransport(async () => token, f, '/x')({ request: req, signal: new AbortController().signal, onDelta: () => {} })
    expect(await run(vi.fn(), null)).toMatchObject({ ok: false, code: 'unauthenticated' })
    expect(await run(vi.fn(async () => new Response('nope', { status: 404 })))).toMatchObject({ ok: false, code: 'unavailable' })
    expect(await run(vi.fn(async () => Response.json({ error: { code: 'daily_limit', resetsAt: 'R' } }, { status: 429 })))).toMatchObject({ code: 'daily_limit', resetsAt: 'R' })
    expect(await run(vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))).toMatchObject({ ok: false, code: 'network' })
    const f = vi.fn<typeof fetch>(async () => Response.json({ error: { code: 'consent_required' } }, { status: 403 }))
    expect(await run(f)).toMatchObject({ code: 'consent_required' })
    expect((f.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe('Bearer t')
  })
})
