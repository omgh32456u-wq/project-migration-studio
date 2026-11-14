import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/components/providers/app-store'
import {
  firstNameFrom,
  unconfiguredAuthClient,
  type AccountState,
  type AccountUser,
  type AuthClient,
  type AuthErrorCode,
  type AuthMode,
  type SignUpResult,
} from '@/lib/account'
import { AccountSheet } from './account-sheet'
import { NamePrompt } from './name-prompt'

interface AccountContextValue {
  account: AccountState
  client: AuthClient
  /** Guests get the sign-up / sign-in panel, signed-in users their profile. */
  openAccount: (mode?: AuthMode) => void
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>
  signInWithEmail: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  signInWithGoogle: (mode: AuthMode) => Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  resendConfirmation: (email: string) => Promise<{ ok: true } | { ok: false; error: AuthErrorCode }>
  signOut: () => Promise<void>
  /** A problem reported by a returning email link or Google redirect, shown once in the auth panel. */
  redirectNotice: AuthErrorCode | null
  clearRedirectNotice: () => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider')
  return ctx
}

/**
 * Holds the session and the account sheet. The app passes the Supabase client; the default
 * `unconfiguredAuthClient` keeps everyone a guest (tests pass their own client/state).
 * Signing in or out never reads, moves or clears guest food data; only `settings.account` (name/photo cache) is touched.
 */
export function AccountProvider({
  children,
  client = unconfiguredAuthClient,
  initialAccount = { status: 'guest' },
  readRedirectError,
}: {
  children: ReactNode
  client?: AuthClient
  initialAccount?: AccountState
  /** Reads (and removes) an auth error left in the address by a redirect. */
  readRedirectError?: () => AuthErrorCode | null
}) {
  const store = useStore()
  const [account, setAccount] = useState<AccountState>(initialAccount)
  const [sheet, setSheet] = useState<{ open: boolean; mode: AuthMode }>({ open: false, mode: 'sign_up' })
  const [namePrompt, setNamePrompt] = useState<{ open: boolean; prefill: string }>({ open: false, prefill: '' })

  const [redirectNotice, setRedirectNotice] = useState<AuthErrorCode | null>(null)

  const { updateSettings, status } = store
  const currentRef = useRef<AccountState>(initialAccount)
  const promptedRef = useRef(new Set<string>())
  const knownUserRef = useRef(store.settings.account)
  knownUserRef.current = store.settings.account
  const adoptUser = useCallback(
    async (user: AccountUser, isNew: boolean) => {
      // Supabase repeats SIGNED_IN on tab refocus; an unchanged session must not close or reopen anything.
      const same = currentRef.current.status === 'signed_in' && currentRef.current.user.id === user.id
      currentRef.current = { status: 'signed_in', user }
      setAccount({ status: 'signed_in', user })
      if (same && !isNew) return
      const known = knownUserRef.current
      // The on-device name/photo cache belongs to one account; another account starts empty.
      await updateSettings((s) => (s.account.userId === user.id ? s : { ...s, account: { userId: user.id, displayName: '', avatar: null } }))
      setSheet((p) => ({ ...p, open: false }))
      // Ask for a name only for a new account that has none saved on this device yet.
      if (isNew && !promptedRef.current.has(user.id) && !(known.userId === user.id && known.displayName)) {
        promptedRef.current.add(user.id)
        setNamePrompt({ open: true, prefill: firstNameFrom(user.providerName) })
      }
    },
    [updateSettings],
  )

  // Once local data is loaded: restore a saved session, then follow identity changes.
  const ready = status === 'ready'
  useEffect(() => {
    if (!ready) return
    let active = true
    const notice = readRedirectError?.() ?? null
    if (notice) {
      setRedirectNotice(notice)
      setSheet({ open: true, mode: 'sign_in' })
    }
    void client.restore?.().then((user) => {
      if (active && user) void adoptUser(user, false)
    })
    const stop = client.subscribe?.((change) => {
      if (!active) return
      if (change.type === 'signed_out') {
        currentRef.current = { status: 'guest' }
        setAccount({ status: 'guest' })
      } else if (change.type === 'updated') {
        currentRef.current = { status: 'signed_in', user: change.user }
        setAccount({ status: 'signed_in', user: change.user })
      } else void adoptUser(change.user, change.fresh)
    })
    return () => {
      active = false
      stop?.()
    }
  }, [ready, client, adoptUser, readRedirectError])

  const value = useMemo<AccountContextValue>(
    () => ({
      account,
      client,
      openAccount: (mode = 'sign_up') => setSheet({ open: true, mode }),
      signUpWithEmail: async (email, password) => {
        const r = await client.signUpWithEmail(email, password)
        if (r.ok && !r.needsConfirmation) await adoptUser(r.user, true)
        return r
      },
      signInWithEmail: async (email, password) => {
        const r = await client.signInWithEmail(email, password)
        if (!r.ok) return r
        await adoptUser(r.user, false)
        return { ok: true }
      },
      signInWithGoogle: (mode) => client.signInWithGoogle(mode),
      resendConfirmation: (email) => client.resendConfirmation?.(email) ?? Promise.resolve({ ok: false, error: 'not_configured' }),
      signOut: async () => {
        await client.signOut()
        currentRef.current = { status: 'guest' }
        setAccount({ status: 'guest' })
      },
      redirectNotice,
      clearRedirectNotice: () => setRedirectNotice(null),
    }),
    [account, client, adoptUser, redirectNotice],
  )

  return (
    <AccountContext.Provider value={value}>
      {children}
      <AccountSheet open={sheet.open} mode={sheet.mode} onOpenChange={(open) => setSheet((p) => ({ ...p, open }))} />
      <NamePrompt
        open={namePrompt.open}
        prefill={namePrompt.prefill}
        onClose={() => setNamePrompt((p) => ({ ...p, open: false }))}
      />
    </AccountContext.Provider>
  )
}
