# Reporting Dashboard

A Node.js 20 + Express + EJS application for reporting and analytics.

## Tech Stack

- **Node.js 20**
- **Express** - Web framework
- **EJS** - Template engine
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Express Session** - Session management
- **Zod** - Environment variable validation
- **Pino** - High-performance logging
- **ESM Modules** - Modern JavaScript modules

## Project Structure

```
reporting-app/
  src/
    app.ts            # Express app + middleware
    server.ts         # HTTP server + graceful shutdown
    config/
      env.ts          # Environment validation and config
      logger.ts       # Pino logger configuration
      db.ts           # PostgreSQL connection
    middleware/
      auth.ts         # Session authentication middleware
    routes/
      login.ts        # Login/logout routes
      health.ts       # /healthz endpoint
      index.ts        # Dashboard route
  views/              # EJS templates
    login.ejs         # Login page
    dashboard.ejs     # Dashboard page
    error.ejs         # Error page
```

## Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- npm

## Setup

1. Install dependencies:
   ```bash
   cd reporting-app
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Configure your `.env` file:
   - Set `DB_URL` to your PostgreSQL connection string
   - Set `ADMIN_USER` and `ADMIN_PASS` for login credentials
   - Set `SESSION_SECRET` to a secure random string (min 32 characters)

4. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001` (or the PORT specified in `.env`).

## Available Scripts

- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server (requires build first)
- `npm run lint` - Run ESLint

## Environment Variables

- `PORT` - Server port (default: 3001)
- `LOG_LEVEL` - Logging level: fatal, error, warn, info, debug, trace (default: info)
- `NODE_ENV` - Environment: development, production, test (default: development)
- `DB_URL` - PostgreSQL connection URL (required)
- `ADMIN_USER` - Admin username for login (required)
- `ADMIN_PASS` - Admin password for login (required)
- `SESSION_SECRET` - Secret key for session encryption (min 32 characters)

## Endpoints

### Public Endpoints

- `GET /healthz` - Health check endpoint (includes database connection status)
- `GET /login` - Login page
- `POST /login` - Login form submission

### Protected Endpoints

- `GET /` - Dashboard (requires authentication)
- `POST /logout` - Logout

## Health Check

Test the health endpoint:

```bash
curl http://localhost:3001/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## Authentication

The application uses session-based authentication. After logging in with valid credentials, a session cookie is set and you'll be redirected to the dashboard.

To logout, click the "Logout" button in the dashboard header or POST to `/logout`.

## Features

- ✅ TypeScript with strict type checking
- ✅ ESM modules support
- ✅ Session-based authentication
- ✅ PostgreSQL database connection
- ✅ Environment variable validation with Zod
- ✅ Structured logging with Pino
- ✅ Graceful shutdown (SIGINT/SIGTERM)
- ✅ Error handling middleware
- ✅ Health check endpoint with database status
- ✅ EJS templating for views

## Database Connection

The application connects to PostgreSQL using the `DB_URL` environment variable. The connection is tested on startup, and the server will not start if the database connection fails.

Example `DB_URL` format:
```
postgresql://username:password@host:port/database
```

## Notes

- Charts and reporting features are not yet implemented
- The dashboard currently shows a welcome message
- Session cookies are HTTP-only and secure in production mode


