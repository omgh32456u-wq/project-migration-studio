
import type { ReactNode } from 'react'
import { AccountProvider } from '@/components/account/account-provider'
import { AppStoreProvider, useStore } from '@/components/providers/app-store'
import { ToastProvider } from '@/components/providers/toast-provider'
import { AppShell } from './app-shell'
import { PwaRegister } from './pwa-register'
import { ReminderRunner } from './reminder-runner'

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
        <AccountProvider>
          <AppShell>{children}</AppShell>
        </AccountProvider>
        <PwaRegister />
        <ReminderRunner />
      </WithToasts>
    </AppStoreProvider>
  )
}
