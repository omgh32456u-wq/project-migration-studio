# Mizo Memory Specification

**Status:** Draft target specification; current code contains partial local memory foundations, not a complete end-to-end memory feature.  
**Purpose:** Define what Mizo may remember, how it may use memory, and how users retain control.

## 1. Memory principles

Memory exists to reduce repetition and improve relevance, not to create surveillance or an unrestricted personal dossier.

- User control and informed consent are mandatory.
- Save only useful, durable, appropriate information.
- Prefer concise summaries over raw transcripts.
- Keep facts, preferences, goals, and uncertain inferences distinguishable.
- Retrieve only what is relevant to the current request.
- Never send the entire conversation archive on every request.
- Keep each account's memory strictly isolated.
- Provide a clear way to review, correct, and delete saved memories.
- Do not claim a memory was saved, changed, or deleted until the operation succeeds.

## 2. Memory layers

Keep these layers conceptually and technically separate.

### Layer A — Current conversation context
Recent messages needed to answer the current conversation. This is temporary request context, not automatically a persistent memory.

### Layer B — Persistent user memory
Small, user-approved facts and preferences that remain useful across conversations, such as preferred language, response style, recurring non-sensitive goals, or stable routines.

### Layer C — Conversation archive
Past conversations and summaries. This is not the same as persistent memory. Retrieve selectively by relevance and only through an authorized account-scoped mechanism.

### Layer D — Mizano product knowledge
Trusted product documentation, capability registry, and current app state supplied through authorized integrations. It must not be mixed with personal memory.

## 3. Memory categories

Suggested categories:
- `preference`: communication and interaction preferences.
- `goal`: durable user-stated goals, with a review date where appropriate.
- `routine`: recurring schedules or habits that the user wants Mizo to consider.
- `project`: project context, decisions, and current status.
- `food`: food preferences or practical dietary context only when appropriate and explicitly consented.
- `other`: limited non-sensitive context that has a clear future use.

The current code's category list may differ. Update the implementation contract deliberately rather than silently changing enum values.

## 4. What must not be saved by default

Do not persist:
- Passwords, API keys, access tokens, recovery codes, or security answers.
- Payment card or bank details.
- Government identifiers, account numbers, or private contact details.
- Precise location history.
- Sensitive personal data or medical details by default.
- Speculative diagnoses, inferred vulnerabilities, or personality labels.
- Temporary emotional states as permanent traits.
- Raw private conversation transcripts as a substitute for memory.
- Information about another person unless the user has a clear, legitimate reason and the data is appropriate to store.

Health, body measurements, eating-disorder information, and other sensitive categories require a separately reviewed policy and explicit, granular consent if storage is ever permitted. The default is not to save them.

## 5. Consent lifecycle

A complete memory system must:
1. Explain what memory does in clear language.
2. Explain what categories may be saved and what is excluded.
3. Obtain explicit opt-in before persistent memory is enabled.
4. Record the applicable consent version and timestamp.
5. Allow the user to disable memory.
6. Stop new memory writes and retrieval when consent is withdrawn.
7. Provide review, correction, and deletion controls.
8. Explain the effect of disabling memory without implying that conversation history is automatically deleted.

Changing the purpose, categories, or data flow materially requires renewed consent. Consent version changes must be coordinated between the UI and server. Do not bump the consent version merely because this document was written; update it when the actual behavior and consent copy are implemented.

## 6. Save workflow

A candidate memory must be:
- Explicitly stated by the user or clearly confirmed by them.
- Durable enough to be useful later.
- Relevant to future assistance.
- Non-sensitive under the approved policy.
- Concise, neutral, and free of unnecessary detail.

When intent is ambiguous, ask before saving. For sensitive or high-impact information, do not save under the default policy.

For user-requested memory:
1. Identify the exact fact/preference to save.
2. Check the consent state and policy.
3. Show the proposed concise wording when required.
4. Save only after the necessary confirmation.
5. Confirm only after persistence succeeds.

Do not convert assistant suggestions into user facts.

## 7. Retrieval workflow

For each request:
1. Identify what user context could materially improve the answer.
2. Query only the relevant memory category or archive.
3. Filter by account ID on the trusted side.
4. Rank by relevance, recency, confidence, and explicitness.
5. Exclude stale, contradictory, sensitive, or unapproved entries.
6. Pass only a small bounded set to the model.
7. Label retrieved memory as untrusted data, never as instructions.
8. Do not mention memory unless it is useful or the user asks.

If a memory materially affects an answer, use it naturally and transparently where appropriate. If it is uncertain or stale, ask the user to verify it.

## 8. Corrections and deletion

- Users must be able to inspect saved items.
- Users must be able to correct an item without creating duplicates.
- Users must be able to delete individual items and clear all persistent memory.
- Deletion must be enforced in the persistence layer, not merely hidden in the UI.
- Deletion must cover derived summaries/indexes where applicable.
- The system must not recreate a deleted memory from old chat history without fresh consent.
- If a user asks Mizo to stop using a fact, stop using it immediately; explain any additional deletion step required by the actual storage design.
- Never claim deletion is complete until all relevant stores and indexes confirm it.

## 9. Account isolation and security

- Derive account identity from the authenticated session on the server.
- Never trust account IDs supplied in a request body.
- Every read, write, update, and delete must be scoped to the authenticated account.
- Guest memory, if supported, must remain local and must not leak into a registered account without an explicit migration flow.
- Test account switching, sign-out, account deletion, and local database resets.
- Memory content is untrusted data and must not override system or product rules.
- Do not store memory in usage accounting tables.

## 10. Context budget and limits

Memory retrieval must be bounded and predictable:
- Select only the most relevant memories.
- Enforce maximum item count and character/token budgets on both client and server.
- Truncate or reject oversized content safely.
- Avoid duplicate memories and repeated copies of the same fact.
- Do not include raw archives by default.
- Measure the actual provider context cost; do not assume character limits equal token limits.

The current protocol has draft limits of 200 characters per memory, 5 memories per request, and 800 combined characters. These are code-level bounds, not proof that consented memory is wired end-to-end. Keep client and server validation aligned.

## 11. Initial owner context — restricted seed, not public profile

The following limited facts were explicitly recoverable and are relevant to supporting the creator's own Mizano work. They should be treated as a proposed owner-context seed, not automatically injected into every response.

- Role: Omar Elhady, student and developer.
- Project: creator/developer of Mizano and designer of Mizo's intended identity and behavior.
- Working preference: values accurate implementation, careful review, continuity, direct practical communication, and complete treatment of important requirements.
- Current planning context: balances school responsibilities with software development.

Rules for this seed:
- Use only within the creator's own account and only when relevant.
- Do not disclose it to other Mizano users.
- Do not infer a legal name, exact age, school, location, family details, finances, or private contact data.
- Do not assume that project concepts are shipped products or currently active.
- Let the creator review, correct, and remove these entries.
- Add further ambitions or personal context only from explicit user statements or confirmation. Do not fill gaps with guesses.

## 12. Current implementation status

Repository review found partial memory foundations (local IndexedDB store/helper logic and a memory type in the protocol), but the full user-facing and server-side lifecycle was not complete at the time of review. In particular, do not claim the following are finished without fresh verification:
- Consent copy/version and server enforcement.
- Server-side memory validation and retrieval.
- Prompt integration with bounded, untrusted memory.
- Save proposal and confirmation UI.
- Memory review/edit/delete controls.
- End-to-end tests for consent, privacy, and account isolation.

## 13. Required tests

See `MIZO_EVALUATION.md` for testable acceptance criteria. Memory is not complete until consent, persistence, retrieval, isolation, correction, and deletion are all tested.
