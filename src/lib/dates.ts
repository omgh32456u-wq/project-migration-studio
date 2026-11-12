/** Date keys are local calendar days (YYYY-MM-DD) to avoid UTC/time-zone drift. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function isDateKey(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parseDateKey(s)
  return toDateKey(d) === s
}

/** Parses at local noon so DST transitions never shift the day. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

export function addMonths(key: string, months: number): string {
  const d = parseDateKey(key)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return toDateKey(d)
}

/** weekStart: 0 = Sunday … 6 = Saturday. */
export function startOfWeek(key: string, weekStart: number): string {
  const d = parseDateKey(key)
  const diff = (d.getDay() - weekStart + 7) % 7
  return addDays(key, -diff)
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`
}

export function daysInMonth(key: string): number {
  const d = parseDateKey(key)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function dateRange(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i))
}

export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
