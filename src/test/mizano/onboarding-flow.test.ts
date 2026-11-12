import { describe, expect, it } from 'vitest'
import { TOTAL_STEPS } from '@/components/shell/onboarding'
import { ageTone } from '@/components/shell/onboarding-wheels-panel'

describe('onboarding flow', () => {
  it('has exactly 3 steps: Auth, Welcome, Profile', () => {
    expect(TOTAL_STEPS).toBe(3)
  })
  it('marks ages 15–17 as minor (amber)', () => {
    expect([15, 16, 17].map(ageTone)).toEqual(['minor', 'minor', 'minor'])
  })
  it('marks 18 differently from 15–17', () => {
    expect(ageTone(18)).toBe('threshold')
  })
  it('leaves adults over 18 neutral', () => {
    expect(ageTone(25)).toBeUndefined()
  })
})
