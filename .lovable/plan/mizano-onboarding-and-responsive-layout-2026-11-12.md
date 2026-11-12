# Mizano: onboarding and responsive layout

## Where things stand now
None of the earlier proposed changes are in yet. The welcome flow still has the original 4 steps: Auth, then Welcome (language and theme), then Day Start, then Profile (age, height and weight wheels, sex, activity).

## What the app has today
- **Flow:** the step controller is `src/components/shell/onboarding.tsx` (`TOTAL_STEPS = 4`). Each step lives in `onboarding-auth.tsx`, `onboarding-welcome.tsx`, `onboarding-step-daystart.tsx` and `onboarding-wheels-panel.tsx`.
- **Leftover files:** `onboarding-steps.tsx` (`StepPanel`), `onboarding-step-welcome.tsx`, `onboarding-step-profile.tsx` and `onboarding-profile-wheels.tsx` overlap with the live steps. The overlapping profile file is a near-copy of `onboarding-wheels-panel.tsx`. I'll confirm which ones are unused before removing anything.
- **Screen frame:** `onboarding-layout.tsx` uses `min-h-dvh`, so a step can grow taller than the screen and scroll. Around it are a busy three-layer radial-gradient background, the plant artwork, an intro overlay, and the progress bar (`onboarding-progress.tsx`, `onboarding-growths.ts`, which has tests).
- **Language and theme:** these are only on the Welcome step, as option cards plus a light/dark/system switch. There is no shared header.
- **Auth:** the Google button uses a single-color "G" glyph and the email button uses a generic mail icon. Both show an honest "not available" notice, and guest mode is the main path.
- **Wheels:** `onboarding-wheel.tsx` shows the selected value in green on a faint green band. Ages 15–17 already use the amber warning color. Age 18 uses the main green, so there is no clash with under-18. The light/dark contrast still needs checking.
- **Sex and activity:** these use `onboarding-options.tsx` and `onboarding-pickers.tsx`. Their selected states are subtle.
- **Logo:** `common/brand-mark.tsx` draws an inline leaf on a green tile. It's used in `app-shell.tsx` (sidebar and loading screen), `onboarding-layout.tsx`, `onboarding-intro.tsx`, `onboarding-plant.tsx` and `today-screen.tsx`. The app icons are in `public/icons/*` and `public/apple-icon.png`.
- **Missing:** the new logo file, a persistent header, a theme ripple, and a 3-step flow that never scrolls.

## Technical risks
- **Fitting without scrolling:** the Profile step has 3 wheels plus sex, activity and day start, which won't fit on short phones (about 640px tall) or in landscape. I need a compact arrangement, such as wheels side by side or a two-column layout on tablet and desktop, and I'll verify each size. Shrinking text until it's unreadable is not an option.
- **Theme ripple:** I'll use the browser's built-in page-transition feature, with a plain instant swap as the fallback. It will respect the "reduce motion" setting, and the ripple must start at the button in Arabic (right-to-left) too.
- **Day start:** moving it must keep the stored setting exactly as it is (`dayStartMinutes`).
- **Wording:** every new label needs both English and Arabic text.
- **Logo pages:** the logo shows on pages built on the server, so it must render the same on the server and in the browser.
- **App icons:** browsers that installed Mizano may keep the old cached icons. I'll bump the offline-cache version if the icons change.

## Plan, in low-cost stages (each stage ends with a check)
1. **Logo (after you upload it):** inspect the file and keep its original pixels, without redrawing. Replace the drawing inside `BrandMark` only, so all real brand spots update together. Update the favicon, app icons and install-as-app icons only if the file suits small sizes. Generic icons are left alone.
2. **3-step flow:** go to Auth, then Welcome, then Profile, and add Day Start as a compact field inside Profile. Remove the standalone Day Start step and the language/theme block from Welcome. Update the step count, the growth stages and their test.
3. **Shared header:** add a compact header on all 3 steps with the logo, a simple EN/AR switch, and a medium round theme button showing a sun in light theme and a moon in dark. Tapping it plays a quick circular ripple from the button.
4. **No-scroll frame:** make the frame exactly the screen height (`h-dvh`) with safe areas respected and inner scrolling removed. Replace the background with one calm, plain color or a single very faint tint. Lay out each step separately for phone, tablet (two columns where helpful) and desktop.
5. **Profile clarity:** give the wheels a strong selected value in both themes, keeping ages 15–17 amber and age 18 clearly different. Sex and activity get a filled selected state with a check mark and a visible border in both themes. Tap targets will be at least 44px, with visible keyboard focus.
6. **Auth icons:** draw custom outline-style marks in Mizano green for Google and email, without Google's colors. Keep the honest "not available" notice and the main guest button.
7. **Check the core screens:** look at Today, Foods, Progress and Settings at every width for overflow, clipping and overlap. Fix layout only, with no change to behavior or data.

## How I'll check it
Screenshots at phone (360x640, 390x844, landscape 844x390), tablet (768x1024, 1024x768), in-between widths (600, 900) and desktop (1280x800, 1440x900), each in English and Arabic, light and dark. I'll also confirm onboarding never scrolls at any of these sizes, test with the keyboard, and run the existing tests.

## Not included
No sign-in or server features, no change to how data is stored, no rebuild, and no video or promo work until onboarding and the core screens are stable.

## Needed from you
Please upload the new Mizano logo here (a transparent SVG or PNG is best). I won't edit anything until I have the file and your approval.
