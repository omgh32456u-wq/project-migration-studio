import type { Locale } from '../types'
import { parseDateKey } from '../dates'
import { ar } from './ar'
import { en, type MessageKey as BaseKey } from './en'
import { arExtra } from './ar-extra'
import { enExtra, type ExtraKey } from './en-extra'

export type MessageKey = BaseKey | ExtraKey
export type Vars = Record<string, string | number>

// Widen the const dictionaries so MessageKey (which includes ExtraKey) can index them.
const enAll: Record<MessageKey, string> = { ...en, ...enExtra }
const arAll: Record<MessageKey, string> = { ...ar, ...arExtra }

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  en: enAll,
  ar: arAll,
}
const intlLocale: Record<Locale, string> = { en: 'en-US', ar: 'ar-EG' }

export const dirFor = (l: Locale): 'ltr' | 'rtl' => (l === 'ar' ? 'rtl' : 'ltr')
/** Saturday-first weeks are common in Egypt; Monday-first for English. */
export const weekStartFor = (l: Locale) => (l === 'ar' ? 6 : 1)

const numberFormatters = new Map<string, Intl.NumberFormat>()

export function createTranslator(locale: Locale) {
  const dict = dictionaries[locale]
  const tag = intlLocale[locale]

  const fmtNum = (n: number, maxFractionDigits = 0) => {
    const key = `${tag}:${maxFractionDigits}`
    let f = numberFormatters.get(key)
    if (!f) {
      f = new Intl.NumberFormat(tag, { maximumFractionDigits: maxFractionDigits })
      numberFormatters.set(key, f)
    }
    return f.format(n)
  }

  const t = (key: MessageKey, vars?: Vars) => {
    const template = dict[key] ?? enAll[key] ?? key
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (_, name: string) => {
      const v = vars[name]
      if (v === undefined) return `{${name}}`
      return typeof v === 'number' ? fmtNum(v, 1) : v
    })
  }

  const fmtDate = (key: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(tag, opts).format(parseDateKey(key))

  /** Formats minutes after midnight as a locale time ("6:00 AM" / "٦:٠٠ ص"); UTC keeps it independent of the device timezone. */
  const fmtTime = (minutes: number) =>
    new Intl.DateTimeFormat(tag, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)),
    )

  return { t, fmtNum, fmtDate, fmtTime, locale, dir: dirFor(locale), tag }
}

export type Translator = ReturnType<typeof createTranslator>
