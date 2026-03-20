# AGENTS.md

## Scope

This directory contains the reporting UI and its backend routes. Changes here should preserve accurate admin reporting and safe presentation of conversation data.

## Primary Areas

- `src/pages/`: React screens
- `src/routes/`: backend API endpoints for dashboard data
- `src/middleware/`: auth and access control
- `views/`: server-rendered templates still used in parts of the app

## Guardrails

- Preserve authentication and account scoping on every reporting endpoint.
- Show complete conversation data on detail views unless truncation is explicitly intended for list previews.
- Keep exports, summaries, and detail pages consistent with the same underlying data.
- Do not expose secrets or internal-only fields in API responses.
- Avoid editing `dist/` unless the task explicitly requires generated output updates.

## Verification

After client or reporting-route changes, prefer:

1. `npm run build` from `reporting-app/`
2. Manual verification of the affected page or API response
3. Any targeted linting or tests available for touched files

If verification is skipped or blocked, state that in the handoff.
