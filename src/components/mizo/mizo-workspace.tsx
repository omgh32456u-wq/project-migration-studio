import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowUp, CloudOff, Info, Menu, Pencil, Plus, RotateCcw, ShieldCheck, Square, SquarePen, Trash2, TriangleAlert } from 'lucide-react'
import { BrandMark } from '@/components/common/brand-mark'
import { LoadingMark } from '@/components/common/loading-mark'
import { Card } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { useAccount } from '@/components/account/account-provider'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { newConversation, newId, sharedChatStore, titleFrom, type ChatStore, type MizoConsent, type MizoConversation, type MizoMessage } from '@/lib/mizo/chat-store'
import { buildMizoRequest, createMizoTransport, type MizoTransport, type MizoUsage } from '@/lib/mizo/client'
import { MIZO_CONSENT_VERSION, type MizoErrorCode } from '@/lib/mizo/protocol'
import type { MessageKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const SUGGESTIONS: MessageKey[] = ['mizo.suggest.1', 'mizo.suggest.2', 'mizo.suggest.3', 'mizo.suggest.4']

/** Localized message for every failure the endpoint or the connection can produce. */
export const MIZO_ERROR_KEY: Record<MizoErrorCode, MessageKey> = {
  unauthenticated: 'mizo.err.session',
  invalid_request: 'mizo.err.invalid',
  consent_required: 'mizo.consent.offBody',
  daily_limit: 'mizo.quota',
  concurrent_limit: 'mizo.err.busyOwn',
  burst_limit: 'mizo.err.burst',
  provider_not_configured: 'mizo.err.notConfigured',
  unavailable: 'mizo.err.notConfigured',
  provider_auth: 'mizo.err.service',
  provider_forbidden: 'mizo.err.service',
  provider_bad_request: 'mizo.err.service',
  provider_rate_limited: 'mizo.err.busy',
  provider_quota: 'mizo.err.busy',
  timeout: 'mizo.err.timeout',
  offline: 'mizo.offline',
  network: 'mizo.err.network',
  usage_unavailable: 'mizo.err.generic',
  provider_unavailable: 'mizo.err.generic',
  provider_malformed: 'mizo.err.generic',
  unknown: 'mizo.err.generic',
}

export function consentGranted(c: MizoConsent | null): boolean {
  return Boolean(c?.granted && c.version === MIZO_CONSENT_VERSION)
}

export function MizoGlyph({ className }: { className?: string }) {
  return (
    <span className={cn('flex size-16 items-center justify-center rounded-full bg-accent ring-8 ring-accent/40', className)} aria-hidden>
      <BrandMark className="size-9" />
    </span>
  )
}

type NoticeKind = 'unavailable' | 'offline' | 'error' | 'quota' | 'info'

export function MizoNotice({ kind, children, id }: { kind: NoticeKind; children: React.ReactNode; id?: string }) {
  const Icon = kind === 'offline' ? CloudOff : kind === 'error' || kind === 'quota' ? TriangleAlert : Info
  return (
    <div
      id={id}
      role={kind === 'error' || kind === 'quota' ? 'alert' : undefined}
      data-notice={kind}
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed text-pretty sm:text-sm',
        kind === 'error' || kind === 'quota' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border bg-muted/50 text-muted-foreground',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">{children}</div>
    </div>
  )
}

function useOnline() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}


/** The explicit, reversible opt-in shown before anything is sent. */
function ConsentCard({ revoked, onAgree, busy }: { revoked: boolean; onAgree: () => void; busy: boolean }) {
  const { t } = useStore().i18n
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-lift" data-mizo-consent={revoked ? 'off' : 'ask'}>
      <h2 id={titleId} className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        {t(revoked ? 'mizo.consent.offTitle' : 'mizo.consent.title')}
      </h2>
      {revoked && <p className="text-sm text-muted-foreground">{t('mizo.consent.offBody')}</p>}
      <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm leading-relaxed text-pretty">
        <li>{t('mizo.consent.body')}</li>
        <li>{t('mizo.consent.notSent')}</li>
        <li>{t('mizo.consent.local')}</li>
      </ul>
      <Button size="lg" className="self-start" onClick={onAgree} disabled={busy}>
        {t('mizo.consent.agree')}
      </Button>
    </section>
  )
}

