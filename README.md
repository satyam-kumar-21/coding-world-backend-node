# Coding World — Backend API

Production-ready Node.js backend powering both **[codingworld.in](https://www.codingworld.in)** (LMS + coding practice platform) and **[connect.codingworld.in](https://connect.codingworld.in)** (developer social network) from a **single codebase, single PostgreSQL database, and single user account system**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js 4 |
| Language | TypeScript 5 (strict mode) |
| Database | PostgreSQL 16 via Prisma ORM |
| Cache / Queue | Redis 7 + BullMQ |
| Realtime | Socket.IO 4 + Redis Adapter |
| Auth | JWT (access + refresh rotation) + Argon2id |
| Validation | Zod |
| Storage | AWS S3 (abstracted — MinIO compatible) |
| Email | Nodemailer (SMTP abstraction) |
| Payments | Razorpay |
| Logging | Pino + pino-pretty |
| API Docs | Swagger / OpenAPI 3.0 |
| Testing | Jest + Supertest |
| Containers | Docker + docker-compose |

---

## Project Structure

```
src/
├── app.ts                    # Express app factory
├── server.ts                 # HTTP server + bootstrap
├── config/                   # env, database, redis, logger, swagger
├── constants/                # App-wide constants & enums
├── types/                    # TypeScript interfaces & types
├── utils/                    # response, pagination, jwt, crypto, slugify
├── lib/                      # redis.service, storage.service, email.service, queue.service
├── middlewares/              # authenticate, errorHandler, rateLimiter, validate, upload
├── sockets/                  # Socket.IO setup + event handlers
├── jobs/                     # BullMQ workers (email, notifications, xp, execution, cleanup)
└── modules/
    ├── auth/                 # register, login, logout, refresh, verify, reset
    ├── users/                # profile, avatar, privacy, education
    ├── courses/              # LMS: courses, sections, lectures, enroll, progress, reviews
    ├── payments/             # Razorpay orders, verify, webhooks, transactions
    ├── notes/                # Personal notes + file resources
    ├── bootcamps/            # Bootcamps, sessions, enrollment, attendance
    ├── problems/             # Coding problems (DSA, JS, SQL, MCQ, …)
    ├── submissions/          # Code submission → BullMQ → sandbox → result
    ├── rankings/             # XP, levels, streaks, leaderboards, achievements
    ├── posts/                # Social feed (text, image, link, question, poll, …)
    ├── comments/             # Comments, replies, reactions
    ├── connections/          # Send/accept/reject/block developer connections
    ├── notifications/        # In-app notifications (cursor-paginated)
    ├── chat/                 # Direct + group chat with cursor-paginated messages
    ├── live/                 # Live Developers — real-time presence
    ├── rooms/                # Collaboration sessions (chat, shared coding)
    ├── search/               # Global search across users, courses, problems, posts
    └── admin/                # Dashboard metrics, user management, moderation

prisma/
├── schema.prisma             # Complete DB schema with indexes
├── seed.ts                   # Admin, instructor, student, courses, problems seed
└── migrations/               # Auto-generated Prisma migrations

tests/
├── setup.ts
├── unit/utils/               # Pagination, crypto, jwt, slugify, response utils
└── integration/              # Auth, courses, problems HTTP tests

uploads/                      # Local dev uploads (not committed)
```

---

## Environment Setup

### 1 — Clone & install

```bash
git clone https://github.com/your-org/coding-world-backend.git
cd coding-world-backend
npm install
```

### 2 — Environment variables

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

Required variables:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/codingworld_db
JWT_ACCESS_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
REDIS_URL=redis://localhost:6379
```

---

## PostgreSQL Setup

### Docker (recommended for dev)

```bash
docker-compose up -d postgres
```

### Manual

```bash
createdb codingworld_db
```

Set `DATABASE_URL` in `.env`.

---

## Redis Setup

### Docker

```bash
docker-compose up -d redis
```

### Manual

Install Redis 7+ and ensure it is running on port 6379.

---

## Prisma Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (dev)
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Open Prisma Studio
npm run prisma:studio
```

### Production migrations

```bash
npm run prisma:migrate:prod
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (tsx watch)
npm run dev

# Type-check only (no emit)
npm run type-check

# Lint
npm run lint:check
npm run lint        # auto-fix

# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

---

## Production Commands

```bash
# Build TypeScript → dist/
npm run build

# Start production server
npm start
```

---

## Docker Setup

```bash
# Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# Start only infrastructure (for local dev)
docker-compose up -d postgres redis

# Start with dev tools (MinIO + PgAdmin)
docker-compose --profile dev up -d

# View logs
docker-compose logs -f api

# Stop everything
docker-compose down
```

---

## API Documentation

Once the server is running:

```
http://localhost:5000/api/docs
```

Swagger UI with all endpoints documented.

---

## API Base URL

```
/api/v1
```

### Key endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Current user |
| GET | `/api/v1/users/:username` | User profile |
| GET | `/api/v1/courses` | List courses |
| POST | `/api/v1/courses` | Create course (instructor) |
| POST | `/api/v1/courses/:id/enroll` | Enroll free course |
| GET | `/api/v1/problems` | List problems |
| POST | `/api/v1/submissions` | Submit code |
| GET | `/api/v1/rankings/global` | Global leaderboard |
| GET | `/api/v1/posts` | Social feed |
| POST | `/api/v1/connections/send` | Send connection request |
| GET | `/api/v1/notifications` | User notifications |
| GET | `/api/v1/chat` | Conversations |
| GET | `/api/v1/live` | Live developers |
| GET | `/api/v1/search?q=react` | Global search |
| GET | `/api/v1/admin/dashboard` | Admin metrics |
| GET | `/health` | Health check |

---

## Authentication Flow

```
POST /auth/register
  → creates User + UserProfile + UserGamification + UserStreak
  → queues verification email
  → returns { user, tokens: { accessToken, refreshToken } }

POST /auth/login
  → validates credentials (Argon2id)
  → issues short-lived access token (15m) + long-lived refresh token (7d)
  → refresh token stored in PostgreSQL with family tracking
  → refresh token also set as httpOnly cookie

POST /auth/refresh
  → validates refresh token family (rotation + reuse detection)
  → revokes old token, issues new pair
  → full family revoked on reuse detection

Authorization header:
  Authorization: Bearer <accessToken>
```

---

## Role-Based Access Control

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Full platform access |
| `ADMIN` | Platform management |
| `INSTRUCTOR` | Create/manage courses & problems |
| `MODERATOR` | Content moderation |
| `USER` | Default registered user |
| `STUDENT` | Enrolled student alias |

---

## Socket.IO Architecture

```
Client → connects with JWT token
       → socketAuth middleware validates token
       → joins personal room: user:{userId}
       → registers handlers: presence, chat, live, rooms

Events:
  user:online / user:offline       → presence
  message:send / message:new       → real-time chat
  user:typing / user:stopTyping    → typing indicators
  message:read                     → read receipts
  live:join / live:leave           → Live Developers
  notification:new                 → push notifications
  submission:result                → code execution results
  session:joined / session:message → collaboration rooms
```

Redis adapter enables horizontal scaling across multiple server instances.

---

## Code Execution Architecture

```
Frontend
  └─→ POST /api/v1/submissions
        └─→ Submission saved (PENDING)
        └─→ Job enqueued to Redis/BullMQ (code-execution queue)
              └─→ Code Execution Worker
                    └─→ External Sandbox Service (Docker-isolated)
                          └─→ Result returned
                    └─→ Submission updated (ACCEPTED / WRONG_ANSWER / …)
                    └─→ Socket.IO: submission:result emitted to user
                    └─→ XP awarded if first accepted
```

**IMPORTANT:** User code is NEVER executed inside the Express process. Always sandboxed externally. Set `CODE_EXECUTION_SERVICE_URL` in `.env` to connect a sandbox. Without it, a mock result is used in development.

---

## AWS S3 Configuration

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=codingworld-storage
```

### MinIO (local S3-compatible dev)

```env
AWS_S3_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
```

Start MinIO:
```bash
docker-compose --profile dev up -d minio
```

---

## Razorpay Configuration

```env
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Payment flow

```
1. POST /api/v1/payments/orders         → creates internal order + Razorpay order
2. Frontend completes Razorpay checkout
3. POST /api/v1/payments/verify         → server-side signature verification
   → on success: enrollment granted + receipt email queued
4. POST /api/v1/payments/webhook        → Razorpay webhook (raw body + HMAC verified)
```

Course prices are **always fetched from the database** — never trusted from the frontend.

---

## Deployment Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- PM2 or similar process manager (or Docker)

### Steps

```bash
# 1. Install dependencies
npm ci --only=production

# 2. Generate Prisma client
npx prisma generate

# 3. Run migrations
npx prisma migrate deploy

# 4. Build
npm run build

# 5. Start
npm start
# or with PM2:
pm2 start dist/server.js --name coding-world-api
```

### Docker deployment

```bash
docker build -t coding-world-api .
docker run -d \
  --env-file .env \
  -p 5000:5000 \
  coding-world-api
```

Or with docker-compose:

```bash
docker-compose up -d
```

---

## CORS Configuration

The API allows requests from:

- `https://www.codingworld.in`
- `https://connect.codingworld.in`
- `http://localhost:3000`
- `http://localhost:3001`

Set `CORS_ORIGINS` in `.env` to add more origins (comma-separated).

---

## Single Account Architecture

A user registered on `codingworld.in` **automatically** works on `connect.codingworld.in`:

```
User registers on codingworld.in
  → PostgreSQL User record created
  → UserProfile created (used by both frontends)
  → UserGamification created (XP, levels, streaks)
  → Same JWT works on both domains
  → Same courses, problems, connections, chat across both platforms
```

Both frontends call the same `/api/v1/*` endpoints. There is no separate user database.

---

## Seed Credentials

After running `npm run prisma:seed`:

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@codingworld.in | Admin@CodingWorld2024! |
| Instructor | instructor@codingworld.in | Instructor@CW2024! |
| Student | student@codingworld.in | Student@CW2024! |

> Never use these credentials in production. Set `SEED_ADMIN_PASSWORD` in `.env`.

---

## License

MIT © Coding World
