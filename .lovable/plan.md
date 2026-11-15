# Mizo: multiple conversations per account (minimal, no redesign)

## Pre-flight finding
Checked-out branch shows as `edit/edt-849fedc1…` at HEAD `873f8cc` (same commit as expected). Confirm this is the Lovable working copy of `development/mizano-roadmap` before building; stop if not.

Verified facts: `chat-store.ts` keeps one `MizoConversation` per `userId` (store `conversations`, keyPath `userId`) plus `consent` in DB `mizano-mizo` v2. `mizo-workspace.tsx` (460 lines) loads/saves/removes that one record. Bounds in `protocol.ts` already apply per request and only to the messages passed in, so other conversations are never sent.

## What the user gets
- Menu button in the Mizo header opens a side sheet listing this account's chats (newest first).
- New chat, open any chat, rename (inline dialog), delete one chat with confirmation.
- Title = first user message, trimmed to ~40 chars (no AI call); "New chat" until then.
- Last open chat is restored after visiting Today/Settings or reloading.
- Existing chat appears as the first item with all messages intact.

## 1. Files to change
- `src/lib/mizo/chat-store.ts` — new model + v3 migration + new ChatStore API.
- `src/components/mizo/mizo-workspace.tsx` — work on an active conversation id; header menu, new chat, delete current chat.
- `src/components/mizo/mizo-conversation-list.tsx` (new, small) — reuse existing `Sheet`, `Button`, `Dialog`/`AlertDialog`, `Input` from `src/components/ui`.
- `src/lib/i18n/en-extra.ts`, `ar-extra.ts` — ~10 keys (menu, new chat, untitled, rename, save, delete confirm, empty list).
- `src/test/mizano/mizo.test.tsx` + new `src/test/mizano/mizo-store.test.ts` (fake-indexeddb if already present; else Memory store + a hand-built v2 DB via the existing test setup).
- `docs/MIZANO_MASTER_PLAN.md`, `AGENTS.md` (update the Mizo storage rule), `roadmap.md`.
No server, protocol, secrets, Supabase or routing changes.

## 2. Data model and migration (DB v2 -> v3)
```text
conversations (v3, keyPath id, index byUser on userId)
  { id, userId, title, titleSource: 'auto'|'manual', messages[], createdAt, updatedAt,
    kind: 'chat'            // reserved so future 'work' records fit
    links?: string[]        // reserved for Chat->Work context carry, unused now
    summary?: string }      // reserved for future cross-chat memory, unused now
meta (new, keyPath userId)  { userId, activeConversationId }
consent                     unchanged
```
Migration inside `onupgradeneeded` (single versionchange transaction, atomic):
1. If old store `conversations` has keyPath `userId`: read all records with a cursor into memory.
2. Delete old store, create new `conversations` (keyPath `id`, index `byUser`), create `meta`.
3. Re-insert each legacy record with `id = 'legacy-' + userId`, title derived from first user message, `createdAt` = first message time, messages unchanged; set that as active in `meta`.
4. Empty legacy records (no messages) are dropped.
If anything throws, the transaction aborts and v2 data stays as is (current fallback to MemoryStore remains, so history is never overwritten). Deterministic legacy id makes reruns idempotent.

New API (all calls assert userId and filter on it):
`list(userId)`, `get(userId,id)`, `create(userId)`, `save(conv)`, `rename(userId,id,title)`, `remove(userId,id)`, `getActive(userId)`, `setActive(userId,id)`, consent methods unchanged. `get`/`remove` reject records whose `userId` differs. Also fix `run()` to attach `oncomplete` before awaiting the request (existing race).

Active-chat rules: on mount load active id; if missing/deleted, open newest; if none, show empty welcome and create the record only on first send (no empty-chat clutter). Deleting the active chat switches to newest remaining or empty state. Streaming request is aborted before switching chats.

## 3. Acceptance tests
- Migration: v2 DB with two accounts' conversations -> v3 has two records, messages byte-equal, each active for its owner; consent untouched; rerun is a no-op.
- Empty legacy record is not migrated; `track-meals-macros` never opened.
- Isolation: user B `list` excludes A; `get/rename/remove` of A's id as B fails/no-op.
- New/open/rename/delete: create two, rename one (manual title survives new messages), delete one with confirm, other intact; cancel leaves both.
- Auto title from first user message, length capped, Arabic text preserved.
- Active persistence: set active, remount workspace (simulated navigation / new store instance) -> same chat shown.
- Request payload only contains the active chat's messages.
- Guest still sees invitation; no store opened.
- Run full suite, typecheck, production build; preview check of the list in EN/AR, light/dark, phone width (signed-in view unverified without a session).

## 4. Credit estimate (9 available)
- Store + migration + store tests: ~2–3
- Workspace + list sheet + i18n + UI tests: ~3
- Docs/roadmap and fix-ups after build: ~1–2
Total realistic: 6–8. If it runs tight, defer in this order: inline rename polish (keep simple dialog), preview matrix screenshots, master-plan detail beyond status lines. Never deferred: migration safety, isolation, tests.

## Deferred (not built)
Work mode, cross-chat memory, chat search, cloud sync, AI titles, any visual redesign.
