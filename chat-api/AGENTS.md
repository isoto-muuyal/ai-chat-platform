# AGENTS.md

## Scope

This directory contains the server-side chat API. Changes here should prioritize API correctness, data integrity, and safe handling of stored conversation data.

## Primary Areas

- `routes/`: HTTP endpoints, including chat streaming
- `config/`: environment, logging, and database setup
- `src/services/`: server-side business logic such as sentiment analysis
- `test/`: API tests

## Guardrails

- Keep request validation strict and explicit.
- Preserve account scoping and authorization behavior.
- Do not log secrets, API keys, or decrypted sensitive payloads unless explicitly required.
- Prefer storing the raw user message for analytics and logs, not prompt-expanded variants.
- Avoid editing `dist/` unless the task explicitly requires generated output updates.

## Verification

After server-side changes, prefer:

1. Targeted endpoint or unit checks for the affected route or service
2. `npm run build` from `chat-api/`
3. Any relevant integration tests if available

If verification is skipped or blocked, state that in the handoff.
