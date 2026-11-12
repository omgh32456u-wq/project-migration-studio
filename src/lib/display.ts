import { isNativeApp, shareTextFile } from './native'
import type { Food, Locale, LoggedItem, ServingUnit } from './types'

export function localName(item: Pick<Food | LoggedItem, 'nameEn' | 'nameAr'>, locale: Locale): string {
  return locale === 'ar' ? item.nameAr.trim() || item.nameEn : item.nameEn.trim() || item.nameAr
}

export function secondaryName(item: Pick<Food | LoggedItem, 'nameEn' | 'nameAr'>, locale: Locale): string | null {
  const other = locale === 'ar' ? item.nameEn.trim() : item.nameAr.trim()
  return other && other !== localName(item, locale) ? other : null
}

export function servingLabel(s: Pick<ServingUnit, 'labelEn' | 'labelAr'>, locale: Locale): string {
  return locale === 'ar' ? s.labelAr.trim() || s.labelEn : s.labelEn.trim() || s.labelAr
}

/** Arabic-insensitive normalisation for search (hamza/alef forms, taa marbuta, diacritics). */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchFoods(foods: Food[], query: string): Food[] {
  const q = normalizeSearch(query)
  if (!q) return foods
  const tokens = q.split(' ')
  const scored: { food: Food; score: number }[] = []
  for (const food of foods) {
    const en = normalizeSearch(food.nameEn)
    const arName = normalizeSearch(food.nameAr)
    const hay = `${en} ${arName}`
    if (!tokens.every((tok) => hay.includes(tok))) continue
    const score = en.startsWith(q) || arName.startsWith(q) ? 0 : en.includes(q) || arName.includes(q) ? 1 : 2
    scored.push({ food, score })
  }
  return scored.sort((a, b) => a.score - b.score).map((s) => s.food)
}

export async function downloadFile(filename: string, content: string, mime: string) {
  if (isNativeApp()) return shareTextFile(filename, content)
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
