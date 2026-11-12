
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Info, Plus, Trash2 } from 'lucide-react'
import { AppSheet } from '@/components/common/app-sheet'
import { Field, Notice, NumberInput, TextInput } from '@/components/common/controls'
import { NutrientGrid } from '@/components/common/nutrition'
import { StickySubmit } from '@/components/log/quantity-form'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { createId } from '@/lib/defaults'
import { localName } from '@/lib/display'
import { parseLocaleNumber, recipeTotals } from '@/lib/nutrition'
import type { Food, Recipe, RecipeIngredient } from '@/lib/types'
import { FoodBrowser } from './food-browser'

interface IngredientDraft {
  id: string
  foodId: string
  grams: string
  snapshot: RecipeIngredient['snapshot']
}

const snapshotOf = (food: Food): RecipeIngredient['snapshot'] => ({
  nameEn: food.nameEn,
  nameAr: food.nameAr,
  per100g: food.per100g,
  source: food.source,
})

function RecipeEditorBody({ recipe, picking, setPicking, onSaved }: { recipe?: Recipe; picking: boolean; setPicking: (v: boolean) => void; onSaved: () => void }) {
  const store = useStore()
  const run = useAction()
  const { t, locale } = store.i18n
  const [name, setName] = useState(recipe?.name ?? '')
  const [servings, setServings] = useState(recipe ? String(recipe.servings) : '1')
  const [notes] = useState(recipe?.notes ?? '')
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    () => recipe?.ingredients.map((i) => ({ id: i.id, foodId: i.foodId, grams: String(i.grams), snapshot: i.snapshot })) ?? [],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const parsedServings = parseLocaleNumber(servings)
  const preview = useMemo(() => {
    const valid = ingredients
      .map((i) => ({ ...i, g: parseLocaleNumber(i.grams) }))
      .filter((i): i is IngredientDraft & { g: number } => i.g !== null && i.g > 0)
      .map((i) => ({ id: i.id, foodId: i.foodId, grams: i.g, snapshot: i.snapshot }))
    if (valid.length === 0) return null
    const draft: Recipe = { id: 'preview', name, servings: parsedServings && parsedServings > 0 ? parsedServings : 1, ingredients: valid, notes, createdAt: 0, updatedAt: 0 }
    return recipeTotals(draft, store.foodsById)
  }, [ingredients, parsedServings, name, notes, store.foodsById])

  if (picking) {
    return (
      <FoodBrowser
        showExtraTabs={false}
        onPickFood={(food) => {
          setIngredients((list) => [...list, { id: createId('ing'), foodId: food.id, grams: '100', snapshot: snapshotOf(food) }])
          setPicking(false)
        }}
      />
    )
  }

  const submit = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = t('common.nameRequired')
    if (parsedServings === null || parsedServings < 0.5 || parsedServings > 100) errs.servings = t('recipe.servingsError')
    if (ingredients.length === 0) errs.ingredients = t('recipe.noIngredients')
    const parsed: RecipeIngredient[] = []
    for (const ing of ingredients) {
      const g = parseLocaleNumber(ing.grams)
      if (g === null || g <= 0 || g > 20000) {
        errs[`ing:${ing.id}`] = t('common.invalidNumber')
        continue
      }
      const live = store.foodsById.get(ing.foodId)
      parsed.push({ id: ing.id, foodId: ing.foodId, grams: g, snapshot: live && !live.deleted ? snapshotOf(live) : ing.snapshot })
    }
    setErrors(errs)
    if (Object.keys(errs).length || parsedServings === null) return
    const now = Date.now()
    const next: Recipe = {
      id: recipe?.id ?? createId('recipe'),
      name: name.trim(),
      servings: parsedServings,
      ingredients: parsed,
      notes,
      createdAt: recipe?.createdAt ?? now,
      updatedAt: now,
    }
    void run(
      async () => {
        await store.saveRecipe(next)
        return true
      },
      { success: t('recipe.saved') },
    ).then((ok) => ok && onSaved())
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Field label={t('recipe.name')} error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        )}
      </Field>
      <Field label={t('recipe.servings')} error={errors.servings}>
        {({ id, describedBy, invalid }) => (
          <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={servings} onChange={(e) => setServings(e.target.value)} className="w-32" />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t('recipe.ingredients')}</span>
        {ingredients.length > 0 && (
          <ul className="flex flex-col divide-y rounded-xl border">
            {ingredients.map((ing) => {
              const live = store.foodsById.get(ing.foodId)
              const label = localName(live && !live.deleted ? live : ing.snapshot, locale)
              const err = errors[`ing:${ing.id}`]
              return (
                <li key={ing.id} className="flex flex-col gap-1 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`g-${ing.id}`} className="min-w-0 flex-1 truncate text-sm">
                      {label}
                    </label>
                    <NumberInput
                      id={`g-${ing.id}`}
                      aria-invalid={!!err}
                      value={ing.grams}
                      onChange={(e) => setIngredients((list) => list.map((x) => (x.id === ing.id ? { ...x, grams: e.target.value } : x)))}
                      className="h-10 w-20 text-end"
                    />
                    <span className="text-xs text-muted-foreground">{t('unit.g')}</span>
                    <button
                      type="button"
                      onClick={() => setIngredients((list) => list.filter((x) => x.id !== ing.id))}
                      aria-label={`${t('common.remove')}: ${label}`}
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  {err && (
                    <p className="text-xs font-medium text-destructive" role="alert">
                      {err}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {errors.ingredients && (
          <p className="text-xs font-medium text-destructive" role="alert">
            {errors.ingredients}
          </p>
        )}
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden />
          {t('recipe.addIngredient')}
        </button>
      </div>

      {preview && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {t('recipe.perServing')} · <span className="font-normal text-muted-foreground">{t('recipe.servingWeight', { g: Math.round(preview.servingGrams) })}</span>
          </span>
          <NutrientGrid n={preview.perServing} />
          {preview.estimated && <Notice icon={<Info />}>{t('source.estimate.hint')}</Notice>}
        </div>
      )}

      <StickySubmit label={t('common.save')} />
    </form>
  )
}

export function RecipeEditorSheet({ open, onOpenChange, recipe }: { open: boolean; onOpenChange: (o: boolean) => void; recipe?: Recipe }) {
  const { t, dir } = useStore().i18n
  const [picking, setPicking] = useState(false)
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft
  return (
    <AppSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setPicking(false)
        onOpenChange(o)
      }}
      title={picking ? t('recipe.pickIngredient') : recipe ? t('recipe.editTitle') : t('recipe.new')}
      headerStart={
        picking ? (
          <button type="button" onClick={() => setPicking(false)} className="-ms-2 flex size-10 items-center justify-center rounded-lg hover:bg-muted" aria-label={t('common.back')}>
            <Back className="size-5" aria-hidden />
          </button>
        ) : undefined
      }
    >
      {open && <RecipeEditorBody key={recipe?.id ?? 'new'} recipe={recipe} picking={picking} setPicking={setPicking} onSaved={() => onOpenChange(false)} />}
    </AppSheet>
  )
}
