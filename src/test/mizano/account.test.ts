import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from '@/lib/backup'
import { firstNameFrom, mizoAccess, validateEmailCredentials, type AccountState } from '@/lib/account'
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
  it('requires 8+ characters only when creating an account', () => {
    expect(validateEmailCredentials('sign_up', 'a@b.co', 'short')).toBe('weak_password')
    expect(validateEmailCredentials('sign_in', 'a@b.co', 'short')).toBeNull()
    expect(validateEmailCredentials('sign_in', 'a@b.co', '')).toBe('missing_password')
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
