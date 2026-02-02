# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Study2One is a learning management system for Colombian medical students preparing for the "Saber Pro Medicina" exam. Built with Next.js 14 (App Router), PostgreSQL/Prisma, and NextAuth for authentication.

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma db push    # Push schema changes to database
npx prisma studio     # Open Prisma database GUI
```

## Architecture

### Multi-Role System
Three user roles with isolated dashboards using Next.js route groups:
- **STUDENT** `(student)/` - Daily learning, quizzes, simulacros, leaderboard
- **COORDINATOR** `(coordinator)/` - Student/enrollment management, simulacro creation, announcements
- **CLIENT** `(client)/` - Institution-level analytics and cohort oversight

### Authentication Flow
- NextAuth 5 beta with credentials provider and JWT sessions
- Students require `enrollmentStatus: APPROVED` to login (throws `PENDING_APPROVAL` error otherwise)
- Session includes: `id`, `role`, `pseudonym`, `avatarSeed`, `avatarStyle`
- Custom types extended in `src/types/next-auth.d.ts`

### Key Directory Structure
```
src/
├── app/
│   ├── (auth)/          # Public: login, register, pending approval
│   ├── (student)/       # Student portal pages
│   ├── (coordinator)/   # Coordinator portal pages
│   ├── (client)/        # Client portal pages
│   └── api/             # API routes
│       ├── cron/        # Scheduled tasks (streaks, alerts, reports)
│       └── [role]/      # Role-specific endpoints
├── components/          # Shared React components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client singleton
│   ├── email.ts         # Resend email functions
│   └── push.ts          # Web Push utilities
└── types/               # TypeScript type extensions
```

### Database Schema (Prisma)
Core models:
- **User** - Multi-role with enrollment workflow
- **Cohort/CohortStudent** - Student groupings with coordinator/client assignment
- **Module/Block/DailyContent** - 8 modules × 15 days curriculum structure
- **DailyQuestion/QuestionOption** - Daily 3-question quizzes
- **Simulacro*** - Timed 75-min mock exams with tab-switch detection
- **Streak** - Current and longest streak tracking per student
- **Certificate** - Completion certificates with verification codes

### External Services
- **Resend** - Transactional emails (welcome, weekly reports, alerts)
- **Cloudinary** - Image uploads (student photos, evidence)
- **msedge-tts** - Text-to-speech for audio lessons
- **web-push** - Push notifications

### Cron Jobs
Located in `src/app/api/cron/`:
- `check-streaks/` - Daily streak reset for inactive students
- `inactivity-alerts/` - Notify idle students
- `weekly-report/` - Aggregate progress emails

## Patterns

### API Routes
- Use `auth()` from `@/lib/auth` to get session
- Check `session.user.role` for authorization
- Return appropriate HTTP status codes with JSON responses

### Database Access
- Import `prisma` from `@/lib/prisma`
- Use Prisma's `include` for relations, avoid N+1 queries
- Schema uses `@map()` for snake_case database columns

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json)
