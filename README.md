# AI Chat Platform

Production-ready Node.js backend built with Express, TypeScript, and ESM modules.

## Tech Stack

- **Node.js 20**
- **Express** - Web framework
- **TypeScript** - Type safety
- **ESM Modules** - Modern JavaScript modules
- **Zod** - Environment variable validation
- **Pino** - High-performance logging
- **Docker** - Containerization

## Project Structure

```
chat-api/           # Chat API application
  app.ts            # Express app + middleware
  server.ts         # HTTP server + graceful shutdown
  config/
    env.ts          # Environment validation and config
    logger.ts       # Pino logger configuration
  routes/
    health.ts       # /healthz endpoint
    index.ts        # Route aggregator
    v1/
      chat.ts       # POST /v1/chat/stream endpoint
      index.ts      # v1 route aggregator
  test/             # Integration tests
reporting-app/      # Reporting dashboard application
  src/              # Reporting app source code
  views/            # EJS templates
```

## Local Development

### Prerequisites

- Node.js 20 or higher
- npm

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` (or the PORT specified in `.env`).

### Available Scripts

- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server (requires build first)
- `npm run lint` - Run ESLint
- `npm test` - Run integration tests

### Test Health Endpoint

```bash
curl http://localhost:3000/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Chat Streaming Endpoint

Stream chat responses using Server-Sent Events (SSE):

```bash
curl -N -X POST http://localhost:3000/v1/chat/stream \
  -H "Content-Type: application/json" \
  -H "x-api-key: <account-api-key>" \
  -d '{"message": "Hello!", "accountNumber": 100001, "sourceClient": "default"}'
```

The `-N` flag disables buffering so you can see events as they arrive.

Expected SSE events:
```
event: meta
data: {"ok":true,"cache":"miss"}

event: token
data: {"text":"..."}

event: done
data: {"ok":true}
```

**Request Body:** 
- `message` (string, required): The chat message (max 300 characters)
- `accountNumber` (number, required): Tenant account number
- `sourceClient` (string, optional): Source tag; must exist in account settings if provided

## Docker

### Using Docker Compose

1. Build and start the service:
   ```bash
   docker-compose up --build
   ```

2. Or run in detached mode:
   ```bash
   docker-compose up -d --build
   ```

3. View logs:
   ```bash
   docker-compose logs -f app
   ```

4. Stop the service:
   ```bash
   docker-compose down
   ```

### Using Docker Directly

1. Build the image:
   ```bash
   docker build -t ai-chat-platform .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 \
    -e PORT=3000 \
    -e LOG_LEVEL=info \
    -e NODE_ENV=production \
    ai-chat-platform
   ```

### Test Health Endpoint (Docker)

```bash
curl http://localhost:3000/healthz
```

## First-Time Setup: Accounts & `.env` Walkthrough

Both `chat-api` and `reporting-app` read from `.env` files (copy each app's `.env.example` to `.env`). They share one PostgreSQL database via `DB_URL`. Here's what to set up, in order:

### 1. PostgreSQL database (required)

You need one Postgres database, reachable from both apps, set as `DB_URL` in **both** `chat-api/.env` and `reporting-app/.env`.

- **Local dev**: any local Postgres works (`postgresql://user:password@localhost:5432/dbname`). No manual schema setup needed — `reporting-app` runs `sql/migrations/*.sql` automatically on boot (idempotent, safe to re-run).
- **Hosted option (recommended): Supabase**
  1. Create a free project at supabase.com.
  2. In Project Settings → Database, copy the connection string (use the "Session pooler" or direct connection URI) and set it as `DB_URL`.
  3. You do **not** need the Supabase client libraries or API keys just for the database — `DB_URL` alone is enough for `pg`.
  4. Only set `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (in `reporting-app/.env`) if you also want Supabase Auth for Google/social login on top of the existing email/password login — this is optional.
- The database must have the `pgcrypto` extension available (Supabase enables it by default; on self-hosted Postgres run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` once) — it's used to encrypt API keys and PayPal secrets at rest.

### 2. Gemini API key (required, chat-api only)

1. Create a key at https://aistudio.google.com/app/apikey.
2. Set `GEMINI_KEY` in `chat-api/.env`. `GEMINI_MODEL` defaults to a Flash model; override if needed.

### 3. MailerSend account (required, reporting-app only)

Used for: account-creation emails, password reset emails, and Contact Us form notifications.

1. Create a free account at mailersend.com.
2. Verify a sending domain (or use their test domain while developing).
3. Create an API token (Settings → API Tokens) and set it as `MAILERSEND_API_KEY`.
4. Set `MAIL_FROM` to a verified sender address on that domain.
5. Optionally set `CONTACT_NOTIFY_EMAIL` to a different inbox for Contact Us submissions (defaults to `MAIL_FROM`).

