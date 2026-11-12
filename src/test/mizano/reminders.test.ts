import { describe, expect, it } from 'vitest'
import { defaultReminderConfig, dueReminders, markFired, parseReminderConfig, type ReminderConfig } from '@/lib/reminders'

const at = (h: number, m: number) => new Date(2026, 9, 19, h, m)
const on = (): ReminderConfig => ({ ...defaultReminderConfig(), enabled: true })

describe('reminders', () => {
  it('is opt-in: nothing fires by default', () => {
    expect(defaultReminderConfig().enabled).toBe(false)
    expect(dueReminders(defaultReminderConfig(), at(9, 5))).toEqual([])
  })

  it('fires inside the window and not before or long after', () => {
    expect(dueReminders(on(), at(8, 59))).toEqual([])
    expect(dueReminders(on(), at(9, 0))).toEqual(['breakfast'])
    expect(dueReminders(on(), at(9, 59))).toEqual(['breakfast'])
    expect(dueReminders(on(), at(10, 0))).toEqual([])
  })

  it('fires at most once per day per meal', () => {
    const fired = markFired(on(), ['breakfast'], at(9, 1))
    expect(dueReminders(fired, at(9, 30))).toEqual([])
    expect(dueReminders(fired, new Date(2026, 9, 20, 9, 10))).toEqual(['breakfast'])
  })

  it('respects disabled meals', () => {
    expect(dueReminders(on(), at(17, 10))).toEqual([])
  })

  it('sanitises stored data', () => {
    const parsed = parseReminderConfig({ enabled: 'yes', meals: [{ slot: 'lunch', enabled: false, time: '99:99' }, 'junk'], lastFired: { lunch: 'bad', dinner: '2026-10-19' } })
    expect(parsed.enabled).toBe(false)
    const lunch = parsed.meals.find((m) => m.slot === 'lunch')
    expect(lunch).toEqual({ slot: 'lunch', enabled: false, time: '14:00' })
    expect(parsed.lastFired).toEqual({ dinner: '2026-10-19' })
    expect(parseReminderConfig('garbage')).toEqual(defaultReminderConfig())
  })
})
