
import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { AppSheet } from '@/components/common/app-sheet'
import { FoodBrowser } from '@/components/foods/food-browser'
import { FoodEditorSheet } from '@/components/foods/food-editor-sheet'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import type { LoggedItem, LogEntry, MealSlot } from '@/lib/types'
import { FoodQuantityForm, RecipeQuantityForm, type UnitKey } from './quantity-form'

export type AddTarget =
  | { kind: 'browse' }
  | { kind: 'food'; foodId: string; amount?: number; unit?: UnitKey }
  | { kind: 'recipe'; recipeId: string }

export function AddFoodSheet({
  open,
  onOpenChange,
  date: initialDate,
  meal: initialMeal,
  initial = { kind: 'browse' },
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  date: string
  meal: MealSlot
  initial?: AddTarget
}) {
  const { t, dir } = useStore().i18n
  return (
    <AppSheetHost open={open} onOpenChange={onOpenChange} initialDate={initialDate} initialMeal={initialMeal} initial={initial} titleBrowse={t('add.title')} dir={dir} />
  )
}

function AppSheetHost({
  open,
  onOpenChange,
  initialDate,
  initialMeal,
  initial,
  titleBrowse,
  dir,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initialDate: string
  initialMeal: MealSlot
  initial: AddTarget
  titleBrowse: string
  dir: 'ltr' | 'rtl'
}) {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  const [view, setView] = useState<AddTarget>(initial)
  const [meal, setMeal] = useState<MealSlot>(initialMeal)
  const [date, setDate] = useState(initialDate)
  const [editorOpen, setEditorOpen] = useState(false)
  const [lastOpen, setLastOpen] = useState(false)

  // Reset internal state each time the sheet opens.
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setView(initial)
      setMeal(initialMeal)
      setDate(initialDate)
    }
  }

  const add = async (items: LoggedItem[]) => {
    let created: LogEntry[] = []
    const ok = await run(
      async () => {
        created = await store.addLogItems(items, date, meal)
        return true
      },
      {
        success: t(items.length > 1 ? 'meal.logged' : 'entry.added', { meal: store.mealName(meal) }),
        undo: async () => {
          for (const e of created) await store.deleteLog(e.id)
        },
      },
    )
    if (!ok) return
    onOpenChange(false)
    store.setSelectedDate(date)
  }

  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft
  const food = view.kind === 'food' ? store.foodsById.get(view.foodId) : undefined
  const recipe = view.kind === 'recipe' ? store.recipes.find((r) => r.id === view.recipeId) : undefined
  const showBack = view.kind !== 'browse' && initial.kind === 'browse'

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={view.kind === 'browse' ? titleBrowse : t('add.title')}
        description={store.i18n.fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
        headerStart={
          showBack ? (
            <button
              type="button"
              onClick={() => setView({ kind: 'browse' })}
              className="-ms-2 flex size-10 items-center justify-center rounded-lg hover:bg-muted"
              aria-label={t('common.back')}
            >
              <Back className="size-5" aria-hidden />
            </button>
          ) : undefined
        }
      >
        {view.kind === 'browse' && (
          <FoodBrowser
            onPickFood={(f) => setView({ kind: 'food', foodId: f.id })}
            onPickRecent={(entry) =>
              entry.sourceType === 'recipe' && entry.sourceId
                ? setView({ kind: 'recipe', recipeId: entry.sourceId })
                : entry.sourceId &&
                  setView({
                    kind: 'food',
                    foodId: entry.sourceId,
                    amount: entry.amount,
                    unit: recentUnitKey(entry, store.foodsById.get(entry.sourceId)?.servings ?? []),
                  })
            }
            onPickRecipe={(r) => setView({ kind: 'recipe', recipeId: r.id })}
            onPickMeal={(m) => void add(m.items)}
            onCreateCustom={() => setEditorOpen(true)}
          />
        )}
        {view.kind === 'food' && food && (
          <FoodQuantityForm
            key={`${food.id}:${food.updatedAt}`}
            food={food}
            initialAmount={view.amount}
            initialUnit={view.unit}
            meal={meal}
            onMeal={setMeal}
            date={date}
            onDate={setDate}
            submitLabel={t('add.submit', { meal: store.mealName(meal) })}
            onSubmit={(item) => void add([item])}
          />
        )}
        {view.kind === 'recipe' && recipe && (
          <RecipeQuantityForm
            key={recipe.id}
            recipe={recipe}
            meal={meal}
            onMeal={setMeal}
            date={date}
            onDate={setDate}
            submitLabel={t('add.submit', { meal: store.mealName(meal) })}
            onSubmit={(item) => void add([item])}
          />
        )}
      </AppSheet>
      <FoodEditorSheet open={editorOpen} onOpenChange={setEditorOpen} onSaved={(f) => setView({ kind: 'food', foodId: f.id })} />
    </>
  )
}

function recentUnitKey(entry: LogEntry, servings: { id: string; grams: number; labelEn: string }[]): UnitKey | undefined {
  if (entry.unitKind === 'g') return 'g'
  if (entry.unitKind === 'oz') return 'oz'
  const match = servings.find((s) => s.labelEn === entry.unitLabelEn && Math.abs(s.grams - entry.unitGrams) < 0.01)
  return match ? `s:${match.id}` : undefined
}
