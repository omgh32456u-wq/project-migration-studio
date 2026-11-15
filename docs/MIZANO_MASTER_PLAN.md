# Mizano — Master Product & Execution Plan

> **Document status:** Living source of truth  
> **Last consolidated:** 2026-11-13  
> **Project:** Mizano nutrition and meal-tracking app  
> **Working Lovable project:** Migration Studio — `9633ace4-f9a1-4c55-8aad-71ee8b9bd9a2`  
> **Working source branch:** `development/mizano-roadmap`  
> **Rule:** This document records agreed scope and decisions. Do not silently reinterpret, omit, replace, or mark an item complete without evidence and user confirmation where needed.

---

## 1. Mission and product principles

Mizano is a polished nutrition and meal-tracking product centered on food, nutrition numbers, and practical health awareness. It tracks meals, calories, protein and other macros, daily goals, and progress.

The goal is not to accumulate screens or features. The goal is to deliver the agreed product coherently, with reliable behavior and a consistent identity.

Non-negotiable principles:
- Preserve and improve the existing application; do not rebuild from scratch without explicit approval.
- Local-first behavior is the current baseline. Do not add a backend, authentication, paid AI API, or recurring infrastructure cost without explicit approval.
- Do not break existing storage compatibility, migrations, user data, routes, or working features.
- One coherent Mizano identity across the entire product. No unrelated colors, visual languages, or decorative effects.
- Do not claim a feature works unless it has been implemented and verified.
- Do not silently drop a small requirement because it seems minor.
- Prefer small, controlled, reversible changes over broad rewrites.
- Avoid wasting Lovable credits: inspect first, batch related work carefully, and execute only a clear approved scope.
- Never modify GitHub `main` as part of this work unless the user explicitly authorizes it.

## 2. Project baseline and technical constraints

Known baseline from the project audit (re-verify before architectural changes):
- Next.js 16, static export, `trailingSlash`, React 19, Tailwind CSS 4.
- Capacitor 8 Android shell; PWA support.
- Routes: `/`, `/foods`, `/progress`, `/settings`.
- English and Arabic with RTL/LTR support.
- IndexedDB/local persistence; no backend or authentication in the current app.
- Existing storage compatibility must be preserved: `track-meals-macros` and `tmm:*`.
- Onboarding is controlled by `AppShell` while `settings.profile.onboarded` is false; it is not a standalone route.
- Existing CI has included build, typecheck, and tests on experiment branches. Re-check current workflow and latest commit before relying on historical results.

Known project links:
- Lovable editor: https://lovable.dev/projects/9633ace4-f9a1-4c55-8aad-71ee8b9bd9a2
- Lovable preview: https://id-preview--9633ace4-f9a1-4c55-8aad-71ee8b9bd9a2.lovable.app
- GitHub working branch: https://github.com/omgh32456u-wq/project-migration-studio/tree/development/mizano-roadmap

## 3. Scope and status vocabulary

Every requirement must have one explicit status:
- **Agreed / not started** — approved scope, implementation not confirmed.
- **In progress** — currently being implemented.
- **Implemented / unverified** — code exists, behavior has not been adequately checked.
- **Verified** — checked in the actual preview/device or through appropriate automated tests.
- **Deferred** — intentionally scheduled for a later phase; do not forget it.
- **Blocked** — cannot proceed until a named dependency is resolved.
- **Rejected / replaced** — only when the user explicitly changes the decision; preserve the history briefly.

Do not convert an item to Verified based only on an agent saying “done”. Record the evidence: commit, files, test result, viewport/device, language, and theme where relevant.

At the start of each implementation task:
1. Read this document and the current project knowledge.
2. Inspect the current branch/commit and relevant files.
3. Compare current implementation with the requirement; identify what is already done.
4. State exact scope and out-of-scope items.
5. Make the smallest coherent change.
6. Run appropriate checks and inspect the preview.
7. Update this document and status only after evidence is available.

## 4. Product identity and design system

**Agreed direction:** the new Mizano logo is the starting point for the visual identity. The app must express meals, nutrition, numbers, and health — not generic eco/farming imagery.

Requirements:
- Build one intentional palette derived from and compatible with the actual logo colors. Do not invent a final palette until the logo asset has been inspected.
- Define semantic roles: Primary, Secondary, Accent, Neutral/surfaces, text, borders, and semantic success/warning/error/info colors.
- Light and Dark are separately tuned, complete themes — not a simple inversion. Maintain legible contrast and clear hierarchy.
- Avoid the current muddy/indistinct green-on-green feeling. Green is not mandatory everywhere and should not be treated as the default answer for every action or selection.
- Colors used for gender, activity level, nutrition metrics, buttons, and charts must be distinct where function requires it, while belonging to the same visual system.
- Give the product depth and polish without visual clutter, childish illustration, excessive 3D, or random gradients.
- Do not introduce Liquid Glass as the dominant system until the palette, typography, surfaces, and components are stable. It is a later polish phase.
- Document tokens and component rules so every screen uses the same system.

### Logo and brand assets
- Use the square official logo/app icon only where a square app icon is appropriate.
- Create/use a standalone M mark without the square background for in-app brand placements. Ensure correct contrast: darker treatment in Light Mode and lighter treatment in Dark Mode.
- Remove the old plant/leaf identity and plant artwork/references throughout the app. Do not leave obsolete loading/onboarding assets behind.
- The logo should not be repeated as a large square badge everywhere.
- The exact supplied logo artwork is the source of truth; do not redraw or recolor it arbitrarily.

## 5. Onboarding and profile

