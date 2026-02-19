# Study2One Platform

Plataforma de preparacion para examenes Saber Pro/TyT diseñada para estudiantes universitarios de ciencias de la salud en Colombia. Programa estructurado de 125 dias (lunes a viernes) con audio diario, quizzes, practica de escritura, subida de evidencias fotograficas, simulacros mensuales tipo Saber Pro con metricas de investigacion, y panel de coordinador con ECG waveforms.

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
- [Base de Datos](#base-de-datos)
- [API Reference](#api-reference)
- [Scripts de Utilidad](#scripts-de-utilidad)
- [Despliegue](#despliegue)
- [Variables de Entorno](#variables-de-entorno)

---

## Vision General

Study2One transforma la preparacion del Saber Pro en un programa diario estructurado. Cada dia el estudiante:

1. **Escucha** una leccion en audio (generada con OpenAI TTS, alojada en Cloudinary)
2. **Responde** un quiz de 3 preguntas sobre el contenido del dia
3. **Sube** una evidencia fotografica (mapa mental, cuadro sinoptico, cuadernillo)
4. **Practica escritura** (solo Modulo 4 — Comunicacion Escrita)
5. **Presenta simulacros** mensuales tipo Saber Pro con timing oficial ICFES

Tres roles: **Estudiante**, **Coordinador** y **Cliente**. El coordinador programa simulacros por cohorte, revisa metricas detalladas y monitorea la salud academica mediante ECG waveforms animados.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | Next.js 14.2 (App Router), React 18, TypeScript 5 |
| Estilos | Tailwind CSS 3.4 |
| ORM | Prisma 5.22, PostgreSQL 16 |
| Auth | NextAuth v5 beta (credentials, JWT, `trustHost: true`) |
| Estado | Zustand (client), Zod (validacion) |
| CDN Audio | Cloudinary (`resource_type: "video"`) |
| Email | Resend |
| Push | web-push (VAPID) |
| PDF | jsPDF + qrcode.react |
| Audio TTS | OpenAI TTS API (tts-1-hd) |
| Deploy | Render.com |

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
npx prisma db push   # Push schema (usar en Render — no interactivo)
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
│   └── api/             # 57 endpoints REST
├── components/
│   ├── monthly-exam/    # PCOnlyGate, ExamTimer, QuestionNavigator, ConfirmSubmitModal
│   ├── coordinator/     # Componentes del panel de coordinador
│   └── EcgWaveform.tsx  # SVG polyline con scroll infinito CSS
├── lib/
│   ├── auth.ts          # NextAuth config con Prisma adapter
│   ├── prisma.ts        # Singleton Prisma client
│   ├── student-day.ts   # Calculo de dias habiles, modulos, semanas
│   ├── exam-schedule.ts # Mapeo seccion→dia para simulacros
│   ├── ecg-rhythms.ts   # 6 ritmos ECG y getStudentRhythm()
│   ├── exam-sounds.ts   # Web Audio API (warning, completion, time-up)
│   └── cloudinary.ts    # Upload/retrieval de audio
└── types/
    └── next-auth.d.ts   # Extensiones de sesion
```

### Patron de Autenticacion

No hay `middleware.ts` — auth se verifica por ruta. Cada API protegida usa:

```typescript
const session = await auth();
if (!session?.user?.role || session.user.role !== "COORDINATOR") {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
```

Cron endpoints usan `?key=CRON_SECRET`. Path alias: `@/` → `./src/`.

---

## Roles de Usuario

### Estudiante (STUDENT)
- Dashboard con alerta de simulacro del dia, racha, progreso
- Contenido diario: audio + quiz + evidencia fotografica
- Practica de escritura (Modulo 4)
- Simulacros mensuales con timer oficial ICFES
- Leaderboard, roadmap, perfil con ECG rhythm
- Notificaciones push

### Coordinador (COORDINATOR)
- Dashboard con ECG waveforms (salud academica por estudiante)
- Gestion de alumnos, matriculas, cohortes
- **Programacion de simulacros por cohorte** (elige semana de inicio)
- **Metricas de simulacros**: puntajes, tiempos, cambios de respuesta, tab switches
- **Export CSV** de datos para investigacion
- Anuncios, desbloqueo manual de exams
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
- Audio (~10 min) → Quiz (3 preguntas) → Evidencia fotografica
- Dia completado = audio + quiz + evidencia

### Funcionalidades Especiales

- **Modulo 4**: Practica de escritura con anti-paste (onPaste/onDrop/onContextMenu)
- **Modulo 6 dias 26-30**: Exam days (15 preguntas, timer visible, `isExamDay: true`)

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
- **WEEKLY** (Simulacros 1-4, 6): Secciones en cualquier orden, una por dia programado
- **CONTINUOUS** (Simulacro 5): Secciones secuenciales 1→8

### Programacion por Cohorte

El coordinador programa cada simulacro eligiendo la **semana de inicio** para una cohorte:
- **Semana 1**: Secciones 1-5 (Lun-Vie)
- **Semana 2**: Secciones 6-8 (Lun-Mie)
- Total: 8 secciones en 8 dias habiles (2 semanas)

El estudiante ve una **alerta en su dashboard** el dia que tiene simulacro: "Hoy tienes simulacro — lo puedes realizar durante todo el dia, a la hora que quieras, pero debes cumplir con las reglas del Saber Pro."

### Timer Server-Enforced

- El timer se calcula desde `startedAt` del servidor, no del cliente
- Si el estudiante cierra el navegador, el tiempo sigue corriendo
- Al reconectarse, el timer muestra el tiempo real transcurrido
- Si el tiempo expira, se auto-submit la seccion con las respuestas guardadas

### Auto-Guardado

- Cada 30 segundos se guardan: respuestas, tiempo, tab switches, metricas
- Si se pierde conexion, al reconectar se restauran las respuestas guardadas
- El estudiante NO puede reiniciar un simulacro — solo continuar

### Auto-Cero por Inasistencia

Si el estudiante no presenta una seccion en el dia programado:
- Cron diario (`/api/cron/check-exam-deadlines`) marca la seccion como SUBMITTED con 0 correctas
- Como si no hubiera asistido al examen real

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

---

## Metricas de Investigacion

Sistema completo de tracking para analisis estadistico posterior. **Invisible para el estudiante.**

### Datos Registrados

**Por respuesta (`ExamAnswerEvent`):**
- Tipo de evento: SELECTED (primera vez), CHANGED (cambio), CLEARED (borrada)
- Opcion seleccionada y opcion anterior
- Si la opcion es correcta (para analizar patrones buena→mala, mala→buena)
- Timestamp exacto

**Por pregunta (`ExamQuestionView`):**
- Cuando el estudiante llego a la pregunta (`viewedAt`)
- Cuando salio de la pregunta (`leftAt`)
- Duracion en segundos

**Por seccion (`ExamSectionAttempt`):**
- Tiempo total (server-enforced)
- Cambios de pestaña
- Total de cambios de respuesta
- Contenido de escritura y conteo de palabras

### Export CSV

El coordinador puede exportar todos los datos en CSV desde:
`GET /api/coordinator/monthly-exams/[examId]/export`

El CSV incluye dos secciones:
1. **Eventos de respuesta**: studentId, pseudonym, seccion, pregunta, tipo de evento, opcion, correcta, timestamp
2. **Vistas de preguntas**: studentId, pseudonym, seccion, pregunta, viewedAt, leftAt, duracion

---

## Visualizacion ECG

ECG waveforms animados en el panel del coordinador como indicadores de salud academica.

| Ritmo | Condicion | Color |
|-------|-----------|-------|
| Normal Sinus | Activo, quiz >= 80% | Verde |
| Wenckebach | 1-2d inactivo o quiz 60-79% | Lima |
| Mobitz II | 3-4d inactivo o quiz 40-59% | Amarillo |
| AFib | 5-7d inactivo o quiz 20-39% | Naranja |
| VTach | 7+d inactivo + quiz < 40% | Rojo |
| Asystole | 14+d inactivo o nunca activo | Gris |

Implementacion: `src/lib/ecg-rhythms.ts` (generadores de forma de onda Gaussiana) + `src/components/EcgWaveform.tsx` (SVG polyline con scroll CSS infinito).

---

## Base de Datos

### Modelos Principales (45+)

**Usuarios y Auth:** User, Account, Session, VerificationToken

**Cohortes:** Cohort, CohortStudent, Certificate

**Contenido:** Module, Block, DailyContent, DailyQuestion, QuestionOption

**Progreso:** AudioProgress, QuizAttempt, QuizAnswer, PhotoUpload, WritingSubmission, Streak

**Simulacros Mensuales:**
- MonthlyExam, ExamSection, ExamSectionQuestion, ExamSectionOption
- MonthlyExamAttempt, ExamSectionAttempt, ExamSectionAnswer
- ManualUnlock, CohortExamSchedule

**Metricas de Investigacion:**
- ExamAnswerEvent (historial de clicks con tipo SELECTED/CHANGED/CLEARED)
- ExamQuestionView (tiempo viendo cada pregunta)

**Comunicacion:** Announcement, EmailLog, PushSubscription, Notification

**Legacy:** Simulacro, SimulacroQuestion, SimulacroOption, SimulacroAttempt, SimulacroAnswer

---

## API Reference

### Estudiante — Contenido Diario

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/day/[dayId]` | Datos completos del dia (titulo, audio, resumen, progreso) |
| GET | `/api/audio/file/[dayId]` | Redirect 302 a URL de Cloudinary |
| POST | `/api/audio/[dailyContentId]/progress` | Actualizar progreso de audio (usa UUID) |
| GET | `/api/quiz/[dayId]` | Preguntas del quiz (`{ questions, isExamDay }`) |
| POST | `/api/quiz/[dayId]/submit` | Entregar quiz (acepta `timeSpentSeconds`) |
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

### Estudiante — Simulacros Mensuales

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/monthly-exam` | Lista de 6 simulacros + progreso + gating |
| GET | `/api/monthly-exam/[examId]` | Overview del examen (8 secciones + estados) |
| GET | `/api/monthly-exam/[examId]/section/[sectionId]` | Cargar seccion (preguntas, `serverElapsedSeconds`, `isTimeExpired`) |
| POST | `/api/monthly-exam/[examId]/section/[sectionId]/save` | Auto-save (respuestas + answerEvents + questionViews) |
| POST | `/api/monthly-exam/[examId]/section/[sectionId]/submit` | Entregar seccion (server-enforced timing) |
| GET | `/api/monthly-exam/[examId]/results` | Resultados con desglose por competencia |

### Coordinador — Simulacros

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/coordinator/monthly-exams` | Lista de simulacros con stats agregadas |
| PATCH | `/api/coordinator/monthly-exams/[examId]` | Activar/desactivar simulacro |
| GET | `/api/coordinator/monthly-exams/[examId]/analytics` | Metricas detalladas por estudiante |
| GET | `/api/coordinator/monthly-exams/[examId]/export` | Export CSV de metricas |
| GET | `/api/coordinator/cohort-exam-schedule` | Listar programaciones |
| POST | `/api/coordinator/cohort-exam-schedule` | Crear programacion (cohortId, examId, startWeek) |
| DELETE | `/api/coordinator/cohort-exam-schedule/[scheduleId]` | Eliminar programacion |

### Coordinador — General

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/coordinator/dashboard` | Dashboard con ECG data |
| GET | `/api/coordinator/students` | Lista de estudiantes |
| GET | `/api/coordinator/students/[studentId]` | Detalle del estudiante |
| POST | `/api/coordinator/students/[studentId]/unlock` | Desbloqueo manual |
| POST | `/api/coordinator/students/[studentId]/message` | Enviar mensaje |
| GET | `/api/coordinator/cohorts` | Lista de cohortes |
| POST | `/api/coordinator/cohorts` | Crear cohorte |
| GET | `/api/coordinator/enrollments` | Matriculas pendientes |
| POST | `/api/coordinator/announcements` | Crear anuncio |
| GET | `/api/coordinator/exam-days` | Dias de examen (Modulo 6) |

### Notificaciones

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/notifications` | Listar notificaciones |
| PATCH | `/api/notifications/[notificationId]` | Marcar como leida |
| POST | `/api/notifications/read-all` | Marcar todas como leidas |
| GET | `/api/notifications/unread-count` | Conteo de no leidas |
| POST | `/api/push/subscribe` | Suscribir push |

### Cron Jobs

| Endpoint | Frecuencia | Funcion |
|----------|-----------|---------|
| `/api/cron/check-streaks` | Diario 11:59 PM | Resetea rachas rotas |
| `/api/cron/check-exam-deadlines` | Diario | Auto-cero secciones de simulacro no presentadas |
| `/api/cron/inactivity-alerts` | Diario | Alertas de inactividad |
| `/api/cron/weekly-report` | Semanal | Reporte semanal |

---

## Scripts de Utilidad

```
scripts/
├── upload-audios-cloudinary.mjs     # Sube MP3s, crea modules/blocks/DailyContent
├── seed-exam-days-module6.mjs       # Crea DailyContent para dias 26-30 (exam days)
├── seed-exam-questions-module6.mjs  # Seed de preguntas de examen Modulo 6
├── seed-cohort-demo.mjs             # Seed de cohorte demo
├── seed-demo-full-access.mjs        # Demo con acceso completo
├── seed-ecg-demo.mjs                # Demo de ECG waveforms
├── generar-audio-presentacion.mjs   # Genera audio de presentacion
└── simulacros/
    ├── seed-monthly-exams.mjs       # Seed de 6 simulacros desde JSON
    └── data/
        └── simulacro-01/            # 8 JSONs (311 MC + 1 essay)
            ├── lectura-critica.json
            ├── razonamiento-cuantitativo.json
            ├── competencias-ciudadanas.json
            ├── comunicacion-escrita.json
            ├── ingles.json
            ├── fundamentacion-dx-tx.json
            ├── atencion-en-salud.json
            └── promocion-prevencion.json
```

**JSON gotcha:** Usar «» guillemets en lugar de `"` en caseText para evitar errores de parsing.

---

## Despliegue

Render.com con build command: `npm install && npx prisma generate && npm run build`

Usar `npx prisma db push` (no `migrate dev`) — entorno no interactivo.

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

- **57** API endpoints
- **32+** paginas
- **9** componentes
- **11** archivos de libreria
- **11** scripts
- **45+** modelos Prisma
- **3** roles de usuario
- **8** modulos academicos
- **6** simulacros mensuales (48 secciones, 311+ preguntas)
- **6** ritmos ECG
- **4** cron jobs
