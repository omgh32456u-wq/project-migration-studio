/**
 * Strings added after the base dictionaries were frozen, merged into the
 * active dictionaries by ./index.ts. Keys here extend the MessageKey union.
 */
export const enExtra = {
  'auth.signin.google': 'Continue with Google',
  'auth.signin.email': 'Continue with email',
  'auth.explain':
    'Signing in is optional. It lets you receive product updates and use supported sync features once they become available. Mizano keeps working fully offline without an account.',
  'auth.unavailable':
    'Online sign-in is not available in this build yet. You can continue without an account — everything stays on this device.',
  'auth.guest': 'Continue without an account',
  'onboarding.profile.hint2': 'Turn the wheels to set your details. You can skip this and change it later in Settings.',
  'onboarding.age.under18': 'Under 18 — personal energy targets stay off for now.',
  'intro.mute': 'Mute opening sound',
  'intro.unmute': 'Play opening sound',
} as const

export type ExtraKey = keyof typeof enExtra
