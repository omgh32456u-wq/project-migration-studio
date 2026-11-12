export type Locale = 'en' | 'ar'
export type ThemePref = 'light' | 'dark' | 'system'
export type UnitSystem = 'metric' | 'imperial'
export type AgeGroup = 'under18' | 'adult' | 'unspecified'
export type Sex = 'female' | 'male' | 'unspecified'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
export type MealSlot = (typeof MEAL_SLOTS)[number]

export const NUTRIENT_KEYS = ['kcal', 'protein', 'carbs', 'fat'] as const
export type NutrientKey = (typeof NUTRIENT_KEYS)[number]
export type MacroKey = Exclude<NutrientKey, 'kcal'>

/** `null` means the value is unknown — never silently treated as zero. */
export type Nutrients = Record<NutrientKey, number | null>

export const FOOD_CATEGORIES = [
  'bread_grains',
  'legumes',
  'dairy_eggs',
  'meat_fish',
  'vegetables',
  'fruits',
  'dishes',
  'sweets_spreads',
  'nuts_oils',
  'drinks',
  'snacks_packaged',
  'other',
] as const
export type FoodCategory = (typeof FOOD_CATEGORIES)[number]

/** estimate = typical/approximate values; label = copied from a product label; user = user-entered. */
export type DataSource = 'estimate' | 'label' | 'user'

export interface ServingUnit {
  id: string
  labelEn: string
  labelAr: string
  grams: number
}

export interface Food {
  id: string
  nameEn: string
  nameAr: string
  category: FoodCategory
  per100g: Nutrients
  servings: ServingUnit[]
  source: DataSource
  notes: string
  isCustom: boolean
  /** Built-in food whose values were edited by the user. */
  modified: boolean
  /** Soft delete so recipes that reference it keep working. */
  deleted: boolean
  createdAt: number
  updatedAt: number
}

export interface IngredientSnapshot {
  nameEn: string
  nameAr: string
  per100g: Nutrients
  source: DataSource
}

export interface RecipeIngredient {
  id: string
  foodId: string
  grams: number
  /** Fallback values if the referenced food is later deleted. */
  snapshot: IngredientSnapshot
}

export interface Recipe {
  id: string
  name: string
  servings: number
  ingredients: RecipeIngredient[]
  notes: string
  createdAt: number
  updatedAt: number
}

export type UnitKind = 'g' | 'oz' | 'serving' | 'recipe_serving'

export interface LoggedItem {
  sourceType: 'food' | 'recipe'
  sourceId: string | null
  nameEn: string
  nameAr: string
  amount: number
  unitKind: UnitKind
  unitLabelEn: string
  unitLabelAr: string
  /** Grams per one unit (1 for grams). */
  unitGrams: number
  grams: number
  /** Snapshot at the time of logging; historical logs never silently change. */
  nutrients: Nutrients
  estimated: boolean
}

export interface LogEntry extends LoggedItem {
  id: string
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  meal: MealSlot
  createdAt: number
  updatedAt: number
}

export interface SavedMeal {
  id: string
  name: string
  items: LoggedItem[]
  createdAt: number
  updatedAt: number
}

export interface WeightEntry {
  id: string
  date: string
  kg: number
  createdAt: number
}

export interface Profile {
  onboarded: boolean
  ageGroup: AgeGroup
  age: number | null
  sex: Sex
  heightCm: number | null
  weightKg: number | null
  activity: ActivityLevel | null
  units: UnitSystem
  trackWeight: boolean
}

export interface Targets {
  enabled: boolean
  kcal: number | null
  proteinPct: number
  carbsPct: number
  fatPct: number
}

export interface Settings {
  locale: Locale
  theme: ThemePref
  profile: Profile
  targets: Targets
  mealNames: Partial<Record<MealSlot, string>>
  favorites: string[]
  /**
   * Minutes after local midnight at which a nutrition day starts (0 = midnight). Decides which day
   * new entries and "today" belong to; entries keep the day they were logged under.
   */
  dayStartMinutes: number
}

export interface AppData {
  foods: Food[]
  logs: LogEntry[]
  recipes: Recipe[]
  savedMeals: SavedMeal[]
  weights: WeightEntry[]
  settings: Settings
}
