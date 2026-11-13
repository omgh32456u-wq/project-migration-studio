# Phase 1, Task 1 — Mizano visual identity audit (no code changes)

## 1. Ref inspected
- Local checkout ref: `edit/edt-1b453571…` (Lovable's internal edit branch, synced to the project repo), HEAD `19684f7` "docs: align Mizano master plan with approved development branch" (2026-11-13 13:25 +0200).
- I cannot confirm from the sandbox that this ref maps 1:1 to GitHub `development/mizano-roadmap`; please confirm the GitHub sync branch in Lovable settings before implementation. `docs/MIZANO_MASTER_PLAN.md` read in full (sections 4, 6, 15, 18 govern this task).

## 2. Current brand assets and usage
Assets
- `src/assets/mizano-logo.png.asset.json` — full square tile (rounded corners made transparent from your JPEG; not redrawn).
- `public/favicon.png`, `public/apple-icon.png`, `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — all derived from the square tile.
- `public/manifest.webmanifest` theme_color `#1d6b4f`, background `#f8f7f2`; `src/routes/__root.tsx` theme-color meta `#f8f7f2` / `#111a16` and icon links; `public/sw.js` precaches icons (VERSION tmm-v4); `src/lib/reminders.ts` notification icon/badge = icon-192.
- No standalone M mark and no outlined M exist yet.

Usages of `BrandMark` (all show the full square tile today — violates "not a square badge everywhere")
- `shell/app-shell.tsx` — loading screen (size-16 + ping) and desktop sidebar (size-10).
- `shell/onboarding-header.tsx` (size-10), `shell/onboarding-layout.tsx` desktop side column (size-12), `shell/onboarding-intro.tsx` (size-20).
- `today/today-screen.tsx` header (size-9).

Plant / leaf identity still present (must be removed)
- `shell/onboarding-plant.tsx` (SVG plant, comments call it "brand leaf").
- Used in `onboarding-welcome.tsx`, `onboarding-auth.tsx`, `onboarding-layout.tsx`.
- `shell/onboarding-growths.ts` (growth states seed/sprout/growth/bloom) + `src/test/mizano/onboarding-growth.test.ts`.
- Comment in `src/styles.css` ("botanical wellness", "fern") and the body "botanical wash" radial gradients.

## 3. Theme architecture
- Tailwind v4, tokens in `src/styles.css`: `:root` and `.dark` OKLCH variables mapped via `@theme inline` (shadcn roles + `energy/protein/carbs/fat`, `hero-*`, `warning`, `minor*`, `brand-lime*`, `glass*`, `elev-*`). Dark mode = `.dark` class set by the boot script in `__root.tsx`.
- Current primary is a single fern green used for primary, ring, energy, accent tint and hero gradient → the "green-on-green" problem.
- Hardcoded colours: `ui/sheet|dialog|alert-dialog.tsx` `bg-black/10` overlays (acceptable scrim), `today/idea-wheel.tsx` `text-white`, `today/day-summary.tsx` `bg-white/[0.07] ring-white/10` on hero, `providers/toast-provider.tsx` `text-white`, `lib/error-page.ts` standalone grey hexes, manifest/meta hexes.

## 4. Proposed semantic palette (provisional)
Sampled from your JPEG (compression and gradient mean these are approximate; will re-measure from flat regions before implementation):
- Logo deep green ≈ `#1E6337`, logo mid green ≈ `#178258`, logo lime ≈ `#C3E828`, logo white arch ≈ near `#F4F7F2`.

Roles

| Role | Light | Dark | Notes |
|---|---|---|---|
| Primary (brand actions) | deep green ≈ #1E6337 | lighter green ≈ #4FBF7F | white text on light primary ≈ 7:1; dark text on dark primary |
| Secondary | cool neutral-green tint #EEF2EE | #222A25 | non-green-dominant controls |
| Accent / lemon | lime #C3E828 (fills only, dark text #1F2A10) | same lime | lime is never used as text on light surfaces (fails contrast) |
| Background | #F7F8F5 (neutral, slightly cool) | #121614 | calm, no gradients |
| Surface/card | #FFFFFF | #1A201C | |
| Text | #17201A / muted #56615A | #EEF1EE / muted #A3ADA6 | ≥ 4.5:1 body, muted ≥ 4.5:1 |
| Border | #DFE4DF | white 10% | |
| Success | green (= primary family) | | |
| Warning | amber (existing `minor` family kept) | | |
| Error | existing red | | |
| Info | blue (from current `protein`) | | |
- Macro colours (protein blue, carbs amber, fat terracotta) stay distinct; energy moves off pure primary so the hero isn't green-on-green.
- Exact values will be checked with a contrast script (WCAG AA) in both themes before committing.

## 5. Logo plan by context

| Context | Treatment | Needs new asset? |
|---|---|---|
| App icon / PWA / apple / maskable | Full square artwork (current files) | No (keep) |
| Favicon | Full square at 32/64 | No |
| Notification icon | Square; Android badge ideally monochrome M | Later, optional |
| In-app brand (header, sidebar, onboarding, Today) | Standalone M mark, no tile: white half → dark-green in Light, white in Dark; lime half stays lime (Light gets a slightly deeper lime or thin outline for contrast on light bg) | Yes — M extracted from the official artwork as transparent PNG/SVG trace; colour switching via theme |
| Onboarding/welcome hero | Standalone M, larger; no square | Same asset |
| Loading (current) | Interim: standalone M static; animation is a later task | Same asset |
| Loading animation (later task) | Outlined two-half M, connected at top | Yes, later — outline SVG specified, not built now |
| Mizo (later) | Reuses outlined M for loading only | Later |

Asset approach: extract the two arches from the official image by colour masking (white and lime regions) into two separate transparent layers — no redrawing. If edge quality is poor, I'll stop and ask you rather than vectorise freehand.

## 6. Files for the first identity implementation
Likely to change
- `src/styles.css` (tokens, remove botanical wash/comments)
- `src/components/common/brand-mark.tsx` (add `variant: 'tile' | 'mark'`, theme-aware halves)
- New: `src/assets/mizano-m-*.asset.json` pointers
- `src/components/shell/app-shell.tsx`, `onboarding-header.tsx`, `onboarding-layout.tsx`, `onboarding-intro.tsx`, `today/today-screen.tsx` (switch to `mark`)
- Remove plant: `onboarding-plant.tsx`, its uses in `onboarding-welcome.tsx`, `onboarding-auth.tsx`, `onboarding-layout.tsx`; `onboarding-growths.ts` + its test only if nothing else depends on it (to verify)
- `__root.tsx` theme-color metas, `public/manifest.webmanifest` theme/background colours, `public/sw.js` VERSION bump
- Hardcoded colours: `today/day-summary.tsx`, `today/idea-wheel.tsx`, `providers/toast-provider.tsx`
- `docs/MIZANO_MASTER_PLAN.md` (statuses + decision log), `AGENTS.md` if a rule changes

Leave untouched
- `src/lib/storage/*`, `src/lib/backup.ts`, `nutrition*.ts`, `dates.ts`, `reminders.ts` logic, `src/routes/*` (except root head colours), i18n files (unless an alt label is needed), onboarding step logic/wheels/pickers, Day Start, food/Idea Wheel modals, `src/components/ui/*`, `public/icons/*` and square icon files.

## 7. Risks
- Routes: none changed. Storage: no keys touched (`track-meals-macros`, `tmm:*` intact).
- PWA: icon paths unchanged; sw VERSION bump needed for new mark assets; installed apps may keep old theme colour until reinstall.
- Capacitor: Android icons live in the old repo/build — not affected here; flagged as separate.
- RTL: M mark must not be mirrored in Arabic (logos are not flipped) — enforce `dir`-independent rendering.
- Contrast: lime on light backgrounds fails as text/thin shapes — mitigated with a deeper lime or outline in Light.
- Removing the growth state may break `onboarding-growth.test.ts`; update or remove deliberately.
- Token changes ripple to every screen; mitigated by screenshot matrix before/after.

## 8. Sequence and acceptance
1. Re-measure logo colours; produce contrast table; you approve palette.
2. Extract standalone M (two transparent halves) from the official artwork; you approve preview on light/dark.
3. Apply tokens in `styles.css` + fix the listed hardcoded colours.
4. Add `BrandMark` variants; switch in-app placements to `mark`; keep tile for icons.
5. Remove plant artwork, references and calm the background.
6. Update meta/manifest colours, bump sw VERSION.
7. Tests + screenshot matrix; update master plan statuses.

Acceptance
- No plant/leaf code or references remain (`rg` clean).
- Square tile only in favicon/PWA/app icon; in-app shows standalone M, correct in Light and Dark, unmirrored in Arabic.
- All text roles ≥ AA contrast in both themes (measured, listed).
- Primary/accent no longer green-on-green on Today hero and controls.
- Routes, stored data and backup unchanged; all existing tests pass.
- Screens checked at phone/tablet/desktop × EN/AR × Light/Dark; anything not checked labelled unverified.

Out of scope: loading animation, onboarding selection fixes, Day Start, modals, Mizo, Liquid Glass, new packages.
