
import { useState } from 'react'
import { Copy, History, Trash2 } from 'lucide-react'
import { AppSheet } from '@/components/common/app-sheet'
import { Badge, Field, Notice, NumberInput } from '@/components/common/controls'
import { NutrientGrid } from '@/components/common/nutrition'
import { Button } from '@/components/ui/button'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { localName, secondaryName } from '@/lib/display'
import { parseLocaleNumber, rescaleItem, validateAmount } from '@/lib/nutrition'
import type { LogEntry, MealSlot } from '@/lib/types'
import { MealAndDate } from './quantity-form'

function EntryForm({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const store = useStore()
  const run = useAction()
  const { t, locale, fmtNum } = store.i18n
  const [raw, setRaw] = useState(String(entry.amount))
  const [meal, setMeal] = useState<MealSlot>(entry.meal)
  const [date, setDate] = useState(entry.date)
  const amount = parseLocaleNumber(raw)
  const error = validateAmount(amount, entry.unitGrams || 1)
  const preview = !error && amount !== null ? rescaleItem(entry, amount) : null
  const unitLabel = locale === 'ar' ? entry.unitLabelAr : entry.unitLabelEn
  const sub = secondaryName(entry, locale)

  const save = async () => {
    if (!preview) return
    const ok = await run(() => store.updateLog({ ...entry, ...preview, meal, date }).then(() => true), { success: t('entry.updated') })
    if (ok) {
      store.setSelectedDate(date)
      onClose()
    }
  }

  const duplicate = async () => {
    const { id: _id, date: _d, meal: _m, createdAt: _c, updatedAt: _u, ...item } = entry
    const ok = await run(() => store.addLogItems([item], date, meal).then(() => true), { success: t('entry.duplicated') })
    if (ok) onClose()
  }

  const remove = async () => {
    const removed = await run(() => store.deleteLog(entry.id), {
      success: t('entry.deleted'),
      undo: () => store.restoreLog(entry),
    })
    if (removed !== undefined) onClose()
  }

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold leading-tight">{localName(entry, locale)}</h3>
          {entry.estimated && <Badge tone="warning">{t('entry.estimatedBadge')}</Badge>}
        </div>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>
      <Field label={t('entry.amountIn', { unit: unitLabel })} error={error ? t(`qty.${error}`) : null}>
        {({ id, describedBy, invalid }) => (
          <NumberInput
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 text-lg font-semibold"
          />
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">{t('add.preview')}</span>
          {preview && entry.unitKind !== 'g' && <span className="text-xs text-muted-foreground">{t('add.equals', { g: fmtNum(preview.grams, 1) })}</span>}
        </div>
        <NutrientGrid n={preview?.nutrients ?? { kcal: null, protein: null, carbs: null, fat: null }} />
        <Notice icon={<History />}>{t('entry.snapshotNote')}</Notice>
      </div>
      <MealAndDate meal={meal} onMeal={setMeal} date={date} onDate={setDate} />
      <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t bg-popover px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="button" variant="destructive" size="lg" onClick={() => void remove()} aria-label={t('common.delete')}>
          <Trash2 aria-hidden />
          <span className="hidden sm:inline">{t('common.delete')}</span>
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => void duplicate()} aria-label={t('common.duplicate')}>
          <Copy aria-hidden />
          <span className="hidden sm:inline">{t('common.duplicate')}</span>
        </Button>
        <Button type="submit" size="lg" className="flex-1" disabled={!!error}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}

export function EntrySheet({ entry, onOpenChange }: { entry: LogEntry | null; onOpenChange: (o: boolean) => void }) {
  const { t } = useStore().i18n
  return (
    <AppSheet open={!!entry} onOpenChange={onOpenChange} title={t('entry.edit')}>
      {entry && <EntryForm key={entry.id} entry={entry} onClose={() => onOpenChange(false)} />}
    </AppSheet>
  )
}
