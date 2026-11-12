
import { useDeferredValue, useMemo, useState } from 'react'
import { BookmarkCheck, ChefHat, Clock, Plus, Search, Star, UtensilsCrossed } from 'lucide-react'
import { Chip, EmptyState, TextInput, Badge } from '@/components/common/controls'
import { FoodIcon } from '@/components/common/food-icon'
import { iconForCategory, iconForLoggedItem, RECIPE_ICON, SAVED_MEAL_ICON } from '@/lib/food-icons'
import { MacroInline, useNutritionFormat } from '@/components/common/nutrition'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { localName, searchFoods, secondaryName, servingLabel } from '@/lib/display'
import { recipeTotals, sumItems } from '@/lib/nutrition'
import { FOOD_CATEGORIES, type Food, type FoodCategory, type LogEntry, type Recipe, type SavedMeal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useRecentEntries } from './use-recent'

const MAX_RESULTS = 150

export function FoodRow({ food, onSelect }: { food: Food; onSelect: (f: Food) => void }) {
  const store = useStore()
  const run = useAction()
  const { t, locale } = store.i18n
  const f = useNutritionFormat()
  const fav = store.settings.favorites.includes(food.id)
  const sub = secondaryName(food, locale)
  const serving = food.servings[0]
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSelect(food)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <FoodIcon icon={iconForCategory(food.category)} />
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="flex w-full items-center gap-2">
          <span className="truncate text-sm font-medium">{localName(food, locale)}</span>
          {food.isCustom ? <Badge tone="primary">{t('food.custom')}</Badge> : food.modified ? <Badge tone="primary">{t('food.modified')}</Badge> : null}
        </span>
        <span className="flex w-full flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {sub && <span className="truncate">{sub}</span>}
          <span className="tabular-nums">
            {f.kcal(food.per100g.kcal)} {t('unit.kcal')} / 100 {t('unit.g')}
          </span>
          {serving && (
            <span className="truncate">
              · {servingLabel(serving, locale)} ≈ {f.grams(serving.grams)} {t('unit.g')}
            </span>
          )}
        </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => run(() => store.toggleFavorite(food.id))}
        aria-pressed={fav}
        aria-label={`${fav ? t('food.unfavorite') : t('food.favorite')}: ${localName(food, locale)}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Star className={cn('size-5', fav && 'fill-carbs text-carbs')} aria-hidden />
      </button>
    </li>
  )
}

export function useFilteredFoods(query: string, category: FoodCategory | 'all', onlyCustom = false) {
  const { foods, i18n } = useStore()
  const deferred = useDeferredValue(query)
  return useMemo(() => {
    const visible = foods.filter((f) => !f.deleted && (category === 'all' || f.category === category) && (!onlyCustom || f.isCustom))
    const results = deferred.trim()
      ? searchFoods(visible, deferred)
      : [...visible].sort((a, b) => localName(a, i18n.locale).localeCompare(localName(b, i18n.locale), i18n.tag))
    return results
  }, [foods, deferred, category, onlyCustom, i18n])
}

export function CategoryChips({ value, onChange }: { value: FoodCategory | 'all'; onChange: (c: FoodCategory | 'all') => void }) {
  const { t } = useStore().i18n
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('food.category')}>
      {(['all', ...FOOD_CATEGORIES] as const).map((c) => (
        <Chip key={c} active={value === c} onClick={() => onChange(c)}>
          {t(`category.${c}`)}
        </Chip>
      ))}
    </div>
  )
}

export function SearchBox({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const { t } = useStore().i18n
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <TextInput
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('add.search')}
        aria-label={t('common.search')}
        autoFocus={autoFocus}
        className="h-12 rounded-xl ps-10 text-base sm:text-sm"
        enterKeyHint="search"
      />
    </div>
  )
}

type Tab = 'all' | 'favorites' | 'recent' | 'recipes' | 'meals'

export function FoodBrowser({
  onPickFood,
  onPickRecent,
  onPickRecipe,
  onPickMeal,
  onCreateCustom,
  showExtraTabs = true,
}: {
  onPickFood: (f: Food) => void
  onPickRecent?: (entry: LogEntry) => void
  onPickRecipe?: (r: Recipe) => void
  onPickMeal?: (m: SavedMeal) => void
  onCreateCustom?: () => void
  showExtraTabs?: boolean
}) {
  const store = useStore()
  const { t, locale } = store.i18n
  const f = useNutritionFormat()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FoodCategory | 'all'>('all')
  const [tab, setTab] = useState<Tab>('all')
  const results = useFilteredFoods(query, category)
  const recent = useRecentEntries(20)
  const favorites = useMemo(
    () => store.settings.favorites.map((id) => store.foodsById.get(id)).filter((x): x is Food => !!x && !x.deleted),
    [store.settings.favorites, store.foodsById],
  )

  const searching = query.trim().length > 0
  const activeTab: Tab = searching ? 'all' : tab
  const tabs: { id: Tab; label: string; icon: typeof Star }[] = [
    { id: 'all', label: t('add.tab.all'), icon: UtensilsCrossed },
    { id: 'favorites', label: t('add.tab.favorites'), icon: Star },
    { id: 'recent', label: t('add.tab.recent'), icon: Clock },
    { id: 'recipes', label: t('add.tab.recipes'), icon: ChefHat },
    { id: 'meals', label: t('add.tab.meals'), icon: BookmarkCheck },
  ]

  return (
    <div className="flex flex-col gap-3">
      <SearchBox value={query} onChange={setQuery} />
      {showExtraTabs && !searching && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:px-0" role="tablist" aria-label={t('add.title')}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <Chip key={id} role="tab" active={activeTab === id} aria-pressed={undefined} aria-selected={activeTab === id} onClick={() => setTab(id)}>
              <Icon className="size-4" aria-hidden />
              {label}
            </Chip>
          ))}
        </div>
      )}

      {activeTab === 'all' && (
        <>
          <CategoryChips value={category} onChange={setCategory} />
          {results.length === 0 ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title={searching ? t('add.noResults', { q: query.trim() }) : t('foods.empty')}
              action={
                onCreateCustom && (
                  <button type="button" onClick={onCreateCustom} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                    <Plus className="size-4" aria-hidden />
                    {t('add.createCustom')}
                  </button>
                )
              }
            />
          ) : (
            <ul className="-mx-2 flex flex-col">
              {results.slice(0, MAX_RESULTS).map((food) => (
                <FoodRow key={food.id} food={food} onSelect={onPickFood} />
              ))}
            </ul>
          )}
          {onCreateCustom && results.length > 0 && (
            <button
              type="button"
              onClick={onCreateCustom}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-4" aria-hidden />
              {t('add.createCustom')}
            </button>
          )}
        </>
      )}

      {activeTab === 'favorites' &&
        (favorites.length === 0 ? (
          <EmptyState icon={<Star className="size-5" />} title={t('add.noFavorites')} />
        ) : (
          <ul className="-mx-2 flex flex-col">
            {favorites.map((food) => (
              <FoodRow key={food.id} food={food} onSelect={onPickFood} />
            ))}
          </ul>
        ))}

      {activeTab === 'recent' &&
        (recent.length === 0 ? (
          <EmptyState icon={<Clock className="size-5" />} title={t('add.noRecent')} />
        ) : (
          <ul className="-mx-2 flex flex-col">
            {recent.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onPickRecent?.(entry)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-start hover:bg-muted"
                >
                  <FoodIcon icon={iconForLoggedItem(entry, store.foodsById)} />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span className="text-sm font-medium">{localName(entry, locale)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {store.i18n.fmtNum(entry.amount, 2)} × {locale === 'ar' ? entry.unitLabelAr : entry.unitLabelEn} · {f.kcal(entry.nutrients.kcal)} {t('unit.kcal')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {activeTab === 'recipes' &&
        (store.recipes.length === 0 ? (
          <EmptyState icon={<ChefHat className="size-5" />} title={t('add.noRecipes')} body={t('recipe.empty')} />
        ) : (
          <ul className="-mx-2 flex flex-col">
            {store.recipes.map((r) => {
              const totals = recipeTotals(r, store.foodsById)
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => onPickRecipe?.(r)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-start hover:bg-muted">
                    <FoodIcon icon={RECIPE_ICON} />
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                      <span className="text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {t('recipe.perServing')}: {f.kcal(totals.perServing.kcal)} {t('unit.kcal')} · {t('recipe.servingWeight', { g: Math.round(totals.servingGrams) })}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ))}

      {activeTab === 'meals' &&
        (store.savedMeals.length === 0 ? (
          <EmptyState icon={<BookmarkCheck className="size-5" />} title={t('add.noMeals')} body={t('savedMeal.empty')} />
        ) : (
          <ul className="-mx-2 flex flex-col">
            {store.savedMeals.map((m) => {
              const totals = sumItems(m.items)
              return (
                <li key={m.id}>
                  <button type="button" onClick={() => onPickMeal?.(m)} className="flex min-h-14 w-full items-start gap-3 rounded-xl px-3 py-2 text-start hover:bg-muted">
                    <FoodIcon icon={SAVED_MEAL_ICON} className="mt-0.5" />
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {f.kcal(totals.values.kcal)} <span className="text-xs font-normal text-muted-foreground">{t('unit.kcal')}</span>
                      </span>
                    </span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{m.items.map((i) => localName(i, locale)).join(' · ')}</span>
                    <MacroInline n={totals.values} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ))}
    </div>
  )
}
