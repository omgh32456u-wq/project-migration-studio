
import { useMemo, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Chip, Field, NativeSelect, Notice, NumberInput, TextInput } from '@/components/common/controls'
import { NutrientGrid } from '@/components/common/nutrition'
import { useStore } from '@/components/providers/app-store'
import { isDateKey } from '@/lib/dates'
import { localName, secondaryName, servingLabel } from '@/lib/display'
import {
  buildFoodItem,
  buildRecipeItem,
  GRAMS_PER_OZ,
  hasMissing,
  parseLocaleNumber,
  recipeTotals,
  validateAmount,
} from '@/lib/nutrition'
import { MEAL_SLOTS, type Food, type LoggedItem, type MealSlot, type Recipe, type UnitKind } from '@/lib/types'

export type UnitKey = 'g' | 'oz' | `s:${string}`

interface UnitOption {
  key: UnitKey
  kind: UnitKind
  grams: number
  labelEn: string
  labelAr: string
}

function unitOptions(food: Food, imperial: boolean): UnitOption[] {
  const opts: UnitOption[] = food.servings.map((s) => ({ key: `s:${s.id}` as UnitKey, kind: 'serving', grams: s.grams, labelEn: s.labelEn || s.labelAr, labelAr: s.labelAr || s.labelEn }))
  opts.push({ key: 'g', kind: 'g', grams: 1, labelEn: 'g', labelAr: 'جم' })
  if (imperial) opts.push({ key: 'oz', kind: 'oz', grams: GRAMS_PER_OZ, labelEn: 'oz', labelAr: 'أونصة' })
  return opts
}

function quickAmounts(kind: UnitKind): number[] {
  if (kind === 'g') return [50, 100, 150, 200, 250]
  if (kind === 'oz') return [1, 2, 4, 6, 8]
  return [0.5, 1, 1.5, 2, 3]
}

export function MealAndDate({
  meal,
  onMeal,
  date,
  onDate,
}: {
  meal: MealSlot
  onMeal: (m: MealSlot) => void
  date: string
  onDate: (d: string) => void
}) {
  const { i18n, mealName } = useStore()
  const { t } = i18n
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium" id="meal-label">
          {t('add.meal')}
        </span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="meal-label">
          {MEAL_SLOTS.map((m) => (
            <Chip key={m} role="radio" aria-pressed={undefined} aria-checked={meal === m} active={meal === m} onClick={() => onMeal(m)}>
              {mealName(m)}
            </Chip>
          ))}
        </div>
      </div>
      <Field label={t('add.date')}>
        {({ id }) => <TextInput id={id} type="date" value={date} required onChange={(e) => isDateKey(e.target.value) && onDate(e.target.value)} className="w-auto" />}
      </Field>
    </div>
  )
}

export function StickySubmit({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-1 border-t bg-popover px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button type="submit" size="lg" className="w-full" disabled={disabled}>
        {label}
      </Button>
    </div>
  )
}

