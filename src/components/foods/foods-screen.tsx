
import { useState } from 'react'
import { BookmarkCheck, ChefHat, Info, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { FoodIcon } from '@/components/common/food-icon'
import { RECIPE_ICON, SAVED_MEAL_ICON } from '@/lib/food-icons'
import { Button } from '@/components/ui/button'
import { Card, Chip, EmptyState, Notice, PageHeader, Segmented } from '@/components/common/controls'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { MacroInline, useNutritionFormat } from '@/components/common/nutrition'
import { AddFoodSheet, type AddTarget } from '@/components/log/add-food-sheet'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { NameDialog } from '@/components/today/name-dialog'
import { defaultMealForNow } from '@/components/today/today-screen'
import { localName } from '@/lib/display'
import { recipeTotals, sumItems } from '@/lib/nutrition'
import type { Food, FoodCategory, LogEntry, Recipe, SavedMeal } from '@/lib/types'
import { CategoryChips, FoodRow, SearchBox, useFilteredFoods } from './food-browser'
import { FoodDetailSheet } from './food-detail-sheet'
import { FoodEditorSheet } from './food-editor-sheet'
import { RecipeEditorSheet } from './recipe-editor-sheet'

type Tab = 'foods' | 'recipes' | 'meals'
const MAX_RESULTS = 200

export function FoodsScreen() {
  const store = useStore()
  const { t } = store.i18n
  const [tab, setTab] = useState<Tab>('foods')
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null)
  const [recipeEditor, setRecipeEditor] = useState<{ open: boolean; recipe?: Recipe }>({ open: false })
  const [foodEditor, setFoodEditor] = useState<{ open: boolean; food?: Food }>({ open: false })

  const headerAction =
    tab === 'foods' ? (
      <Button onClick={() => setFoodEditor({ open: true })}>
        <Plus aria-hidden />
        {t('food.new')}
      </Button>
    ) : tab === 'recipes' ? (
      <Button onClick={() => setRecipeEditor({ open: true })}>
        <Plus aria-hidden />
        {t('recipe.new')}
      </Button>
    ) : null

  return (
    <div className="flex flex-col">
      <PageHeader title={t('foods.title')} actions={headerAction}>
        <Segmented
          label={t('foods.title')}
          value={tab}
          onChange={setTab}
          className="sm:max-w-md [&_button]:px-1.5 [&_button]:text-[13px] [&_button]:whitespace-nowrap sm:[&_button]:px-3 sm:[&_button]:text-sm"
          options={[
            { value: 'foods', label: t('foods.tab.foods') },
            { value: 'recipes', label: t('foods.tab.recipes') },
            { value: 'meals', label: t('foods.tab.meals') },
          ]}
        />
      </PageHeader>

      {tab === 'foods' && (
        <FoodsTab
          onLog={(f) => setAddTarget({ kind: 'food', foodId: f.id })}
          onEdit={(f) => setFoodEditor({ open: true, food: f })}
        />
      )}
      {tab === 'recipes' && (
        <RecipesTab onEdit={(r) => setRecipeEditor({ open: true, recipe: r })} onLog={(r) => setAddTarget({ kind: 'recipe', recipeId: r.id })} />
      )}
      {tab === 'meals' && <SavedMealsTab />}

      <AddFoodSheet
        open={addTarget !== null}
        onOpenChange={(o) => !o && setAddTarget(null)}
        date={store.selectedDate}
        meal={defaultMealForNow(store.settings.dayStartMinutes)}
        initial={addTarget ?? { kind: 'browse' }}
      />
      <FoodEditorSheet open={foodEditor.open} food={foodEditor.food} onOpenChange={(open) => setFoodEditor((s) => ({ ...s, open }))} />
      <RecipeEditorSheet open={recipeEditor.open} recipe={recipeEditor.recipe} onOpenChange={(open) => setRecipeEditor((s) => ({ ...s, open }))} />
    </div>
  )
}

