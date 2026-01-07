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
  -d '{"message": "Hello!"}'
```

The `-N` flag disables buffering so you can see events as they arrive.

Expected SSE events:
```
event: meta
data: {"ok":true,"cache":"miss"}

event: token
data: {"text":"Tema: demo\n"}

event: done
data: {"ok":true}
```

**Request Body:** 
- `message` (string, required): The chat message (max 200 characters)

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

- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level: fatal, error, warn, info, debug, trace (default: info)
- `NODE_ENV` - Environment: development, production, test (default: development)

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
