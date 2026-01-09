# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend files
COPY package.json ./
COPY package-lock.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY index.html ./
COPY src ./src

# Install dependencies and build
RUN npm ci
RUN npm run build:frontend

# Build stage for backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy backend files
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
COPY src ./src

# Install dependencies and build
RUN npm ci 
RUN npm run build:backend

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built frontend
COPY --from=frontend-builder /app/dist/public ./dist/public

# Copy built backend
COPY --from=backend-builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["node", "dist/server.js"]
