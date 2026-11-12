import type {
  ActivityLevel,
  Food,
  LoggedItem,
  MacroKey,
  Nutrients,
  NutrientKey,
  Profile,
  Recipe,
  Targets,
  UnitKind,
} from './types'
import { NUTRIENT_KEYS } from './types'

export const GRAMS_PER_OZ = 28.349523125
export const MAX_ENTRY_GRAMS = 5000
export const MAX_AMOUNT = 10000
export const KCAL_PER_GRAM: Record<MacroKey, number> = { protein: 4, carbs: 4, fat: 9 }

export const TARGET_LIMITS = { minKcal: 1200, maxKcal: 4500 } as const
export const MACRO_PCT_LIMITS = { min: 5, max: 70 } as const
/** Acceptable Macronutrient Distribution Ranges for adults (reference only). */
export const AMDR: Record<MacroKey, [number, number]> = {
  protein: [10, 35],
  carbs: [45, 65],
  fat: [20, 35],
}

export const emptyNutrients = (): Nutrients => ({ kcal: null, protein: null, carbs: null, fat: null })
export const zeroNutrients = (): Nutrients => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 })

const round2 = (n: number) => Math.round(n * 100) / 100

/** Normalizes Arabic-Indic / Persian digits and Arabic separators, then parses. */
export function parseLocaleNumber(input: string): number | null {
  const normalized = input
    .trim()
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u066B,]/g, '.')
    .replace(/\u066C/g, '')
  if (normalized === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(normalized)) return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100
  const out = emptyNutrients()
  for (const k of NUTRIENT_KEYS) {
    const v = per100g[k]
    out[k] = v === null ? null : round2(v * factor)
  }
  return out
}

export function hasMissing(n: Nutrients): boolean {
  return NUTRIENT_KEYS.some((k) => n[k] === null)
}

export interface Totals {
  values: Record<NutrientKey, number>
  /** Number of items lacking each value; totals exclude them. */
  missing: Record<NutrientKey, number>
  count: number
  estimatedCount: number
}

export function sumItems(items: Pick<LoggedItem, 'nutrients' | 'estimated'>[]): Totals {
  const values = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const missing = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  let estimatedCount = 0
  for (const item of items) {
    if (item.estimated) estimatedCount++
    for (const k of NUTRIENT_KEYS) {
      const v = item.nutrients[k]
      if (v === null) missing[k]++
      else values[k] += v
    }
  }
  for (const k of NUTRIENT_KEYS) values[k] = round2(values[k])
  return { values, missing, count: items.length, estimatedCount }
}

export function isIncomplete(t: Totals): boolean {
  return NUTRIENT_KEYS.some((k) => t.missing[k] > 0)
}

export type QuantityError = 'required' | 'invalid' | 'non_positive' | 'too_large'

export function validateAmount(amount: number | null, unitGrams: number): QuantityError | null {
  if (amount === null) return 'required'
  if (!Number.isFinite(amount)) return 'invalid'
  if (amount <= 0) return 'non_positive'
  if (amount > MAX_AMOUNT || amount * unitGrams > MAX_ENTRY_GRAMS) return 'too_large'
  return null
}

/** Resolves grams per unit for a food. Returns null for an unknown serving id. */
export function unitGramsFor(food: Food, unitKind: UnitKind, servingId?: string): number | null {
  if (unitKind === 'g') return 1
  if (unitKind === 'oz') return GRAMS_PER_OZ
  if (unitKind === 'serving') return food.servings.find((s) => s.id === servingId)?.grams ?? null
  return null
}

export function buildFoodItem(
  food: Food,
  amount: number,
  unit: { kind: UnitKind; grams: number; labelEn: string; labelAr: string },
): LoggedItem {
  const grams = round2(amount * unit.grams)
  return {
    sourceType: 'food',
    sourceId: food.id,
    nameEn: food.nameEn,
    nameAr: food.nameAr,
    amount,
    unitKind: unit.kind,
    unitLabelEn: unit.labelEn,
    unitLabelAr: unit.labelAr,
    unitGrams: unit.grams,
    grams,
    nutrients: scaleNutrients(food.per100g, grams),
    estimated: food.source === 'estimate',
  }
}

