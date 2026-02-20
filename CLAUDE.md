# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Study2One is a medical exam preparation platform (Saber Pro/TyT) built for Colombian university students. It follows a 125-day program (weekdays only) across 8 modules with daily audio lessons, quizzes, photo uploads, writing practice, and practice exams (simulacros). Three user roles: STUDENT, COORDINATOR, CLIENT. The coordinator panel features animated ECG waveforms as visual health indicators for student performance.

**All user-facing text is in Spanish.** Use Spanish for UI strings, error messages, labels, and notifications.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes without migration (use this on Render — non-interactive)
npx prisma migrate dev --name <name>  # Create and apply migration (local dev only)
npx prisma studio    # Browse DB via web UI
```

Production build (as in render.yaml): `npm install && npx prisma generate && npm run build`

Utility scripts in `/scripts/`:
- `upload-audios-cloudinary.mjs` — Upload MP3s to Cloudinary, seed modules/blocks/DailyContent
- `seed-questions.mjs` / `seed-daily-questions.mjs` — Seed daily quiz questions
- `validate-daily-questions.mjs` — Validate daily question JSON data
- `seed-exam-days-module6.mjs` — Create DailyContent for Module 6 exam days (26-30)
- `seed-exam-questions-module6.mjs` — Seed Module 6 exam questions
- `seed-demo-data.mjs` / `seed-cohort-demo.mjs` / `seed-demo-full-access.mjs` / `seed-ecg-demo.mjs` — Demo data seeders
- `simulacros/seed-monthly-exams.mjs` — Seed 6 monthly exams from JSON data files
- `generate-audio.mjs` / `generar-audio-presentacion.mjs` — TTS audio generation

There are no tests. No Jest, Vitest, or testing library is configured.

## Tech Stack

- **Next.js 14.2** with App Router, React 18, TypeScript 5
- **Prisma 5.22** ORM with PostgreSQL 16
- **NextAuth v5 beta** (credentials provider, JWT sessions, `trustHost: true`)
- **Tailwind CSS 3.4** for styling
- **Zod** for validation (client state uses React `useState` + `fetch()` directly — no Zustand/SWR/TanStack Query)
- **Cloudinary** (audio CDN), **Resend** (email), **web-push** (notifications)
- **jsPDF** + **qrcode.react** for certificate generation
- Deployed on **Render.com**

## Architecture

### Route Groups (src/app/)

Routes are organized by role using Next.js route groups:
- `(auth)/` — Login, register, pending-approval pages
- `(student)/` — Dashboard, daily content (`/day/[dayId]`), quiz, writing practice, profile, leaderboard, roadmap, notifications, monthly exams (`/examen/...`)
- `(coordinator)/` — Dashboard (ECG waveforms), student management, cohort management, enrollment approval, exam day management, monthly exam activation, announcements
- `(client)/` — Aggregate metrics dashboard, cohort overview

Each group has its own `layout.tsx` with role-specific navigation (bottom nav bar).

### Auth Pattern

There is **no `middleware.ts`** — all auth checks are per-route. Every protected API route checks session via `auth()` from `src/lib/auth.ts`:
```typescript
const session = await auth();
if (!session?.user?.role || session.user.role !== "COORDINATOR") {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
```

Cron endpoints (`/api/cron/*`) use `?key=CRON_SECRET` instead of session-based auth.

NextAuth session is extended in `src/types/next-auth.d.ts` to include `id`, `role`, `pseudonym`, `avatarSeed`, `avatarStyle` on `session.user`.

### Key API Routes

57 endpoints total. See `README.md` for the complete API reference table.

Critical routes to understand:
- `/api/day/[dayId]` — Comprehensive day data (title, audioUrl, summary, module info, student progress)
- `/api/audio/file/[dayId]` — Returns 302 redirect to Cloudinary URL (not file serving)
- `/api/audio/[dailyContentId]/progress` — Audio progress tracking (**uses UUID, not global day number**)
- `/api/quiz/[dayId]` — Returns `{ questions, isExamDay }` (always this shape, even with 0 questions)
- `/api/quiz/[dayId]/submit` — Accepts optional `timeSpentSeconds`
- `/api/monthly-exam/` — Full monthly exam system (list, detail, section questions, save, submit, results)

### Key Libraries (src/lib/)

- `auth.ts` — NextAuth config with Prisma adapter, bcryptjs hashing, JWT callbacks. Secure cookies (`__Secure-authjs.session-token`) in production.
- `prisma.ts` — Singleton Prisma client
- `student-day.ts` — **Critical**: Calculates student's current day (1-125, weekdays only) based on cohort `startDate`. Key functions: `getStudentCurrentDay()`, `getModuleForDay()`, `getDayInModule()`, `countWeekdays()`, `getDayDate()`, `getWeekNumber()`, `getWeekStartDay()`
- `exam-schedule.ts` — Monthly exam cohort scheduling: `getSectionSchedule()`, `getTodaysSection()`, `getMissedSections()`. Maps 8 sections across 2 weeks (5+3 weekdays).
- `ecg-rhythms.ts` — 6 ECG waveform generators and `getStudentRhythm()` mapper (maps daysInactive + avgQuizScore → rhythm)
- `cloudinary.ts` — Audio upload/retrieval (uses `resource_type: "video"` for audio — Cloudinary convention)
- `exam-sounds.ts` — Web Audio API sounds for exam timer (warning at 5 min, alert at 1 min, time-up)
- `push.ts` / `email.ts` / `message-templates.ts` — Push notifications (web-push VAPID), email (Resend), and message formatting
- `generate-credential-pdf.ts` — PDF certificate generation with jsPDF + QR code

### Data Fetching Pattern

Pages use `useState` + `fetch()` directly. Dynamic route params via `useParams()`.

### Module-Day Mapping (src/lib/student-day.ts)

All quiz/submit/audio APIs use `getModuleForDay(globalDay)` + `getDayInModule(globalDay)` to resolve which module a global day belongs to. The program counts **weekdays only** (Monday–Friday), 5 days per week, 25 weeks = 125 days. The `MODULES_INFO` constant defines the day ranges:

| Module | Name | Days | Weeks | Range |
|--------|------|------|-------|-------|
| 1 | Lectura Crítica | 15 | 3 | 1–15 |
| 2 | Razonamiento Cuantitativo | 15 | 3 | 16–30 |
| 3 | Competencias Ciudadanas | 15 | 3 | 31–45 |
| 4 | Comunicación Escrita | 10 | 2 | 46–55 |
| 5 | Inglés | 10 | 2 | 56–65 |
| 6 | Fundamentación Dx y Tx | 30 | 6 | 66–95 |
| 7 | Atención en Salud | 15 | 3 | 96–110 |
| 8 | Promoción y Prevención | 15 | 3 | 111–125 |

`getStudentCurrentDay()` counts weekdays from cohort `startDate`. `getDayDate()` converts a day number back to a calendar date, skipping weekends. DB module numbers match these numbers (1-8). **DailyContent `dayNumber` is the day within the module, not the global day.**

### Database Schema (prisma/schema.prisma)

Core model relationships:
- **User** → belongs to Cohort(s) via CohortStudent join table (`enrollmentStatus`: PENDING/APPROVED/REJECTED)
- **Cohort** → has a coordinator (User) and optional client (User)
- **Module** → Block → DailyContent → DailyQuestion → QuestionOption (content hierarchy)
- **Student progress**: AudioProgress, QuizAttempt/QuizAnswer, PhotoUpload, WritingSubmission, Streak
- **Monthly Exams**: MonthlyExam → ExamSection → ExamSectionQuestion → ExamSectionOption. Tracking: MonthlyExamAttempt → ExamSectionAttempt → ExamSectionAnswer. Scheduling: CohortExamSchedule, ManualUnlock. Modes: WEEKLY / CONTINUOUS.
- **Research tracking** (invisible to students): ExamAnswerEvent (SELECTED/CHANGED/CLEARED per click), ExamQuestionView (viewedAt, leftAt, durationSeconds per question). `totalAnswerChanges` denormalized on ExamSectionAttempt.
- **Communication**: Announcement, EmailLog, PushSubscription, Notification
- **Certificate**: Issued per student per cohort with unique verificationCode

35 models + 8 enums. All table names use snake_case via `@@map()`. Field names use camelCase in Prisma, mapped to snake_case columns.

## Day Page Behavior

The day page (`/day/[dayId]`) fetches from `/api/day/[dayId]` and renders two distinct UIs:

- **Normal days**: Progress checklist (Audio, Quiz, Evidencia) with photo upload. Day completion = all three done. Quiz is always unlocked (no audio gate). Photo guidance: mapas mentales, cuadros sinópticos, cuadernillos — not personal photos.
- **Exam days** (`isExamDay: true`): 15-question quiz with visible timer. Used for Module 6 days 26-30.

## Module-Specific Features

**Module 4 (Comunicación Escrita)** — Writing practice at `/day/[dayId]/write`. Anti-paste enforcement (onPaste/onDrop/onContextMenu). Timer counts from first keystroke. Days 7-10 have 40-min goal; days 9-10 are full simulacros. Button shown only when `moduleNumber === 4`.

**Module 6 (Fundamentación Dx y Tx)** — Days 1-25: cuadernillo + audio. Days 26-30: platform-only exam days (`isExamDay: true`, 15 questions, streak threshold 10/15). Coordinator manages at `/coordinator/exam-days`.

## Monthly Exam System (Simulacros Mensuales)

6 monthly exams replicating full Saber Pro (8 sections: LC, RC, CC, CE, Inglés, DxTx, AS, PP). Modes: `WEEKLY` (any section order, Simulacros 1-4, 6) and `CONTINUOUS` (sequential 1→8, Simulacro 5).

Key features: timed sections with Web Audio API sounds, question navigator, auto-save, PC-only gate, confirm submit modal, competency-based results, coordinator manual unlock.

**Data pipeline:** JSON files in `scripts/simulacros/data/simulacro-XX/` (8 files per simulacro). Seeded via `scripts/simulacros/seed-monthly-exams.mjs`. Simulacro 1 complete (311 MC + 1 essay). Simulacros 2-6 pending.

**JSON gotcha:** Watch for unescaped `"` in caseText (literary dialogue). Use «» guillemets instead.

## ECG Waveform System

Animated ECG traces in coordinator views indicate student academic health. 6 rhythms from healthy to flatline based on `daysInactive` + `avgQuizScore`:

| Rhythm | Condition | Color |
|--------|-----------|-------|
| Normal Sinus | Active, quiz >= 80% | green |
| Wenckebach | 1-2d inactive or quiz 60-79% | lime |
| Mobitz II | 3-4d inactive or quiz 40-59% | yellow |
| AFib | 5-7d inactive or quiz 20-39% | orange |
| VTach | 7+d inactive + quiz < 40% | red |
| Asystole | 14+d inactive or never active | gray |

Implementation: `src/lib/ecg-rhythms.ts` (waveform generators, `getStudentRhythm()`) and `src/components/EcgWaveform.tsx` (SVG polyline with CSS infinite scroll). Used in coordinator dashboard, student list, and student detail pages.

## Key Flows

**Enrollment:** Student registers → `PENDING` → Coordinator approves → `APPROVED` → Can log in (enforced in auth.ts authorize).

**Streaks:** Increment on quiz score ≥ 2/3. Daily cron resets broken streaks. `lastActivityDate` normalized to `00:00`.

**Monthly exam scheduling:** Coordinator picks start week for a cohort → 8 sections distributed over 2 weeks (5 Mon-Fri + 3 Mon-Wed). Student sees dashboard alert on scheduled day. Auto-cero if section not presented by end of scheduled day.

**Monthly exam "Confirmar respuesta" flow:** Click option → preselect (blue dashed border) → click "Confirmar respuesta" → lock answer (green background). If already confirmed, button becomes "Cambiar respuesta". Each action tracked as ExamAnswerEvent for research.

## Cron Jobs

All cron endpoints use `?key=CRON_SECRET` for auth (no session). Configured in Render cron jobs.

| Endpoint | Frequency | Purpose |
|----------|-----------|---------|
| `/api/cron/check-streaks` | Daily 11:59 PM | Reset broken streaks |
| `/api/cron/check-exam-deadlines` | Daily | Auto-cero missed simulacro sections |
| `/api/cron/inactivity-alerts` | Daily | Send inactivity alerts |
| `/api/cron/weekly-report` | Weekly | Generate weekly reports |

## Environment Variables

Required (see render.yaml): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`.

## Conventions

- Path alias: `@/*` → `./src/*`. Always use `@/` imports.
- DB naming: camelCase fields in Prisma mapped to snake_case columns via `@map()`. Table names mapped via `@@map()`.
- Coordinator nav: 7 items — Panel, Alumnos, Simulacros, Matrículas, Anuncios, Exámenes, Mensuales.
- Simulacro JSON data: `scripts/simulacros/data/simulacro-XX/` (8 JSON files per simulacro). Use «» guillemets instead of `"` in caseText to avoid parse errors.