export function FoodQuantityForm({
  food,
  initialUnit,
  initialAmount,
  meal,
  onMeal,
  date,
  onDate,
  submitLabel,
  onSubmit,
}: {
  food: Food
  initialUnit?: UnitKey
  initialAmount?: number
  meal: MealSlot
  onMeal: (m: MealSlot) => void
  date: string
  onDate: (d: string) => void
  submitLabel: string
  onSubmit: (item: LoggedItem) => void
}) {
  const { i18n, settings } = useStore()
  const { t, locale } = i18n
  const options = useMemo(() => unitOptions(food, settings.profile.units === 'imperial'), [food, settings.profile.units])
  const [unitKey, setUnitKey] = useState<UnitKey>(() => (initialUnit && options.some((o) => o.key === initialUnit) ? initialUnit : options[0].key))
  const unit = options.find((o) => o.key === unitKey) ?? options[0]
  const [raw, setRaw] = useState(() => String(initialAmount ?? (unit.kind === 'g' ? 100 : unit.kind === 'oz' ? 3.5 : 1)))
  const [touched, setTouched] = useState(false)

  const amount = parseLocaleNumber(raw)
  const error = validateAmount(amount, unit.grams)
  const item = !error && amount !== null ? buildFoodItem(food, amount, { kind: unit.kind, grams: unit.grams, labelEn: unit.labelEn, labelAr: unit.labelAr }) : null
  const sub = secondaryName(food, locale)

  const submit = () => {
    setTouched(true)
    if (item) onSubmit(item)
  }


  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      noValidate
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold leading-tight">{localName(food, locale)}</h3>
          <Badge tone={food.source === 'estimate' ? 'warning' : 'primary'}>{t(`source.${food.source}`)}</Badge>
        </div>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>

      <div className="grid grid-cols-[1fr_1.3fr] gap-3">
        <Field label={t('add.quantity')} error={touched && error ? t(`qty.${error}`) : null}>
          {({ id, describedBy, invalid }) => (
            <NumberInput
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onBlur={() => setTouched(true)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 text-lg font-semibold"
            />
          )}
        </Field>
        <Field label={t('add.unit')}>
          {({ id }) => (
            <NativeSelect
              id={id}
              value={unitKey}
              className="h-12"
              onChange={(e) => {
                const next = options.find((o) => o.key === e.target.value)
                if (!next) return
                setUnitKey(next.key)
                setRaw(String(next.kind === 'g' ? 100 : next.kind === 'oz' ? 3.5 : 1))
              }}
            >
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.kind === 'serving'
                    ? `${servingLabel(o, locale)} (${i18n.fmtNum(o.grams, 1)} ${t('unit.g')})`
                    : o.kind === 'g'
                      ? t('unit.grams')
                      : t('unit.oz')}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>

      <div className="flex flex-wrap gap-2" aria-label={t('add.quantity')}>
        {quickAmounts(unit.kind).map((q) => (
          <Chip key={q} active={amount === q} onClick={() => setRaw(String(q))}>
            {i18n.fmtNum(q, 1)}
          </Chip>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{t('add.preview')}</span>
          {item && unit.kind !== 'g' && <span className="text-xs text-muted-foreground tabular-nums">{t('add.equals', { g: i18n.fmtNum(item.grams, 1) })}</span>}
        </div>
        <NutrientGrid n={item?.nutrients ?? { kcal: null, protein: null, carbs: null, fat: null }} />
        {hasMissing(food.per100g) && <Notice tone="warning" icon={<AlertTriangle />}>{t('add.missingWarning')}</Notice>}
        {food.source === 'estimate' && <Notice icon={<Info />}>{food.notes ? `${t('source.estimate.hint')} ${food.notes}` : t('source.estimate.hint')}</Notice>}
      </div>

      <MealAndDate meal={meal} onMeal={onMeal} date={date} onDate={onDate} />
      <StickySubmit label={submitLabel} disabled={!!error && touched} />
    </form>
  )
}

export function RecipeQuantityForm({
  recipe,
  meal,
  onMeal,
  date,
  onDate,
  submitLabel,
  onSubmit,
}: {
  recipe: Recipe
  meal: MealSlot
  onMeal: (m: MealSlot) => void
  date: string
  onDate: (d: string) => void
  submitLabel: string
  onSubmit: (item: LoggedItem) => void
}) {
  const { i18n, foodsById } = useStore()
  const { t } = i18n
  const totals = useMemo(() => recipeTotals(recipe, foodsById), [recipe, foodsById])
  const [raw, setRaw] = useState('1')
  const [touched, setTouched] = useState(false)
  const amount = parseLocaleNumber(raw)
  const error = validateAmount(amount, totals.servingGrams)
  const item = !error && amount !== null ? buildRecipeItem(recipe, totals, amount) : null
  const submit = () => {
    setTouched(true)
    if (item) onSubmit(item)
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      noValidate
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold leading-tight">{recipe.name}</h3>
          {totals.estimated && <Badge tone="warning">{t('source.estimate')}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">{t('recipe.servingWeight', { g: Math.round(totals.servingGrams) })}</p>
      </div>
      <Field label={t('add.servingsCount')} error={touched && error ? t(`qty.${error}`) : null}>
        {({ id, describedBy, invalid }) => (
          <NumberInput
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={() => setTouched(true)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 text-lg font-semibold"
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        {[0.5, 1, 1.5, 2].map((q) => (
          <Chip key={q} active={amount === q} onClick={() => setRaw(String(q))}>
            {i18n.fmtNum(q, 1)}
          </Chip>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t('add.preview')}</span>
        <NutrientGrid n={item?.nutrients ?? { kcal: null, protein: null, carbs: null, fat: null }} />
        {totals.missingFoods > 0 && <Notice tone="warning" icon={<AlertTriangle />}>{t('recipe.missingFood', { n: totals.missingFoods })}</Notice>}
      </div>
      <MealAndDate meal={meal} onMeal={onMeal} date={date} onDate={onDate} />
      <StickySubmit label={submitLabel} disabled={!!error && touched} />
    </form>
  )
}
