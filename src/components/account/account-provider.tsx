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
import { RegistrationDialog, type RegistrationStep } from './registration-dialog'

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

  // A signed-in Google account that has not finished registration. The app stays in guest mode meanwhile.
  const [registration, setRegistration] = useState<{ user: AccountUser; step: RegistrationStep } | null>(null)
  const registrationRef = useRef<string | null>(null)
  const [redirectNotice, setRedirectNotice] = useState<AuthErrorCode | null>(null)

  const { updateSettings, status } = store
  const currentRef = useRef<AccountState>(initialAccount)
  const promptedRef = useRef(new Set<string>())
  const knownUserRef = useRef(store.settings.account)
  knownUserRef.current = store.settings.account
  const adoptUser = useCallback(
    async (user: AccountUser, isNew: boolean) => {
      if (user.needsRegistration) {
        // Repeated SIGNED_IN / restore for the same unfinished account must not stack or reset the dialog.
        if (registrationRef.current === user.id) return
        registrationRef.current = user.id
        currentRef.current = { status: 'guest' }
        setAccount({ status: 'guest' })
        setSheet((p) => ({ ...p, open: false }))
        setRegistration({ user, step: client.googleIntent?.() === 'sign_in' ? 'not_found' : 'complete' })
        return
      }
      // Supabase repeats SIGNED_IN on tab refocus; an unchanged session must not close or reopen anything.
      const same = currentRef.current.status === 'signed_in' && currentRef.current.user.id === user.id
      currentRef.current = { status: 'signed_in', user }
      setAccount({ status: 'signed_in', user })
      if (same && !isNew) return
      const known = knownUserRef.current
      const localName = known.userId === user.id ? known.displayName : ''
      const accountName = user.displayName ?? ''
      // The on-device name/photo cache belongs to one account; another account starts empty.
      // A name saved on the account fills an empty local name, so devices agree.
      await updateSettings((s) => {
        const base = s.account.userId === user.id ? s.account : { userId: user.id, displayName: '', avatar: null }
        const displayName = base.displayName || accountName
        return base === s.account && displayName === s.account.displayName ? s : { ...s, account: { ...base, displayName } }
      })
      setSheet((p) => ({ ...p, open: false }))
      // Only a genuinely new account with no usable name anywhere, asked once per account.
      if (!(isNew || user.namePromptPending) || user.namePromptDone || accountName || localName || promptedRef.current.has(user.id)) return
      promptedRef.current.add(user.id)
      const providerFirst = firstNameFrom(user.providerName)
      if (providerFirst) {
        // Google already gave a name: use it instead of asking.
        await updateSettings((s) => (s.account.userId === user.id ? { ...s, account: { ...s.account, displayName: providerFirst } } : s))
        void client.updateProfile?.({ displayName: providerFirst })
        return
      }
      setNamePrompt({ open: true, prefill: '' })
    },
    [updateSettings, client],
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
        registrationRef.current = null
        setRegistration(null)
      } else if (change.type === 'updated') {
        if (change.user.needsRegistration || registrationRef.current === change.user.id) return
        currentRef.current = { status: 'signed_in', user: change.user }
        setAccount({ status: 'signed_in', user: change.user })
      } else void adoptUser(change.user, false)
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

  const finishRegistration = async (name: string) => {
    const pending = registration
    if (!pending) return { ok: true as const }
    const r = (await client.completeRegistration?.(name)) ?? { ok: false as const, error: 'not_configured' as const }
    if (!r.ok) return r
    client.clearGoogleIntent?.()
    registrationRef.current = null
    setRegistration(null)
    const displayName = name || pending.user.displayName || null
    await adoptUser({ ...pending.user, displayName, namePromptDone: true, namePromptPending: false, needsRegistration: false }, false)
    return r
  }

  const cancelRegistration = async () => {
    client.clearGoogleIntent?.()
    await client.signOut()
    registrationRef.current = null
    setRegistration(null)
    currentRef.current = { status: 'guest' }
    setAccount({ status: 'guest' })
  }

  return (
    <AccountContext.Provider value={value}>
      {children}
      <AccountSheet open={sheet.open} mode={sheet.mode} onOpenChange={(open) => setSheet((p) => ({ ...p, open }))} />
      <RegistrationDialog
        state={registration}
        onCreate={() => setRegistration((r) => (r ? { ...r, step: 'complete' } : r))}
        onFinish={finishRegistration}
        onCancel={cancelRegistration}
      />
      <NamePrompt
        open={namePrompt.open}
        prefill={namePrompt.prefill}
        onClose={() => setNamePrompt((p) => ({ ...p, open: false }))}
        // Saved or skipped, the account remembers it so the prompt never returns.
        onDone={(name) => void client.updateProfile?.(name ? { displayName: name } : { namePromptDone: true })}
      />
    </AccountContext.Provider>
  )
}
