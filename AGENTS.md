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

- App data (foods, logs, settings, Mizo chat and Mizo consent) lives only on the device in IndexedDB (`src/lib/storage/db.ts`; Mizo chats (many per account, keyed by conversation id and scoped by account id; last open chat per account) and consent in their own `mizano-mizo` database). The external Supabase project is used for Auth plus one server-written table, `mizo_requests` (usage counts only, never chat text); nothing else is synced. Why: private, offline-first, guest-friendly; moving data across devices goes through backup export/import in Settings.
- UI kit is shadcn on `@base-ui/react` (not Radix) in `src/components/ui`; the base-ui `data-*` variants are inlined at the top of `src/styles.css`. Why: ported as-is from the original app.
- Every user-visible string goes through `t()` with keys in both `src/lib/i18n/en*.ts` and `ar*.ts`. Why: full Arabic (RTL) and English support is a core feature.
- Capacitor plugins are only lazy-imported behind `isNativeApp()` in `src/lib/native.ts`. Why: the web build must never load native code; they exist for the Android shell's share sheet.
- Bump `VERSION` in `public/sw.js` whenever cached routes or asset paths change. Why: old caches are dropped only on a version change.
- tsconfig keeps `strict` but disables `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `noPropertyAccessFromIndexSignature`. Why: the imported, tested code was written against plain strict mode.
- Onboarding is pinned to the viewport (fixed, h-dvh, no scrolling); steps compact via the `short`/`tiny`/`landscape-short`/`roomy` height variants in `src/styles.css`. Why: no onboarding step may ever scroll on any supported device.
- The logo lives only in `BrandMark` (`mark` = standalone M with light/dark variants, `tile` = square app-icon art, `outline` = contour M measured from the artwork, two separate half elements) plus the real icon files in `public/`; the square tile appears only in app-icon contexts (icon files), never in in-app UI. Change brand placements through `BrandMark`. True app-loading states use `LoadingMark`: the outline M whose halves trade places around their shared upper joint (motion-safe only; every rotation pivots on that joint), with the localized status message visible below it. Why: one source of truth for every true brand spot and one consistent loading look.
- Sign-in goes only through the `AuthClient` interface in `src/lib/account.ts`; the app's client is `createSupabaseAuthClient` (`src/lib/supabase-auth.ts`, the connected external Supabase project, publishable key only, lazy-loaded after hydration), and account profile data (name, photo) stays in `settings.account` on the device. Why: screens stay independent of the auth service, and signing in or out must never read, move or clear guest IndexedDB data.
- Ages 15–17 are never blocked; their estimates use the IOM adolescent EER in `src/lib/nutrition.ts` and their energy target never goes below it (`minTargetKcal`). Why: user policy — age-appropriate, no deficit for minors, full access.
- A Google-only account enters the app only after the `mizano_registered` user-metadata marker is written (`isRegistered` in `src/lib/supabase-auth.ts`); until then the account stays in guest mode behind the required registration dialog. Why: Supabase OAuth always creates the user on first use, and timestamps can't tell new from existing users.
- Mizo answers go only through the server route `src/routes/api/public/mizo/chat.ts` (logic in `src/lib/mizo/*.server.ts`; shared contract in `src/lib/mizo/protocol.ts`): it validates the Supabase session itself, whitelists role/text turns, requires the consent version, then reserves quota atomically via the service-role-only `mizo_begin_request`/`mizo_finish_request` RPCs before calling the OpenAI-compatible provider adapter. Provider, model, base URL and limits come from server env vars only. Why: keys and limits stay off the device; new Supabase Edge Functions can't be created on this stack; `/api/public` keeps it reachable from the Android shell.
