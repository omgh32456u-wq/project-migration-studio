
import { useMemo, useState } from 'react'
import { Plus, RotateCcw, Salad } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AvatarButton } from '@/components/account/account-avatar'
import { BrandMark } from '@/components/common/brand-mark'
import { Card, EmptyState } from '@/components/common/controls'
import { useNutritionFormat } from '@/components/common/nutrition'
import { useRecentEntries } from '@/components/foods/use-recent'
import { AddFoodSheet, type AddTarget } from '@/components/log/add-food-sheet'
import { EntrySheet } from '@/components/log/entry-sheet'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { createId } from '@/lib/defaults'
import { localName } from '@/lib/display'
import { sumItems } from '@/lib/nutrition'
import { isBeforeDayStart } from '@/lib/nutrition-day'
import { MEAL_SLOTS, type LoggedItem, type LogEntry, type MealSlot } from '@/lib/types'
import { DateNav } from './date-nav'
import { DaySummary } from './day-summary'
import { IdeaWheelCard } from './idea-wheel'
import { MealSection } from './meal-section'
import { NameDialog } from './name-dialog'

export function defaultMealForNow(dayStartMinutes = 0, now = new Date()): MealSlot {
  // Still inside the previous nutrition day's window (e.g. 01:00 with a 04:00 start): a late-night snack.
  if (isBeforeDayStart(now, dayStartMinutes)) return 'snacks'
  const h = now.getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snacks'
}

const toItem = ({ id: _i, date: _d, meal: _m, createdAt: _c, updatedAt: _u, ...item }: LogEntry): LoggedItem => item