The onboarding selection-state bug was a priority: all four steps previously appeared frozen because selections did not visibly highlight, including gender, language, app mode, activity, and pickers. Verify the current state before changing code.

Requirements:
- All selected controls must show a clear, immediate visual selected state, including Male/Female, language, Light/Dark, activity, and numeric wheels.
- Keep onboarding responsive and comfortable on mobile, tablet, and desktop. Avoid unnecessary scrolling on onboarding screens; do not stretch a mobile layout awkwardly on tablet or desktop.
- Respect safe areas and keyboard behavior.
- Keep the EN/AR selector compact and the theme toggle accessible near the top of onboarding steps.
- Theme transition may use a restrained ripple effect; language changes must not cause rotation, jarring motion, or disruptive layout shifts.
- Profile data should be distributed and explained clearly rather than crammed into one screen.
- Rework age/height/weight wheels to be readable and space-efficient; a vertical arrangement may be preferable if it improves clarity and available space. Do not sacrifice usability for novelty.
- Gender choices should have distinct, tasteful states that are not simply the app's dominant green.
- Activity-level choices may use progressively rising bar indicators, with clear labels and differentiated but coordinated colors.
- Separate Day Start visually from activity choices; reduce crowding.
- Ages 15–17 are fully allowed (registration, Mizo, every feature). Age is never a defect or a block; the amber 15–17 cue is informational only. Ages 15–17 get the IOM (2005) adolescent EER estimate, not the adult Mifflin–St Jeor equation; adult reference ranges apply from 18. For 15–17 the energy target can never be set below the estimated needs (no deficit/weight-loss target). Settings lets 15–17 edit age, sex, activity, height and weight. — Implemented 2026-11-14 (see change log).
- Do not add redundant loading steps for a new local user.
- Remove duplicate privacy reassurance copy where it appears redundantly.
- Google/email buttons may show proper recognizable iconography, but do not imply authentication works while it is not connected.

### Day Start and daily boundary
- Add/retain a user-configurable day-start time.
- Explain clearly that entries before the chosen day start count toward the previous tracking day. — Settings already explained it; onboarding did not (defect found 2026-11-13). Fixed: a short note under the onboarding Day Start row, also the input's accessible description; regression test in `loading-mark.test.tsx`.
- Allow the user to edit this setting later in Settings.
- Ensure food and macro entries do not disappear or reset incorrectly at midnight. The tracking-day key must respect the configured day boundary, including late-night/gym use.
- Test before/after the day-start boundary, midnight, timezone changes where practical, and historical days.

## 6. Loading and motion

### M mark loading animation
Agreed concept:
- Use only the partial M mark, not the complete square logo tile. (2026-11-13: the user asked for the localized “Loading your data…” message to be visible directly below the mark; this replaces the earlier screen-reader-only label.)
- Outline/contour treatment with the interior unfilled.
- One light/white half and one lemon/lime half remain magnetically connected near the top.
- The halves rotate/swap sides in a continuous loop, conceptually completing a 360-degree turn without visibly disconnecting.
- Keep motion smooth, calm, and consistent wherever the app displays a loading state, including future Mizo assistant loading.
- Respect reduced-motion preferences and avoid unnecessary CPU/battery load.
- Remove the old plant animation and all plant loading references.

**Acceptance criteria (agreed 2026-11-13, replaces the earlier whole-plane turn):**
- The two halves are separate visual elements that move independently and trade left/right places in a continuous loop, staying joined at their shared upper joint throughout. Never one rigid plane, never detached, no generic spinner or fade.
- Outline/contour only, interior empty; official M geometry, never redrawn.
- Reads clearly as the M at the rest positions; no half stays edge-on for more than a passing instant; calm, smooth, no jumps.
- Reduced motion shows the static outlined M.
- A visible, localized message directly below the mark (EN "Loading your data…", AR "تحميل بياناتك…"), one polite status region, no duplicate announcement; mark and message centred together with no overflow or scroll on phone/tablet/desktop.
- Used for the real app data-loading state only, and reusable for future Mizo loading.

**Status (2026-11-13, brand/logo correction): Implemented / verified in browser preview only.** `BrandMark variant="outline"` now renders the two arches as two separate elements (lime behind, white in front), each with the official 1024px-artwork geometry. Every rotation pivots on the shared joint (x 512.25 on the middle leg, y 327 where the two outer contours meet), so the halves stay joined. Per swap (2.4 s), the left half swings forward over the joint while the right half follows 0.4 s later, swinging back. While they pass, each leans up to 18° toward where it is heading, so they stay two distinct shapes. Then the swapped M rests for 0.7 s. Two swaps make one 4.8 s loop, with a full 360° per half. Each arch band is painted with `--mark-fill` (the surface colour, by default the page background), so the half behind is hidden as in the logo while the interior still reads as empty; on any other surface, override `--mark-fill`. Transform-only animation (compositor). `LoadingMark` shows the localized message visibly under the mark. During loading, the language comes from the saved preference that is already applied to the page, so Arabic users no longer see English. The earlier whole-plane `m-turn` animation was removed. Known limits: at the exact moment a half is edge-on it is a thin line (sometimes slightly broken) for a split second, and while the halves pass, they briefly overlap. Both follow from turning around a shared joint.

### Screen transitions
- Card-to-card navigation should feel like the incoming card smoothly pushes the previous card sideways.
- Motion should be consistent and restrained, not disorienting.
- Verify on mobile and tablet, with RTL direction handled correctly.

## 7. Core app screens and interaction details