### 4. PayPal account (required for credit purchases)

Used for one-time, pay-as-you-go credit purchases (Orders v2 API). No subscription/Stripe integration exists in this codebase.

1. Create a developer account at developer.paypal.com and create a Sandbox app (Apps & Credentials → Create App) to get a sandbox **Client ID** and **Secret**.
2. You can either:
   - Set `PAYPAL_ENVIRONMENT=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` in `reporting-app/.env` as a fallback, **or**
   - Leave them blank and instead log in as a sysadmin and configure them at `/admin/paypal` once the app is running — values saved there (in the `paypal_settings` table) always take priority over the `.env` fallback.
3. To receive purchase confirmations via webhook, create a webhook in the PayPal Developer Dashboard pointing to `${APP_BASE_URL}/api/billing/paypal/webhook`, subscribe to payment/checkout events, and set the webhook ID (`PAYPAL_WEBHOOK_ID` env var or the Webhook ID field on `/admin/paypal`).
4. When ready for real payments, create a Live app in the same dashboard and switch `environment` to `live` (either via `.env` or `/admin/paypal`).
5. Credit package names/prices are also configured at `/admin/paypal` — no env vars needed for pricing.

### 5. Session/encryption secrets (required)

These aren't third-party accounts, just secrets you generate yourself (e.g. `openssl rand -hex 32`):

- `SESSION_SECRET` (reporting-app, min 32 chars) — signs session cookies.
- `MESSAGE_ENCRYPTION_KEY` (both apps, must match) — used by `pgcrypto` to encrypt stored API keys and the PayPal client secret. Must be identical in both `.env` files since both apps read/write encrypted columns in the same DB.
- `ADMIN_USER` / `ADMIN_PASS` (reporting-app) — bootstrap sysadmin login credentials.

### 6. Roblox-side scripts

`roblox_scripts/` (e.g. `LevelModule.lua`) run inside Roblox Studio/Roblox's own runtime, not Node — they don't read `.env` and don't need any of the accounts above. They call the deployed `chat-api` HTTP endpoint directly using the per-account API key issued from `/settings` in `reporting-app`.

## Environment Variables

### chat-api

- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level: fatal, error, warn, info, debug, trace (default: info)
- `NODE_ENV` - Environment: development, production, test (default: development)
- `DB_URL` - PostgreSQL connection URL
- `GEMINI_KEY` - Gemini API key
- `GEMINI_MODEL` - Gemini model name
- `MESSAGE_ENCRYPTION_KEY` - Key for pgcrypto message encryption
- `CHAT_RATE_LIMIT_WINDOW_MS` - Rate limit window in ms (default: 60000)
- `CHAT_RATE_LIMIT_MAX` - Max requests per window (default: 60)

### reporting-app

- `PORT` - Server port (default: 3001)
- `LOG_LEVEL` - Logging level: fatal, error, warn, info, debug, trace (default: info)
- `NODE_ENV` - Environment: development, production, test (default: development)
- `COOKIE_SECURE` - Use secure cookies (true/false)
- `DB_URL` - PostgreSQL connection URL
- `ADMIN_USER` - Bootstrap admin email
- `ADMIN_PASS` - Bootstrap admin password
- `SESSION_SECRET` - Session signing secret (min 32 chars)
- `MESSAGE_ENCRYPTION_KEY` - Key for pgcrypto message encryption
- `MAILERSEND_API_KEY` - MailerSend API key
- `MAIL_FROM` - Sender email
- `CONTACT_NOTIFY_EMAIL` - Where the Contact Us form notifies (optional, falls back to `MAIL_FROM`)
- `APP_BASE_URL` - Base URL for web app (used in links + CORS)
- `CHAT_API_URL` - Chat API base URL for settings page
- `AUTH_RATE_LIMIT_WINDOW_MS` - Rate limit window in ms (default: 60000)
- `AUTH_RATE_LIMIT_MAX` - Max auth requests per window (default: 10)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Optional, only needed for Google/social login
- `PAYPAL_ENVIRONMENT`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` - Fallback PayPal credentials used only if no row exists in the `paypal_settings` table (configure from `/admin/paypal` instead once the app is running)
- `PAYPAL_PRO_PLAN_ID`, `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL` - Optional, only used by the legacy subscription flow

### Reporting Auth Notes

- State-changing requests require the `x-csrf-token` header.
- The token is returned by `/api/auth/login` and `/api/auth/me`.

## Features

- ✅ TypeScript with strict type checking
- ✅ ESM modules support
- ✅ Environment variable validation with Zod
- ✅ Structured logging with Pino
- ✅ Graceful shutdown (SIGINT/SIGTERM)
- ✅ Error handling middleware
- ✅ Health check endpoint
- ✅ Docker multi-stage build
- ✅ Production-ready structure
