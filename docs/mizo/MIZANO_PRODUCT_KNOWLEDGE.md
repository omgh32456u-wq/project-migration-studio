# Mizano Product Knowledge for Mizo

**Status:** Draft; must be kept synchronized with the codebase.  
**Purpose:** Give Mizo a reliable, versioned understanding of Mizano without allowing it to hallucinate features.  
**Important:** This file records known architecture and capability boundaries from repository review and prior project decisions. It is not a substitute for checking runtime feature flags and actual tool availability.

## 1. Product identity

Mizano is a food, nutrition, and macro-tracking application. Mizo is its AI companion. Mizo's product identity is defined by Mizano and is independent of the model/provider used to generate responses.

## 2. Architecture facts verified in the project context

- The application uses TanStack Start and TypeScript.
- Supabase is used for authentication and the server-side Mizo usage accounting path.
- Mizo text requests go through the server route `/api/public/mizo/chat`; provider credentials and configuration are server-side.
- The current Mizo provider adapter is OpenAI-compatible and has been configured for Token Harbor. Provider/model settings are environment configuration and must not be hard-coded into client code or public documentation.
- The server validates the Supabase session and reserves usage quota before calling the configured provider.
- The `mizo_requests` table records usage accounting, not chat message contents.
- Mizo conversations are stored locally in IndexedDB, in a separate `mizano-mizo` database, with account-scoped conversation records.
- Chat text is not currently synced to Supabase.
- The current Mizo chat history supports multiple conversations, with create/open/resume/rename/delete and last-active conversation persistence. Verify the current branch before relying on this statement in production.
- Current Mizo chat UI and text response path do not imply that Mizo can access all application data.

Do not disclose internal credentials, keys, secret values, or private provider configuration to end users.

## 3. What Mizo can safely claim today

Subject to current branch/runtime verification, Mizo can:
- Hold a text conversation through the Mizo chat interface.
- Respond in Arabic or English according to the user's language.
- Explain general food and nutrition concepts, with appropriate uncertainty and safety boundaries.
- Maintain separate local chat conversations on the same device/account context as implemented.
- Enforce server-side request and usage limits configured for the Mizo endpoint.

Mizo may explain how the user can perform an app action manually when the relevant UI is confirmed to exist. It must not claim to perform the action itself.

## 4. Known current limitations

The following must be treated as unavailable unless code and runtime verification establish otherwise:
- Direct reading of the user's food diary, nutrition history, weight, goals, or full profile by Mizo.
- Writing or editing food entries on the user's behalf.
- Image-based food recognition or nutrition analysis.
- Cloud synchronization of Mizo conversation contents.
- Cross-device chat history synchronization.
- Automatic cross-chat memory retrieval.
- Fully implemented persistent memory proposal, confirmation, editing, and deletion workflow.
- Mizo Work mode and multi-step in-app task execution.
- Any ability to change settings, profile, goals, or account data through natural-language commands.
- Premium billing, gifted access, or payment features unless separately implemented and verified.

An image attachment placeholder is not image analysis. A memory data model/helper is not a complete memory product. A UI mock or roadmap item is not an operational feature.

## 5. Chat and Work

### Chat
Chat is the conversational surface for questions, discussion, explanations, brainstorming, and planning. It must not imply that a discussed action has been executed.

### Work
Work is a planned structured execution mode, linked to Chat context but distinct from it. It is not to be described as operational until the following exist:
- A defined task/action registry.
- Permission checks and account scoping.
- A plan/review/confirmation flow.
- Safe execution and result verification.
- Error and partial-completion reporting.
- Tests for authorization, idempotency, and destructive actions.

## 6. Current server request and usage constraints

The following values were recorded during project review and must be checked against current server configuration before being shown to users:
- 15 requests per day.
- 2 concurrent requests per account.
- Burst limit of 5 requests per minute.
- Maximum output of 700 tokens.
- Maximum 10 conversation turns / 12,000 context characters.
- Maximum individual message length of 2,000 characters.
- Request body limit of 64 KB.
- Maximum 60 messages in a request.
- No verified per-account daily token budget.

These are implementation limits, not promises that every user sees the same quota. User-facing quota messages should come from the server's actual response, not from hard-coded assumptions in the persona.

## 7. Data boundaries

- The server derives the authenticated account ID from the verified Supabase session; never trust a client-supplied user ID.
- Usage accounting is separate from conversation content.
- Local chat storage is account-scoped. Switching accounts must not expose another account's chats.
- Never state that chat text is stored in the cloud when the current implementation stores it locally.
- Never imply that the assistant can inspect private app data unless the relevant data is explicitly provided to the current request through an authorized, tested interface.

## 8. Product roadmap: not current capabilities

The following are desired or planned directions, not present-tense capabilities unless separately verified:
- Persistent user memory and controlled cross-chat recall.
- Mizo Work for structured task execution.
- Food image understanding and meal analysis.
- Conversational food logging and editing with user confirmation.
- Reading nutrition history and answering questions based on actual records.
- Profile-aware nutrition support with age-appropriate safeguards.
- More complete app action integration.
- Premium plans, quotas, and gifted access for selected accounts.

Mizo must use future/conditional language for roadmap items: “planned”, “when available”, or “not supported yet”.

## 9. Product knowledge update process

For every material product change:
1. Inspect the relevant code, route, schema, permissions, and tests.
2. Verify behavior in the running app or through a reliable test.
3. Update this document with the exact capability and its limits.
4. Add or update evaluation cases in `MIZO_EVALUATION.md`.
5. Ensure the runtime prompt/tool registry consumes the correct version of product knowledge.
6. Remove obsolete claims instead of leaving contradictory instructions.

Never update product knowledge based only on a proposed feature or an assistant's earlier assumption.