function FoodsTab({ onLog, onEdit }: { onLog: (f: Food) => void; onEdit: (f: Food) => void }) {
  const { t } = useStore().i18n
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FoodCategory | 'all'>('all')
  const [onlyCustom, setOnlyCustom] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const results = useFilteredFoods(query, category, onlyCustom)
  const { foodsById } = useStore()
  const selected = selectedId ? (foodsById.get(selectedId) ?? null) : null

  return (
    <div className="flex flex-col gap-4">
      <Notice icon={<Info />}>{t('foods.estimateNote')}</Notice>
      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <SearchBox value={query} onChange={setQuery} />
        <CategoryChips value={category} onChange={setCategory} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {t('foods.count', { n: results.length })}
          </span>
          <Chip active={onlyCustom} onClick={() => setOnlyCustom((v) => !v)}>
            {t('foods.onlyCustom')}
          </Chip>
        </div>
        {results.length === 0 ? (
          <EmptyState icon={<Search className="size-5" />} title={query.trim() ? t('add.noResults', { q: query.trim() }) : t('foods.empty')} />
        ) : (
          <ul className="-mx-2 flex flex-col">
            {results.slice(0, MAX_RESULTS).map((food) => (
              <FoodRow key={food.id} food={food} onSelect={(f) => setSelectedId(f.id)} />
            ))}
          </ul>
        )}
      </Card>
      <FoodDetailSheet
        food={selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        onLog={(f) => {
          setSelectedId(null)
          onLog(f)
        }}
        onEdit={(f) => {
          setSelectedId(null)
          onEdit(f)
        }}
      />
    </div>
  )
}

function RecipesTab({ onEdit, onLog }: { onEdit: (r?: Recipe) => void; onLog: (r: Recipe) => void }) {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  const f = useNutritionFormat()
  const [toDelete, setToDelete] = useState<Recipe | null>(null)

  if (store.recipes.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ChefHat className="size-6" />}
          title={t('add.noRecipes')}
          body={t('recipe.empty')}
          action={
            <Button onClick={() => onEdit()}>
              <Plus aria-hidden />
              {t('recipe.new')}
            </Button>
          }
        />
      </Card>
    )
  }

  const sorted = [...store.recipes].sort((a, b) => b.updatedAt - a.updatedAt)
  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {sorted.map((r) => {
          const totals = recipeTotals(r, store.foodsById)
          return (
            <li key={r.id}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <FoodIcon icon={RECIPE_ICON} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h3 className="truncate text-sm font-semibold">{r.name}</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {t('recipe.servings')}: {store.i18n.fmtNum(r.servings, 1)} · {t('recipe.servingWeight', { g: Math.round(totals.servingGrams) })}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {f.kcal(totals.perServing.kcal)} <span className="text-xs font-normal text-muted-foreground">{t('unit.kcal')}</span>
                  </span>
                </div>
                <MacroInline n={totals.perServing} />
                {totals.missingFoods > 0 && <Notice tone="warning">{t('recipe.missingFood', { n: totals.missingFoods })}</Notice>}
                <div className="mt-auto flex gap-2">
                  <Button variant="outline" size="icon-lg" className="size-12" onClick={() => setToDelete(r)} aria-label={`${t('common.delete')}: ${r.name}`}>
                    <Trash2 aria-hidden />
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => onEdit(r)}>
                    <Pencil aria-hidden />
                    {t('common.edit')}
                  </Button>
                  <Button size="lg" className="flex-1" onClick={() => onLog(r)}>
                    <Plus aria-hidden />
                    {t('recipe.log')}
                  </Button>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('recipe.deleteConfirm')}
        description={t('recipe.deleteBody')}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (!toDelete) return
          const removed = toDelete
          void run(() => store.deleteRecipe(removed.id), { success: t('recipe.deleted'), undo: () => store.saveRecipe(removed) })
        }}
      />
    </>
  )
}

function SavedMealsTab() {
  const store = useStore()
  const run = useAction()
  const { t, locale } = store.i18n
  const f = useNutritionFormat()
  const [renaming, setRenaming] = useState<SavedMeal | null>(null)
  const [toDelete, setToDelete] = useState<SavedMeal | null>(null)

  const logMeal = async (m: SavedMeal) => {
    const meal = defaultMealForNow(store.settings.dayStartMinutes)
    let created: LogEntry[] = []
    await run(
      async () => {
        created = await store.addLogItems(m.items, store.selectedDate, meal)
      },
      {
        success: t('meal.logged', { meal: store.mealName(meal) }),
        undo: async () => {
          for (const e of created) await store.deleteLog(e.id)
        },
      },
    )
  }

  if (store.savedMeals.length === 0) {
    return (
      <Card>
        <EmptyState icon={<BookmarkCheck className="size-6" />} title={t('add.noMeals')} body={t('savedMeal.empty')} />
      </Card>
    )
  }

  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {store.savedMeals.map((m) => {
          const totals = sumItems(m.items)
          return (
            <li key={m.id}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <FoodIcon icon={SAVED_MEAL_ICON} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h3 className="truncate text-sm font-semibold">{m.name}</h3>
                    <span className="text-xs text-muted-foreground">{t('savedMeal.items', { n: m.items.length })}</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {f.kcal(totals.values.kcal)} <span className="text-xs font-normal text-muted-foreground">{t('unit.kcal')}</span>
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{m.items.map((i) => localName(i, locale)).join(' · ')}</p>
                <MacroInline n={totals.values} />
                <div className="mt-auto flex gap-2">
                  <Button variant="outline" size="icon-lg" className="size-12" onClick={() => setToDelete(m)} aria-label={`${t('common.delete')}: ${m.name}`}>
                    <Trash2 aria-hidden />
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => setRenaming(m)}>
                    <Pencil aria-hidden />
                    {t('common.rename')}
                  </Button>
                  <Button size="lg" className="flex-1" onClick={() => void logMeal(m)}>
                    <Plus aria-hidden />
                    {t('savedMeal.log')}
                  </Button>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
      <NameDialog
        open={renaming !== null}
        onOpenChange={(o) => !o && setRenaming(null)}
        title={t('common.rename')}
        label={t('meal.saveAs.name')}
        initial={renaming?.name ?? ''}
        onSubmit={(name) => {
          if (!renaming) return
          const target = renaming
          setRenaming(null)
          void run(() => store.saveSavedMeal({ ...target, name }), { success: t('savedMeal.renamed') })
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('savedMeal.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (!toDelete) return
          const removed = toDelete
          void run(() => store.deleteSavedMeal(removed.id), { success: t('savedMeal.deleted'), undo: () => store.saveSavedMeal(removed) })
        }}
      />
    </>
  )
}
