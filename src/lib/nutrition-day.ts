import { addDays, toDateKey } from './dates'
import type { LogEntry } from './types'

/**
 * A "nutrition day" is a 24-hour window that starts at a user-chosen local wall-clock time
 * (`Settings.dayStartMinutes`, minutes after local midnight; 0 = midnight, the classic calendar day).
 *
 * A day is labelled by the calendar date on which it STARTS, so with a 06:00 start, 02:30 on the 10th
 * still belongs to the day labelled the 9th. Boundaries use the runtime's local-time disambiguation consistently: nonexistent spring-forward
 * times move forward by the DST gap, and repeated fall-back times use their earlier occurrence.
 *
 * Entries store the label they were logged under (`LogEntry.date`) plus their real timestamp
 * (`createdAt`). The boundary only decides which label NEW entries and "today" get; it is never used
 * to re-derive the label of an existing entry, so changing it cannot move historical records.
 */

export const MINUTES_PER_DAY = 24 * 60
export const DEFAULT_DAY_START_MINUTES = 0

const pad = (n: number) => String(n).padStart(2, '0')

/** Anything that is not an integer minute in [0, 1440) falls back to midnight. */
export function normalizeDayStart(v: unknown): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < MINUTES_PER_DAY ? v : DEFAULT_DAY_START_MINUTES
}

/** Minutes after midnight -> "HH:MM" (the value format of <input type="time">). */
export function dayStartToTime(minutes: number): string {
  const m = normalizeDayStart(minutes)
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

/** "HH:MM" -> minutes after midnight, or null if it is not a valid 24-hour time. */
export function parseTimeInput(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** Resolve a local day-start boundary using the platform's deterministic Date disambiguation.
 * Nonexistent spring-forward times move forward by the DST gap; repeated fall-back times
 * use the earlier occurrence. Both the key and bounds use this exact instant.
 */
function dayStartBoundary(key: string, dayStartMinutes: number): Date {
  const m = normalizeDayStart(dayStartMinutes)
  const [y, mo, d] = key.split('-').map(Number)
  return new Date(y, mo - 1, d, Math.floor(m / 60), m % 60, 0, 0)
}

/** True while the instant precedes today's resolved local day-start boundary. */
export function isBeforeDayStart(now: Date, dayStartMinutes: number): boolean {
  return now.getTime() < dayStartBoundary(toDateKey(now), dayStartMinutes).getTime()
}

/** The nutrition-day label (YYYY-MM-DD) that contains the instant `now`. */
export function nutritionDayKey(now: Date, dayStartMinutes: number): string {
  const calendar = toDateKey(now)
  return isBeforeDayStart(now, dayStartMinutes) ? addDays(calendar, -1) : calendar
}

/**
 * The window of a nutrition day: [start, end). `end` is the next day's start boundary, so
 * consecutive days tile the timeline with no gap or overlap. The window is 24 wall-clock hours
 * (23 or 25 real hours on a DST change day).
 */
export function nutritionDayBounds(key: string, dayStartMinutes: number): { start: Date; end: Date } {
  return {
    start: dayStartBoundary(key, dayStartMinutes),
    end: dayStartBoundary(addDays(key, 1), dayStartMinutes),
  }
}

/** Groups entries by the day label they were stored with, oldest first inside each day. */
export function groupLogsByDate(logs: LogEntry[]): Map<string, LogEntry[]> {
  const map = new Map<string, LogEntry[]>()
  for (const l of logs) {
    const list = map.get(l.date)
    if (list) list.push(l)
    else map.set(l.date, [l])
  }
  for (const list of map.values()) list.sort((a, b) => a.createdAt - b.createdAt)
  return map
}
