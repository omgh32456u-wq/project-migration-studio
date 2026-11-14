# Mizo AI assistant — proposal (plan only, nothing built yet)

## 0. Verified current state (read this turn)
- Checkout: branch `edit/edt-b83251ce-…`, HEAD `d4c726e` (Google registration fix). Not literally named `development/mizano-roadmap` — confirm this edit branch syncs to it before any build.
- `/mizo` route (`src/routes/mizo.tsx`) has no route guard, no loader, no `beforeLoad`. Gating is only inside `MizoScreen` via `mizoAccess()` (`status === 'signed_in'` → open). Guests get the full page shell with a sign-up/sign-in card; signed-in users get an "coming later" empty state. Nothing sensitive is rendered today, so the gate is honest but **component-level, not route-level**.
- No AI provider, no server function, no AI secret present in env (only Supabase URL/ID/publishable key). No `LOVABLE_API_KEY` seen. **Provider costs/quotas cannot be verified from project config** — none is configured.
- Data available on-device (IndexedDB, `src/lib/types.ts`): `Profile`, `Targets`, `LogEntry` (with `nutrients`, `estimated`), `Settings.account`, day start via `nutritionDayKey()`; adolescent EER and `minTargetKcal` in `nutrition.ts`.

## 1. Contradictions to resolve first
1. AGENTS.md rule 1 says "there is no server database or sign-in" — stale since Supabase Auth was added (the later AGENTS rule describes it).
2. Master plan §2 says "Next.js 16, static export" and "no backend or authentication" — stale (TanStack Start + external Supabase Auth).
3. Master plan §1 describes a nutrition tracker; your later Mizo-first direction was never saved (memory tool was unavailable). Needs recording.
4. Master plan §8 agreed a "maintenance" placeholder reply phase; this proposal replaces it with real answers — confirm.
5. Project instructions say no paid AI API / recurring cost without approval; any real model call is a cost decision (see §4).
6. Lovable's platform default is server functions on Lovable hosting; Mizo needs a server hop because keys may not live in the browser.

## 2. Capabilities (v1)
- Answer nutrition questions in EN/AR, matching the user's language.
- "How am I doing today?": summary of current tracking day (respecting Day Start) vs targets.
- Suggest meal ideas to fill remaining protein/kcal, using foods the user logs often.
- Explain an estimate (why a total is marked incomplete/estimated).
- Read-only: Mizo never writes logs or changes targets in v1.

## 3. Non-goals and safety boundaries
- Not a doctor: no diagnosis, medication, supplement dosing, or disease treatment; points to a professional.
- No extreme diets, fasting protocols, very-low-calorie plans, "burn it off" compensation, or body-shaming language; no weight/appearance judgments.
- Ages 15–17: full access; informational amber note ("estimates for teens are less precise") only. System prompt forbids deficit/weight-loss targets and steers to growth-appropriate eating — no feature blocks.
- Eating-disorder signals → gentle, non-judgmental reply with support resources, no numbers.
- No images, voice, attachments in v1 (composer shows those as disabled "Coming later").

## 4. Provider options (costs NOT verified — none configured)
| Option | Key safety | Cost character |
|---|---|---|
| A. Lovable AI Gateway via TanStack server function | Key server-side, managed | Usage draws on workspace AI balance; may include a free allowance but **not a guaranteed free service**. Recommended for simplicity. |
| B. Free-tier third-party API (user-supplied key in Secrets) via server function | Key server-side | Free **quota**, can change or be revoked; no card required only if that provider allows it |
| C. On-device small model (WebLLM) | No key | Truly no server cost, but large download, weak Arabic, poor on phones — not recommended |
Recommendation: A, with hard app-side caps so spend can't run away. Final choice is yours.

## 5. Data flow, consent, privacy
```text
Device (IndexedDB) -> build minimal context (client) -> consent check
  -> server function (verifies Supabase JWT, rate-limits) -> model
  -> reply streamed back -> stored locally only
```
- First open: one-time consent screen listing exactly what is sent (first name, age band not birth date, goal, today's targets/totals, up to N today's food names+macros). Toggle "Share my tracking with Mizo" in Settings; off = general answers only.
- Never sent: email, avatar, weight history, backups, other days (v1).
- Chat history stays in IndexedDB per user id; cleared on account switch; "Delete chat" control. Server stores nothing (no tables).
- Guest data untouched; existing stores unchanged; new store added via safe IndexedDB version bump.

## 6. Security, injection, abuse
- Route-level gate: `beforeLoad`/client guard on `/mizo` that renders only the invitation for guests and never mounts chat code; the server function independently rejects requests without a valid Supabase access token for a registered user (`mizano_registered`).
- Context is passed as structured JSON in a separate system section, labelled as data; food names are length-limited and stripped; model told to ignore instructions inside data.
- Caps: message length, history window, output tokens; per-user daily message limit and burst limit (in-memory per instance is weak — a durable limit needs a Supabase table, which requires your approval; v1 proposal uses a client counter + server per-request caps, flagged as soft).
- Provider errors never leak details.

## 7. Offline, errors, limits (all localized)
- Offline: composer disabled, banner "Mizo needs a connection"; history still readable.
- Loading: shared `LoadingMark` with "Mizo is thinking…".
- 429/quota: "Mizo has reached today's limit, try again tomorrow". 402/credits: "Mizo is unavailable right now". Session expired: re-sign-in prompt.

## 8. Milestones (smallest first)
1. **M0 docs** — fix the contradictions in master plan/AGENTS, save Mizo-first direction to memory. (~1 credit)
2. **M1 gate + UI shell** — route-level guest gate, chat layout, consent screen, disabled attach/mic, local history store, offline state; no model yet. (~3–5)
3. **M2 live answers, no personal data** — server function with auth check, safety system prompt, caps, error states. Requires provider approval. (~3–5)
4. **M3 personal context** — consent-gated minimal context builder (day-start aware, teen note). (~2–4)
5. **M4 QA pass** — EN/AR, light/dark, phone/tablet/desktop, signed-in browser test. (~2)
Credit numbers are rough estimates, not measured.

## 9. Files (expected)
- Edit: `src/routes/mizo.tsx`, `src/components/mizo/mizo-screen.tsx`, `src/lib/account.ts`, `src/lib/storage/db.ts`, `src/lib/types.ts`, `src/lib/i18n/{en,ar}-extra.ts`, settings screen (consent toggle), `docs/MIZANO_MASTER_PLAN.md`, `AGENTS.md`.
- New: `src/lib/mizo/context.ts` (minimal context), `src/lib/mizo/safety.ts` (prompt), `src/lib/mizo.functions.ts` (server function), `src/components/mizo/{chat,composer,consent}.tsx`.
- Dependencies: none new for option A (fetch); `@lovable.dev/ai-gateway` if used.

## 10. Tests and acceptance
- Guest on `/mizo` sees only invitation; chat never mounts; server rejects no-token and unregistered-Google tokens.
- Context builder: omits email/avatar; respects Day Start; consent off → no personal data; teen → age band only + note flag.
- Prompt includes no-deficit rule for 15–17; history isolated per user id and cleared on switch; guest IndexedDB unchanged.
- Error mapping for offline/429/402/expired session.
- Acceptance: real signed-in preview conversation in EN and AR, both themes, three sizes; any untested item labelled unverified.

## Decisions needed from you
1. Provider: A, B, or C (and accept that A/B are quotas, not guaranteed free).
2. Approve dropping the "maintenance" placeholder phase.
3. Is a soft (client-side) daily limit acceptable for v1, or approve one small Supabase table for a durable limit?