type Failure = { userMessageId: string; code: MizoErrorCode; resetsAt?: string }
type Pending = { userMessageId: string; text: string }

/** Signed-in Mizo chat space. Only mounted for an account; `userId` scopes all history and consent reads and writes. */
export function MizoWorkspace({ userId, store, transport }: { userId: string; store?: ChatStore; transport?: MizoTransport }) {
  const app = useStore()
  const { t } = app.i18n
  const appLocale = app.i18n.locale === 'ar' ? 'ar' : 'en'
  const { client } = useAccount()
  const online = useOnline()
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ready'; conversation: MizoConversation }>({ status: 'loading' })
  const [consent, setConsent] = useState<MizoConsent | null>(null)
  const [consentBusy, setConsentBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [attachNote, setAttachNote] = useState(false)
  const [chats, setChats] = useState<MizoConversation[]>([])
  const [listOpen, setListOpen] = useState(false)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [usage, setUsage] = useState<MizoUsage | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const convRef = useRef<MizoConversation | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const noticeId = useId()
  const attachId = useId()
  const statusId = useId()

  const send = useMemo<MizoTransport>(() => transport ?? createMizoTransport(() => client.accessToken?.() ?? Promise.resolve(null)), [transport, client])
  const getStore = useCallback(() => (store ? Promise.resolve(store) : sharedChatStore()), [store])

  useEffect(() => {
    let live = true
    getStore()
      .then(async (s) => {
        const [list, activeId, k] = await Promise.all([s.list(userId), s.getActive(userId), s.loadConsent(userId).catch(() => null)])
        if (!live) return
        const own = list.filter((c) => c.userId === userId)
        const conversation = own.find((c) => c.id === activeId) ?? own[0] ?? newConversation(userId)
        convRef.current = conversation
        setChats(own)
        setConsent(k && k.userId === userId ? k : null)
        setState({ status: 'ready', conversation })
        if (conversation.id !== activeId && own.length) await s.setActive(userId, conversation.id).catch(() => setSaveError(true))
      })
      .catch(() => live && setState({ status: 'error' }))
    return () => {
      live = false
      abortRef.current?.abort()
    }
  }, [getStore, userId])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [state, pending?.text])

  const persist = useCallback(
    async (conversation: MizoConversation) => {
      if (conversation.userId !== userId) return
      // A reply for a chat that is no longer open is saved to that chat, never shown in the open one.
      if (convRef.current?.id === conversation.id) {
        convRef.current = conversation
        setState({ status: 'ready', conversation })
      }
      setChats((list) => [conversation, ...list.filter((c) => c.id !== conversation.id)])
      try {
        const s = await getStore()
        await s.save(conversation)
        if (convRef.current?.id === conversation.id) await s.setActive(userId, conversation.id)
        setSaveError(false)
      } catch {
        setSaveError(true)
      }
    },
    [getStore, userId],
  )

  const granted = consentGranted(consent)

  const updateConsent = async (next: boolean) => {
    setConsentBusy(true)
    const record: MizoConsent = { userId, version: MIZO_CONSENT_VERSION, granted: next, updatedAt: new Date().toISOString() }
    if (!next) abortRef.current?.abort()
    try {
      await (await getStore()).saveConsent(record)
      setConsent(record)
      if (next && failure?.code === 'consent_required') setFailure(null)
    } catch {
      setSaveError(true)
    } finally {
      setConsentBusy(false)
    }
  }

  /** Asks for an answer to `userMessageId`, which must be the last saved message. Saves at most one reply. */
  const answer = async (userMessageId: string) => {
    const conversation = convRef.current
    if (!conversation || abortRef.current) return
    const index = conversation.messages.findIndex((m) => m.id === userMessageId)
    if (index === -1 || index !== conversation.messages.length - 1) return
    const controller = new AbortController()
    abortRef.current = controller
    let text = ''
    setFailure(null)
    setPending({ userMessageId, text: '' })
    const result = await send({
      request: buildMizoRequest(conversation.messages.slice(0, index + 1), appLocale),
      signal: controller.signal,
      onDelta: (piece) => {
        text += piece
        setPending({ userMessageId, text })
      },
    })
    abortRef.current = null
    setPending(null)
    if (result.usage) setUsage(result.usage)
    const origin = conversation.id
    const latest = convRef.current?.id === origin ? convRef.current : await getStore().then((s) => s.get(userId, origin)).catch(() => null)
    if (text.trim() && latest && latest.userId === userId && latest.id === origin) {
      const reply: MizoMessage = {
        id: newId(),
        role: 'assistant',
        text,
        createdAt: new Date().toISOString(),
        status: result.ok ? 'complete' : result.aborted ? 'stopped' : 'cut',
        replyTo: userMessageId,
      }
      await persist({ ...latest, messages: [...latest.messages, reply], updatedAt: reply.createdAt })
    }
    if (convRef.current?.id !== origin) return
    if (!result.ok && !result.aborted) {
      if (result.code === 'consent_required') setConsent(null)
      if (!text.trim()) setFailure({ userMessageId, code: result.code, resetsAt: result.resetsAt })
      else setFailure({ userMessageId: '', code: result.code })
    }
  }

  const submit = async () => {
    const text = draft.trim()
    const conversation = convRef.current
    if (!text || !conversation || !granted || !online || abortRef.current) return
    const message: MizoMessage = { id: newId(), role: 'user', text, createdAt: new Date().toISOString() }
    setDraft('')
    const title = conversation.titleSource === 'manual' || conversation.title ? conversation.title : titleFrom(text)
    await persist({ ...conversation, title, messages: [...conversation.messages, message], updatedAt: message.createdAt })
    await answer(message.id)
  }

  /** Opens a saved chat. Any reply still streaming is stopped and kept in its own chat. */
  const openChat = async (next: MizoConversation) => {
    abortRef.current?.abort()
    convRef.current = next
    setState({ status: 'ready', conversation: next })
    setFailure(null)
    setPending(null)
    setDraft('')
    setListOpen(false)
    try {
      await (await getStore()).setActive(userId, next.id)
    } catch {
      setSaveError(true)
    }
  }

  /** Saves a new empty chat right away so it stays open across navigation and reloads. An already empty open chat is reused, never duplicated. */
  const startNewChat = async () => {
    const current = convRef.current
    const reuse = current !== null && current.messages.length === 0 && !abortRef.current
    const next = reuse ? current : newConversation(userId)
    if (reuse) setListOpen(false)
    else await openChat(next)
    if (!chats.some((c) => c.id === next.id)) await persist(next)
  }

  const renameChat = async () => {
    if (!renaming) return
    const title = renaming.title.replace(/\s+/g, ' ').trim().slice(0, 80)
    const target = convRef.current?.id === renaming.id ? convRef.current : chats.find((c) => c.id === renaming.id)
    setRenaming(null)
    if (!target) return
    await persist({ ...target, title: title || titleFrom(target.messages.find((m) => m.role === 'user')?.text ?? ''), titleSource: title ? 'manual' : 'auto' })
  }

  const deleteChat = async () => {
    const id = confirmDelete
    if (!id) return
    try {
      if (convRef.current?.id === id) abortRef.current?.abort()
      const s = await getStore()
      await s.remove(userId, id)
      const rest = chats.filter((c) => c.id !== id)
      setChats(rest)
      if (convRef.current?.id === id) {
        const next = rest[0] ?? newConversation(userId)
        convRef.current = next
        setState({ status: 'ready', conversation: next })
        setFailure(null)
        await s.setActive(userId, rest[0]?.id ?? null)
      }
      setDeleteError(false)
      setConfirmDelete(null)
    } catch {
      setDeleteError(true)
    }
  }

  if (state.status === 'loading') return <LoadingMark label={t('mizo.loadingHistory')} className="min-h-[50dvh]" />

  const messages = state.status === 'ready' ? state.conversation.messages : []
  const busy = pending !== null
  const canSend = granted && online && !busy && draft.trim().length > 0 && state.status === 'ready'
  const last = messages[messages.length - 1]
  const canRetry = failure && failure.userMessageId && last?.id === failure.userMessageId && !busy && granted && online
  const resetTime = failure?.resetsAt
    ? new Intl.DateTimeFormat(appLocale === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(failure.resetsAt))
    : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4" data-mizo-workspace={userId}>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setListOpen(true)} aria-label={t('mizo.chats.open')}>
          <Menu aria-hidden />
          <span className="max-w-[45vw] truncate sm:max-w-xs" dir="auto">{state.status === 'ready' && state.conversation.title ? state.conversation.title : t('mizo.chats.untitled')}</span>
        </Button>
        <div className="ms-auto flex items-center gap-1">
          {messages.length > 0 && state.status === 'ready' && (
            <Button variant="ghost" size="icon" aria-label={t('mizo.delete.action')} onClick={() => setConfirmDelete(state.conversation.id)}>
              <Trash2 aria-hidden />
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label={t('mizo.chats.new')} disabled={messages.length === 0 && !busy} onClick={() => void startNewChat()}>
            <SquarePen aria-hidden />
          </Button>
        </div>
      </div>
      {state.status === 'error' && <MizoNotice kind="error">{t('mizo.error.history')}</MizoNotice>}
      {saveError && <MizoNotice kind="error">{t('mizo.error.history')}</MizoNotice>}

      {messages.length === 0 && !busy ? (
        <Card className="flex animate-rise flex-col items-center gap-4 px-5 py-8 text-center sm:px-10">
          <MizoGlyph />
          <div className="flex max-w-md flex-col gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-balance">{t('mizo.welcome.title')}</h2>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t('mizo.welcome.body')}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:grid sm:grid-cols-2">
            {SUGGESTIONS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setDraft(t(k))}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-start text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {t(k)}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <ol className="flex flex-col gap-3" aria-label={t('mizo.history.label')}>
            {messages.map((m) => (
              <li key={m.id} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                <p
                  dir="auto"
                  className={cn(
                    'max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user' ? 'rounded-2xl rounded-ee-md bg-primary px-4 py-2.5 text-primary-foreground' : 'px-1 text-foreground',
                  )}
                >
                  {m.text}
                </p>
                {m.role === 'assistant' && (m.status === 'stopped' || m.status === 'cut') && (
                  <span className="px-1 pt-1 text-xs text-muted-foreground">{t(m.status === 'stopped' ? 'mizo.stopped' : 'mizo.cutShort')}</span>
                )}
              </li>
            ))}
            {pending && (
              <li className="flex flex-col items-start" data-mizo-pending>
                {pending.text && (
                  <p dir="auto" aria-busy="true" className="max-w-[85%] px-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {pending.text}
                  </p>
                )}
                <span className="flex items-center gap-2 px-1 pt-1 text-xs text-muted-foreground">
                  <span className="flex gap-1" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </span>
                  {t(pending.text ? 'mizo.writing' : 'mizo.thinking')}
                </span>
              </li>
            )}
          </ol>
        </>
      )}

      <div role="status" aria-live="polite" id={statusId} className="sr-only">
        {pending ? t(pending.text ? 'mizo.writing' : 'mizo.thinking') : ''}
      </div>

      {failure && failure.code !== 'consent_required' && (
        <MizoNotice kind={failure.code === 'daily_limit' ? 'quota' : failure.code === 'offline' ? 'offline' : 'error'}>
          <span>{failure.code === 'daily_limit' && resetTime ? t('mizo.quotaReset', { time: resetTime }) : t(MIZO_ERROR_KEY[failure.code])}</span>
          {canRetry && failure.code !== 'daily_limit' && (
            <Button variant="outline" size="sm" onClick={() => void answer(failure.userMessageId)}>
              <RotateCcw aria-hidden />
              {t('mizo.retry')}
            </Button>
          )}
        </MizoNotice>
      )}

      <div ref={endRef} />

      {!granted ? (
        <div className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-4">
          <ConsentCard revoked={consent !== null} onAgree={() => void updateConsent(true)} busy={consentBusy} />
        </div>
      ) : (
        <form
          className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-lift lg:bottom-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          aria-label={t('mizo.composer.label')}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void submit()
              }
            }}
            rows={2}
            maxLength={2000}
            dir="auto"
            placeholder={t('mizo.composer.placeholder')}
            aria-label={t('mizo.composer.placeholder')}
            aria-describedby={noticeId}
            className="max-h-40 min-h-12 w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('mizo.attach.label')}
              aria-describedby={attachNote ? attachId : undefined}
              aria-expanded={attachNote}
              onClick={() => setAttachNote((v) => !v)}
            >
              <Plus aria-hidden />
            </Button>
            {usage && (
              <span className="text-xs text-muted-foreground tabular-nums">{t('mizo.usage', { used: String(usage.usedToday), limit: String(usage.dailyLimit) })}</span>
            )}
            {busy ? (
              <Button type="button" size="icon" variant="outline" aria-label={t('mizo.stop')} onClick={() => abortRef.current?.abort()}>
                <Square aria-hidden />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!canSend} aria-label={t('mizo.send')} aria-describedby={noticeId}>
                <ArrowUp aria-hidden />
              </Button>
            )}
          </div>
          {attachNote && <MizoNotice kind="info" id={attachId}>{t('mizo.attach.note')}</MizoNotice>}
          <MizoNotice kind={online ? 'info' : 'offline'} id={noticeId}>
            <span>{t(online ? 'mizo.consent.active' : 'mizo.offline')}</span>
            {online && (
              <button type="button" className="font-medium text-foreground underline underline-offset-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" onClick={() => void updateConsent(false)}>
                {t('mizo.consent.revoke')}
              </button>
            )}
          </MizoNotice>
        </form>
      )}

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side={app.i18n.locale === 'ar' ? 'right' : 'left'} className="p-4">
          <SheetHeader className="p-0">
            <SheetTitle>{t('mizo.chats.title')}</SheetTitle>
          </SheetHeader>
          <Button variant="outline" onClick={() => void startNewChat()}>
            <SquarePen aria-hidden />
            {t('mizo.chats.new')}
          </Button>
          {chats.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('mizo.chats.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-1 overflow-y-auto" aria-label={t('mizo.chats.title')}>
              {chats.map((c) => {
                const current = state.status === 'ready' && state.conversation.id === c.id
                const name = c.title || t('mizo.chats.untitled')
                return (
                  <li key={c.id} className={cn('flex items-center gap-1 rounded-xl', current && 'bg-muted')}>
                    <button
                      type="button"
                      dir="auto"
                      aria-current={current ? 'true' : undefined}
                      onClick={() => void openChat(c)}
                      className="min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-start text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {name}
                    </button>
                    <Button variant="ghost" size="icon-sm" aria-label={t('mizo.chats.rename', { name })} onClick={() => (setListOpen(false), setRenaming({ id: c.id, title: c.title }))}>
                      <Pencil aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={t('mizo.chats.delete', { name })} onClick={() => (setListOpen(false), setConfirmDelete(c.id))}>
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('mizo.chats.renameTitle')}</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void renameChat()
            }}
          >
            <Input
              dir="auto"
              maxLength={80}
              aria-label={t('mizo.chats.renameTitle')}
              value={renaming?.title ?? ''}
              onChange={(e) => setRenaming((r) => (r ? { ...r, title: e.target.value } : r))}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                {t('mizo.delete.cancel')}
              </Button>
              <Button type="submit">{t('mizo.chats.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mizo.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('mizo.delete.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <MizoNotice kind="error">{t('mizo.error.delete')}</MizoNotice>}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('mizo.delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteChat}>
              {t('mizo.delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
