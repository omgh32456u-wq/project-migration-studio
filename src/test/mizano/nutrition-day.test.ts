import { describe, expect, it } from 'vitest'
import { createBackup, mergeData, parseBackup } from '@/lib/backup'
import { addDays } from '@/lib/dates'
import { defaultSettings, normalizeSettings } from '@/lib/defaults'
import { buildSeedFoods } from '@/lib/foods-seed'
import { buildFoodItem, sumItems } from '@/lib/nutrition'
import {
  dayStartToTime,
  groupLogsByDate,
  isBeforeDayStart,
  normalizeDayStart,
  nutritionDayBounds,
  nutritionDayKey,
  parseTimeInput,
} from '@/lib/nutrition-day'
import type { AppData, Food, LogEntry, Settings } from '@/lib/types'

const foods = buildSeedFoods(0)
const egg = foods.find((f) => f.id === 'seed:egg-boiled') as Food
const rice = foods.find((f) => f.id === 'seed:rice-white') as Food

/** Local wall-clock date; month is 1-based. */
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi)
const HOUR = 3_600_000

function entry(id: string, date: string, when: Date, food: Food = egg): LogEntry {
  return {
    ...buildFoodItem(food, 1, { kind: 'serving', grams: 50, labelEn: 'portion', labelAr: 'حصة' }),
    id,
    date,
    meal: 'snacks',
    createdAt: when.getTime(),
    updatedAt: when.getTime(),
  }
}

describe('day-start setting', () => {
  it('accepts whole minutes in [0, 1440) and falls back to midnight otherwise', () => {
    for (const ok of [0, 1, 360, 1439]) expect(normalizeDayStart(ok)).toBe(ok)
    for (const bad of [1440, -1, 5.5, Number.NaN, Infinity, '360', null, undefined, {}]) expect(normalizeDayStart(bad)).toBe(0)
  })

  it('round-trips with <input type="time"> values', () => {
    expect(dayStartToTime(0)).toBe('00:00')
    expect(dayStartToTime(395)).toBe('06:35')
    expect(dayStartToTime(1439)).toBe('23:59')
    expect(parseTimeInput('06:35')).toBe(395)
    for (const bad of ['', '6:35', '24:00', '23:60', '06:35:10', 'ab:cd']) expect(parseTimeInput(bad)).toBeNull()
    for (let m = 0; m < 1440; m++) expect(parseTimeInput(dayStartToTime(m))).toBe(m)
  })

  it('defaults to midnight and gives existing users midnight without touching their other settings', () => {
    expect(defaultSettings().dayStartMinutes).toBe(0)
    const legacy: Partial<Settings> = { ...defaultSettings(), locale: 'ar', theme: 'dark', favorites: ['seed:egg-boiled'], mealNames: { breakfast: 'Fatoor' } }
    delete legacy.dayStartMinutes
    const loaded = normalizeSettings(legacy)
    expect(loaded.dayStartMinutes).toBe(0)
    expect(loaded).toEqual({ ...legacy, dayStartMinutes: 0 })
  })

  it('keeps a saved day start and repairs an invalid one', () => {
    expect(normalizeSettings({ dayStartMinutes: 360 }).dayStartMinutes).toBe(360)
    expect(normalizeSettings({ dayStartMinutes: 9999 }).dayStartMinutes).toBe(0)
  })
})

describe('nutritionDayKey', () => {
  it('with the default midnight start it is exactly the calendar day', () => {
    for (let h = 0; h < 24; h++) {
      for (const mi of [0, 1, 59]) expect(nutritionDayKey(at(2026, 11, 9, h, mi), 0)).toBe('2026-11-09')
    }
  })

  it('counts food logged before the start time toward the previous day', () => {
    const start = 6 * 60
    expect(nutritionDayKey(at(2026, 11, 9, 5, 59), start)).toBe('2026-11-08')
    expect(nutritionDayKey(at(2026, 11, 9, 6, 0), start)).toBe('2026-11-09')
    expect(nutritionDayKey(at(2026, 11, 9, 23, 59), start)).toBe('2026-11-09')
    expect(nutritionDayKey(at(2026, 11, 10, 0, 0), start)).toBe('2026-11-09')
    expect(nutritionDayKey(at(2026, 11, 10, 5, 59), start)).toBe('2026-11-09')
  })

  it('rolls back across month, year and leap-day boundaries', () => {
    expect(nutritionDayKey(at(2026, 1, 1, 3, 0), 6 * 60)).toBe('2025-12-31')
    expect(nutritionDayKey(at(2026, 3, 1, 2, 0), 4 * 60)).toBe('2026-02-28')
    expect(nutritionDayKey(at(2028, 3, 1, 2, 0), 4 * 60)).toBe('2028-02-29')
  })

  it('supports a late-evening start', () => {
    const start = 23 * 60 + 30
    expect(nutritionDayKey(at(2026, 11, 9, 23, 29), start)).toBe('2026-11-08')
    expect(nutritionDayKey(at(2026, 11, 9, 23, 30), start)).toBe('2026-11-09')
    expect(isBeforeDayStart(at(2026, 11, 9, 23, 29), start)).toBe(true)
    expect(isBeforeDayStart(at(2026, 11, 9, 23, 30), start)).toBe(false)
  })
})

