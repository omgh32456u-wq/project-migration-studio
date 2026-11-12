import { describe, expect, it } from 'vitest'
import { accountEligibility } from '@/lib/account-eligibility'

describe('accountEligibility', () => {
  it('allows confirmed adults', () => {
    expect(accountEligibility({ ageGroup: 'adult', age: 30 })).toEqual({ ok: true })
  })

  it('blocks the under-18 group and any age below 18', () => {
    expect(accountEligibility({ ageGroup: 'under18', age: null })).toEqual({ ok: false, reason: 'minor' })
    expect(accountEligibility({ ageGroup: 'adult', age: 16 })).toEqual({ ok: false, reason: 'minor' })
    expect(accountEligibility({ ageGroup: 'unspecified', age: 15 })).toEqual({ ok: false, reason: 'minor' })
  })

  it('requires a confirmed adult age', () => {
    expect(accountEligibility({ ageGroup: 'unspecified', age: null })).toEqual({ ok: false, reason: 'age_unconfirmed' })
    expect(accountEligibility({ ageGroup: 'adult', age: null })).toEqual({ ok: false, reason: 'age_unconfirmed' })
  })
})
