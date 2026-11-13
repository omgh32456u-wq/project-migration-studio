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
- Preserve the agreed age and profile constraints already implemented only after inspecting current code and confirming they remain correct. Under-18 handling must be safe and age-appropriate.
- Do not add redundant loading steps for a new local user.
- Remove duplicate privacy reassurance copy where it appears redundantly.
- Google/email buttons may show proper recognizable iconography, but do not imply authentication works while it is not connected.

### Day Start and daily boundary
- Add/retain a user-configurable day-start time.
- Explain clearly that entries before the chosen day start count toward the previous tracking day.
- Allow the user to edit this setting later in Settings.
- Ensure food and macro entries do not disappear or reset incorrectly at midnight. The tracking-day key must respect the configured day boundary, including late-night/gym use.
- Test before/after the day-start boundary, midnight, timezone changes where practical, and historical days.

## 6. Loading and motion

### M mark loading animation
Agreed concept (not to be confused with the current ordinary full-logo loading state):
- Use only the partial M mark, not the complete logo with “Loading your data”.
- Outline/contour treatment with the interior unfilled.
- One light/white half and one lemon/lime half remain magnetically connected near the top.
- The halves rotate/swap sides in a continuous loop, conceptually completing a 360-degree turn without visibly disconnecting.
- Keep motion smooth, calm, and consistent wherever the app displays a loading state, including future Mizo assistant loading.
- Respect reduced-motion preferences and avoid unnecessary CPU/battery load.
- Remove the old plant animation and all plant loading references.

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

Append future decisions here with date, decision, reason, affected requirements, and whether it replaces an earlier decision.

## 18. Open verification items (do not assume complete)

- Confirm current onboarding selection visuals in the latest preview.
- Confirm actual current logo artwork and extract its color values. — Done 2026-11-13 (sampled: deep #1e6337, mid #178258, lime #c3e828, white #eaf0ec).
- Confirm standalone M mark exists and is used in the correct contexts. — Implemented / unverified in Arabic and tablet.
- Confirm plant assets/references have been fully removed. — Done 2026-11-13 (code search clean).
- Confirm loading animation matches the agreed partial-M concept (not just a static full logo).
- Confirm Day Start persistence and late-night logging behavior.
- Confirm Add Food and Idea Wheel modal positioning from all entry points and viewport sizes.
- Confirm Today macro card contrast in both themes.
- Confirm date navigation ordering in English and Arabic.
- Confirm Mizo navigation and honest placeholder behavior.
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