/** Rescales an existing item by a new amount, preserving its per-gram snapshot. */
export function rescaleItem(item: LoggedItem, amount: number): LoggedItem {
  const grams = round2(amount * item.unitGrams)
  const ratio = item.grams > 0 ? grams / item.grams : 0
  const nutrients = emptyNutrients()
  for (const k of NUTRIENT_KEYS) {
    const v = item.nutrients[k]
    nutrients[k] = v === null ? null : round2(v * ratio)
  }
  return { ...item, amount, grams, nutrients }
}

export interface RecipeTotals {
  grams: number
  total: Nutrients
  perServing: Nutrients
  servingGrams: number
  estimated: boolean
  missingFoods: number
}

export function recipeTotals(recipe: Recipe, foodsById: Map<string, Food>): RecipeTotals {
  const total = zeroNutrients()
  let grams = 0
  let estimated = false
  let missingFoods = 0
  const unknown = new Set<NutrientKey>()
  for (const ing of recipe.ingredients) {
    const food = foodsById.get(ing.foodId)
    const live = food && !food.deleted ? food : null
    if (!live) missingFoods++
    const per100g = live ? live.per100g : ing.snapshot.per100g
    const source = live ? live.source : ing.snapshot.source
    if (source === 'estimate') estimated = true
    grams += ing.grams
    const scaled = scaleNutrients(per100g, ing.grams)
    for (const k of NUTRIENT_KEYS) {
      const v = scaled[k]
      if (v === null) unknown.add(k)
      else total[k] = (total[k] ?? 0) + v
    }
  }
  for (const k of NUTRIENT_KEYS) total[k] = unknown.has(k) ? null : round2(total[k] ?? 0)
  const servings = recipe.servings > 0 ? recipe.servings : 1
  const perServing = emptyNutrients()
  for (const k of NUTRIENT_KEYS) {
    const v = total[k]
    perServing[k] = v === null ? null : round2(v / servings)
  }
  return {
    grams: round2(grams),
    total,
    perServing,
    servingGrams: round2(grams / servings),
    estimated,
    missingFoods,
  }
}

export function buildRecipeItem(recipe: Recipe, totals: RecipeTotals, servings: number): LoggedItem {
  const nutrients = emptyNutrients()
  for (const k of NUTRIENT_KEYS) {
    const v = totals.perServing[k]
    nutrients[k] = v === null ? null : round2(v * servings)
  }
  return {
    sourceType: 'recipe',
    sourceId: recipe.id,
    nameEn: recipe.name,
    nameAr: recipe.name,
    amount: servings,
    unitKind: 'recipe_serving',
    unitLabelEn: 'serving',
    unitLabelAr: 'حصة',
    unitGrams: totals.servingGrams,
    grams: round2(totals.servingGrams * servings),
    nutrients,
    estimated: totals.estimated,
  }
}

/** Converts values entered per serving (e.g. from a label) to per-100 g. */
export function perServingToPer100g(values: Nutrients, servingGrams: number): Nutrients {
  const out = emptyNutrients()
  if (servingGrams <= 0) return out
  for (const k of NUTRIENT_KEYS) {
    const v = values[k]
    out[k] = v === null ? null : round2((v * 100) / servingGrams)
  }
  return out
}

/** Energy implied by macros (4/4/9). Used to flag implausible custom entries. */
export function kcalFromMacros(n: Nutrients): number | null {
  if (n.protein === null || n.carbs === null || n.fat === null) return null
  return n.protein * 4 + n.carbs * 4 + n.fat * 9
}

