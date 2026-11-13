<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (Mizano)

- User data lives only in the browser's IndexedDB (`src/lib/storage/db.ts`); there is no server database or sign-in. Why: the app is deliberately private, offline-first and guest-only; moving data across devices goes through the backup export/import in Settings.
- UI kit is shadcn on `@base-ui/react` (not Radix) in `src/components/ui`; the base-ui `data-*` variants are inlined at the top of `src/styles.css`. Why: ported as-is from the original app.
- Every user-visible string goes through `t()` with keys in both `src/lib/i18n/en*.ts` and `ar*.ts`. Why: full Arabic (RTL) and English support is a core feature.
- Capacitor plugins are only lazy-imported behind `isNativeApp()` in `src/lib/native.ts`. Why: the web build must never load native code; they exist for the Android shell's share sheet.
- Bump `VERSION` in `public/sw.js` whenever cached routes or asset paths change. Why: old caches are dropped only on a version change.
- tsconfig keeps `strict` but disables `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `noPropertyAccessFromIndexSignature`. Why: the imported, tested code was written against plain strict mode.
- Onboarding is pinned to the viewport (fixed, h-dvh, no scrolling); steps compact via the `short`/`tiny`/`landscape-short`/`roomy` height variants in `src/styles.css`. Why: no onboarding step may ever scroll on any supported device.
- The logo lives only in `BrandMark` (`mark` = standalone M with light/dark variants, `tile` = square app-icon art, `outline` = contour M measured from the artwork, two separate half elements) plus the real icon files in `public/`; the square tile appears only in app-icon contexts (icon files), never in in-app UI. Change brand placements through `BrandMark`. True app-loading states use `LoadingMark`: the outline M whose halves trade places around their shared upper joint (motion-safe only; every rotation pivots on that joint), with the localized status message visible below it. Why: one source of truth for every true brand spot and one consistent loading look.
