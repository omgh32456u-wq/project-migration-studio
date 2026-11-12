import {
  Apple,
  Bean,
  Beef,
  BookmarkCheck,
  CakeSlice,
  Carrot,
  ChefHat,
  Cookie,
  CupSoda,
  Egg,
  Nut,
  Soup,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react'
import type { Food, FoodCategory, LoggedItem } from './types'

export const CATEGORY_ICONS: Record<FoodCategory, LucideIcon> = {
  bread_grains: Wheat,
  legumes: Bean,
  dairy_eggs: Egg,
  meat_fish: Beef,
  vegetables: Carrot,
  fruits: Apple,
  dishes: Soup,
  sweets_spreads: CakeSlice,
  nuts_oils: Nut,
  drinks: CupSoda,
  snacks_packaged: Cookie,
  other: UtensilsCrossed,
}

export const FALLBACK_FOOD_ICON: LucideIcon = UtensilsCrossed
export const RECIPE_ICON: LucideIcon = ChefHat
export const SAVED_MEAL_ICON: LucideIcon = BookmarkCheck

export function iconForCategory(category: string | undefined | null): LucideIcon {
  return (category && CATEGORY_ICONS[category as FoodCategory]) || FALLBACK_FOOD_ICON
}

/** Logged items keep a snapshot, so the source food may be deleted or missing; fall back safely. */
export function iconForLoggedItem(item: Pick<LoggedItem, 'sourceType' | 'sourceId'>, foodsById: Map<string, Food>): LucideIcon {
  if (item.sourceType === 'recipe') return RECIPE_ICON
  return iconForCategory(item.sourceId ? foodsById.get(item.sourceId)?.category : undefined)
}
