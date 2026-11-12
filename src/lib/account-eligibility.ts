import type { Profile } from './types'

export type AccountEligibility =
  | { ok: true }
  | { ok: false; reason: 'minor' | 'age_unconfirmed' }

/**
 * Cloud accounts are adult-only until a parental-consent and privacy review for minors is done.
 * Guest (local-only) use stays available to everyone regardless of this result.
 */
export function accountEligibility(profile: Pick<Profile, 'ageGroup' | 'age'>): AccountEligibility {
  if (profile.ageGroup === 'under18') return { ok: false, reason: 'minor' }
  if (profile.age !== null && profile.age < 18) return { ok: false, reason: 'minor' }
  if (profile.ageGroup !== 'adult' || profile.age === null) return { ok: false, reason: 'age_unconfirmed' }
  return { ok: true }
}
