# ============================================
# CODING WORLD BACKEND - DOCKERFILE
# ============================================

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules (argon2, sharp)
RUN apk add --no-cache python3 make g++ libc6-compat vips-dev

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npm ci && \
    npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache libc6-compat vips-dev dumb-init

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

# Create upload directory
RUN mkdir -p uploads && chown expressjs:nodejs uploads

USER expressjs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