### Today
- Review the calorie/macros card in both themes. Ensure numbers and labels retain intentional contrast; avoid the Light Mode issue where numbers become unexpectedly dark or visually inconsistent.
- Date navigation order is Yesterday → Today → Tomorrow. When viewing a past date, Today belongs to the right of the previous-day direction; when viewing a future date, Today belongs to the left so the ordering remains logical.
- Verify date labels and navigation in Arabic RTL and English LTR.
- Daily totals must follow the configured Day Start boundary.

### Foods and add-food flows
- The Add Food / New Food modal opened from some screens previously appeared far off to the left in browser/preview/tablet, showing only a small portion. Fix responsive positioning and centering, with correct viewport bounds and scroll behavior.
- The Foods section's own add-food view was reported to appear correctly; do not break it while fixing other entry points.
- Keep food entry usable on mobile, tablet, and desktop.

### Idea Wheel
- Fix the Idea Wheel modal/panel positioning issue similar to Add Food: keep it visible, centered, responsive, and within viewport bounds.
- Preserve its interaction and existing behavior.

### Support
- Headphone/support icon belongs inside Settings only; it should not obstruct other screens.
- Support email: mizano.support@gmail.com.

## 8. Navigation and Mizo assistant

### Navigation
- Add a dedicated Mizo assistant destination in the center of the bottom navigation, resulting in five destinations (the four existing sections plus Mizo), subject to preserving responsive navigation and accessibility.
- Do not break existing Today, Foods, Progress, or Settings routes.

### Mizo assistant — staged honest experience
Current reality: there is no live AI service/backend for Mizo. Do not represent it as a working AI assistant until a real provider/service is implemented and tested.

Agreed initial UI:
- Modern, calm AI-chat layout with a welcoming empty state explaining what Mizo will help with.
- A simple, subtly animated AI/robot head mark; not a childish cartoon.
- Composer with text input, plus/attachment affordance, send action, and microphone affordance. Do not make nonfunctional controls appear active without clear disabled/coming-soon behavior.
- When a user sends a message in this placeholder phase, show a progressive, honest response such as: “Sorry, Mizo is currently under maintenance.” Localized appropriately.
- Clearly communicate that full assistant capability is coming later; no fake generated answers.
- Reuse the shared M loading mark for future response loading.

Status 2026-11-14: Mizo destination added (route `/mizo`, centre of the 5-item bottom bar, same order in the desktop sidebar). Guests see a sign-up / sign-in prompt; signed-in users of any age see an honest "coming later" empty state. The chat composer and maintenance reply above are not built yet (still Agreed/not started). Implemented / verified in browser preview for guests only — no signed-in session is possible yet (see section 12).

> Superseded 2026-11-14: the "under maintenance" placeholder reply phase above is replaced by the milestone roadmap below. Mizo never fakes replies.

