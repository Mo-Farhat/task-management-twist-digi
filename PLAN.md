# TaskFlow — Architecture & Security Plan

## 1. Backend Choice Justification

### Why Next.js API Routes (Serverless) Over a Dedicated Backend

The project is deployed on **Vercel**, which natively supports Next.js API routes as serverless functions. Choosing this approach over a traditional Express/Node.js backend hosted separately (e.g., on Railway, Render, or a VPS) was a deliberate decision for this use case:

| Concern                   | Next.js API Routes (chosen)                                                           | Separate Express Backend                                                       |
| ------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Deployment complexity** | Single `git push` deploys frontend + backend together                                 | Two separate deployments, two CI/CD pipelines, CORS configuration between them |
| **Infrastructure cost**   | Vercel's generous free tier covers the full-stack app                                 | VPS or Railway adds a second billing surface and requires uptime monitoring    |
| **Cold starts**           | Acceptable for a task management app — API routes spin up in ~100–300ms               | Always-on server eliminates cold starts but costs more at idle                 |
| **DevEx**                 | Shared TypeScript types between frontend and backend, no API client generation needed | Requires maintaining a shared types package or OpenAPI spec                    |
| **Scaling**               | Scales automatically per-function; no capacity planning                               | Manual scaling configuration or container orchestration                        |

For a task management application with moderate traffic, the serverless model fits naturally — requests are short-lived CRUD operations and occasional AI calls, not persistent WebSocket connections or long-running processes.

### Why NeonDB Over a Self-Hosted PostgreSQL

**Neon** is a serverless-native PostgreSQL provider. It was chosen over hosting PostgreSQL on a VPS for several reasons:

1. **Serverless connection handling** — Neon uses a WebSocket-based connection proxy that plays nicely with Vercel's ephemeral function model. Traditional PostgreSQL on a VPS would exhaust connection limits quickly under serverless concurrency, requiring a separate connection pooler like PgBouncer.

2. **Zero infrastructure management** — No SSH, no `pg_hba.conf`, no backup scripts, no OS patching. Neon handles replication, point-in-time recovery, and automatic scaling.

3. **Branch-based development** — Neon supports database branching (similar to git branches), which makes it easy to test schema migrations or seed data without touching production.

4. **Cost efficiency** — For a demo/portfolio project, Neon's free tier provides more than enough compute and storage. A VPS running 24/7 would cost more for the same workload.

5. **Seamless Vercel integration** — Neon integrates directly with Vercel's environment variable system and dashboard, reducing setup friction to near zero.

### Why Prisma ORM

Prisma was selected as the ORM layer over raw SQL or alternatives like Drizzle/Knex for these reasons:

- **Type-safe queries** — Prisma Client is auto-generated from the schema, providing full TypeScript autocompletion and compile-time safety for every database operation.
- **Schema-as-source-of-truth** — The `schema.prisma` file serves as the single source of truth for the data model, making it easy to reason about relationships and enums.
- **Migration tooling** — `prisma migrate` handles schema evolution with versioned SQL migrations.
- **Adapter-based architecture** — Prisma 7's `@prisma/adapter-pg` driver adapter removes the dependency on the Rust-based query engine, reducing bundle size and improving Vercel compatibility.

---

## 2. Architecture Overview

This is a **full-stack task management application** built with Next.js 15 and deployed on Vercel. The core functionality is straightforward CRUD for tasks, wrapped in a proper authentication system.

### System Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Client (Browser)                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Login   │  │Dashboard │  │  Meeting Notes    │  │
│  │ Register │  │Task CRUD │  │  AI Extraction    │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS (HttpOnly cookies)
┌────────────────────┼────────────────────────────────┐
│  Next.js Middleware │ (JWT validation + redirects)   │
└────────────────────┼────────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────────┐
│            API Routes (serverless functions)          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Auth API │  │ Task API │  │  Meeting API      │  │
│  │ (5 eps)  │  │ (4 eps)  │  │  (2 eps)          │  │
│  └────┬─────┘  └────┬─────┘  └────┬──────────────┘  │
│       │              │              │                 │
│  ┌────┴──────────────┴──────────────┴──────────────┐ │
│  │  Shared Middleware Layer                         │ │
│  │  • Zod validation  • Rate limiting              │ │
│  │  • Auth check      • Error sanitization         │ │
│  └──────────────────────┬──────────────────────────┘ │
└─────────────────────────┼────────────────────────────┘
                          │
         ┌────────────────┼─────────────────┐
         │                │                 │
    ┌────▼────┐     ┌─────▼─────┐    ┌──────▼──────┐
    │ NeonDB  │     │  bcrypt   │    │  Groq API   │
    │ (Prisma)│     │ (hashing) │    │ (Llama 3.3) │
    └─────────┘     └───────────┘    └─────────────┘
