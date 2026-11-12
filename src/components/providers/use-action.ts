
import { useCallback } from 'react'
import { useStore } from './app-store'
import { useToast } from './toast-provider'

interface Feedback {
  success?: string
  undo?: () => void | Promise<void>
}

/** Runs a persistence action and reports success or failure to the user. */
export function useAction() {
  const toast = useToast()
  const { i18n } = useStore()
  return useCallback(
    async <T,>(fn: () => Promise<T>, feedback: Feedback = {}): Promise<T | undefined> => {
      try {
        const result = await fn()
        if (feedback.success) {
          toast({
            message: feedback.success,
            action: feedback.undo ? { label: i18n.t('common.undo'), onClick: () => void feedback.undo?.() } : undefined,
          })
        }
        return result
      } catch (error) {
        console.error('[tmm] action failed', error)
        toast({ message: i18n.t('common.error'), tone: 'error' })
        return undefined
      }
    },
    [toast, i18n],
  )
}
