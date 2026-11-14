
import type { ReactNode } from 'react'
import { AccountProvider } from '@/components/account/account-provider'
import { createSupabaseAuthClient, takeAuthRedirectError } from '@/lib/supabase-auth'
import { AppStoreProvider, useStore } from '@/components/providers/app-store'
import { ToastProvider } from '@/components/providers/toast-provider'
import { AppShell } from './app-shell'
import { PwaRegister } from './pwa-register'
import { ReminderRunner } from './reminder-runner'

// One client for the app's lifetime; it loads the Supabase browser client only after hydration.
const authClient = createSupabaseAuthClient()

function WithToasts({ children }: { children: ReactNode }) {
  const { i18n } = useStore()
  return (
    <ToastProvider regionLabel={i18n.t('toast.region')} closeLabel={i18n.t('common.close')}>
      {children}
    </ToastProvider>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppStoreProvider>
      <WithToasts>
        <AccountProvider client={authClient} readRedirectError={takeAuthRedirectError}>
          <AppShell>{children}</AppShell>
        </AccountProvider>
        <PwaRegister />
        <ReminderRunner />
      </WithToasts>
    </AppStoreProvider>
  )
}