```

### Core Features

**Authentication** — Full register/login flow with bcrypt password hashing and JWT-based sessions. Tokens are stored in HttpOnly cookies (never exposed to client-side JavaScript). A Next.js middleware layer intercepts every request to validate the access token, attempt a silent refresh if expired, or redirect to login if invalid.

**Task CRUD** — Authenticated users can create, read, update, and delete tasks. Each task has a title, optional description, status (TODO / IN_PROGRESS / DONE), priority (LOW / MEDIUM / HIGH / URGENT), and optional due date. Task listing supports filtering by status/priority and sorting by multiple fields. All operations enforce ownership — a user can only access their own tasks.

**AI Meeting Notes Extraction** — The novelty feature. A user can paste a meeting transcript and optionally specify a name to extract action items for. If no name is provided, the app defaults to the logged-in user's account name. The transcript is sent to the Groq API (Llama 3.3 70B) which scans it for action items relevant to the specified person — tasks assigned directly to them, or tasks assigned to "the team" / "everyone." The extracted items are returned for the user to review, edit, and then confirm as actual tasks in bulk.

### API Endpoints

| Method   | Route                   | Purpose                                       |
| -------- | ----------------------- | --------------------------------------------- |
| `POST`   | `/api/auth/register`    | Create account                                |
| `POST`   | `/api/auth/login`       | Authenticate and issue tokens                 |
| `POST`   | `/api/auth/refresh`     | Rotate token pair                             |
| `POST`   | `/api/auth/logout`      | Invalidate tokens and clear cookies           |
| `GET`    | `/api/auth/me`          | Get current user info                         |
| `GET`    | `/api/tasks`            | List user's tasks (with filters/sort)         |
| `POST`   | `/api/tasks`            | Create a task                                 |
| `PUT`    | `/api/tasks/:id`        | Update a task                                 |
| `DELETE` | `/api/tasks/:id`        | Delete a task                                 |
| `POST`   | `/api/meetings/extract` | Extract action items from transcript via AI   |
| `POST`   | `/api/meetings/confirm` | Bulk-create tasks from confirmed action items |

### Database Schema

**4 models** in PostgreSQL (NeonDB) via Prisma:

- **User** — `id` (UUID), `name`, `email` (unique), `passwordHash`, `createdAt`
- **Task** — `id`, `title`, `description`, `status` (enum), `priority` (enum), `dueDate`, `userId` (FK → User), `sourceTranscriptId` (FK → MeetingTranscript, nullable), timestamps
- **RefreshToken** — `id`, `userId` (FK → User), `tokenHash`, `expiresAt`, `createdAt`
- **MeetingTranscript** — `id`, `rawText`, `summary`, `userId` (FK → User), `createdAt`

Indexed on: `userId` (all models), `status`, `priority` (tasks), `tokenHash` (refresh tokens).

---

## 3. Security Considerations

### Token Strategy

The app uses a **dual-token system** — a short-lived access token for authorizing API requests and a long-lived refresh token for obtaining new access tokens without requiring the user to log in again.

| Token       | Lifetime   | Storage                                   | Purpose                                                                                                                                                                  |
| ----------- | ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Access**  | 15 minutes | HttpOnly cookie                           | Authorizes API requests. Short expiry limits the damage window if a token is somehow leaked.                                                                             |
| **Refresh** | 7 days     | HttpOnly cookie + bcrypt hash in database | Used only to request a new access token. The raw token is never stored server-side — only a bcrypt hash, so even a database breach doesn't expose usable refresh tokens. |

### Token Rotation

On every refresh, the server:

1. Verifies the refresh token JWT signature.
2. Compares the token against stored hashes in the database.
3. **Deletes all existing refresh tokens** for that user (invalidating the old token).
4. Issues a brand new access + refresh token pair.
5. Stores the new refresh token hash.

This rotation strategy means that if a refresh token is stolen and used by an attacker, the legitimate user's next refresh attempt will fail (their old token has been invalidated), signaling a compromise. It also means each refresh token is single-use.

### Cookie Configuration

All auth cookies are configured with:

- `HttpOnly: true` — Prevents JavaScript access, mitigating XSS token theft.
- `Secure: true` (production) — Cookies are only sent over HTTPS.
- `SameSite: Lax` — Provides CSRF protection while still allowing top-level navigations.
- `Path: /` — Available to all routes within the application.

### Password Security

- Passwords are hashed using **bcrypt** with a cost factor of **12 rounds** before storage.
- The raw password is never stored or logged anywhere.
- Login responses use generic "Invalid email or password" messages to prevent user enumeration.

### Input Validation (Zod)

Every API endpoint validates request bodies with strict Zod schemas before processing:

- **Email**: valid format + max 255 chars
- **Password**: min 8 chars, must include uppercase + lowercase + digit
- **Task title**: required, max 255 chars
- **Task description**: max 2,000 chars
- **Transcript**: 10–50,000 chars
- **IDs**: UUID format validation on all path parameters

### Rate Limiting

In-memory sliding window rate limiter with auto-cleanup, configured per endpoint type:

| Endpoint Type                 | Limit      | Rationale                                  |
| ----------------------------- | ---------- | ------------------------------------------ |
| Auth (login/register/refresh) | 5 req/min  | Prevents brute-force attacks               |
| General API (tasks)           | 60 req/min | Generous limit for normal usage            |
| AI (transcript extraction)    | 10 req/min | Controls Groq API costs and prevents abuse |

> **Note**: The in-memory rate limiter resets on cold starts in Vercel's serverless environment. This is acceptable for a demo/portfolio project. For production, this should be replaced with a Redis-backed solution (e.g., Upstash Redis, which is also serverless-friendly).

### Security Headers

Configured in `next.config.js` and applied to all responses:

- `X-Frame-Options: DENY` — Prevents clickjacking
- `X-Content-Type-Options: nosniff` — Prevents MIME type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — Controls referrer information leakage
- `X-XSS-Protection: 1; mode=block` — Legacy XSS filter (defense in depth)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — Disables unnecessary browser APIs

### Error Handling

- All API errors are returned through a sanitized `apiError()` utility.
- No stack traces, internal file paths, or raw database errors are ever exposed to the client.
- Server-side `console.error` is used for debugging without leaking details.

---

## 4. Alternative Tech Choices & Justification

| Category          | Chosen                  | Alternative                         | Why this choice                                                                                                                                                                                                                                                         |
| ----------------- | ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database host** | NeonDB                  | Self-hosted PostgreSQL on VPS       | Serverless connection handling, zero ops overhead, free tier sufficient, native Vercel integration. A VPS would require managing PgBouncer, backups, OS updates, and 24/7 uptime monitoring for a demo-scale project.                                                   |
| **ORM**           | Prisma 7                | Drizzle ORM / raw SQL               | Type-safe client generation, declarative schema, migration tooling, adapter-based architecture (no Rust engine on Vercel). Drizzle would be a viable alternative but Prisma's ecosystem and documentation are more mature.                                              |
| **Auth strategy** | JWT in HttpOnly cookies | NextAuth.js / Lucia / session-based | Rolling a custom JWT implementation provides full control over the token lifecycle, rotation strategy, and cookie configuration. NextAuth adds abstraction that isn't needed for a simple email/password flow and introduces its own opinions about session management. |
| **AI provider**   | Groq (Llama 3.3 70B)    | OpenAI GPT-4o / Anthropic Claude    | Groq offers significantly faster inference at lower cost. Llama 3.3 70B is more than capable of structured action item extraction. The `json_object` response format ensures reliable structured output without extra parsing logic.                                    |
| **Validation**    | Zod                     | Yup / Joi / class-validator         | Zod is TypeScript-first with excellent type inference. `z.infer<>` generates input types directly from schemas, eliminating type drift between validation and application code.                                                                                         |
| **Deployment**    | Vercel                  | AWS / Railway / VPS                 | Vercel is purpose-built for Next.js — zero-config deployments, edge network, preview deployments per PR. For a full-stack Next.js app, there's no simpler deployment path.                                                                                              |

---

## 5. Environment Variables

```
DATABASE_URL          # NeonDB PostgreSQL connection string
JWT_SECRET            # Access token signing secret (min 32 chars)
JWT_REFRESH_SECRET    # Refresh token signing secret (min 32 chars)
GROQ_API_KEY          # Groq API key for AI features
NEXT_PUBLIC_APP_URL   # Application URL (for CORS, redirects)
```

## 6. Deployment Notes

- **Runtime**: Node.js (not Edge) — required for bcrypt compatibility.
- **Build command**: `npx prisma generate && next build` — generates the Prisma client before building.
- **Rate limiting caveat**: In-memory state resets per cold start. Acceptable for this scale; upgrade to Upstash Redis for production.
- **Prisma driver**: Uses `@prisma/adapter-pg` (JavaScript-based) instead of the default Rust query engine, which isn't compatible with Vercel's serverless environment.
