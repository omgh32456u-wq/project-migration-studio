
import { useState } from 'react'
import { AlertTriangle, Info, Plus, Trash2 } from 'lucide-react'
import { AppSheet } from '@/components/common/app-sheet'
import { Field, NativeSelect, Notice, NumberInput, Segmented, TextInput } from '@/components/common/controls'
import { StickySubmit } from '@/components/log/quantity-form'
import { useStore } from '@/components/providers/app-store'
import { useAction } from '@/components/providers/use-action'
import { createId } from '@/lib/defaults'
import { normalizeSearch } from '@/lib/display'
import { emptyNutrients, kcalFromMacros, parseLocaleNumber, perServingToPer100g, validateFoodValues } from '@/lib/nutrition'
import { FOOD_CATEGORIES, NUTRIENT_KEYS, type DataSource, type Food, type FoodCategory, type NutrientKey, type Nutrients } from '@/lib/types'

interface ServingDraft {
  id: string
  labelEn: string
  labelAr: string
  grams: string
}

const toStr = (v: number | null) => (v === null ? '' : String(v))

function EditorBody({ food, onSaved }: { food?: Food; onSaved: (f: Food) => void }) {
  const store = useStore()
  const run = useAction()
  const { t } = store.i18n
  const isNew = !food
  const [nameEn, setNameEn] = useState(food?.nameEn ?? '')
  const [nameAr, setNameAr] = useState(food?.nameAr ?? '')
  const [category, setCategory] = useState<FoodCategory>(food?.category ?? 'other')
  const [basis, setBasis] = useState<'per100' | 'perServing'>(isNew ? 'perServing' : 'per100')
  const [servingSize, setServingSize] = useState('')
  const [values, setValues] = useState<Record<NutrientKey, string>>(() => {
    const n = food?.per100g ?? emptyNutrients()
    return { kcal: toStr(n.kcal), protein: toStr(n.protein), carbs: toStr(n.carbs), fat: toStr(n.fat) }
  })
  const [servings, setServings] = useState<ServingDraft[]>(
    () => food?.servings.map((s) => ({ id: s.id, labelEn: s.labelEn, labelAr: s.labelAr, grams: String(s.grams) })) ?? [],
  )
  const [source, setSource] = useState<DataSource>(food ? (food.source === 'estimate' ? 'user' : food.source) : 'label')
  const [notes, setNotes] = useState(food?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const parsedInput: Nutrients = {
    kcal: values.kcal.trim() ? parseLocaleNumber(values.kcal) : null,
    protein: values.protein.trim() ? parseLocaleNumber(values.protein) : null,
    carbs: values.carbs.trim() ? parseLocaleNumber(values.carbs) : null,
    fat: values.fat.trim() ? parseLocaleNumber(values.fat) : null,
  }
  const servingG = parseLocaleNumber(servingSize)
  const implied = kcalFromMacros(parsedInput)
  const mismatch = implied !== null && parsedInput.kcal !== null && implied > 20 && Math.abs(implied - parsedInput.kcal) / Math.max(implied, parsedInput.kcal) > 0.25

  const duplicate =
    isNew &&
    (nameEn.trim() || nameAr.trim()) &&
    store.foods.some(
      (f) =>
        !f.deleted &&
        ((nameEn.trim() && normalizeSearch(f.nameEn) === normalizeSearch(nameEn)) || (nameAr.trim() && normalizeSearch(f.nameAr) === normalizeSearch(nameAr))),
    )

  const submit = async () => {
    const errs: Record<string, string> = {}
    if (!nameEn.trim() && !nameAr.trim()) errs.name = t('common.nameRequired')
    for (const k of NUTRIENT_KEYS) {
      if (values[k].trim() && parsedInput[k] === null) errs[k] = t('common.invalidNumber')
    }
    if (basis === 'perServing' && (servingG === null || servingG <= 0 || servingG > 5000)) errs.servingSize = t('food.error.servingSize')
    const per100g = basis === 'perServing' && servingG ? perServingToPer100g(parsedInput, servingG) : parsedInput
    const valueError = Object.keys(errs).length ? null : validateFoodValues(per100g)
    if (valueError) errs.values = t(`food.error.${valueError}`)
    const servingRows = servings.filter((s) => s.labelEn.trim() || s.labelAr.trim() || s.grams.trim())
    const parsedServings = servingRows.map((s) => ({ id: s.id, labelEn: s.labelEn.trim(), labelAr: s.labelAr.trim(), grams: parseLocaleNumber(s.grams) }))
    if (parsedServings.some((s) => (!s.labelEn && !s.labelAr) || s.grams === null || s.grams <= 0 || s.grams > 5000)) errs.servings = t('food.error.servingRow')
    setErrors(errs)
    if (Object.keys(errs).length) return

    const finalServings = parsedServings.map((s) => ({ ...s, grams: s.grams as number }))
    if (basis === 'perServing' && servingG && !finalServings.some((s) => Math.abs(s.grams - servingG) < 0.01)) {
      finalServings.unshift({ id: createId('srv'), labelEn: '1 serving', labelAr: 'حصة واحدة', grams: servingG })
    }
    const now = Date.now()
    const next: Food = {
      id: food?.id ?? createId('food'),
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim(),
      category,
      per100g,
      servings: finalServings,
      source,
      notes: notes.trim(),
      isCustom: food?.isCustom ?? true,
      modified: food ? !food.isCustom : false,
      deleted: false,
      createdAt: food?.createdAt ?? now,
      updatedAt: now,
    }
    const ok = await run(() => store.saveFood(next).then(() => true), { success: t('food.saved') })
    if (ok) onSaved(next)
  }

  const setValue = (k: NutrientKey, v: string) => setValues((s) => ({ ...s, [k]: v }))
  const unitFor = (k: NutrientKey) => (k === 'kcal' ? t('unit.kcal') : t('unit.g'))

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      {food && !food.isCustom && <Notice icon={<Info />}>{t('food.builtinEditNote')}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('food.nameEn')} error={errors.name} hint={t('food.nameHint')}>
          {({ id, describedBy, invalid }) => (
            <TextInput id={id} dir="ltr" lang="en" aria-describedby={describedBy} aria-invalid={invalid} value={nameEn} onChange={(e) => setNameEn(e.target.value)} maxLength={120} />
          )}
        </Field>
        <Field label={t('food.nameAr')}>
          {({ id }) => <TextInput id={id} dir="rtl" lang="ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} maxLength={120} />}
        </Field>
      </div>
      {duplicate && <Notice tone="warning" icon={<AlertTriangle />}>{t('food.duplicate')}</Notice>}

      <Field label={t('food.category')}>
        {({ id }) => (
          <NativeSelect id={id} value={category} onChange={(e) => setCategory(e.target.value as FoodCategory)}>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>

      <div className="flex flex-col gap-3 rounded-2xl border p-4">
        <span className="text-sm font-medium">{t('food.basis')}</span>
        <Segmented
          label={t('food.basis')}
          value={basis}
          onChange={setBasis}
          options={[
            { value: 'perServing', label: t('food.basis.perServing') },
            { value: 'per100', label: t('food.basis.per100') },
          ]}
        />
        {basis === 'perServing' && (
          <Field label={t('food.servingSize')} error={errors.servingSize}>
            {({ id, describedBy, invalid }) => (
              <NumberInput id={id} aria-describedby={describedBy} aria-invalid={invalid} value={servingSize} onChange={(e) => setServingSize(e.target.value)} />
            )}
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          {NUTRIENT_KEYS.map((k) => (
            <Field key={k} label={`${t(`nutrient.${k}`)} (${unitFor(k)})`} error={errors[k]}>
              {({ id, describedBy, invalid }) => (
                <NumberInput
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={values[k]}
                  placeholder={t('common.unknown')}
                  onChange={(e) => setValue(k, e.target.value)}
                />
              )}
            </Field>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('food.unknownHint')}</p>
        {errors.values && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.values}
          </p>
        )}
        {mismatch && implied !== null && <Notice tone="warning" icon={<AlertTriangle />}>{t('food.kcalMismatch', { n: Math.round(implied) })}</Notice>}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{t('food.servings')}</span>
          <span className="text-xs text-muted-foreground">{t('food.servings.hint')}</span>
        </div>
        {servings.map((s, i) => (
          <div key={s.id} className="grid grid-cols-[1fr_1fr_5rem_auto] items-end gap-2">
            <Field label={<span className="text-xs">{t('food.servingLabelEn')}</span>}>
              {({ id }) => (
                <TextInput id={id} dir="ltr" value={s.labelEn} onChange={(e) => setServings((list) => list.map((x, j) => (j === i ? { ...x, labelEn: e.target.value } : x)))} />
              )}
            </Field>
            <Field label={<span className="text-xs">{t('food.servingLabelAr')}</span>}>
              {({ id }) => (
                <TextInput id={id} dir="rtl" value={s.labelAr} onChange={(e) => setServings((list) => list.map((x, j) => (j === i ? { ...x, labelAr: e.target.value } : x)))} />
              )}
            </Field>
            <Field label={<span className="text-xs">{t('food.servingGrams')}</span>}>
              {({ id }) => (
                <NumberInput id={id} value={s.grams} onChange={(e) => setServings((list) => list.map((x, j) => (j === i ? { ...x, grams: e.target.value } : x)))} />
              )}
            </Field>
            <button
              type="button"
              onClick={() => setServings((list) => list.filter((_, j) => j !== i))}
              className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
              aria-label={t('common.remove')}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        {errors.servings && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.servings}
          </p>
        )}
        <button
          type="button"
          onClick={() => setServings((list) => [...list, { id: createId('srv'), labelEn: '', labelAr: '', grams: '' }])}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden />
          {t('food.addServing')}
        </button>
      </div>

      <Field label={t('food.source')} hint={t(`source.${source}.hint`)}>
        {({ id, describedBy }) => (
          <NativeSelect id={id} aria-describedby={describedBy} value={source} onChange={(e) => setSource(e.target.value as DataSource)}>
            <option value="label">{t('source.label')}</option>
            <option value="user">{t('source.user')}</option>
            <option value="estimate">{t('source.estimate')}</option>
          </NativeSelect>
        )}
      </Field>

      <Field label={`${t('food.notes')} (${t('common.optional')})`}>
        {({ id }) => <TextInput id={id} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />}
      </Field>

      <StickySubmit label={t('common.save')} />
    </form>
  )
}

export function FoodEditorSheet({
  open,
  onOpenChange,
  food,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  food?: Food
  onSaved?: (f: Food) => void
}) {
  const { t } = useStore().i18n
  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={food ? t('food.editTitle') : t('food.new')}>
      {open && (
        <EditorBody
          key={food?.id ?? 'new'}
          food={food}
          onSaved={(f) => {
            onOpenChange(false)
            onSaved?.(f)
          }}
        />
      )}
    </AppSheet>
  )
}
