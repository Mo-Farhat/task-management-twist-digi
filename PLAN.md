# TaskFlow — Architecture & Security Plan

## 1. System Architecture

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
│  Next.js Middleware │ (JWT validation, redirects)    │
└────────────────────┼────────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────────┐
│            API Routes (Node.js runtime)              │
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

## 2. Database Schema

**4 models** in PostgreSQL via Prisma:

- **User** — id, name, email (unique), passwordHash, timestamps
- **Task** — id, title, description, status (enum), priority (enum), dueDate, userId (FK), sourceTranscriptId (FK, nullable), timestamps
- **RefreshToken** — id, userId (FK), tokenHash, expiresAt, timestamps
- **MeetingTranscript** — id, rawText, summary, userId (FK), timestamps

**Enums**: TaskStatus (TODO, IN_PROGRESS, DONE), TaskPriority (LOW, MEDIUM, HIGH, URGENT)

## 3. Authentication Flow

```
Register/Login → bcrypt verify → Sign JWT (access 15m + refresh 7d)
→ Set HttpOnly cookies → Return user info

Protected Request → Middleware checks access_token cookie
→ Valid: proceed | Expired: try refresh | Invalid: redirect /login

Refresh → Verify refresh JWT → Compare hash in DB
→ Delete old token → Issue new pair (rotation) → Set new cookies

Logout → Delete all refresh tokens from DB → Clear cookies
```

### Token Details

| Token   | Lifetime | Storage                   | Purpose           |
| ------- | -------- | ------------------------- | ----------------- |
| Access  | 15 min   | HttpOnly cookie           | API authorization |
| Refresh | 7 days   | HttpOnly cookie + DB hash | Token renewal     |

### Cookie Flags

- `HttpOnly: true` — prevents XSS access
- `Secure: true` (production) — HTTPS only
- `SameSite: Lax` — CSRF protection
- `Path: /` — available on all routes

## 4. Security Measures

### Input Validation (Zod)

Every API endpoint validates request bodies with strict Zod schemas:

- Email format + length limits
- Password: min 8 chars, must include uppercase, lowercase, digit
- Task fields: title required, description ≤ 2000 chars, valid enums
- Transcript: 10–50,000 chars

### Rate Limiting

In-memory sliding window rate limiter with auto-cleanup:
| Endpoint Type | Limit |
|---------------|----------------|
| Auth | 5 req/min |
| General API | 60 req/min |
| AI (Groq) | 10 req/min |

### Authorization

- All task operations check `task.userId === currentUser.id`
- Transcript ownership verified before confirmation
- UUID format validation on all ID parameters

### Security Headers (next.config.js)

- `X-Frame-Options: DENY` — clickjacking protection
- `X-Content-Type-Options: nosniff` — MIME sniffing prevention
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Error Handling

- All API errors return sanitized messages via `apiError()`
- No stack traces, internal paths, or DB details in responses
- Console logging for server-side debugging only

## 5. AI Integration (Groq)

- **Model**: Llama 3.3 70B Versatile
- **Mode**: `json_schema` for structured output
- **Temperature**: 0.3 (consistent extraction)
- **Flow**: Transcript → Groq → Structured JSON → User review → Bulk task creation
- **Rate limited**: 10 requests/min per IP

## 6. Deployment (Vercel)

### Environment Variables Required

```
DATABASE_URL          # NeonDB PostgreSQL connection string
JWT_SECRET            # Access token signing secret (min 32 chars)
JWT_REFRESH_SECRET    # Refresh token signing secret (min 32 chars)
GROQ_API_KEY          # Groq API key for AI features
NEXT_PUBLIC_APP_URL   # Application URL (for CORS, redirects)
```

### Vercel Considerations

- Node.js runtime (not Edge) for bcrypt compatibility
- In-memory rate limiting resets per cold start (acceptable for demo; use Redis for production)
- Prisma 7 with `@prisma/adapter-pg` driver (no Rust engine)
