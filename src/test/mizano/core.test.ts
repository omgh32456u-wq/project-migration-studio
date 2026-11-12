import { describe, expect, it } from 'vitest'
import { createBackup, logsToCsv, mergeData, parseBackup } from '@/lib/backup'
import { addDays, addMonths, isDateKey, startOfWeek, toDateKey } from '@/lib/dates'
import { defaultSettings } from '@/lib/defaults'
import { buildSeedFoods } from '@/lib/foods-seed'
import {
  activeTargets,
  buildFoodItem,
  buildRecipeItem,
  estimateMaintenance,
  GRAMS_PER_OZ,
  macroGramTargets,
  parseLocaleNumber,
  perServingToPer100g,
  recipeTotals,
  rescaleItem,
  scaleNutrients,
  sumItems,
  validateAmount,
  validateTargets,
} from '@/lib/nutrition'
import type { AppData, Food, LogEntry, Profile, Recipe } from '@/lib/types'

const foods = buildSeedFoods(0)
const food = (slug: string) => foods.find((f) => f.id === `seed:${slug}`) as Food
const adult: Profile = { ...defaultSettings().profile, ageGroup: 'adult', age: 30, sex: 'female', heightCm: 165, weightKg: 60, activity: 'light' }

describe('seed data', () => {
  it('has unique ids and bilingual names', () => {
    expect(new Set(foods.map((f) => f.id)).size).toBe(foods.length)
    for (const f of foods) {
      expect(f.nameEn.length).toBeGreaterThan(0)
      expect(f.nameAr.length).toBeGreaterThan(0)
      expect(f.servings.every((s) => s.grams > 0)).toBe(true)
    }
  })
})

describe('quantity scaling', () => {
  it('scales per-100g values linearly', () => {
    const n = scaleNutrients({ kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, 250)
    expect(n).toEqual({ kcal: 325, protein: 6.75, carbs: 70, fat: 0.75 })
  })
  it('keeps unknown values as null instead of zero', () => {
    expect(scaleNutrients({ kcal: 100, protein: null, carbs: 10, fat: null }, 50)).toEqual({ kcal: 50, protein: null, carbs: 5, fat: null })
  })
  it('builds a serving-based item', () => {
    const item = buildFoodItem(food('egg-boiled'), 2, { kind: 'serving', grams: 50, labelEn: 'egg', labelAr: 'بيضة' })
    expect(item.grams).toBe(100)
    expect(item.nutrients.kcal).toBe(155)
    expect(item.estimated).toBe(true)
  })
  it('converts ounces', () => {
    const item = buildFoodItem(food('rice-white'), 1, { kind: 'oz', grams: GRAMS_PER_OZ, labelEn: 'oz', labelAr: 'أونصة' })
    expect(item.grams).toBeCloseTo(28.35, 2)
  })
  it('rescales an existing entry from its snapshot', () => {
    const item = buildFoodItem(food('baladi-bread'), 1, { kind: 'serving', grams: 90, labelEn: 'loaf', labelAr: 'رغيف' })
    const half = rescaleItem(item, 0.5)
    expect(half.grams).toBe(45)
    expect(half.nutrients.kcal).toBeCloseTo(117, 1)
  })
  it('converts label values per serving to per 100 g', () => {
    expect(perServingToPer100g({ kcal: 150, protein: 3, carbs: null, fat: 9 }, 30)).toEqual({ kcal: 500, protein: 10, carbs: null, fat: 30 })
  })
})

describe('validation', () => {
  it('rejects bad quantities', () => {
    expect(validateAmount(null, 1)).toBe('required')
    expect(validateAmount(0, 1)).toBe('non_positive')
    expect(validateAmount(-3, 1)).toBe('non_positive')
    expect(validateAmount(6000, 1)).toBe('too_large')
    expect(validateAmount(200, 50)).toBe('too_large')
    expect(validateAmount(150, 1)).toBeNull()
  })
  it('parses Arabic-Indic digits and separators', () => {
    expect(parseLocaleNumber('١٢٫٥')).toBe(12.5)
    expect(parseLocaleNumber('2,5')).toBe(2.5)
    expect(parseLocaleNumber('abc')).toBeNull()
    expect(parseLocaleNumber('')).toBeNull()
  })
})

describe('totals', () => {
  it('sums and tracks missing values', () => {
    const t = sumItems([
      { nutrients: { kcal: 100, protein: 5, carbs: 10, fat: 2 }, estimated: true },
      { nutrients: { kcal: 50, protein: null, carbs: 5, fat: 1 }, estimated: false },
    ])
    expect(t.values).toEqual({ kcal: 150, protein: 5, carbs: 15, fat: 3 })
    expect(t.missing.protein).toBe(1)
    expect(t.estimatedCount).toBe(1)
  })
})

describe('recipes', () => {
  const zero = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const recipe: Recipe = {
    id: 'r1',
    name: 'Foul plate',
    servings: 2,
    notes: '',
    createdAt: 0,
    updatedAt: 0,
    ingredients: [
      { id: 'i1', foodId: 'seed:foul-plain', grams: 300, snapshot: { nameEn: '', nameAr: '', per100g: zero, source: 'estimate' } },
      { id: 'i2', foodId: 'seed:olive-oil', grams: 10, snapshot: { nameEn: '', nameAr: '', per100g: zero, source: 'estimate' } },
    ],
  }
  it('computes totals and per-serving values', () => {
    const t = recipeTotals(recipe, new Map(foods.map((f) => [f.id, f])))
    expect(t.grams).toBe(310)
    expect(t.total.kcal).toBeCloseTo(330 + 88.4, 1)
    expect(t.perServing.kcal).toBeCloseTo((330 + 88.4) / 2, 1)
    const item = buildRecipeItem(recipe, t, 1.5)
    expect(item.grams).toBeCloseTo(232.5, 1)
    expect(item.nutrients.kcal).toBeCloseTo(((330 + 88.4) / 2) * 1.5, 0)
  })
  it('falls back to snapshot when a food is deleted', () => {
    const t = recipeTotals(recipe, new Map<string, Food>())
    expect(t.missingFoods).toBe(2)
    expect(t.total.kcal).toBe(0)
  })
})

describe('targets and safeguards', () => {
  it('never estimates for minors', () => {
    expect(estimateMaintenance({ ...adult, ageGroup: 'under18', age: 15 })).toEqual({ ok: false, reason: 'minor' })
    expect(estimateMaintenance({ ...adult, age: 16 })).toEqual({ ok: false, reason: 'minor' })
  })
  it('requires confirmed adult age group', () => {
    expect(estimateMaintenance({ ...adult, ageGroup: 'unspecified' })).toEqual({ ok: false, reason: 'age_unknown' })
  })
  it('requires complete data', () => {
    expect(estimateMaintenance({ ...adult, sex: 'unspecified' })).toEqual({ ok: false, reason: 'missing_data' })
  })
  it('estimates maintenance with Mifflin–St Jeor', () => {
    const r = estimateMaintenance(adult)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.bmr).toBe(Math.round(10 * 60 + 6.25 * 165 - 5 * 30 - 161))
      expect(r.maintenance).toBe(Math.round((r.bmr * 1.375) / 10) * 10)
    }
  })
  it('keeps macro grams consistent with energy', () => {
    const g = macroGramTargets({ kcal: 2000, proteinPct: 20, carbsPct: 50, fatPct: 30 })!
    expect(g).toEqual({ protein: 100, carbs: 250, fat: 67 })
    expect(Math.abs(g.protein * 4 + g.carbs * 4 + g.fat * 9 - 2000)).toBeLessThan(10)
  })
  it('validates target ranges', () => {
    expect(validateTargets({ kcal: 800, proteinPct: 20, carbsPct: 50, fatPct: 30 })).toBe('kcal_range')
    expect(validateTargets({ kcal: 2000, proteinPct: 20, carbsPct: 50, fatPct: 20 })).toBe('pct_sum')
    expect(validateTargets({ kcal: 2000, proteinPct: 2, carbsPct: 68, fatPct: 30 })).toBe('pct_range')
  })
  it('disables active targets for minors even if enabled', () => {
    const t = { enabled: true, kcal: 2000, proteinPct: 20, carbsPct: 50, fatPct: 30 }
    expect(activeTargets(adult, t)).not.toBeNull()
    expect(activeTargets({ ...adult, ageGroup: 'under18' }, t)).toBeNull()
  })
})

