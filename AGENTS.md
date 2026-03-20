# AGENTS.md

## Purpose

This repository contains an AI chat platform implemented with Node.js, TypeScript, and Express. Use this file as the default operating guide for coding agents working in the repo.

## Repository Layout

- `chat-api/`: primary chat API application
- `reporting-app/`: reporting/dashboard application
- `src/`: top-level Express app sources used by the root package
- `test/`: shared or root-level tests
- `dist/`: build output

Important files:

- `package.json`: root scripts and dependencies
- `README.md`: setup, environment variables, and API behavior
- `chat-api/routes/v1/chat.ts`: chat streaming route referenced frequently during development

## Tech Stack

- Node.js 20+
- TypeScript
- Express
- ESM modules
- Zod for config validation
- Pino for logging
- Vitest for tests

## Standard Workflow

1. Read the relevant code before changing behavior.
2. Keep changes scoped to the requested task.
3. Preserve existing module style and naming conventions.
4. Run targeted verification when possible before finishing.

## Local Commands

From the repository root:

- `npm install`: install dependencies
- `npm run dev`: start the development server with `tsx watch`
- `npm run build`: compile TypeScript
- `npm test`: run the test suite with Vitest
- `npm run test:watch`: run tests in watch mode
- `npm run lint`: lint `chat-api`

## Coding Conventions

- Prefer small, explicit TypeScript changes over broad refactors.
- Follow existing ESM import style.
- Keep environment access centralized through config modules.
- Reuse existing logger and route patterns.
- Avoid introducing new dependencies unless necessary for the task.
- Do not commit secrets, generated credentials, or `.env` values.

## API Notes

- Health endpoint: `GET /healthz`
- Chat streaming endpoint: `POST /v1/chat/stream`
- Streaming responses use Server-Sent Events (SSE).

## Validation

When code changes are made, prefer this order:

1. Run targeted tests for the affected area.
2. Run `npm test` if the change touches shared behavior.
3. Run `npm run build` for type-level verification when relevant.

If verification cannot be run, state that clearly in the final handoff.

## Guardrails

- Do not make unrelated refactors while addressing a focused request.
- Do not overwrite user changes you did not make.
- Treat `dist/` as generated output unless the task explicitly requires updating built artifacts.
- Prefer editing source files over generated files.

## Handoff Expectations

Final updates should state:

- what changed
- what verification was run
- any remaining risks or follow-up items
