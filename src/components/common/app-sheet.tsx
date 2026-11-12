
import type { ReactNode } from 'react'
import { useStore } from '@/components/providers/app-store'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/** Bottom sheet on phones, centred panel on larger screens. */
export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  headerStart,
  children,
  footer,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  headerStart?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const { t } = useStore().i18n
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        closeLabel={t('common.close')}
        className={cn(
          'flex max-h-[92dvh] flex-col gap-0 rounded-t-3xl border-x-0 p-0 sm:inset-x-auto sm:left-1/2 sm:bottom-4 sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:rounded-3xl sm:border',
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="flex shrink-0 items-center gap-2 px-5 pt-3 pb-3 pe-14 sm:pt-5">
          {headerStart}
          <div className="flex min-w-0 flex-col gap-0.5">
            <SheetTitle className="truncate text-base font-semibold">{title}</SheetTitle>
            {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t bg-card px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </SheetContent>
    </Sheet>
  )
}
