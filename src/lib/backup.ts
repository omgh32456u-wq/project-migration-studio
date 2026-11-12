import { isDateKey } from './dates'
import { normalizeSettings } from './defaults'
import type {
  AppData,
  Food,
  IngredientSnapshot,
  LoggedItem,
  LogEntry,
  Nutrients,
  Recipe,
  SavedMeal,
  Settings,
  WeightEntry,
} from './types'
import { FOOD_CATEGORIES, MEAL_SLOTS, NUTRIENT_KEYS } from './types'

/**
 * Backup file format (JSON):
 * {
 *   "app": "track-meals-macros",
 *   "format": 1,
 *   "exportedAt": "<ISO timestamp>",
 *   "data": { "foods": Food[], "logs": LogEntry[], "recipes": Recipe[],
 *             "savedMeals": SavedMeal[], "weights": WeightEntry[], "settings": Settings }
 * }
 * Nutrient values are per 100 g for foods and absolute for logged entries; `null` = unknown.
 */
export const BACKUP_APP_ID = 'track-meals-macros'
export const BACKUP_FORMAT = 1
const MAX_RECORDS = 200_000

export interface BackupFile {
  app: typeof BACKUP_APP_ID
  format: number
  exportedAt: string
  data: AppData
}

export function createBackup(data: AppData, now = new Date()): BackupFile {
  return { app: BACKUP_APP_ID, format: BACKUP_FORMAT, exportedAt: now.toISOString(), data }
}

export type ImportError = 'not_json' | 'wrong_app' | 'newer_format' | 'invalid_data' | 'too_large'
export type ImportResult =
  | { ok: true; data: AppData; counts: Record<'foods' | 'logs' | 'recipes' | 'savedMeals' | 'weights', number> }
  | { ok: false; error: ImportError; detail?: string }

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isNonNegNum = (v: unknown): v is number => isNum(v) && v >= 0
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

function isNutrients(v: unknown): v is Nutrients {
  return isObj(v) && NUTRIENT_KEYS.every((k) => v[k] === null || isNonNegNum(v[k]))
}

function isFood(v: unknown): v is Food {
  return (
    isObj(v) &&
    isStr(v.id) && v.id.length > 0 &&
    isStr(v.nameEn) &&
    isStr(v.nameAr) &&
    (v.nameEn.trim() !== '' || v.nameAr.trim() !== '') &&
    (FOOD_CATEGORIES as readonly string[]).includes(v.category as string) &&
    isNutrients(v.per100g) &&
    Array.isArray(v.servings) &&
    v.servings.every((s) => isObj(s) && isStr(s.id) && isStr(s.labelEn) && isStr(s.labelAr) && isNum(s.grams) && s.grams > 0) &&
    ['estimate', 'label', 'user'].includes(v.source as string) &&
    isStr(v.notes) &&
    isBool(v.isCustom) &&
    isBool(v.modified) &&
    isBool(v.deleted) &&
    isNum(v.createdAt) &&
    isNum(v.updatedAt)
  )
}

function isLoggedItem(v: unknown): v is LoggedItem {
  return (
    isObj(v) &&
    (v.sourceType === 'food' || v.sourceType === 'recipe') &&
    (v.sourceId === null || isStr(v.sourceId)) &&
    isStr(v.nameEn) &&
    isStr(v.nameAr) &&
    isNum(v.amount) && v.amount > 0 &&
    ['g', 'oz', 'serving', 'recipe_serving'].includes(v.unitKind as string) &&
    isStr(v.unitLabelEn) &&
    isStr(v.unitLabelAr) &&
    isNonNegNum(v.unitGrams) &&
    isNonNegNum(v.grams) &&
    isNutrients(v.nutrients) &&
    isBool(v.estimated)
  )
}

function isLogEntry(v: unknown): v is LogEntry {
  return (
    isLoggedItem(v) &&
    isObj(v) &&
    isStr(v.id) &&
    isDateKey(v.date) &&
    (MEAL_SLOTS as readonly string[]).includes(v.meal as string) &&
    isNum(v.createdAt) &&
    isNum(v.updatedAt)
  )
}

function isSnapshot(v: unknown): v is IngredientSnapshot {
  return isObj(v) && isStr(v.nameEn) && isStr(v.nameAr) && isNutrients(v.per100g) && ['estimate', 'label', 'user'].includes(v.source as string)
}

function isRecipe(v: unknown): v is Recipe {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.name) &&
    isNum(v.servings) && v.servings > 0 &&
    Array.isArray(v.ingredients) &&
    v.ingredients.every((i) => isObj(i) && isStr(i.id) && isStr(i.foodId) && isNum(i.grams) && i.grams > 0 && isSnapshot(i.snapshot)) &&
    isStr(v.notes) &&
    isNum(v.createdAt) &&
    isNum(v.updatedAt)
  )
}

