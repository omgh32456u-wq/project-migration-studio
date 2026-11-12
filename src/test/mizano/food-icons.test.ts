import { describe, expect, it } from 'vitest'
import { CATEGORY_ICONS, FALLBACK_FOOD_ICON, iconForCategory, iconForLoggedItem, RECIPE_ICON } from '@/lib/food-icons'
import { buildSeedFoods } from '@/lib/foods-seed'
import { FOOD_CATEGORIES, type Food } from '@/lib/types'

const SEED_FOODS = buildSeedFoods(0)

describe('food icons', () => {
  it('maps every food category to an icon', () => {
    for (const c of FOOD_CATEGORIES) expect(CATEGORY_ICONS[c]).toBeTruthy()
  })

  it('gives every seed food a category-specific icon', () => {
    for (const f of SEED_FOODS) expect(iconForCategory(f.category)).toBe(CATEGORY_ICONS[f.category])
  })

  it('falls back safely for unknown or missing categories', () => {
    expect(iconForCategory(undefined)).toBe(FALLBACK_FOOD_ICON)
    expect(iconForCategory('not-a-category')).toBe(FALLBACK_FOOD_ICON)
  })

  it('resolves logged items, including recipes and deleted foods', () => {
    const food = SEED_FOODS[0]
    const byId = new Map<string, Food>([[food.id, food]])
    expect(iconForLoggedItem({ sourceType: 'food', sourceId: food.id }, byId)).toBe(CATEGORY_ICONS[food.category])
    expect(iconForLoggedItem({ sourceType: 'recipe', sourceId: 'r1' }, byId)).toBe(RECIPE_ICON)
    expect(iconForLoggedItem({ sourceType: 'food', sourceId: 'gone' }, byId)).toBe(FALLBACK_FOOD_ICON)
    expect(iconForLoggedItem({ sourceType: 'food', sourceId: null }, byId)).toBe(FALLBACK_FOOD_ICON)
  })
})
