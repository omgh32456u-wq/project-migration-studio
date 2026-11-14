# Google sign-in: finalize first-time vs existing user flow (analysis)

Checkout inspected: HEAD `8eafa89`, branch reported as an `edit/...` branch, not `development/mizano-roadmap`. Confirm the branch before any build.

## Findings (from current source)
- `signInWithGoogle(_mode)` ignores the button pressed; both call `signInWithOAuth({ provider: 'google', redirectTo: origin })`.
- On return, `SIGNED_IN` fires and `subscribe()` sends `fresh: isFreshAccount(user)` (last_sign_in_at - created_at < 10 min). `adoptUser` uses it only to decide the optional name prompt. Nothing stops a new Google user from going straight into the app.
- `isFreshAccount` gives wrong answers: an existing user who returns within 10 minutes counts as new, and a slow first sign-in counts as old. It also runs again whenever `SIGNED_IN` repeats on tab refocus.
- Metadata already used: `display_name`, `name_prompt_done` (set by `updateProfile`). Google adds `full_name` / `name`.
- Onboarding (Auth, Welcome, Profile) is driven by local IndexedDB settings, not by the account. Guest data is never touched by sign-in. This must stay that way.

## How Supabase Google OAuth behaves
- Supabase has no "sign in only" option for OAuth (no `shouldCreateUser` like OTP has). The first Google use always creates the auth user before the app runs any code. So the app cannot block creation from the client.
- If a confirmed account with the same email exists (email/password), Supabase links Google to that same user (same id). No duplicate is created.
- If the same email exists but is unconfirmed, Supabase links it and drops the unconfirmed password (documented security behaviour). Unverified for this project.
- Blocking at the server would need a "Before User Created" auth hook. That is a settings change, and it still could not tell which button was pressed. Not recommended.

## Reliable "new user" signal (no time window, no schema change)
Use a registration-complete marker in auth `user_metadata` that only the app writes, e.g. `mizano_registered: true`. Write it when required registration finishes (name step confirmed or skipped). That moment is already where `updateProfile` sets `name_prompt_done`, so reuse that call.
- Marker missing = registration not finished, whether the account is a minute or a month old.
- Legacy accounts (made before the change): treat `name_prompt_done === true` or a non-empty `display_name` as registered. Write the marker silently on next sign-in.
- Email sign-up goes through the same check, so all providers behave the same way.
- Caveat: users can edit their own `user_metadata`. That is fine for UX gating, but it is not a security boundary. Nothing secure depends on it.

## Recommended behaviour
- Before redirecting, save the intent (`sign_in` | `sign_up`) in sessionStorage. Read it and clear it once after the callback. The intent changes only the wording, never access.
- Existing Google user (marker present), any button: goes straight to the app with no prompt.
- Google **Sign up**, new user: account created, then a required "Complete registration" step (name prefilled from Google, editable) that cannot be dismissed. After it, the marker is written and the local onboarding continues (Welcome, Profile) if not done yet.
- Google **Sign in**, new user: allow the account to be created (it can't be prevented), but never let it into the app silently. Show "No Mizano account was found for this Google account" with two choices:
  - "Create account": the same required registration step.
  - "Cancel": local sign-out. The empty auth user stays and is completed on a later attempt. Deleting it needs a server or admin key, which is out of scope.
- Until the marker exists, the account state is a new `pending_registration` status, not `signed_in`. Account-only features (Mizo gate, account rows) treat it as signed out. Guest/local data stays fully usable.
- Remove `isFreshAccount` and `fresh`.

## Edge cases and handling
- OAuth cancelled or denied: the URL holds `error=access_denied`. `takeAuthRedirectError` shows a notice, intent is cleared, the session is unchanged.
- Same email, Google linked to an existing user: marker present, goes straight to the app.
- Refresh or return mid-registration: `restore()` sees the session without the marker, so the required step reopens. It doesn't rely on sessionStorage. Without stored intent it uses the neutral "Complete your registration" wording.
- `SIGNED_IN` repeated on refocus: the decision depends only on metadata, so it is the same every time with no flicker. The existing same-user guard stays.
- Missing Google name: empty name field. The user must enter one or choose "Skip". Either way the marker is written, keeping today's "name optional" rule. (Open question: should a name be mandatory?)
- Offline when finishing registration: `updateUser` fails, so show an error and keep the step open. Never mark it done locally only.
- Account switch or sign-out: the existing per-user local cache rules are unchanged. No IndexedDB migration.
- Existing restored sessions of registered users: unchanged.

## Files to change
- `src/lib/account.ts`: add `registered` to `AccountUser`, a `pending_registration` state, `completeRegistration` on `AuthClient`, and remove `fresh` from the event.
- `src/lib/supabase-auth.ts`: `toAccountUser` derives `registered` (with legacy fallback), store/read intent around OAuth, `completeRegistration` writes the marker plus name, delete `isFreshAccount`.
- `src/components/account/account-provider.tsx`: route unregistered users to a required step instead of the optional prompt, and add the Sign-in "no account found" branch.
- `src/components/account/name-prompt.tsx`: required "complete registration" variant (no outside-click close) and Cancel = sign out.
- `src/components/account/auth-panel.tsx`: pass the intent (small change).
- `src/lib/i18n/en-extra.ts`, `ar-extra.ts`: new strings.
- Tests: `src/test/mizano/supabase-auth.test.ts`, `account-ui.test.tsx`.
- `docs/MIZANO_MASTER_PLAN.md` / `AGENTS.md`: record the marker rule.

## Precise tests
1. `toAccountUser`: the marker, or legacy `name_prompt_done`/`display_name`, gives registered=true. A bare Google user gives false, at any created/last-sign-in gap.
2. `signInWithGoogle('sign_in'|'sign_up')` stores the intent before `signInWithOAuth`. A failed redirect clears it.
3. `completeRegistration` calls `updateUser` with the marker plus name. Error leads to `{ ok:false }`.
4. Provider: a registered user sees no dialog. An unregistered user with intent sign_up sees the required step. With intent sign_in they see "no account found". Without intent they see neutral wording.
5. Cancel calls `signOut` and status returns to guest. Guest IndexedDB records are unchanged (assert store contents).
6. Repeated `signed_in` for the same unregistered user doesn't stack dialogs. A registered repeat does nothing.
7. Restore with an unregistered session reopens the step after a reload.
8. Redirect error `access_denied` shows a notice and no state change.
9. The offline `updateUser` failure keeps the step open.

## Not verifiable here
- A real Google round trip, identity linking and the unconfirmed-email behaviour on project `ejgimkfnydgefoweasmr`. These need a manual test with real Google accounts once redirect URLs are set up.

## Estimate
- One focused build covers it (about 1–2 Build actions including a fix-up run). No DB schema, RLS or Supabase settings changes.