export function TodayScreen() {
  const store = useStore()
  const run = useAction()
  const { t, locale } = store.i18n
  const f = useNutritionFormat()
  const entries = useMemo(() => store.logsByDate.get(store.selectedDate) ?? [], [store.logsByDate, store.selectedDate])
  const totals = useMemo(() => sumItems(entries), [entries])
  const recent = useRecentEntries(8)

  const [sheet, setSheet] = useState<{ open: boolean; meal: MealSlot; target: AddTarget }>({ open: false, meal: 'breakfast', target: { kind: 'browse' } })
  const [editing, setEditing] = useState<LogEntry | null>(null)
  const [saveSlot, setSaveSlot] = useState<MealSlot | null>(null)

  const dayStart = store.settings.dayStartMinutes
  const openAdd = (meal: MealSlot = defaultMealForNow(dayStart), target: AddTarget = { kind: 'browse' }) => setSheet({ open: true, meal, target })

  const logAgain = async (entry: LogEntry) => {
    const meal = defaultMealForNow(dayStart)
    let created: LogEntry[] = []
    await run(
      async () => {
        created = await store.addLogItems([toItem(entry)], store.selectedDate, meal)
      },
      {
        success: t('entry.added', { meal: store.mealName(meal) }),
        undo: async () => {
          for (const e of created) await store.deleteLog(e.id)
        },
      },
    )
  }

  const saveMeal = async (name: string) => {
    if (!saveSlot) return
    const items = entries.filter((e) => e.meal === saveSlot).map(toItem)
    const now = Date.now()
    await run(() => store.saveSavedMeal({ id: createId('meal'), name, items, createdAt: now, updatedAt: now }), { success: t('meal.saved') })
    setSaveSlot(null)
  }

  return (
    // Extra bottom room on phones so the last meal row is not hidden behind the floating "Add food" button.
    <div className="flex flex-col gap-5 pb-14 sm:pb-0">
      <header className="flex flex-col gap-3">
        {/* Brand row: the sidebar carries the logo on large screens, so this is phone/tablet only. */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-9" />
            <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" className="hidden sm:inline-flex" onClick={() => openAdd()}>
              <Plus aria-hidden />
              {t('today.addFood')}
            </Button>
            <AvatarButton />
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 lg:max-w-xl">
            <DateNav />
          </div>
          <Button size="lg" className="hidden lg:inline-flex" onClick={() => openAdd()}>
            <Plus aria-hidden />
            {t('today.addFood')}
          </Button>
        </div>
      </header>

      {/* grid-cols-1 = minmax(0,1fr): without it the implicit phone column sizes to the widest min-content
          (the horizontally scrolling "Log again" row), stretching the whole screen past the viewport. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-8">
          <DaySummary totals={totals} />

          {recent.length > 0 && (
            <Card className="flex animate-rise flex-col gap-3 p-4 [animation-delay:120ms]" aria-labelledby="recent-title">
              <div className="flex flex-col gap-0.5">
                <h2 id="recent-title" className="flex items-center gap-2 text-sm font-semibold">
                  <RotateCcw className="size-4 text-primary" aria-hidden />
                  {t('today.recent')}
                </h2>
                <p className="text-xs text-muted-foreground">{t('today.recent.hint')}</p>
              </div>
              <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:flex-wrap">
                {recent.map((entry) => (
                  <li key={entry.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => void logAgain(entry)}
                      className="flex max-w-56 flex-col items-start gap-0.5 rounded-2xl border bg-background px-3.5 py-2.5 text-start transition-all duration-200 hover:border-primary/50 hover:bg-accent hover:shadow-soft active:scale-[0.97]"
                      aria-label={`${t('today.recent')}: ${localName(entry, locale)}, ${f.kcal(entry.nutrients.kcal)} ${t('unit.kcal')}`}
                    >
                      <span className="flex max-w-full items-center gap-1.5 text-sm font-medium">
                        <Plus className="size-3.5 shrink-0 text-primary" aria-hidden />
                        <span className="truncate">{localName(entry, locale)}</span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {store.i18n.fmtNum(entry.amount, 2)} × {locale === 'ar' ? entry.unitLabelAr : entry.unitLabelEn} · {f.kcal(entry.nutrients.kcal)} {t('unit.kcal')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <IdeaWheelCard />
        </div>

        {/* Tablets (md) lay the four meals out two-up; phones and the desktop right column stay single-column. */}
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:items-start lg:grid-cols-1">
          {entries.length === 0 && (
            <Card className="animate-rise md:col-span-2 lg:col-span-1">
              <EmptyState
                icon={<Salad className="size-6" />}
                title={t('today.empty.title')}
                body={t('today.empty.body')}
                action={
                  <Button size="lg" onClick={() => openAdd()}>
                    <Plus aria-hidden />
                    {t('today.addFood')}
                  </Button>
                }
              />
            </Card>
          )}
          {MEAL_SLOTS.map((slot, i) => (
            <MealSection
              key={slot}
              slot={slot}
              index={i}
              entries={entries.filter((e) => e.meal === slot)}
              onAdd={() => openAdd(slot)}
              onEdit={setEditing}
              onSave={() => setSaveSlot(slot)}
            />
          ))}
        </div>
      </div>

      <Button
        size="lg"
        onClick={() => openAdd()}
        className="fixed end-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 h-14 rounded-2xl px-5 shadow-lift sm:hidden"
      >
        <Plus className="size-5" aria-hidden />
        {t('today.addFood')}
      </Button>

      <AddFoodSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        date={store.selectedDate}
        meal={sheet.meal}
        initial={sheet.target}
      />
      <EntrySheet entry={editing} onOpenChange={(o) => !o && setEditing(null)} />
      <NameDialog
        open={saveSlot !== null}
        onOpenChange={(o) => !o && setSaveSlot(null)}
        title={t('meal.saveAs.title')}
        label={t('meal.saveAs.name')}
        initial={saveSlot ? `${store.mealName(saveSlot)} – ${store.i18n.fmtDate(store.selectedDate, { day: 'numeric', month: 'short' })}` : ''}
        onSubmit={(name) => void saveMeal(name)}
      />
    </div>
  )
}
