
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastAction {
  label: string
  onClick: () => void
}
interface ToastInput {
  message: string
  tone?: 'success' | 'error'
  action?: ToastAction
  duration?: number
}
interface ToastItem extends ToastInput {
  id: number
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export function ToastProvider({ children, regionLabel, closeLabel }: { children: ReactNode; regionLabel: string; closeLabel: string }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-2), { ...input, id }])
      window.setTimeout(() => dismiss(id), input.duration ?? (input.action ? 6000 : 3200))
    },
    [dismiss],
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        aria-label={regionLabel}
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg animate-in fade-in-0 slide-in-from-bottom-2',
              t.tone === 'error' ? 'bg-destructive text-white' : 'bg-foreground text-background',
            )}
          >
            {t.tone === 'error' ? <AlertTriangle className="size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="size-4 shrink-0" aria-hidden />}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="rounded-md px-2 py-1 font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-current"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(t.id)} className="rounded-md p-1 opacity-70 hover:opacity-100" aria-label={closeLabel}>
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </section>
    </ToastContext.Provider>
  )
}