### Mizo milestone roadmap (agreed 2026-11-14)
- **M1 — UI + page gate + local per-account history. Implemented / tests pass; signed-in preview unverified.** Guests only ever see the Sign up / Sign in invitation; the chat workspace and history never mount for them (component-level gate in `MizoScreen`; the route has no server data to protect). Signed-in users of every supported age (15–17 included) get a welcome state, four suggested prompts (fill the composer), message bubbles, composer with + (explains photos come in M3; nothing uploaded) and Send, which stays disabled with an honest "Mizo isn't connected yet" note. Offline, error and daily-limit notice components exist (limit notice unused until M2). History is stored only on this device in a separate IndexedDB database `mizano-mizo` (store `conversations`, key = Supabase user id); `track-meals-macros`, its version and `tmm:*` keys are untouched. The workspace is keyed by account id, so switching accounts never shows another account's chat. "Delete chat" asks for confirmation and removes only that account's chat. No chat sync to Supabase. Files: `src/lib/mizo/chat-store.ts`, `src/components/mizo/mizo-screen.tsx`, `src/components/mizo/mizo-workspace.tsx`, `src/lib/i18n/en-extra.ts`, `src/lib/i18n/ar-extra.ts`, `src/test/mizano/mizo.test.tsx`. Tests: 163 passed (4 new Mizo tests); typecheck and production build passed. Preview: a fresh browser lands on onboarding, and no signed-in session can be created for the external Supabase project from the sandbox, so the Mizo screens were not checked visually (Unverified on phone/tablet/desktop, RTL and both themes).
- **M2 — Implemented / mocked tests pass; NOT live (provider key not added, signed-in preview unverified).** Real text chat through a server-side endpoint, AshnaAI first.
  - Architecture: TanStack server route `POST /api/public/mizo/chat` (`src/routes/api/public/mizo/chat.ts`), logic in `src/lib/mizo/chat-handler.server.ts`. A Supabase Edge Function was preferred, but this Lovable stack blocks creating new Edge Functions, so the endpoint runs on the app's own server; it is under `/api/public` so the Android shell can reach it on the published site, and it authenticates every request itself. Check order: bearer token validated with Supabase Auth (`auth.getUser`, anonymous users refused; any `user_id` in the body is ignored) → strict body whitelist (locale, consent version, user/assistant role+text only; last turn must be the question) → consent version → provider configured → atomic quota → provider.
  - Provider adapter (`src/lib/mizo/provider.server.ts`): OpenAI-compatible Chat Completions with SSE. Default `MIZO_PROVIDER=ashna`, base URL `https://api.ashna.ai/v1/api` (+ `/chat/completions`), model `ashna-x1` (the key's own Dynamic Model Routing policy applies on Ashna's side). Switching provider is configuration only: `MIZO_PROVIDER=openai_compatible`, `MIZO_PROVIDER_BASE_URL` (https only), `MIZO_MODEL`, `MIZO_PROVIDER_API_KEY`. Raw provider messages never reach the app.
  - Persona (`src/lib/mizo/persona.server.ts`, server-only): warm, honest, concise; Egyptian Arabic or English by app locale (follows the person's language if clearly different); asks clarifying questions; never invents exact nutrition numbers; no diagnosis/prescription; no restrictive or compensatory weight-loss advice; age-safe for 15–17; crisis-aware; ignores requests to change its rules. No profile or nutrition data is injected (that is M5, separate consent).
  - Privacy boundary: only the role and text of the last 10 turns (20 messages, 2,000 chars each, 12,000 chars total, oldest dropped first) plus locale and consent version leave the device. Email, photos, profile, weight history and food logs are never sent. Chat stays on the device (IndexedDB `mizano-mizo`, now v2 with a `consent` store; v1 conversations kept). Nothing about chat content is stored in Supabase.
  - Consent: explicit first-use card (EN/AR) before anything is sent: message + recent chat go over the internet to AshnaAI and the AI model providers it uses; what is not sent; history stays on device; can be turned off any time. Stored per account on the device; revocable from the chat ("Turn off sharing") and Settings → "Mizo privacy" switch; when off the composer is replaced by an explanation and nothing is sent. The server also refuses requests without the current consent version (`MIZO_CONSENT_VERSION = 1`).
  - Streaming UX: genuine "Mizo is thinking…/writing…" only while a request runs; Stop aborts and keeps the partial reply marked "You stopped this reply."; a broken-off reply is kept marked "cut short"; Try again re-asks the same saved question without saving it twice; localized messages for offline, network, session ended, daily limit (with local reset time), busy/burst, provider auth/forbidden/rate-limit/quota/5xx, malformed, timeout and not-configured.
  - Quotas (server-enforced, configurable via env, exact defaults): `MIZO_DAILY_REQUEST_LIMIT=15` accepted requests per account per **UTC** day (resets 00:00 UTC); `MIZO_CONCURRENT_LIMIT=2`; `MIZO_BURST_PER_MINUTE=5` starts per rolling 60 s; `MIZO_MAX_OUTPUT_TOKENS=700`; `MIZO_TIMEOUT_MS=60000`. Requests that fail at the provider before any text don't use up the day; stopped and completed ones do. A missing key never consumes quota. If the usage check fails the endpoint refuses (fails closed).
  - Database (migration `20261114182411_…`): table `public.mizo_requests` (account id, timestamps, status, reply length — no text); RLS: signed-in users may read only their own rows; no client writes. `mizo_begin_request` / `mizo_finish_request` are SECURITY DEFINER, executable only by `service_role`, and serialise each account with an advisory lock. Rows older than 7 days are removed per account.
  - Required setup (not done): add secret `ASHNA_API_KEY` through Lovable Project Settings → Secrets (secure form; never in chat or source). Until then the endpoint answers `provider_not_configured` and the app says Mizo isn't switched on yet. Free-account API quota on Ashna is unknown and not assumed. Android: a bundled APK must set `VITE_MIZO_API_ORIGIN` to the published https origin; no secret is in the app; the endpoint allows `capacitor://localhost`, `https://localhost`, `http://localhost` cross-origin.
  - Evidence 2026-11-14: 197/197 tests (new `src/test/mizano/mizo-server.test.ts` 26 tests; `mizo.test.tsx` now 13) covering missing/invalid JWT, body user-id ignored, consent missing/old, not-configured, quota outcomes mapped, fail-closed, defaults, provider 401/403/429/402/5xx + quota code, malformed stream, timeout, streaming events, mid-stream error, 10-turn window + char budget, persona rules, request whitelist, consent gate/revoke/per-account, streaming save, retry without duplicates, Stop partial save, daily-limit notice. Typecheck clean; production build OK; client bundle contains no persona, key name or RPC name. SQL verified on a throwaway local Postgres 16: 40 parallel starts → exactly 15 accepted; 30 parallel with limit 2 → exactly 2; 6th start in a minute refused; failed requests not counted; another account can't close a request; `authenticated` and `anon` can't run the functions or write the table and see only their own rows. Live dev endpoint: no token / forged token → 401 `unauthenticated`.
  - Unverified: any live AshnaAI answer (no key), the endpoint with a real signed-in session (sandbox can't sign in to this external project), the signed-in Mizo screens and Settings card visually (phone/tablet/desktop, RTL/LTR, both themes), Stop on a real network, IndexedDB v1→v2 upgrade in a real browser, real devices/APK, screen readers.
  - Later scope (not built): billing, Premium purchase, complimentary Premium grants/admin UI, model-effort tiers, usage dashboard.
- **M3 — Agreed/not started.** Vision: attach food photos, clearly approximate nutrition estimates, clarifying questions when ingredients or portion can't be inferred.
- **M4 — Agreed/not started.** Nutrition actions: parse meal descriptions, ask about variants/portion/ingredients, prepare a reviewable food card and log only after explicit confirmation; custom food estimates marked with provenance and uncertainty.
- **M5 — Agreed/not started.** Read-only history questions and summaries from actual logged records, respecting Day Start.
- **M6 — Agreed/not started.** Controlled app actions (for example creating tasks) only after confirmation, and only if a task feature exists.
- **Future scope, not implemented:** premium tiers / model effort, admin-granted complimentary premium, payments. (Per-account limits and the APK endpoint path landed in M2.)

## 9. Notifications and reminders

Deferred feature; design carefully and keep it optional, gentle, and user-controlled.

Potential requirements:
- A reminder may be offered after a configurable interval (example discussed: around four hours after the user's day starts) if no meal has been logged. It must be adjustable and should not assume a rigid eating schedule.
- Standard mode: a light, limited reminder cadence.
- Gym/Bulking-oriented mode: potentially more frequent supportive prompts, but never pressure, shame, or punitive streak mechanics.
- Optional streak/history indicator may celebrate consistency without punishing missed days or making calorie targets a moral score. Be especially careful for younger users.
- A library of varied messages was proposed (100+), including gentle logging prompts, food variety, hydration, and general nutrition education. All factual claims must be reviewed against reliable sources; avoid medical claims and misinformation.
- No alarmist sugar warnings, supplement claims, or unqualified claims about creatine/protein/water.
- Ask notification permission only after a clear, optional user action and explain the benefit first. Never surprise-prompt on first launch.
- Provide complete notification controls in Settings, including enable/disable, cadence, quiet hours, and relevant categories.
- Test permission denied/granted, disabled state, timezone/day-start behavior, and duplicate notifications.

## 10. Food database and nutrition accuracy

Deferred content-quality phase; do not let it distract from current UI/identity blockers.

Requirements:
- Expand basic seed foods: cheeses, fruits, vegetables, drinks, snacks, shawarma, and common everyday foods.
- Correct Arabic and English names and translations.
- Audit calories, protein, carbohydrates, fat, serving sizes, and units against reliable nutrition references.
- Investigate implausible or inflated values; do not guess nutrition values.
- Distinguish generic foods from branded/restaurant foods and clarify whether values are per 100 g, per serving, or per item.
- Preserve user-created foods and existing saved entries.

## 11. Camera-assisted food logging

Future feature; not current functionality.

Requirements:
- Allow a user to photograph a meal, packaged food, chips/snacks, or a dish.
- Use recognition/search to suggest possible foods, not to assert certainty.
- Clearly state that a photo cannot reliably reveal every ingredient, preparation method, or exact portion size.
- Let the user review, correct, remove, and adjust foods and portions before saving.
- Show estimates as estimates and avoid silently logging uncertain results.
- Evaluate privacy, on-device processing, external service costs, and connectivity before selecting an implementation.

## 12. Authentication, accounts, and data

Future capability; not active in the current local-first app.

Potential providers discussed:
- Google
- Email
- Sign in with Apple
- Phone number

Requirements:
- Do not imply sign-in is functional until a real backend/auth provider is configured and tested.
- Any future account system must define secure local-to-account migration, conflict resolution, backup, deletion, and recovery.
- Do not enable Supabase or another backend without explicit approval of architecture, costs, and data handling.
- Maintain local use/guest experience where feasible.

Status 2026-11-14 — account UI implemented, sign-in service **Blocked** (no backend connected; enabling one needs the user's explicit approval):
- Onboarding Auth step and the account window (avatar on Today/Settings, desktop sidebar) show, in order: Google, Apple (disabled, "Coming later"), Email, Phone number (disabled, "Coming later"), then the Sign up / Sign in switch and Continue as guest. Sign up and Sign in are separate views; sign-in never creates an account. The unknown-account message is privacy-safe ("Email or password don't match an account…") instead of "No account found", to avoid revealing which emails are registered.
- With no service connected, Google and email show "Accounts aren't switched on in this version yet" and nothing pretends to sign in. All of it runs through one replaceable `AuthClient` (`src/lib/account.ts`).
- Profile: display name + photo saved on this device in Settings (`settings.account`, included in backups); photo is cropped/downsized locally. "What should we call you?" dialog after a first sign-up, prefilled from the Google first name. Cloud photo sync: not built (needs approved storage).
- Guest data migration to an account: **not built**. Needs approved decisions first: cloud schema, merge rule per store (foods, logs, recipes, saved meals, weights, settings), and conflict policy. Guest data is never touched.
- Google strict sign-in vs sign-up cannot be enforced client-side: OAuth may create an account on first use; to be decided when the provider is configured.
- Registration form (2026-11-14, UI/validation only — the sign-in service is still not connected): Apple button shows Apple's logo and stays disabled ("Coming later"). Placeholders: email `example@gmail.com`, password "Enter your password", display name "Your name" (EN/AR). Sign-up shows five live requirements under the password (8+ characters, uppercase, lowercase, number, special character), each with icon + text + screen-reader "Done/Not yet"; a weak/medium/strong meter (strong = all five; 3–4 = medium; 1–2 = weak); a confirm-password field with its own show/hide and live match status. Create account stays disabled until the email is valid, all five rules pass, the confirmation matches and no request is running. Sign-in has no confirm field and only needs a valid email + non-empty password (older passwords keep working). On short phones the header hint, privacy line and (smallest/short-landscape only) the footer step aside in the sign-up email view; "Other options" returns to them. Short landscape uses three columns.
- Phone number stays disabled until a real, secure OTP flow is approved. Deferred with it: country picker and country-aware phone input. Acceptance for that later task: Egypt local input such as `01234567890` normalizes to `+201234567890` (trunk 0 dropped, never `+2001…`).

## 13. Themes, icons, support funding, and monetization

Deferred until core app is stable.

- User-created premium themes and icon packs are planned.
- Possible indicative price discussed: EGP 20 per theme or icon pack. This is an idea, not a finalized price or implemented store.
- Icon packs may use different professional motifs (including fitness/muscle-inspired motifs); they do not all need to be derived from the M logo.
- Optional support/donation flow may help fund app-store publishing. It must be transparent, tasteful, voluntary, and never guilt-based.
- Do not implement payments, purchases, or donation collection until platform, legal, tax, and payment requirements are reviewed and explicitly approved.

## 14. Brand film / promotional animation — very late phase

Explicitly deferred until the app works and the core identity is finalized.

Concept:
- The white half of the M moves left and joins another white half to form a complete white M; the rest of the word “meal” appears from the side (“eal”), representing taste and enjoyment.
- The lemon/lime half joins a matching half to form a complete lemon-colored M; the remaining letters appear, representing nutrition benefits, trade-offs, and numbers.
- Treat this as a later brand-film concept, not a current implementation task.

## 15. Recommended delivery roadmap

### Phase 0 — Audit and protect
- Confirm the exact current Lovable project, source branch, commit, and file state.
- Check whether requirements below are already implemented.
- Preserve local storage, routes, working flows, and existing data.
- Create/maintain this document and project-level instructions.

### Phase 1 — Identity and core UI
1. Inspect the actual logo asset and derive a coherent semantic palette.
2. Implement and verify Light/Dark design tokens and key components.
3. Add the standalone M mark and remove obsolete plant branding.
4. Fix onboarding selection states and responsive profile layout.
5. Separate Day Start and activity controls; verify day-boundary logic.
6. Implement the agreed M loading animation and shared loading behavior.
7. Fix Add Food and Idea Wheel positioning from every entry point.
8. Refine Today nutrition card and Yesterday/Today/Tomorrow navigation.
9. Apply coherent card transitions and support placement.
10. Verify English/Arabic, RTL/LTR, Light/Dark, and mobile/tablet/desktop.

### Phase 2 — Honest product experience
1. Add the Mizo destination and honest coming-soon chat experience.
2. Design notification preferences and optional reminder flows.
3. Verify all navigation and empty/loading/error states.

### Phase 3 — Nutrition content quality
1. Expand food seed data.
2. Audit translations, units, portions, and nutrition values.
3. Test search, custom foods, editing, and historical entries.

### Phase 4 — Larger capabilities
1. Plan and approve account/auth architecture.
2. Plan camera-assisted food suggestions and privacy/cost model.
3. Plan optional themes/icons and monetization only after core stability.

### Phase 5 — Final polish and release preparation
1. Consider Liquid Glass after the design system is stable.
2. Device-level QA, accessibility, performance, offline/install behavior, notifications, and safe-area checks.
3. App-store readiness and support/donation decisions.
4. Produce the brand film last.

## 16. Required QA matrix

For every relevant screen and interaction, test:
- Mobile narrow viewport.
- Tablet viewport (including the user's Galaxy Tab A9+ class of device).
- Desktop viewport.
- English LTR.
- Arabic RTL.
- Light Mode.
- Dark Mode.
- Keyboard open where inputs exist.
- Safe areas/notches on real devices where possible.
- Touch targets, visible selection, focus, disabled, loading, empty, error, and success states.
- No horizontal overflow, clipped modals, hidden controls, or unreadable contrast.
- Build, typecheck, lint if configured, and relevant tests.
- Real-device checks for Capacitor-only behavior; browser preview alone is not proof.

Record anything not tested explicitly as **unverified**.

## 17. Decision and change log

- **2026-11-12:** New M-based identity direction accepted; old plant/leaf identity is to be removed.
- **2026-11-12:** Split-M promotional film concept saved for the very late phase.
- **2026-11-12:** M loading animation concept saved: outline, two connected light/lemon halves, continuous side swap/rotation.
- **2026-11-13:** The project is to follow a fixed, tracked roadmap; avoid forgotten requirements, contradictory changes, unnecessary idea expansion, and unplanned execution.
- **2026-11-13:** One coherent logo-led visual identity is mandatory; Light/Dark must be intentionally designed; defer Liquid Glass until foundations are stable.
- **2026-11-13:** Approved working branch is `development/mizano-roadmap`. Keep `main` stable; all implementation and plan updates for this work go to the development branch until the user reviews and explicitly approves a merge.

- **2026-11-13:** Phase 1 Task 1 (identity) — Implemented / partially verified. Palette from the logo: primary #1e6337 (dark theme #4fbf7f), mid green #178258 (energy), lime #c3e828 as fills only with dark text #1f2a10, neutral surfaces #f7f8f5/#ffffff (dark #121614/#1a201c). Standalone M cut from the official artwork (not redrawn): Light = deep-green arch + lime arch with thin green outline (user choice); Dark = original white + lime arches. Square tile kept only for favicon/PWA/app icons. Plant/leaf artwork and growth states removed; background gradients removed. Evidence: 79/79 tests, build OK, preview onboarding checked at 390x844 and 1280x800 in Light and Dark (EN). Unverified: Arabic, tablet, Today/Foods/Progress/Settings after the palette change, real devices. Outlined M for the loading animation remains a later task.

- **2026-11-13:** Phase 1 Task 4 (onboarding selection states) — Implemented / verified in browser preview only. Diagnosis: in the current 3-step flow, the tap controls (EN/AR, theme button, sex, activity) already updated `aria-checked` and their filled style immediately (25–60 ms in the sandbox browser; saving to the device took ~5 ms). The one reproduced defect was the age/height/weight wheels: while turning, the highlight stayed on the old number and slid away from the centre band until scrolling paused and the value was saved. Fix: the wheel now highlights the row under the centre band live while turning and still saves only when it settles (`onboarding-wheel.tsx`). Evidence: new `onboarding-selection.test.tsx` (failed before, passes after), 83/83 tests, typecheck clean; Playwright at 390x844 and 800x1280, EN/AR, Light/Dark. Unverified: real phones/tablets (touch fling), and whether the user's original "frozen" report came from the older app.

- **2026-11-13:** Phase 1 Task 5 (Day Start) — verification pass. Existing behaviour kept (no rewrite). Evidence: `nutrition-day.test.ts` 20/20 (boundaries, midnight, month/year/leap, DST, historical preservation); preview at 390x844 EN/Light and AR/Dark shows Day Start in its own muted box below Activity in onboarding and in Settings ("Nutrition day") with the previous-day rule, the 24-hour window and the never-moves-old-entries note. One defect: onboarding gave no explanation of the previous-day rule. Fixed with a one-line note (EN/AR) linked as the input's description; on short screens (≤719 px tall) the Profile intro sentence is hidden to keep the step scroll-free. Re-checked no scroll and no overlap of the Day Start box with the buttons at 360x640, 375x667, 390x720, 390x844, 844x390, 800x1280, 1024x768, 1280x800 in EN/Light and AR/Dark. Status: Implemented / verified in browser preview only; real devices unverified.

- **2026-11-13:** Phase 1 Task 6 (M loading animation) — Implemented / verified in browser preview only. See section 6 status. Files: `src/components/common/brand-mark.tsx` (outline variant), `src/components/common/loading-mark.tsx` (new), `src/components/shell/app-shell.tsx`, `src/styles.css` (`m-turn` keyframes, `--mark-*` tokens). Evidence: 87/87 tests (new `loading-mark.test.tsx`), typecheck clean, build OK; Playwright with the data store held in its loading state: 390x844 EN Light/Dark and AR Light, 800x1280 EN Light, 1280x800 AR Dark — animation `m-turn` running, mark centred, no image tile, no page scroll, no console errors; frames sampled across the turn in Light and Dark show the swap with the halves joined; reduced motion (390x844 EN Dark, 1280x800 AR Light) shows the static outline with no animation. Unverified: real Android/tablet (smoothness, battery), screen-reader announcement on device.

- **2026-11-13:** Brand/logo correction (consolidated task) — Implemented / verified in browser preview only. Replaces the Task 6 whole-plane turn with the separate-halves animation described in section 6, and makes the loading message visible and localized. Files: `src/components/common/brand-mark.tsx`, `src/components/common/loading-mark.tsx`, `src/components/shell/app-shell.tsx`, `src/styles.css`, `src/lib/i18n/ar.ts` (AR text now “تحميل بياناتك…”), `src/test/mizano/loading-mark.test.tsx`. Brand audit: every in-app placement (onboarding header, Welcome, desktop onboarding side panel, onboarding intro, sidebar, Today header) uses the standalone M (`BrandMark` mark); the square tile is used only by favicon/PWA/Apple/Android icon files (`public/`) and is not rendered anywhere in the app UI (checked in the page at 390x844, 800x1280 and 1280x800, EN/AR, Light/Dark); no transform/mirroring in RTL. No plant/leaf branding remains in the source (search clean; the generic food icons are unrelated). Evidence: 89/89 tests; build OK; lint shows only the project-wide prettier quote/semicolon formatting errors, with no other rule problems in the changed files. Playwright with the data store held in loading: 390x844 EN/AR × Light/Dark, 360x640 AR Dark, 800x1280 EN Light and AR Dark, 1280x800 EN Dark and AR Light. In each: message visible and localized, directly below the mark, both centred, no scroll, no square tile, no console errors. Frames sampled across the loop at 390x844 AR Light/Dark, 800x1280 AR Dark and 1280x800 EN Dark/AR Light show the halves trading places while joined at the top. Reduced motion (390x844 EN Dark, 1280x800 AR Light): static M, no animation. Not checked: real Android phone/tablet (smoothness, battery, screen reader), and the onboarding intro help panel (not changed).

- **2026-11-14:** Account / profile / age policy / Mizo access — Implemented / partly verified in browser preview. Decisions: ages 15–17 allowed everywhere (old under-18 account block removed); teen estimates use IOM 2005 adolescent EER (+25 kcal growth); 15–17 energy targets floored at estimated needs; privacy-safe sign-in error instead of "No account found". Files: `src/lib/nutrition.ts`, `src/lib/account.ts`, `src/lib/avatar.ts`, `src/lib/types.ts`, `src/lib/defaults.ts`, i18n EN/AR, `src/components/account/*`, `src/components/mizo/mizo-screen.tsx`, `src/routes/mizo.tsx`, onboarding Auth step, Settings profile/targets, Today header, app shell nav, `public/sw.js` (v6, caches `/mizo`); removed `src/lib/account-eligibility.ts`. Evidence: 103/103 tests (new `account.test.ts`, `account-ui.test.tsx`, teen tests in `core.test.ts`), typecheck clean, build OK, lint only the project-wide prettier formatting. Playwright: Auth step no-scroll at 360x640, 390x844, 740x360, 844x390, 800x1280, 1024x768, 1280x800 × EN/AR × Light/Dark (options and email views); guest flow → Today avatar → account window → Mizo prompt at 360x740 EN Light, 390x844 AR Dark, 820x1180 AR Light, 1280x800 EN Dark, no console errors; 16-year-old in Settings: fields editable, estimate 3,020 kcal, 1,500 kcal refused. Unverified: any real sign-in (no service), signed-in Mizo/profile editor in the browser (tests only), real devices.

- **2026-11-14:** Registration form UX (section 12) — Implemented / verified in browser preview only; sign-in service still Blocked. Files: `src/lib/account.ts` (password rules, strength, sign-up gating; sign-in rules unchanged), `src/components/account/auth-panel.tsx`, `src/components/account/provider-icons.tsx` (Apple mark), `src/components/account/name-prompt.tsx`, `src/lib/i18n/en-extra.ts`, `src/lib/i18n/ar-extra.ts`, `src/test/mizano/account.test.ts`, `src/test/mizano/account-ui.test.tsx`. Also fixed: in Arabic the show/hide eye sat on top of the password dots. Evidence: 120/120 tests, typecheck clean, production build OK, lint only the project-wide prettier formatting. Playwright, sign-up email view filled: no scroll or clipped controls at 320x568, 360x640, 390x844, 640x360, 667x375, 740x360, 844x390, 915x412, 768x1024, 1024x768, 1280x800, 1440x900 in EN and AR (Light), plus 360x640, 667x375, 1280x800 in Dark; weak/medium/strong, match/mismatch and submit enabling checked at 390x844 Light/Dark; sign-in view has no confirm field or rules. Unverified: real devices and on-screen keyboards, screen-reader announcements, any real sign-up (no service).

Append future decisions here with date, decision, reason, affected requirements, and whether it replaces an earlier decision.

## 18. Open verification items (do not assume complete)

- Confirm current onboarding selection visuals in the latest preview. — Browser preview checked 2026-11-13 (tap controls OK; wheel highlight lag fixed). Real-device check still open.
- Confirm actual current logo artwork and extract its color values. — Done 2026-11-13 (sampled: deep #1e6337, mid #178258, lime #c3e828, white #eaf0ec).
- Confirm standalone M mark exists and is used in the correct contexts. — Verified in browser preview 2026-11-13 (EN/AR, Light/Dark, phone/tablet/desktop; not mirrored in RTL; square tile not rendered in the app UI). Real devices still open.
- Confirm plant assets/references have been fully removed. — Done 2026-11-13 (code search clean; re-checked in the brand/logo correction).
- Confirm loading animation matches the agreed partial-M concept (not just a static full logo). — Reworked 2026-11-13 to separate halves trading places around the shared joint, with a visible localized message; browser preview checked (Light/Dark, EN/AR, phone/tablet/desktop, reduced motion). The user's visual sign-off and real-device smoothness are still open.
- Confirm Day Start persistence and late-night logging behavior. — Logic covered by tests; UI checked in browser preview 2026-11-13 (onboarding + Settings, EN/AR). Real-device late-night use still open.
- Confirm Add Food and Idea Wheel modal positioning from all entry points and viewport sizes. — 2026-11-14 finding: at 1280x800 the Add food panel opens half off-screen to the left (pre-existing; not changed in the account task).
- Confirm Today macro card contrast in both themes.
- Confirm date navigation ordering in English and Arabic.
- Confirm Mizo navigation and honest placeholder behavior. — Navigation + guest prompt checked in browser preview 2026-11-14; chat placeholder not built; signed-in view covered by tests only.
- Confirm real sign-in, guest-to-account migration and cloud photo sync. — Blocked: no sign-in service connected; migration rules need approval.
- Confirm support icon is Settings-only and email is correct.
- Confirm any claimed test count and list exactly which tests ran.

---

## 19. Update protocol

Whenever a new requirement is agreed:
1. Add it to the correct section immediately.
2. Mark its status and phase.
3. Record dependencies and acceptance criteria.
4. If it changes an existing decision, document the replacement and date; do not erase history.
5. Update the decision log.
6. Keep the project knowledge aligned with the most important non-negotiable rules.

Whenever work is implemented:
1. Record commit/message ID and changed files.
2. Record automated checks and their results.
3. Record manual preview/device checks, including viewport, language, and theme.
4. Mark Verified only when evidence supports it.
5. Add known gaps and deferred follow-ups.

**This document is the source of truth for scope and decisions. If an instruction from an AI tool conflicts with this document, stop and ask the user rather than silently changing the product.**


## Status update — real Supabase email/Google sign-in (2026-11-14)
- Status: **Implemented / unverified end-to-end.** Connected external Supabase project `ejgimkfnydgefoweasmr` (not Lovable Cloud). No tables, buckets, RLS, sync or Supabase settings were created or changed.
- Implemented: separate email sign-up and sign-in (sign-in never creates an account); "check your email" state with resend when confirmation is required (project has email confirmation on); unconfirmed sign-in opens that state; session restored on app start (offline-capable) and identity changes followed; sign-out ends the session on this device only; Google via Supabase OAuth, refused with a clear message if the provider is off; failed email-link/Google redirects explained once; onboarding Auth step continues after sign-in. Password rules now ASCII A–Z / a–z / 0–9; any other non-whitespace character is special.
- Guest data: IndexedDB `track-meals-macros` and `tmm:*` untouched; no guest-to-account migration.
- Tests: unit and component tests for sign-up/sign-in separation, confirmation, error mapping, Google provider check, session restore/events, redirect errors, ASCII rules and guest-settings preservation.
- Pending manual Supabase settings: Site URL (currently not the app URL), Redirect URLs for the preview and published URLs, Google OAuth client redirect URI `https://ejgimkfnydgefoweasmr.supabase.co/auth/v1/callback`. Real inbox confirmation, Google round trip and Android deep links are unverified.

## Status update — Google registration flow (2026-11-14)
- Decision: Supabase creates the Auth user on first Google use regardless of the button pressed, so the app gates entry instead of blocking creation. A Google-only account enters Mizano only when `user_metadata.mizano_registered` is true (legacy: `name_prompt_done` or a non-empty `display_name` written by this app). Accounts with an email identity are never gated. The 10-minute timestamp heuristic is removed.
- Sign up + new Google user: required "Finish creating your account" step (name optional, prefilled from Google). Sign in + new Google user: "No Mizano account found" (explains a sign-in record may already exist) with Create account / Cancel (local sign-out). The app stays in guest mode until the marker is saved; a failed save keeps the step open with an error; reloads return to the step.
- Status: Implemented/unverified. Unit and component tests pass; a real Google round trip, identity linking and Android deep links are not tested.
