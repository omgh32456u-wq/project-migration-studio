
import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Notice } from '@/components/common/controls'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { useToast } from '@/components/providers/toast-provider'
import { createBackup, logsToCsv, parseBackup, type ImportResult } from '@/lib/backup'
import { downloadFile } from '@/lib/display'
import { cn } from '@/lib/utils'
import { SettingsSection } from './settings-section'

type PendingImport = Extract<ImportResult, { ok: true }>

export function DataCard() {
  const store = useStore()
  const run = useAction()
  const toast = useToast()
  const { t } = store.i18n
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetAck, setResetAck] = useState(false)

  const stamp = () => store.today

  const save = async (filename: string, content: string, mime: string) => {
    try {
      await downloadFile(filename, content, mime)
      toast({ message: t('data.exported') })
    } catch {
      toast({ message: t('common.error'), tone: 'error' })
    }
  }
  const exportJson = () => save(`mizano-backup-${stamp()}.json`, JSON.stringify(createBackup(store.snapshot()), null, 2), 'application/json')
  const exportCsv = () => save(`mizano-log-${stamp()}.csv`, logsToCsv(store.logs), 'text/csv;charset=utf-8')

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 50_000_000) return toast({ message: t('data.importError.too_large'), tone: 'error' })
    const result = parseBackup(await file.text())
    if (fileRef.current) fileRef.current.value = ''
    if (!result.ok) return toast({ message: t(`data.importError.${result.error}`), tone: 'error' })
    setMode('merge')
    setPending(result)
  }

  return (
    <SettingsSection id="data" title={t('data.title')}>
      <Notice icon={<ShieldCheck />}>{t('data.privacy')}</Notice>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 [&_button]:justify-start">
        <Button variant="outline" size="lg" onClick={exportJson}>
          <Download aria-hidden />
          {t('data.exportJson')}
        </Button>
        <Button variant="outline" size="lg" onClick={exportCsv}>
          <FileSpreadsheet aria-hidden />
          {t('data.exportCsv')}
        </Button>
        <Button variant="outline" size="lg" onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden />
          {t('data.import')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
      <Button
        variant="ghost"
        size="lg"
        className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => {
          setResetAck(false)
          setResetOpen(true)
        }}
      >
        <Trash2 aria-hidden />
        {t('data.reset')}
      </Button>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-md" closeLabel={t('common.close')}>
          <DialogHeader>
            <DialogTitle>{t('data.importTitle')}</DialogTitle>
            {pending && (
              <DialogDescription>
                {t('data.importSummary', {
                  logs: pending.counts.logs,
                  foods: pending.counts.foods,
                  recipes: pending.counts.recipes,
                  meals: pending.counts.savedMeals,
                  weights: pending.counts.weights,
                })}
              </DialogDescription>
            )}
          </DialogHeader>
          <div role="radiogroup" aria-label={t('data.importTitle')} className="flex flex-col gap-2">
            {(['merge', 'replace'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2.5 text-start text-sm font-medium transition-colors',
                  mode === m ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-muted',
                )}
              >
                {t(m === 'merge' ? 'data.importMerge' : 'data.importReplace')}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={mode === 'replace' ? 'destructive' : 'default'}
              onClick={() => {
                if (!pending) return
                const data = pending.data
                setPending(null)
                void run(() => store.importData(data, mode), { success: t('data.imported') })
              }}
            >
              {t('data.importConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('data.resetTitle')}
        description={t('data.resetBody')}
        confirmLabel={t('data.reset')}
        confirmDisabled={!resetAck}
        onConfirm={() => void run(() => store.resetAll(), { success: t('data.resetDone') })}
      >
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={resetAck} onChange={(e) => setResetAck(e.target.checked)} className="mt-0.5 size-4 accent-[var(--destructive)]" />
          {t('data.resetConfirm')}
        </label>
      </ConfirmDialog>
    </SettingsSection>
  )
}
