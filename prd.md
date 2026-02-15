# PRD — Secure Task Management System

**Stack:** Next.js + Prisma + NeonDB (PostgreSQL)**Deployment Target:** Vercel (Frontend + API Routes)

## 1\. Overview

A secure, full-stack **Task Management System** that allows users to register, log in, and manage personal tasks. The system demonstrates full-stack engineering capability including authentication, authorization, database design, security best practices, and deployment readiness.

The project is designed primarily as a **technical assessment artifact** to showcase architectural thinking, clean code structure, and security awareness rather than feature breadth.

## 2\. Objectives

### Primary Objectives

- Implement secure user authentication and session management.
- Enable CRUD operations for user-owned tasks.
- Demonstrate secure token handling and input validation.
- Showcase scalable architecture and clean project structure.
- Provide a deployed, production-like application.

### Secondary Objectives

- Demonstrate ORM usage with Prisma.
- Use serverless-friendly Postgres via NeonDB.
- Provide strong documentation and commit discipline.
- Include one optional novelty feature without compromising core requirements.

## 3\. Target Users

- **Technical reviewers / recruiters**
- Developers evaluating architecture and security decisions
- Individuals wanting a simple personal task manager

## 4\. Core Features

### 4.1 Authentication

- User Registration
- User Login
- Secure password hashing (bcrypt/argon2)
- JWT issuance
- Refresh token mechanism (optional but recommended)
- Secure token storage via **HttpOnly cookies**

### 4.2 Task Management

- Create Task
- Edit Task
- Delete Task
- View All Tasks (owned by user only)
- Authorization enforcement: users can only access their tasks

### 4.3 UI/UX

- Responsive layout
- Dashboard with task list
- Loading and error states
- Form validation feedback
- Basic accessibility considerations
- Route protection for authenticated pages

## 5\. Optional Novelty Feature (Choose One)

- Task deadlines + overdue indicators
- Task categories/tags
- Dark/light theme toggle
- Activity log
- Priority levels

## 6\. Technical Architecture

### 6.1 Frontend

**Framework:** Next.js (App Router)**Styling:** Tailwind CSS or CSS Modules**State:** React state / minimal global state (Zustand optional)

### 6.2 Backend

**Implementation:** Next.js Route Handlers (Serverless Functions)**Runtime:** Node.js runtime (not Edge)**Auth:** JWT with HttpOnly cookies

### 6.3 Database

**Database:** NeonDB (PostgreSQL)**ORM:** Prisma**Connection:** Neon pooled connection string for serverless compatibility

## 7\. Database Schema (High Level)

### Users

- id (UUID)
- email (unique)
- passwordHash
- createdAt

### Tasks

- id (UUID)
- userId (FK)
- title
- description
- status
- createdAt
- updatedAt

### RefreshTokens (Optional)

- id
- userId
- tokenHash
- expiresAt

## 8\. Security Requirements

### Client Side

- Input validation
- Prevent XSS via sanitization
- CSP headers
- Secure cookie flags
- No sensitive data in localStorage

### Server Side

- Password hashing
- JWT validation middleware
- Rate limiting
- Input sanitization
- Proper error handling (no stack traces)
- Authorization checks per task
- Environment variable protection

## 9\. API Endpoints

### Auth

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh (optional)
- POST /api/auth/logout

### Tasks

- GET /api/tasks
- POST /api/tasks
- PUT /api/tasks/:id
- DELETE /api/tasks/:id

## 10\. Non-Functional Requirements

### Performance

- Fast initial load
- Efficient DB queries
- Minimal bundle size

### Scalability

- Stateless JWT auth
- Serverless-friendly DB pooling
- Modular folder structure

### Maintainability

- TypeScript usage
- Clear separation of concerns
- Reusable components
- Consistent naming conventions

## 11\. Folder Structure (Suggested)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   /app    /dashboard    /login    /register    /api      /auth      /tasks  /lib    prisma.ts    auth.ts  /middleware.ts  /prisma    schema.prisma   `

## 12\. Deployment & DevOps

- **Hosting:** Vercel
- **DB:** Neon
- **Env Vars:** .env with .env.example
- **HTTPS enforced**
- **Clear README with setup steps**

## 13\. Deliverables

- Git Repository with clean commits
- PLAN.md (Architecture + Security)
- README.md
- Live deployed URL
- .env.example
- Optional: API documentation

## 14\. Success Criteria

- Secure authentication works reliably
- Tasks are fully isolated per user
- Code is readable, typed, and modular
- App is deployed and accessible
- Developer can confidently explain decisions and trade-offs