describe('nutritionDayBounds', () => {
  it('lasts 24 hours and ends at the next day’s start boundary', () => {
    for (const start of [0, 4 * 60 + 15, 6 * 60, 23 * 60 + 59]) {
      const { start: from, end } = nutritionDayBounds('2026-06-10', start)
      expect(end.getTime() - from.getTime()).toBe(24 * HOUR)
      expect(from.getHours() * 60 + from.getMinutes()).toBe(start)
      expect(end.getHours() * 60 + end.getMinutes()).toBe(start)
      expect(end.getTime()).toBe(nutritionDayBounds('2026-06-11', start).start.getTime())
    }
  })

  it('tiles the timeline: every instant is in exactly the day nutritionDayKey says', () => {
    const start = 4 * 60 + 15
    for (let t = at(2026, 6, 9, 0, 0).getTime(); t < at(2026, 6, 13, 0, 0).getTime(); t += 30 * 60_000) {
      const now = new Date(t)
      const key = nutritionDayKey(now, start)
      const own = nutritionDayBounds(key, start)
      expect(own.start.getTime() <= t && t < own.end.getTime()).toBe(true)
      const prev = nutritionDayBounds(addDays(key, -1), start)
      const next = nutritionDayBounds(addDays(key, 1), start)
      expect(prev.end.getTime() <= t || t < prev.start.getTime()).toBe(true)
      expect(t < next.start.getTime()).toBe(true)
    }
  })
})