export function validateFoodValues(per100g: Nutrients): 'negative' | 'exceeds_100g' | null {
  for (const k of NUTRIENT_KEYS) {
    const v = per100g[k]
    if (v !== null && v < 0) return 'negative'
  }
  const macroSum = (per100g.protein ?? 0) + (per100g.carbs ?? 0) + (per100g.fat ?? 0)
  if (macroSum > 100.5 || (per100g.kcal ?? 0) > 902) return 'exceeds_100g'
  return null
}

// ---------- Targets & estimates (adults only) ----------

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export type TargetEligibility = { ok: true } | { ok: false; reason: 'minor' | 'age_unknown' }

export function targetEligibility(profile: Profile): TargetEligibility {
  if (profile.ageGroup === 'under18') return { ok: false, reason: 'minor' }
  if (profile.age !== null && profile.age < 18) return { ok: false, reason: 'minor' }
  if (profile.ageGroup !== 'adult') return { ok: false, reason: 'age_unknown' }
  return { ok: true }
}

export type EstimateResult =
  | { ok: true; bmr: number; maintenance: number }
  | { ok: false; reason: 'minor' | 'age_unknown' | 'missing_data' }

/** Mifflin–St Jeor resting energy × activity factor. Maintenance estimate only — no deficit is applied. */
export function estimateMaintenance(profile: Profile): EstimateResult {
  const elig = targetEligibility(profile)
  if (!elig.ok) return elig
  const { age, sex, heightCm, weightKg, activity } = profile
  if (age === null || age < 18 || age > 100 || heightCm === null || weightKg === null || !activity || sex === 'unspecified') {
    return { ok: false, reason: 'missing_data' }
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  const bmr = sex === 'male' ? base + 5 : base - 161
  const maintenance = bmr * ACTIVITY_FACTORS[activity]
  return { ok: true, bmr: Math.round(bmr), maintenance: Math.round(maintenance / 10) * 10 }
}

export type TargetError = 'kcal_range' | 'pct_range' | 'pct_sum'

export function validateTargets(t: Pick<Targets, 'kcal' | 'proteinPct' | 'carbsPct' | 'fatPct'>): TargetError | null {
  if (t.kcal === null || t.kcal < TARGET_LIMITS.minKcal || t.kcal > TARGET_LIMITS.maxKcal) return 'kcal_range'
  for (const p of [t.proteinPct, t.carbsPct, t.fatPct]) {
    if (!Number.isFinite(p) || p < MACRO_PCT_LIMITS.min || p > MACRO_PCT_LIMITS.max) return 'pct_range'
  }
  if (Math.round(t.proteinPct + t.carbsPct + t.fatPct) !== 100) return 'pct_sum'
  return null
}

/** Gram targets derived from kcal and percentages, so energy and macros stay consistent. */
export function macroGramTargets(t: Pick<Targets, 'kcal' | 'proteinPct' | 'carbsPct' | 'fatPct'>): Record<MacroKey, number> | null {
  if (t.kcal === null) return null
  return {
    protein: Math.round((t.kcal * t.proteinPct) / 100 / KCAL_PER_GRAM.protein),
    carbs: Math.round((t.kcal * t.carbsPct) / 100 / KCAL_PER_GRAM.carbs),
    fat: Math.round((t.kcal * t.fatPct) / 100 / KCAL_PER_GRAM.fat),
  }
}

/** Active targets only when enabled, valid and the profile is eligible. */
export function activeTargets(profile: Profile, targets: Targets): { kcal: number; grams: Record<MacroKey, number> } | null {
  if (!targets.enabled || !targetEligibility(profile).ok) return null
  if (validateTargets(targets)) return null
  const grams = macroGramTargets(targets)
  if (!grams || targets.kcal === null) return null
  return { kcal: targets.kcal, grams }
}

// ---------- Units ----------
export const KG_PER_LB = 0.45359237
export const CM_PER_IN = 2.54
export const kgToLb = (kg: number) => kg / KG_PER_LB
export const lbToKg = (lb: number) => lb * KG_PER_LB
