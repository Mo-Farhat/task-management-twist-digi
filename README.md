# TaskFlow — Secure Task Management System

A full-stack, secure task management system built with **Next.js 14**, **Prisma 7**, **NeonDB (PostgreSQL)**, and **HeroUI v2**. Includes AI-powered meeting transcript analysis via **Groq API** to extract action items and convert them into tasks.

## ✨ Features

### 🔐 Authentication & Security

- **JWT Authentication** with HttpOnly cookies (access + refresh tokens)
- **bcrypt** password hashing (10 salt rounds)
- **Token rotation** — refresh tokens are rotated on every use
- **Rate limiting** on all API endpoints (auth: 5/min, API: 60/min, AI: 10/min)
- **Zod validation** on all inputs
- **Security headers** (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.)
- **Sanitized errors** — no stack traces leak to clients

### ✅ Task Management

- Full CRUD (Create, Read, Update, Delete)
- **Authorization**: users can only access their own tasks
- Filter by status (TODO, IN_PROGRESS, DONE) and priority (LOW, MEDIUM, HIGH, URGENT)
- Due date tracking with overdue indicators
- Quick inline status toggle
- Task stats dashboard

### 🤖 AI Meeting Notes (Groq)

- Paste meeting transcripts and let **Llama 3.3 70B** extract action items
- AI identifies tasks assigned to you, suggests priorities and due dates
- Review, edit, toggle, and bulk-create tasks from extracted items
- Transcript summaries saved for reference

## 🛠 Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Framework  | Next.js 14 (App Router)              |
| UI         | HeroUI v2, Tailwind CSS              |
| Database   | NeonDB (PostgreSQL)                  |
| ORM        | Prisma 7 (pg driver adapter)         |
| Auth       | JWT (jose), bcrypt, HttpOnly cookies |
| Validation | Zod                                  |
| AI         | Groq SDK (Llama 3.3 70B)             |
| Deployment | Vercel                               |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- NeonDB account (or any PostgreSQL)
- Groq API key

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd task-management-twist-digital

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values:
#   DATABASE_URL=your_neondb_connection_string
#   JWT_SECRET=your_secret_key
#   JWT_REFRESH_SECRET=your_refresh_secret
#   GROQ_API_KEY=your_groq_api_key

# 4. Push database schema
npx prisma db push

# 5. Generate Prisma client
npx prisma generate

# 6. Start development server
npm run dev
```

Visit `http://localhost:3000` to get started.

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/          # register, login, logout, refresh, me
│   │   ├── tasks/         # CRUD + [id] routes
│   │   └── meetings/      # extract, confirm
│   ├── dashboard/
│   │   ├── page.tsx       # Task management dashboard
│   │   └── meetings/
│   │       └── page.tsx   # AI meeting notes page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── page.tsx           # Landing page
├── components/
│   └── navbar.tsx          # Auth-aware navigation
├── lib/
│   ├── auth.ts            # JWT, bcrypt, cookies
│   ├── prisma.ts          # Database client (pg adapter)
│   ├── validations.ts     # Zod schemas
│   ├── rate-limit.ts      # In-memory rate limiter
│   ├── groq.ts            # Groq API client
│   └── api-utils.ts       # Response helpers
├── prisma/
│   └── schema.prisma      # Database schema
├── prisma.config.ts       # Prisma 7 config
└── middleware.ts           # Route protection
```

## 🔒 Security Architecture

- **Authentication**: Stateless JWT with HttpOnly, Secure, SameSite=Lax cookies
- **Password**: bcrypt hashing with 10 salt rounds
- **Token Refresh**: Tokens stored as bcrypt hashes in DB; full rotation on refresh
- **Rate Limiting**: Sliding window, in-memory (use Redis for multi-instance)
- **Input Validation**: Zod schemas on all API inputs
- **Error Handling**: Sanitized responses — no internal details exposed
- **Headers**: X-Frame-Options DENY, nosniff, strict referrer policy

## 📄 API Endpoints

| Method | Endpoint              | Description             | Auth |
| ------ | --------------------- | ----------------------- | ---- |
| POST   | /api/auth/register    | Create account          | No   |
| POST   | /api/auth/login       | Sign in                 | No   |
| POST   | /api/auth/logout      | Sign out                | Yes  |
| POST   | /api/auth/refresh     | Refresh tokens          | No\* |
| GET    | /api/auth/me          | Get current user        | Yes  |
| GET    | /api/tasks            | List tasks (filterable) | Yes  |
| POST   | /api/tasks            | Create task             | Yes  |
| PUT    | /api/tasks/:id        | Update task             | Yes  |
| DELETE | /api/tasks/:id        | Delete task             | Yes  |
| POST   | /api/meetings/extract | Extract action items    | Yes  |
| POST   | /api/meetings/confirm | Bulk-create tasks       | Yes  |

\* Uses refresh token cookie

## 📜 License

Licensed under the [MIT license](https://github.com/heroui-inc/hero-ui/blob/main/LICENSE).
