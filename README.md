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
- `APP_BASE_URL` - Base URL for web app (used in links + CORS)
- `CHAT_API_URL` - Chat API base URL for settings page
- `AUTH_RATE_LIMIT_WINDOW_MS` - Rate limit window in ms (default: 60000)
- `AUTH_RATE_LIMIT_MAX` - Max auth requests per window (default: 10)

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
