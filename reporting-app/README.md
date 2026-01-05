# Reporting Dashboard

A React-based reporting dashboard with Express backend for analyzing chat platform data.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js 20 + Express + TypeScript
- **Database**: PostgreSQL (via node-postgres)
- **Charts**: Chart.js with react-chartjs-2
- **Authentication**: Session-based (express-session)
- **Exports**: CSV + XLSX (exceljs)

## Project Structure

```
reporting-app/
  src/
    components/        # React components
    contexts/          # React contexts (Auth)
    pages/             # Page components
    routes/            # Express API routes
    config/            # Configuration (env, db, logger)
    middleware/        # Express middleware
    app.ts             # Express app setup
    server.ts          # HTTP server
    main.tsx           # React entry point
    App.tsx            # React app router
  dist/                # Build output (frontend + backend)
  index.html           # HTML template
```

## Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- npm

## Local Development

### Setup

1. Install dependencies:
   ```bash
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

4. Start development servers (Vite + Express):
   ```bash
   npm run dev
   ```

   This runs:
   - Frontend: http://localhost:5173 (Vite dev server)
   - Backend: http://localhost:3001 (Express API)

   The Vite dev server proxies `/api` requests to the backend.

### Available Scripts

- `npm run dev` - Run both frontend and backend in development mode
- `npm run dev:frontend` - Run only Vite dev server
- `npm run dev:backend` - Run only Express backend
- `npm run build` - Build both frontend and backend for production
- `npm run build:frontend` - Build only React app
- `npm run build:backend` - Build only Express backend
- `npm start` - Start production server (requires build first)
- `npm run lint` - Run ESLint

## Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

   The server will serve the React app and API on port 3001 (or PORT from .env).

## Docker

### Build and Run

1. Build the Docker image:
   ```bash
   docker build -t reporting-app .
   ```

2. Run the container:
   ```bash
   docker run -p 3001:3001 \
    -e PORT=3001 \
    -e DB_URL=postgresql://user:pass@host:5432/db \
    -e ADMIN_USER=admin \
    -e ADMIN_PASS=changeme \
    -e SESSION_SECRET=your-secret-min-32-chars \
    -e LOG_LEVEL=info \
    -e NODE_ENV=production \
    reporting-app
   ```

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  reporting-app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DB_URL=${DB_URL}
      - ADMIN_USER=${ADMIN_USER}
      - ADMIN_PASS=${ADMIN_PASS}
      - SESSION_SECRET=${SESSION_SECRET}
      - LOG_LEVEL=info
      - NODE_ENV=production
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `LOG_LEVEL` - Logging level: fatal, error, warn, info, debug, trace (default: info)
- `NODE_ENV` - Environment: development, production, test (default: development)
- `DB_URL` - PostgreSQL connection URL (required)
- `ADMIN_USER` - Admin username for login (required)
- `ADMIN_PASS` - Admin password for login (required)
- `SESSION_SECRET` - Secret key for session encryption (min 32 characters)

## API Endpoints

All API endpoints require authentication (except `/api/auth/login`).

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Data
- `GET /api/overview?days=7|30|90` - Dashboard overview
- `GET /api/topics?days=30` - Topics list
- `GET /api/topics/timeseries?days=30&top=5` - Topics timeseries
- `GET /api/troll?days=30` - Troll analysis
- `GET /api/users?days=90` - Users list
- `GET /api/conversations?from=&to=&topic=&sentiment=&user=&is_troll=&page=&pageSize=` - Conversations list
- `GET /api/conversations/:id` - Conversation detail

### Exports
- `GET /api/export/messages.csv` - Export messages as CSV
- `GET /api/export/messages.xlsx` - Export messages as XLSX
- `GET /api/export/topics.xlsx?days=30` - Export topics as XLSX

## Database Schema

The application expects the following tables:

- `conversations` (id uuid pk, roblox_user_id bigint, roblox_username text, started_at timestamp, last_message_at timestamp, topic text, sentiment text)
- `messages` (id uuid pk, conversation_id uuid fk, sender text, content text, created_at timestamp, is_troll boolean)
- `analytics` (id uuid pk, roblox_user_id bigint, country text, inferred_age_range text, created_at timestamp)

**Note**: The application does NOT create tables or migrations. Ensure your database schema is set up before running the application.

## Features

- ✅ React 18 with TypeScript
- ✅ Vite for fast development and building
- ✅ Express backend with TypeScript
- ✅ Session-based authentication
- ✅ PostgreSQL database integration
- ✅ Chart.js visualizations
- ✅ CSV and XLSX exports
- ✅ Responsive design
- ✅ Parameterized SQL queries (SQL injection protection)
- ✅ UTC timezone handling
- ✅ Query parameter validation with Zod
- ✅ CORS configured for same-origin
- ✅ Production-ready Docker setup

## Pages

1. **Login** (`/login`) - Admin login page
2. **Dashboard** (`/dashboard`) - Overview with totals, metrics, top topics, sentiment
3. **Topics** (`/topics`) - Topic analysis with timeseries charts
4. **Troll** (`/troll`) - Troll analysis with charts
5. **Users** (`/users`) - User list with analytics data
6. **Conversations** (`/conversations`) - Conversation explorer with filters
7. **Conversation Detail** (`/conversations/:id`) - Message timeline for a conversation