describe('dates', () => {
  it('uses local calendar days', () => {
    expect(toDateKey(new Date(2026, 0, 31, 23, 59))).toBe('2026-01-31')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(startOfWeek('2026-10-19', 6)).toBe('2026-10-17')
    expect(isDateKey('2026-02-30')).toBe(false)
  })
})

describe('backup', () => {
  const log: LogEntry = {
    ...buildFoodItem(food('taameya'), 3, { kind: 'serving', grams: 20, labelEn: 'piece', labelAr: 'قرص' }),
    id: 'l1',
    date: '2026-10-19',
    meal: 'breakfast',
    createdAt: 1,
    updatedAt: 1,
  }
  const data: AppData = { foods, logs: [log], recipes: [], savedMeals: [], weights: [], settings: defaultSettings() }

  it('round-trips an export', () => {
    const r = parseBackup(JSON.stringify(createBackup(data)))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.logs[0]).toEqual(log)
  })
  it('rejects invalid files safely', () => {
    expect(parseBackup('nope')).toMatchObject({ ok: false, error: 'not_json' })
    expect(parseBackup('{"app":"other"}')).toMatchObject({ ok: false, error: 'wrong_app' })
    expect(parseBackup(JSON.stringify({ ...createBackup(data), format: 99 }))).toMatchObject({ ok: false, error: 'newer_format' })
    const broken = createBackup(data)
    ;(broken.data.logs[0] as unknown as Record<string, unknown>).date = 'yesterday'
    expect(parseBackup(JSON.stringify(broken))).toMatchObject({ ok: false, error: 'invalid_data' })
  })
  it('merges without overwriting existing records', () => {
    const incoming = { ...data, logs: [{ ...log, amount: 99 }, { ...log, id: 'l2' }] }
    const merged = mergeData(data, incoming)
    expect(merged.logs).toHaveLength(2)
    expect(merged.logs[0].amount).toBe(3)
  })
  it('exports CSV with escaping', () => {
    const csv = logsToCsv([{ ...log, nameEn: 'Taameya, "fried"' }])
    expect(csv).toContain('"Taameya, ""fried"""')
    expect(csv.split('\r\n')).toHaveLength(2)
  })
})
