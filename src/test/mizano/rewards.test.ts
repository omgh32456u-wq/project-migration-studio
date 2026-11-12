import { describe, expect, it } from 'vitest'
import { IDEA_KINDS, IDEAS, nextRotation, pickIdea, SEGMENT_DEG, segmentFor, WHEEL_SEGMENTS } from '@/lib/rewards'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

describe('rewards wheel', () => {
  it('has unique ids and both languages for every idea', () => {
    expect(new Set(IDEAS.map((i) => i.id)).size).toBe(IDEAS.length)
    for (const i of IDEAS) {
      expect(i.en.trim()).not.toBe('')
      expect(i.ar.trim()).not.toBe('')
    }
  })

  it('is balanced across food ideas, recipes and activities', () => {
    const sizes = IDEA_KINDS.map((k) => IDEAS.filter((i) => i.kind === k).length)
    expect(new Set(sizes).size).toBe(1)
    for (const k of IDEA_KINDS) expect(WHEEL_SEGMENTS.filter((s) => s === k).length).toBe(WHEEL_SEGMENTS.length / IDEA_KINDS.length)

    const random = seeded(42)
    const counts = { food: 0, recipe: 0, activity: 0 }
    for (let n = 0; n < 3000; n++) counts[pickIdea(random).kind]++
    for (const k of IDEA_KINDS) expect(counts[k]).toBeGreaterThan(850)
  })

  it('avoids diet-culture, weight, paid or energy-drink wording', () => {
    const banned = /calorie|kcal|weight|diet|burn|earn|cheat|guilt|junk|bad food|clean eating|lose|energy drink|caffeine|pay|coin|سعر|رجيم|وزن|حرق|ريجيم|مشروب طاقة/i
    for (const i of IDEAS) {
      expect(i.en).not.toMatch(banned)
      expect(i.ar).not.toMatch(banned)
    }
  })

  it('never repeats the previous idea back-to-back', () => {
    const random = seeded(7)
    let prev = pickIdea(random)
    for (let n = 0; n < 500; n++) {
      const next = pickIdea(random, prev.id)
      expect(next.id).not.toBe(prev.id)
      prev = next
    }
  })

  it('lands the wheel on a segment of the chosen kind, always spinning forward', () => {
    let rotation = 0
    const random = seeded(3)
    for (let n = 0; n < 50; n++) {
      const kind = IDEA_KINDS[n % 3]
      const segment = segmentFor(kind, random)
      expect(WHEEL_SEGMENTS[segment]).toBe(kind)
      const next = nextRotation(rotation, segment)
      expect(next - rotation).toBeGreaterThanOrEqual(5 * 360)
      const centre = (((segment * SEGMENT_DEG + SEGMENT_DEG / 2 + next) % 360) + 360) % 360
      expect(centre).toBeCloseTo(0)
      rotation = next
    }
  })
})