function isSavedMeal(v: unknown): v is SavedMeal {
  return isObj(v) && isStr(v.id) && isStr(v.name) && Array.isArray(v.items) && v.items.every(isLoggedItem) && isNum(v.createdAt) && isNum(v.updatedAt)
}

function isWeight(v: unknown): v is WeightEntry {
  return isObj(v) && isStr(v.id) && isDateKey(v.date) && isNum(v.kg) && v.kg > 0 && v.kg < 700 && isNum(v.createdAt)
}

function validateList<T extends { id: string }>(list: unknown, guard: (v: unknown) => v is T, name: string): T[] {
  if (!Array.isArray(list)) throw new Error(`${name}: not a list`)
  const seen = new Set<string>()
  list.forEach((item, i) => {
    if (!guard(item)) throw new Error(`${name}[${i}] is invalid`)
    if (seen.has(item.id)) throw new Error(`${name}: duplicate id ${item.id}`)
    seen.add(item.id)
  })
  return list as T[]
}

function validateSettings(v: unknown): Settings {
  if (!isObj(v)) throw new Error('settings: missing')
  const s = normalizeSettings(v as Partial<Settings>)
  if (s.locale !== 'en' && s.locale !== 'ar') throw new Error('settings.locale invalid')
  if (!['light', 'dark', 'system'].includes(s.theme)) throw new Error('settings.theme invalid')
  if (!['metric', 'imperial'].includes(s.profile.units)) throw new Error('settings.units invalid')
  if (!['under18', 'adult', 'unspecified'].includes(s.profile.ageGroup)) throw new Error('settings.ageGroup invalid')
  return s
}

export function parseBackup(text: string): ImportResult {
  if (text.length > 50_000_000) return { ok: false, error: 'too_large' }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'not_json' }
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP_ID) return { ok: false, error: 'wrong_app' }
  if (!isNum(raw.format) || raw.format > BACKUP_FORMAT) return { ok: false, error: 'newer_format' }
  if (!isObj(raw.data)) return { ok: false, error: 'invalid_data' }
  try {
    const d = raw.data
    const data: AppData = {
      foods: validateList(d.foods, isFood, 'foods'),
      logs: validateList(d.logs, isLogEntry, 'logs'),
      recipes: validateList(d.recipes ?? [], isRecipe, 'recipes'),
      savedMeals: validateList(d.savedMeals ?? [], isSavedMeal, 'savedMeals'),
      weights: validateList(d.weights ?? [], isWeight, 'weights'),
      settings: validateSettings(d.settings),
    }
    const total = data.foods.length + data.logs.length + data.recipes.length + data.savedMeals.length + data.weights.length
    if (total > MAX_RECORDS) return { ok: false, error: 'too_large' }
    return {
      ok: true,
      data,
      counts: {
        foods: data.foods.filter((f) => f.isCustom).length,
        logs: data.logs.length,
        recipes: data.recipes.length,
        savedMeals: data.savedMeals.length,
        weights: data.weights.length,
      },
    }
  } catch (e) {
    return { ok: false, error: 'invalid_data', detail: e instanceof Error ? e.message : undefined }
  }
}

/** Adds incoming records whose ids don't exist yet. Existing records and settings are kept. */
export function mergeData(current: AppData, incoming: AppData): AppData {
  const mergeList = <T extends { id: string }>(a: T[], b: T[]) => {
    const ids = new Set(a.map((x) => x.id))
    return [...a, ...b.filter((x) => !ids.has(x.id))]
  }
  return {
    foods: mergeList(current.foods, incoming.foods),
    logs: mergeList(current.logs, incoming.logs),
    recipes: mergeList(current.recipes, incoming.recipes),
    savedMeals: mergeList(current.savedMeals, incoming.savedMeals),
    weights: mergeList(current.weights, incoming.weights),
    settings: {
      ...current.settings,
      favorites: [...new Set([...current.settings.favorites, ...incoming.settings.favorites])],
    },
  }
}

function csvCell(v: string | number | null): string {
  if (v === null) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s
}

export function logsToCsv(logs: LogEntry[]): string {
  const header = ['date', 'meal', 'name_en', 'name_ar', 'amount', 'unit', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'estimated']
  const rows = [...logs]
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    .map((l) =>
      [l.date, l.meal, l.nameEn, l.nameAr, l.amount, l.unitLabelEn, l.grams, l.nutrients.kcal, l.nutrients.protein, l.nutrients.carbs, l.nutrients.fat, l.estimated ? 'yes' : 'no']
        .map(csvCell)
        .join(','),
    )
  return '\uFEFF' + [header.join(','), ...rows].join('\r\n')
}
