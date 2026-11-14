import { useEffect, useId, useState } from 'react'
import { ArrowUp, CloudOff, Info, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { BrandMark } from '@/components/common/brand-mark'
import { LoadingMark } from '@/components/common/loading-mark'
import { Card } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
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
import { sharedChatStore, type ChatStore, type MizoConversation } from '@/lib/mizo/chat-store'
import type { MessageKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Whether Mizo can answer. No provider is connected in this version, so it is always false. */
export const MIZO_REPLIES_AVAILABLE = false

const SUGGESTIONS: MessageKey[] = ['mizo.suggest.1', 'mizo.suggest.2', 'mizo.suggest.3', 'mizo.suggest.4']

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
    <p
      id={id}
      role={kind === 'error' ? 'alert' : undefined}
      data-notice={kind}
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed text-pretty sm:text-sm',
        kind === 'error' || kind === 'quota' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border bg-muted/50 text-muted-foreground',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
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

/** Signed-in Mizo chat space. Only mounted for an account; `userId` scopes all history reads and writes. */
export function MizoWorkspace({ userId, store }: { userId: string; store?: ChatStore }) {
  const { t } = useStore().i18n
  const online = useOnline()
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ready'; conversation: MizoConversation }>({ status: 'loading' })
  const [draft, setDraft] = useState('')
  const [attachNote, setAttachNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const noticeId = useId()
  const attachId = useId()

  useEffect(() => {
    let live = true
    ;(store ? Promise.resolve(store) : sharedChatStore())
      .then((s) => s.load(userId))
      .then((c) => live && setState({ status: 'ready', conversation: c.userId === userId ? c : { ...c, userId, messages: [] } }))
      .catch(() => live && setState({ status: 'error' }))
    return () => {
      live = false
    }
  }, [store, userId])

  const deleteChat = async () => {
    try {
      const s = store ?? (await sharedChatStore())
      await s.remove(userId)
      setState({ status: 'ready', conversation: { userId, messages: [], updatedAt: new Date().toISOString() } })
      setDeleteError(false)
      setConfirmDelete(false)
    } catch {
      setDeleteError(true)
    }
  }

  if (state.status === 'loading') return <LoadingMark label={t('mizo.loadingHistory')} className="min-h-[50dvh]" />

  const messages = state.status === 'ready' ? state.conversation.messages : []
  const canSend = MIZO_REPLIES_AVAILABLE && online && draft.trim().length > 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4" data-mizo-workspace={userId}>
      {state.status === 'error' && <MizoNotice kind="error">{t('mizo.error.history')}</MizoNotice>}

      {messages.length === 0 ? (
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
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden />
              {t('mizo.delete.action')}
            </Button>
          </div>
          <ol className="flex flex-col gap-3" aria-label={t('mizo.history.label')}>
            {messages.map((m) => (
              <li key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <p
                  className={cn(
                    'max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user' ? 'rounded-2xl rounded-ee-md bg-primary px-4 py-2.5 text-primary-foreground' : 'px-1 text-foreground',
                  )}
                >
                  {m.text}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}

      <form
        className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-lift lg:bottom-4"
        onSubmit={(e) => e.preventDefault()}
        aria-label={t('mizo.composer.label')}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={2000}
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
          <Button type="submit" size="icon" disabled={!canSend} aria-label={t('mizo.send')} aria-describedby={noticeId}>
            <ArrowUp aria-hidden />
          </Button>
        </div>
        {attachNote && <MizoNotice kind="info" id={attachId}>{t('mizo.attach.note')}</MizoNotice>}
        <MizoNotice kind={online ? 'unavailable' : 'offline'} id={noticeId}>
          {t(online ? 'mizo.unavailable' : 'mizo.offline')}
        </MizoNotice>
      </form>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
