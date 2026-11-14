import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
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
  signOut: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider')
  return ctx
}

/**
 * Holds the session and the account sheet. With no sign-in service connected the client is
 * `unconfiguredAuthClient`, so everyone stays a guest; tests pass their own client/state.
 */
export function AccountProvider({
  children,
  client = unconfiguredAuthClient,
  initialAccount = { status: 'guest' },
}: {
  children: ReactNode
  client?: AuthClient
  initialAccount?: AccountState
}) {
  const store = useStore()
  const [account, setAccount] = useState<AccountState>(initialAccount)
  const [sheet, setSheet] = useState<{ open: boolean; mode: AuthMode }>({ open: false, mode: 'sign_up' })
  const [namePrompt, setNamePrompt] = useState<{ open: boolean; prefill: string }>({ open: false, prefill: '' })

  const { updateSettings } = store
  const adoptUser = useCallback(
    async (user: AccountUser, isNew: boolean) => {
      setAccount({ status: 'signed_in', user })
      // The on-device name/photo cache belongs to one account; another account starts empty.
      await updateSettings((s) => (s.account.userId === user.id ? s : { ...s, account: { userId: user.id, displayName: '', avatar: null } }))
      setSheet((p) => ({ ...p, open: false }))
      if (isNew) setNamePrompt({ open: true, prefill: firstNameFrom(user.providerName) })
    },
    [updateSettings],
  )

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
      signOut: async () => {
        await client.signOut()
        setAccount({ status: 'guest' })
      },
    }),
    [account, client, adoptUser],
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
