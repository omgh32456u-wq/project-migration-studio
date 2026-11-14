import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from '@/lib/backup'
import { canSubmitSignUp, firstNameFrom, mizoAccess, passwordChecks, passwordStrength, validateEmailCredentials, type AccountState } from '@/lib/account'
import { defaultSettings, normalizeAccountProfile, normalizeSettings } from '@/lib/defaults'
import type { AppData } from '@/lib/types'

const signedIn: AccountState = { status: 'signed_in', user: { id: 'u1', email: 'a@b.co', providerName: null } }

describe('Mizo access', () => {
  it('is open to any signed-in user and asks guests for an account', () => {
    expect(mizoAccess(signedIn)).toBe('open')
    expect(mizoAccess({ status: 'guest' })).toBe('needs_account')
  })
})

describe('email credential checks', () => {
  it('rejects a malformed email in both modes', () => {
    expect(validateEmailCredentials('sign_up', 'nope', 'longenough')).toBe('invalid_email')
    expect(validateEmailCredentials('sign_in', 'a@b', 'x')).toBe('invalid_email')
  })
  it('applies the five new-account rules only when creating an account', () => {
    expect(validateEmailCredentials('sign_up', 'a@b.co', 'short')).toBe('weak_password')
    expect(validateEmailCredentials('sign_up', 'a@b.co', 'longpassword', 'longpassword')).toBe('weak_password')
    expect(validateEmailCredentials('sign_up', 'a@b.co', 'Mizano#2026', 'Mizano#2025')).toBe('password_mismatch')
    expect(validateEmailCredentials('sign_up', 'a@b.co', 'Mizano#2026', 'Mizano#2026')).toBeNull()
    expect(validateEmailCredentials('sign_in', 'a@b.co', 'short')).toBeNull()
    expect(validateEmailCredentials('sign_in', 'a@b.co', '')).toBe('missing_password')
  })
})

describe('password rules', () => {
  it('checks each of the five rules separately', () => {
    expect(passwordChecks('')).toEqual({ length: false, upper: false, lower: false, number: false, special: false })
    expect(passwordChecks('abcdefgh')).toEqual({ length: true, upper: false, lower: true, number: false, special: false })
    expect(passwordChecks('ABC')).toMatchObject({ upper: true, lower: false })
    expect(passwordChecks('a1').number).toBe(true)
    expect(passwordChecks('a ').special).toBe(false)
    expect(passwordChecks('a_').special).toBe(true)
    expect(passwordChecks('Mizano#2026')).toEqual({ length: true, upper: true, lower: true, number: true, special: true })
  })
  it('counts 8 characters, not 8 bytes', () => {
    expect(passwordChecks('Aa1!😀😀😀').length).toBe(false)
    expect(passwordChecks('Aa1!😀😀😀😀').length).toBe(true)
  })
  it('rates strength from the rules met', () => {
    expect(passwordStrength('')).toBe('none')
    expect(passwordStrength('abc')).toBe('weak')
    expect(passwordStrength('abcdefgH')).toBe('medium')
    expect(passwordStrength('Abcdefg1')).toBe('medium')
    expect(passwordStrength('Mizano#2026')).toBe('strong')
  })
  it('allows sign-up submit only when everything passes and nothing is running', () => {
    expect(canSubmitSignUp('a@b.co', 'Mizano#2026', 'Mizano#2026')).toBe(true)
    expect(canSubmitSignUp('a@b.co', 'Mizano#2026', 'Mizano#2026', true)).toBe(false)
    expect(canSubmitSignUp('a@b', 'Mizano#2026', 'Mizano#2026')).toBe(false)
    expect(canSubmitSignUp('a@b.co', 'Mizano#2026', '')).toBe(false)
    expect(canSubmitSignUp('a@b.co', 'Mizano2026', 'Mizano2026')).toBe(false)
  })
})

describe('display name and photo', () => {
  it('prefills the first name from a Google full name', () => {
    expect(firstNameFrom('  Omar Mohamed ')).toBe('Omar')
    expect(firstNameFrom(null)).toBe('')
  })
  it('gives settings saved before accounts existed an empty profile', () => {
    const { account: _drop, ...old } = defaultSettings()
    expect(normalizeSettings(old).account).toEqual({ userId: null, displayName: '', avatar: null })
  })
  it('drops non-image or oversized photos instead of failing', () => {
    expect(normalizeAccountProfile({ userId: 'u1', displayName: 'Omar', avatar: 'javascript:alert(1)' }).avatar).toBeNull()
    expect(normalizeAccountProfile({ avatar: 'data:image/jpeg;base64,' + 'a'.repeat(500_000) }).avatar).toBeNull()
  })
  it('survives a backup export and import', () => {
    const settings = { ...defaultSettings(), account: { userId: 'u1', displayName: 'Omar', avatar: 'data:image/jpeg;base64,AAAA' } }
    const data: AppData = { foods: [], logs: [], recipes: [], savedMeals: [], weights: [], settings }
    const r = parseBackup(JSON.stringify(createBackup(data)))
    expect(r.ok && r.data.settings.account).toEqual(settings.account)
  })
})
