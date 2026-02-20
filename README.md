# Study2One Platform

Plataforma de preparacion para examenes Saber Pro/TyT diseñada para estudiantes universitarios de ciencias de la salud en Colombia. Programa estructurado de 125 dias (lunes a viernes) con audio diario, quizzes con scoring server-side, practica de escritura, subida de evidencias fotograficas, simulacros mensuales tipo Saber Pro con metricas de investigacion, y panel de coordinador con ECG waveforms.

## Tabla de Contenidos

- [Vision General](#vision-general)
- [Stack Tecnologico](#stack-tecnologico)
- [Inicio Rapido](#inicio-rapido)
- [Arquitectura](#arquitectura)
- [Roles de Usuario](#roles-de-usuario)
- [Programa de 125 Dias](#programa-de-125-dias)
- [Simulacros Mensuales](#simulacros-mensuales)
- [Metricas de Investigacion](#metricas-de-investigacion)
- [Visualizacion ECG](#visualizacion-ecg)
- [Seguridad](#seguridad)
- [Base de Datos](#base-de-datos)
- [API Reference](#api-reference)
- [Scripts de Utilidad](#scripts-de-utilidad)
- [Despliegue](#despliegue)
- [Variables de Entorno](#variables-de-entorno)

---

## Vision General

Study2One transforma la preparacion del Saber Pro en un programa diario estructurado. Cada dia el estudiante:

1. **Escucha** una leccion en audio (generada con OpenAI TTS, alojada en Cloudinary)
2. **Responde** un quiz de 3 preguntas con scoring verificado server-side
3. **Sube** una evidencia fotografica (mapa mental, cuadro sinoptico, cuadernillo)
4. **Practica escritura** (solo Modulo 4 — Comunicacion Escrita)
5. **Presenta simulacros** mensuales tipo Saber Pro con timing oficial ICFES

Tres roles: **Estudiante**, **Coordinador** y **Cliente**. El coordinador programa simulacros por cohorte, revisa metricas detalladas y monitorea la salud academica mediante ECG waveforms animados. Todos los datos del coordinador estan scoped a sus propias cohortes.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | Next.js 14.2 (App Router), React 18, TypeScript 5 |
| Estilos | Tailwind CSS 3.4 |
| ORM | Prisma 5.22, PostgreSQL 16 |
| Auth | NextAuth v5 beta (credentials, JWT, secure cookies) |
| Validacion | Zod |
| CDN Audio | Cloudinary (`resource_type: "video"`) |
| Email | Resend |
| Push | web-push (VAPID) |
| PDF | jsPDF + qrcode.react |
| Audio TTS | OpenAI TTS API (tts-1-hd) |
| Deploy | Render.com (compatible con Google Cloud Run) |

---

## Inicio Rapido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env  # editar con tus valores

# Generar Prisma client
npx prisma generate

# Push schema a la base de datos
npx prisma db push

# Iniciar servidor de desarrollo
npm run dev
```

### Comandos Disponibles

```bash
npm run dev          # Servidor dev (localhost:3000)
npm run build        # Build de produccion
npm run lint         # ESLint
npx prisma generate  # Regenerar Prisma client
npx prisma db push   # Push schema (no interactivo, apto para CI/CD)
npx prisma migrate dev --name <name>  # Migracion local
npx prisma studio    # UI para explorar la BD
```

---

## Arquitectura

### Estructura de Directorios

```
src/
├── app/
│   ├── (auth)/          # Login, registro, aprobacion pendiente
│   ├── (student)/       # Dashboard, dia, quiz, escritura, perfil, examen
│   ├── (coordinator)/   # Panel, alumnos, simulacros, matriculas, metricas
│   ├── (client)/        # Metricas agregadas, cohortes
│   └── api/             # 60 endpoints REST
├── components/
│   ├── audio/           # AudioPlayer
│   ├── monthly-exam/    # PCOnlyGate, ExamTimer, QuestionNavigator, ConfirmSubmitModal
│   ├── coordinator/     # PhotoGallery, MessageModal
│   ├── EcgWaveform.tsx  # SVG polyline con scroll infinito CSS
│   └── PushNotificationSetup.tsx
├── lib/
│   ├── auth.ts          # NextAuth config con Prisma adapter, secure cookies
│   ├── prisma.ts        # Singleton Prisma client
│   ├── student-day.ts   # Calculo de dias habiles, modulos, semanas
│   ├── exam-schedule.ts # Mapeo seccion→dia para simulacros (WEEKLY/CONTINUOUS)
│   ├── ecg-rhythms.ts   # 10 ritmos ECG y getStudentRhythm()
│   ├── exam-sounds.ts   # Web Audio API (warning, completion, time-up)
│   ├── cloudinary.ts    # Upload/retrieval de audio
│   ├── push.ts          # Web-push VAPID notifications
│   ├── email.ts         # Resend email integration
│   ├── message-templates.ts  # Formateo de mensajes
│   └── generate-credential-pdf.ts  # Generacion de certificados PDF
└── types/
    └── next-auth.d.ts   # Extensiones de sesion (id, role, pseudonym, avatarSeed)
```

### Patron de Autenticacion

No hay `middleware.ts` — auth se verifica por ruta. Cada API protegida usa:

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
```

- **Coordinador APIs**: verifican `session.user.role !== "COORDINATOR"` y scoped a sus cohortes
- **Estudiante APIs**: verifican rol + control de acceso a dias futuros via `getStudentCurrentDay()`
- **Cron endpoints**: usan `?key=CRON_SECRET` en vez de sesion
- **Path alias**: `@/` → `./src/`

### Patron de Data Fetching

Pages usan `useState` + `fetch()` directamente — sin SWR ni TanStack Query. Parametros de ruta dinamicos via `useParams()`.

---

## Roles de Usuario

### Estudiante (STUDENT)
- Dashboard con alerta de simulacro del dia, racha, progreso, ECG rhythm
- Contenido diario: audio + quiz (scoring server-side) + evidencia fotografica
- Control de acceso temporal: solo puede acceder a dias desbloqueados por su cohorte
- Practica de escritura con anti-paste (Modulo 4)
- Simulacros mensuales con timer server-enforced
- Leaderboard, roadmap dinamico, perfil personalizable
- Notificaciones push y in-app

### Coordinador (COORDINATOR)
- Dashboard con ECG waveforms (salud academica por estudiante)
- **Datos scoped a sus propias cohortes** — no ve estudiantes de otros coordinadores
- Gestion de alumnos, matriculas (PENDING → APPROVED/REJECTED), cohortes
- **Programacion de simulacros por cohorte** (elige semana de inicio)
- **Metricas de simulacros**: puntajes, tiempos, cambios de respuesta, tab switches
- **Export CSV** de datos para investigacion
- Anuncios, desbloqueo manual de exams, mensajeria
- Gestion de exam days (Modulo 6)

### Cliente (CLIENT)
- Metricas agregadas por cohorte
- Certificados con QR verificable

---

## Programa de 125 Dias

8 modulos, 25 semanas, solo dias habiles (lunes a viernes):

| # | Modulo | Dias | Semanas | Rango |
|---|--------|------|---------|-------|
| 1 | Lectura Critica | 15 | 3 | 1-15 |
| 2 | Razonamiento Cuantitativo | 15 | 3 | 16-30 |
| 3 | Competencias Ciudadanas | 15 | 3 | 31-45 |
| 4 | Comunicacion Escrita | 10 | 2 | 46-55 |
| 5 | Ingles | 10 | 2 | 56-65 |
| 6 | Fundamentacion Dx y Tx | 30 | 6 | 66-95 |
| 7 | Atencion en Salud | 15 | 3 | 96-110 |
| 8 | Promocion y Prevencion | 15 | 3 | 111-125 |

### Dia Normal
- Audio (~10 min) → Quiz (3 preguntas, scoring server-side) → Evidencia fotografica
- Dia completado = audio + quiz aprobado (2/3) + evidencia
- Quiz siempre desbloqueado (no depende de completar audio)

### Funcionalidades Especiales

- **Modulo 4**: Practica de escritura con anti-paste (onPaste/onDrop/onContextMenu). Timer cuenta desde primera tecla. Dias 7-10 con meta de 40 min; dias 9-10 son simulacros completos.
- **Modulo 6 dias 26-30**: Exam days (15 preguntas, timer visible, umbral de aprobacion 10/15 = 67%, `isExamDay: true`)

---

## Simulacros Mensuales

Sistema completo de examenes tipo Saber Pro con 6 simulacros de 8 secciones cada uno.

### Secciones y Tiempos Oficiales (ICFES)

| # | Seccion | Duracion | Tipo |
|---|---------|----------|------|
| 1 | Lectura Critica | 45 min | MC |
| 2 | Razonamiento Cuantitativo | 50 min | MC |
| 3 | Competencias Ciudadanas | 40 min | MC |
| 4 | Comunicacion Escrita | 40 min | Ensayo |
| 5 | Ingles | 60 min | MC |
| 6 | Fund. Dx y Tx | 60 min | MC |
| 7 | Atencion en Salud | 55 min | MC |
| 8 | Promocion y Prevencion | 55 min | MC |

### Modos de Examen
- **WEEKLY** (Simulacros 1-4, 6): Una seccion por dia programado, cualquier orden
- **CONTINUOUS** (Simulacro 5): Todas las secciones el mismo dia, secuenciales 1→8 (replica Saber Pro real)

### Programacion por Cohorte

El coordinador programa cada simulacro eligiendo la **semana de inicio** para una cohorte:
- **WEEKLY**: Semana 1 secciones 1-5 (Lun-Vie), Semana 2 secciones 6-8 (Lun-Mie) — 8 secciones en 8 dias habiles
- **CONTINUOUS**: Todas las 8 secciones en el dia de inicio

El estudiante ve una **alerta en su dashboard** el dia que tiene simulacro.

### Timer Server-Enforced

- El timer se calcula desde `startedAt` del servidor, no del cliente
- Si el estudiante cierra el navegador, el tiempo sigue corriendo
- Al reconectarse, el timer muestra el tiempo real transcurrido (`serverElapsedSeconds`)
- Si el tiempo expira, se auto-submit la seccion con las respuestas guardadas

### Auto-Guardado

- Cada 30 segundos se guardan: respuestas, tiempo, tab switches, metricas de investigacion
- Si se pierde conexion, al reconectar se restauran las respuestas guardadas
- El estudiante NO puede reiniciar un simulacro — solo continuar

### Auto-Cero por Inasistencia

Cron diario (`/api/cron/check-exam-deadlines`):
- Secciones NO_STARTED en dias pasados → SUBMITTED con 0 correctas
- Secciones IN_PROGRESS expiradas (startedAt + timeLimitSeconds) → SUBMITTED con score calculado de respuestas guardadas

### Boton "Confirmar Respuesta"

- Click en opcion → preseleccion (borde azul punteado)
- Click en "Confirmar respuesta" → seleccion fija (fondo verde)
- Si ya habia confirmado otra → boton cambia a "Cambiar respuesta"
- Cada confirmacion/cambio se registra como evento para investigacion

### Proctoring Ligero

- Deteccion de cambios de pestaña (`visibilitychange`)
- Gate PC-only (advierte en pantallas < 1024px)
- Sonidos Web Audio: aviso a 5 min, alerta a 1 min, tiempo agotado
- Advertencia `beforeunload` al intentar cerrar

### Proteccion contra Double-Submit

- Submit usa `updateMany` atomico con `WHERE status = 'IN_PROGRESS'`
- Si ya fue entregado, retorna HTTP 409 (Conflict)

---

## Metricas de Investigacion

Sistema completo de tracking para analisis estadistico posterior. **Invisible para el estudiante.**

### Datos Registrados

**Por respuesta (`ExamAnswerEvent`):**
- Tipo de evento: SELECTED (primera vez), CHANGED (cambio), CLEARED (borrada)
- Opcion seleccionada y opcion anterior
- Si la opcion es correcta (verificado server-side contra la BD)
- Timestamp exacto

**Por pregunta (`ExamQuestionView`):**
- Cuando el estudiante llego a la pregunta (`viewedAt`)
- Cuando salio de la pregunta (`leftAt`)
- Duracion en segundos

**Por seccion (`ExamSectionAttempt`):**
- Tiempo total (server-enforced)
- Cambios de pestaña (`tabSwitches`)
- Total de cambios de respuesta (`totalAnswerChanges`)
- Contenido de escritura y conteo de palabras
- Estado: NOT_STARTED → IN_PROGRESS → SUBMITTED

### Export CSV

El coordinador puede exportar todos los datos en CSV desde:
`GET /api/coordinator/monthly-exams/[examId]/export`

El CSV incluye dos secciones:
1. **Eventos de respuesta**: studentId, pseudonym, seccion, pregunta, tipo de evento, opcion, correcta, timestamp
2. **Vistas de preguntas**: studentId, pseudonym, seccion, pregunta, viewedAt, leftAt, duracion

---

## Visualizacion ECG

ECG waveforms animados en el panel del coordinador como indicadores de salud academica. 10 ritmos desde bradicardia sinusal (elite) hasta asistolia (inactivo):

| Ritmo | Condicion | Color |
|-------|-----------|-------|
| Sinus Bradycardia | Elite: activo, quiz >= 95%, streak >= 5 | Esmeralda |
| Normal Sinus | Activo, quiz >= 85% | Verde |
| Sinus Tachycardia | Activo, quiz < 85% | Lima |
| Premature Beats | 1d inactivo o quiz < 70% | Lima claro |
| Wenckebach | 2d inactivo o quiz < 60% | Amarillo |
| Mobitz II | 3-4d inactivo o quiz < 45% | Ambar |
| AFib | 5-6d inactivo o quiz < 30% | Naranja |
| AFlutter | 7-9d inactivo o quiz < 40% | Naranja oscuro |
| VTach | 10+d inactivo o 7+d con quiz < 30% | Rojo |
| Asystole | 14+d inactivo o nunca activo | Gris |

Implementacion: `src/lib/ecg-rhythms.ts` (generadores de forma de onda Gaussiana) + `src/components/EcgWaveform.tsx` (SVG polyline con scroll CSS infinito, datos duplicados para loop seamless).

---

## Seguridad

### Autenticacion y Autorizacion
- Sesiones JWT con secure cookies (`__Secure-authjs.session-token`) en produccion
- Verificacion de sesion por ruta (sin middleware global)
- Control de acceso temporal: estudiantes no pueden acceder a dias futuros
- Coordinadores solo ven datos de sus propias cohortes (scoped queries)
- APIs de simulacro restringidas a rol STUDENT (coordinadores/clientes no pueden crear attempts)
- Cron endpoints protegidos con `CRON_SECRET`

### Integridad de Datos
- **Quiz scoring server-side**: el servidor recalcula el score desde la BD, ignorando valores del cliente
- **isCorrect verificado server-side**: tanto en quizzes diarios como en eventos de simulacro
- **Batch inserts**: quiz answers se insertan via `createMany` (no N+1)
- **longestStreak atomico**: actualizado con SQL `GREATEST(longest_streak, current_streak)`
- **Double-submit protection**: `updateMany` atomico con guard de estado en simulacros

### Flujo de Matricula
- Registro → estado PENDING → coordinador aprueba → APPROVED (puede iniciar sesion)
- Email normalizado (`toLowerCase().trim()`) en registro y login
- Registro transaccional (User + CohortStudent en una transaccion)
- Guards de estado: solo se pueden aprobar estudiantes en estado PENDING
- Endpoint `/api/auth/check-status` diferencia entre credenciales invalidas, PENDING y REJECTED

### Indices de Base de Datos
Indices optimizados para consultas frecuentes: Notification, PushSubscription, QuizAttempt, PhotoUpload, CohortStudent, Announcement, WritingSubmission.

---

## Base de Datos

### Modelos (35) y Enums (10)

**Usuarios y Auth:**
User

**Cohortes:**
Cohort, CohortStudent, Certificate

**Contenido Academico:**
Module, Block, DailyContent, DailyQuestion, QuestionOption

**Progreso del Estudiante:**
AudioProgress, QuizAttempt, QuizAnswer, PhotoUpload, WritingSubmission, Streak

**Simulacros Mensuales (13 modelos):**
- Estructura: MonthlyExam → ExamSection → ExamSectionQuestion → ExamSectionOption
- Tracking: MonthlyExamAttempt → ExamSectionAttempt → ExamSectionAnswer
- Investigacion: ExamAnswerEvent (SELECTED/CHANGED/CLEARED), ExamQuestionView (viewedAt/leftAt/duracion)
- Scheduling: CohortExamSchedule, ManualUnlock

**Simulacros Legacy:**
Simulacro, SimulacroQuestion, SimulacroOption, SimulacroAttempt, SimulacroAnswer

**Comunicacion:**
Announcement, EmailLog, PushSubscription, Notification

**Enums:** Role, EnrollmentStatus, PhotoType, EmailType, EmailStatus, Difficulty, NotificationType, MonthlyExamMode, ExamSectionStatus, ExamAnswerEventType

Todos los nombres de tabla usan snake_case via `@@map()`. Campos camelCase en Prisma mapeados a snake_case en BD.

---

## API Reference

### Auth

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth (login/logout/session) |
| POST | `/api/auth/register` | Registro de estudiante (transaccional) |
| POST | `/api/auth/check-status` | Estado de matricula por email |

### Estudiante — Contenido Diario

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/day/[dayId]` | Datos completos del dia (titulo, audio, resumen, progreso) |
| GET | `/api/audio/file/[dayId]` | Redirect 302 a URL de Cloudinary |
| POST | `/api/audio/[dailyContentId]/progress` | Actualizar progreso de audio (usa UUID) |
| GET | `/api/quiz/[dayId]` | Preguntas del quiz (sin respuestas correctas) |
| POST | `/api/quiz/[dayId]/submit` | Entregar quiz (scoring server-side) |
| GET | `/api/photos/[dayId]` | Fotos subidas del dia |
| POST | `/api/photos/[dayId]` | Subir evidencia fotografica |
| GET | `/api/writing/[dayId]` | Practica de escritura del dia |
| POST | `/api/writing/[dayId]/submit` | Entregar practica de escritura |

### Estudiante — General

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard (incluye `todaySimulacro` si hay) |
| GET | `/api/leaderboard` | Leaderboard de rachas |
| GET | `/api/student/roadmap` | Roadmap del programa |
| GET | `/api/profile` | Perfil del estudiante |
| PATCH | `/api/profile` | Actualizar perfil |

### Estudiante — Notificaciones

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/notifications` | Listar notificaciones |
| PATCH | `/api/notifications/[notificationId]` | Marcar como leida |
| POST | `/api/notifications/read-all` | Marcar todas como leidas |
| GET | `/api/notifications/unread-count` | Conteo de no leidas |
| POST | `/api/push/subscribe` | Suscribir push |

### Estudiante — Simulacros Mensuales

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/monthly-exam` | Lista de 6 simulacros + progreso + gating |
| GET | `/api/monthly-exam/[examId]` | Overview del examen (8 secciones + estados) |
| GET | `/api/monthly-exam/[examId]/section/[sectionId]` | Cargar seccion (preguntas, `serverElapsedSeconds`) |
| POST | `/api/monthly-exam/[examId]/section/[sectionId]/save` | Auto-save (respuestas + eventos + vistas) |
| POST | `/api/monthly-exam/[examId]/section/[sectionId]/submit` | Entregar seccion (atomico, anti double-submit) |
| GET | `/api/monthly-exam/[examId]/results` | Resultados con desglose por competencia |

### Estudiante — Certificados

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/api/certificates/generate` | Generar certificado PDF con QR |
| GET | `/api/certificates/verify` | Verificar autenticidad de certificado |

### Coordinador — Dashboard y Gestion

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/coordinator/dashboard` | Dashboard (scoped a cohortes propias) |
| GET | `/api/coordinator/students` | Lista de estudiantes (scoped) |
| GET | `/api/coordinator/students/[studentId]` | Detalle del estudiante |
| GET | `/api/coordinator/students/[studentId]/photos` | Fotos del estudiante |
| PATCH | `/api/coordinator/students/[studentId]/photos/[photoId]` | Aprobar/rechazar foto |
| POST | `/api/coordinator/students/[studentId]/message` | Enviar mensaje |
| POST | `/api/coordinator/students/[studentId]/unlock` | Desbloqueo manual de examen |
| GET | `/api/coordinator/students/[studentId]/unlocks` | Historial de desbloqueos |
| GET | `/api/coordinator/cohorts` | Lista de cohortes |
| POST | `/api/coordinator/cohorts` | Crear cohorte |
| GET | `/api/coordinator/cohorts/[cohortId]` | Detalle de cohorte |
| POST | `/api/coordinator/cohorts/[cohortId]/enroll` | Matricular estudiante |
| GET | `/api/coordinator/enrollments` | Matriculas pendientes (scoped) |
| PATCH | `/api/coordinator/enrollments` | Aprobar/rechazar (crea CohortStudent) |
| POST | `/api/coordinator/announcements` | Crear anuncio |

### Coordinador — Exam Days (Modulo 6)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/coordinator/exam-days` | Dias de examen |
| GET | `/api/coordinator/exam-days/[dayId]/questions` | Preguntas del exam day |
| POST | `/api/coordinator/exam-days/[dayId]/questions` | Crear pregunta |
| PUT | `/api/coordinator/exam-days/[dayId]/questions/[questionId]` | Actualizar pregunta |
| DELETE | `/api/coordinator/exam-days/[dayId]/questions/[questionId]` | Eliminar pregunta |

### Coordinador — Simulacros Mensuales

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/coordinator/monthly-exams` | Lista de simulacros con stats |
| PATCH | `/api/coordinator/monthly-exams/[examId]` | Activar/desactivar simulacro |
| GET | `/api/coordinator/monthly-exams/[examId]/analytics` | Metricas detalladas |
| GET | `/api/coordinator/monthly-exams/[examId]/export` | Export CSV de investigacion |
| GET | `/api/coordinator/cohort-exam-schedule` | Listar programaciones |
| POST | `/api/coordinator/cohort-exam-schedule` | Crear programacion (WEEKLY/CONTINUOUS) |
| DELETE | `/api/coordinator/cohort-exam-schedule/[scheduleId]` | Eliminar programacion |

### Cliente

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/client/dashboard` | Metricas agregadas por cohorte |

### Cron Jobs

| Endpoint | Frecuencia | Funcion |
|----------|-----------|---------|
| `/api/cron/check-streaks` | Diario 11:59 PM | Resetea rachas rotas |
| `/api/cron/check-exam-deadlines` | Diario | Auto-cero secciones no presentadas + auto-submit expiradas |
| `/api/cron/inactivity-alerts` | Diario | Alertas de inactividad |
| `/api/cron/weekly-report` | Semanal | Reporte semanal |

---

## Scripts de Utilidad

### Seed de Contenido
```
scripts/
├── upload-audios-cloudinary.mjs     # Sube MP3s, crea modules/blocks/DailyContent
├── seed-questions.mjs               # Seed de preguntas diarias (general)
├── seed-daily-questions.mjs         # Seed de preguntas por modulo desde JSON
├── validate-daily-questions.mjs     # Validacion de JSONs de preguntas
├── seed-exam-days-module6.mjs       # Crea DailyContent para dias 26-30 (exam days)
└── seed-exam-questions-module6.mjs  # Seed de preguntas de examen Modulo 6
```

### Seed de Simulacros
```
scripts/simulacros/
├── seed-monthly-exams.mjs           # Seed de 6 simulacros desde JSON
└── data/
    ├── simulacro-01/                # 8 secciones (completo — 311 MC + 1 essay)
    ├── simulacro-02/                # 8 secciones (completo)
    ├── simulacro-03/                # 7 secciones (pendiente: atencion-en-salud)
    ├── simulacro-04/                # 8 secciones (completo)
    ├── simulacro-05/                # 8 secciones (completo)
    └── simulacro-06/                # 8 secciones (completo)
```

### Datos de Preguntas Diarias
```
scripts/data/
├── daily-questions/
│   ├── module-01-lectura-critica.json
│   ├── module-02-razonamiento-cuantitativo.json
│   ├── module-03-competencias-ciudadanas.json
│   ├── module-04-comunicacion-escrita.json
│   ├── module-05-ingles.json
│   ├── module-06-fundamentacion-dx-tx.json
│   ├── module-07-atencion-en-salud.json
│   └── module-08-promocion-prevencion.json
└── exam-questions-module6.json
```

### Demos y Utilidades
```
scripts/
├── seed-demo-data.mjs               # Seed de datos demo
├── seed-demo-full-access.mjs        # Demo con acceso completo
├── seed-cohort-demo.mjs             # Seed de cohorte demo
├── seed-ecg-demo.mjs                # Demo de ECG waveforms
├── generate-audio.mjs               # Genera audio con TTS
├── generar-audio-presentacion.mjs   # Audio de presentacion
└── e2e-test.mjs                     # Test end-to-end
```

**JSON gotcha:** Usar «» guillemets en lugar de `"` en caseText para evitar errores de parsing.

---

## Despliegue

### Render.com (Actual)
Build command: `npm install && npx prisma generate && npm run build`

Usar `npx prisma db push` (no `migrate dev`) — entorno no interactivo.

Cron jobs configurados en Render.com apuntando a `/api/cron/*?key=CRON_SECRET`.

### Google Cloud (Compatible)

La aplicacion es portable sin cambios de codigo:

| Componente | Render | Google Cloud |
|-----------|--------|-------------|
| Web app | Web Service | Cloud Run (contenedor) |
| Base de datos | PostgreSQL | Cloud SQL for PostgreSQL |
| Cron jobs | Render Cron | Cloud Scheduler → Cloud Run |
| Env vars | Render Dashboard | Secret Manager |
| Config | `render.yaml` | `Dockerfile` + `cloudbuild.yaml` |

---

## Variables de Entorno

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret para JWT |
| `NEXTAUTH_URL` | URL base de la app |
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |
| `RESEND_API_KEY` | API key de Resend |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave publica VAPID |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `CRON_SECRET` | Secret para cron jobs |

---

## Estadisticas del Proyecto

| Metrica | Cantidad |
|---------|----------|
| API endpoints | 60 |
| Paginas | 33 |
| Componentes | 9 |
| Archivos de libreria | 11 |
| Scripts ejecutables | 14 |
| Archivos de datos | 50+ |
| Modelos Prisma | 35 |
| Enums Prisma | 10 |
| Roles de usuario | 3 |
| Modulos academicos | 8 |
| Simulacros mensuales | 6 (48 secciones, 311+ preguntas) |
| Ritmos ECG | 10 |
| Cron jobs | 4 |