describe('local timezone and DST boundaries', () => {
  /** Runs `fn` with the process timezone switched, skipping when the runtime ignores the change. */
  const inZone = (tz: string, fn: () => void, skip: () => void) => {
    const previous = process.env.TZ
    process.env.TZ = tz
    try {
      // In America/New_York 02:30 does not exist on 2026-03-08, so the runtime moves it to 03:30.
      if (new Date(2026, 2, 8, 2, 30).getHours() === 2) return skip()
      fn()
    } finally {
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  }

  it('uses wall-clock time, so the boundary does not drift on DST change days', (ctx) => {
    inZone(
      'America/New_York',
      () => {
        const start = 6 * 60
        expect(nutritionDayKey(at(2026, 3, 8, 5, 59), start)).toBe('2026-03-07')
        expect(nutritionDayKey(at(2026, 3, 8, 6, 0), start)).toBe('2026-03-08')
        expect(nutritionDayKey(at(2026, 11, 1, 5, 59), start)).toBe('2026-10-31')
        expect(nutritionDayKey(at(2026, 11, 1, 6, 0), start)).toBe('2026-11-01')
        // The 02:00 clock change falls inside the window that starts the day before (06:00 -> 06:00).
        const spring = nutritionDayBounds('2026-03-07', start)
        const fall = nutritionDayBounds('2026-10-31', start)
        expect((spring.end.getTime() - spring.start.getTime()) / HOUR).toBe(23)
        expect((fall.end.getTime() - fall.start.getTime()) / HOUR).toBe(25)
        expect(spring.end.getHours()).toBe(6)
        expect(fall.end.getHours()).toBe(6)
        const after = nutritionDayBounds('2026-03-08', start)
        expect((after.end.getTime() - after.start.getTime()) / HOUR).toBe(24)
      },
      () => ctx.skip(),
    )
  })

  it('keeps the skipped-hour key aligned with the resolved boundary', (ctx) => {
    inZone('America/New_York', () => {
      const start = 2 * 60 + 30
      const boundary = nutritionDayBounds('2026-03-08', start).start
      expect(boundary.getHours()).toBe(3)
      expect(boundary.getMinutes()).toBe(30)
      expect(nutritionDayKey(at(2026, 3, 8, 3, 0), start)).toBe('2026-03-07')
      expect(nutritionDayKey(boundary, start)).toBe('2026-03-08')
    }, () => ctx.skip())
  })

  it('does not move the nutrition-day label backwards during a repeated fall-back hour', (ctx) => {
    inZone('America/New_York', () => {
      const start = 1 * 60 + 30
      const firstBoundary = nutritionDayBounds('2026-11-01', start).start
      const before = new Date(firstBoundary.getTime() - 1)
      // Construct instants from the first boundary so these land in the SECOND 01:00 hour (EST).
      const repeatedHour = new Date(firstBoundary.getTime() + 30 * 60_000)
      const afterRepeatedHour = new Date(firstBoundary.getTime() + 75 * 60_000)
      expect(nutritionDayKey(before, start)).toBe('2026-10-31')
      expect(nutritionDayKey(firstBoundary, start)).toBe('2026-11-01')
      expect(repeatedHour.getTime()).toBeGreaterThan(firstBoundary.getTime())
      expect(nutritionDayKey(repeatedHour, start)).toBe('2026-11-01')
      expect(nutritionDayKey(afterRepeatedHour, start)).toBe('2026-11-01')
      expect(nutritionDayBounds('2026-10-31', start).end.getTime()).toBe(firstBoundary.getTime())
    }, () => ctx.skip())
  })

  it('stays contiguous when the chosen start time falls in the skipped hour', (ctx) => {
    inZone(
      'America/New_York',
      () => {
        const start = 2 * 60 + 30
        expect(nutritionDayKey(at(2026, 3, 8, 1, 59), start)).toBe('2026-03-07')
        // 02:30 is skipped and resolves to 03:30; 03:00 is still before the boundary.
        expect(nutritionDayKey(at(2026, 3, 8, 3, 0), start)).toBe('2026-03-07')
        expect(nutritionDayKey(at(2026, 3, 8, 3, 29), start)).toBe('2026-03-07')
        expect(nutritionDayKey(at(2026, 3, 8, 3, 30), start)).toBe('2026-03-08')
        expect(nutritionDayBounds('2026-03-07', start).end.getTime()).toBe(nutritionDayBounds('2026-03-08', start).start.getTime())
      },
      () => ctx.skip(),
    )
  })
})

describe('historical data is never reassigned', () => {
  it('entries keep their stored day and timestamp when the start time changes', () => {
    // Logged under the old midnight boundary: 00:20 on the 10th belongs to the 10th.
    const late = entry('late', '2026-11-10', at(2026, 11, 10, 0, 20), rice)
    const evening = entry('evening', '2026-11-09', at(2026, 11, 9, 23, 50))
    const logs = [evening, late]
    const before = structuredClone(logs)

    const settings: Settings = { ...defaultSettings(), dayStartMinutes: 0 }
    const changed: Settings = { ...settings, dayStartMinutes: 6 * 60 }

    // Under the new setting that timestamp WOULD map to the 9th ...
    expect(nutritionDayKey(new Date(late.createdAt), changed.dayStartMinutes)).toBe('2026-11-09')
    // ... but the stored record is untouched and still grouped under the 10th.
    expect(logs).toEqual(before)
    const grouped = groupLogsByDate(logs)
    expect(grouped.get('2026-11-10')?.map((e) => e.id)).toEqual(['late'])
    expect(grouped.get('2026-11-09')?.map((e) => e.id)).toEqual(['evening'])
    expect(grouped.get('2026-11-10')?.[0].createdAt).toBe(late.createdAt)
  })

  it('new entries use the new boundary while old days keep their totals', () => {
    const start = 6 * 60
    const stamps = [at(2026, 11, 9, 23, 50), at(2026, 11, 10, 2, 10), at(2026, 11, 10, 6, 5)]
    const logs = stamps.map((d, i) => entry(`e${i}`, nutritionDayKey(d, start), d))
    const grouped = groupLogsByDate(logs)
    expect(logs.map((l) => l.date)).toEqual(['2026-11-09', '2026-11-09', '2026-11-10'])
    expect(sumItems(grouped.get('2026-11-09') ?? []).count).toBe(2)
    expect(sumItems(grouped.get('2026-11-10') ?? []).count).toBe(1)
    expect(sumItems(grouped.get('2026-11-09') ?? []).values.kcal).toBe(2 * (egg.per100g.kcal ?? 0) * 0.5)
  })

  it('sorts entries inside a day by when they were logged, not by id', () => {
    const a = entry('z-first', '2026-11-09', at(2026, 11, 9, 8, 0))
    const b = entry('a-second', '2026-11-09', at(2026, 11, 9, 9, 0))
    expect(groupLogsByDate([b, a]).get('2026-11-09')?.map((e) => e.id)).toEqual(['z-first', 'a-second'])
  })
})

describe('day start in backups and merges', () => {
  const log = entry('l1', '2026-11-09', at(2026, 11, 9, 12, 0))
  const data = (dayStartMinutes: number): AppData => ({
    foods,
    logs: [log],
    recipes: [],
    savedMeals: [],
    weights: [],
    settings: { ...defaultSettings(), dayStartMinutes },
  })

  it('round-trips the setting and the entries', () => {
    const r = parseBackup(JSON.stringify(createBackup(data(360))))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.settings.dayStartMinutes).toBe(360)
      expect(r.data.logs[0]).toEqual(log)
    }
  })

  it('imports a backup made before the setting existed as midnight', () => {
    const file = JSON.parse(JSON.stringify(createBackup(data(0)))) as { data: { settings: Record<string, unknown> } }
    delete file.data.settings.dayStartMinutes
    const r = parseBackup(JSON.stringify(file))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.settings.dayStartMinutes).toBe(0)
  })

  it('merging a backup keeps the current day start', () => {
    expect(mergeData(data(360), data(0)).settings.dayStartMinutes).toBe(360)
  })
})
