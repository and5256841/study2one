"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PhotoGallery from "@/components/coordinator/PhotoGallery";
import MessageModal from "@/components/coordinator/MessageModal";
import EcgWaveform from "@/components/EcgWaveform";
import { getStudentRhythmFromActivity } from "@/lib/ecg-rhythms";

type Tab = "resumen" | "modulos" | "audio" | "quizzes" | "fotos" | "escritura" | "simulacros";

interface StudentData {
  student: {
    id: string;
    fullName: string;
    email: string;
    pseudonym: string | null;
    createdAt: string;
  };
  cohort: { name: string; startDate: string } | null;
  currentDay: {
    dayNumber: number;
    moduleNumber: number;
    moduleName: string;
  } | null;
  streak: { current: number; longest: number; lastActivity: string | null };
  overview: {
    daysCompleted: number;
    totalDays: number;
    progressPercent: number;
    quizzesTaken: number;
    quizzesPassedPercent: number;
    avgQuizScore: number;
    photosUploaded: number;
    photosPending: number;
    photosApproved: number;
    totalListenHours: number;
    avgPlaybackSpeed: number;
    writingSubmissions: number;
  };
  moduleProgress: {
    moduleNumber: number;
    moduleName: string;
    moduleIcon: string;
    daysCompleted: number;
    totalDays: number;
    percent: number;
  }[];
  audioDetails: {
    dayNumber: number;
    title: string;
    playbackSpeed: number;
    totalListened: number;
    completionPercent: number;
    isCompleted: boolean;
    completedAt: string | null;
  }[];
  quizDetails: {
    dayNumber: number;
    title: string;
    score: number;
    totalQuestions: number;
    timeSpent: number | null;
    passed: boolean;
    completedAt: string | null;
  }[];
  photos: {
    id: string;
    dayNumber: number;
    title: string;
    photoUrl: string | null;
    thumbnailUrl: string | null;
    photoType: string;
    uploadedAt: string;
    isApproved: boolean;
    approvedAt: string | null;
  }[];
  writingDetails: {
    dayNumber: number;
    title: string;
    wordCount: number;
    timeSpent: number | null;
    submittedAt: string;
  }[];
}

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("resumen");
  const [showMessage, setShowMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    fetch(`/api/coordinator/students/${studentId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  const handlePhotoApproved = (photoId: string) => {
    if (!data) return;
    setData({
      ...data,
      photos: data.photos.map((p) =>
        p.id === photoId
          ? { ...p, isApproved: true, approvedAt: new Date().toISOString(), photoUrl: null, thumbnailUrl: null }
          : p
      ),
      overview: {
        ...data.overview,
        photosPending: data.overview.photosPending - 1,
        photosApproved: data.overview.photosApproved + 1,
      },
    });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="p-4 text-center text-gray-500">
        Estudiante no encontrado
      </div>
    );
  }

  const { student, cohort, currentDay, streak, overview, moduleProgress } = data;

  const studentRhythm = getStudentRhythmFromActivity(
    streak.lastActivity,
    streak.current,
    overview.avgQuizScore
  );

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "modulos", label: "Módulos" },
    { key: "audio", label: "Audio" },
    { key: "quizzes", label: "Quizzes" },
    { key: "fotos", label: "Fotos", badge: overview.photosPending },
    { key: "escritura", label: "Escritura" },
    { key: "simulacros", label: "Simulacros" },
  ];

  return (
    <div className="p-4 max-w-4xl mx-auto pb-32">
      <Link
        href="/coordinator/students"
        className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block"
      >
        ← Volver a alumnos
      </Link>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{student.fullName}</h1>
          <button
            onClick={() => {
              setShowMessage(true);
              setMessageSent(false);
            }}
            className="px-3 py-1.5 rounded-xl bg-purple-500/80 hover:bg-purple-500 text-white text-sm font-semibold transition-colors shrink-0"
          >
            Enviar mensaje
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-400">
          <span>{student.email}</span>
          {student.pseudonym && (
            <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs">
              {student.pseudonym}
            </span>
          )}
        </div>
        {cohort && (
          <p className="text-xs text-gray-500 mt-1">
            {cohort.name} · Inicio:{" "}
            {new Date(cohort.startDate).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        <div className="mt-2">
          <EcgWaveform rhythm={studentRhythm.type} size="lg" showLabel />
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Día actual"
          value={currentDay ? `${currentDay.dayNumber}` : "—"}
          sub={currentDay ? currentDay.moduleName : ""}
        />
        <StatCard
          label="Racha"
          value={`${streak.current}`}
          sub={`Mejor: ${streak.longest}`}
          highlight={streak.current > 0}
        />
        <StatCard
          label="Progreso"
          value={`${overview.progressPercent}%`}
          sub={`${overview.daysCompleted}/${overview.totalDays} días`}
        />
        <StatCard
          label="Quizzes"
          value={`${overview.avgQuizScore}%`}
          sub={`${overview.quizzesTaken} completados`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors relative ${
              tab === t.key
                ? "bg-purple-500/20 text-purple-300"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "resumen" && (
        <TabResumen overview={overview} streak={streak} />
      )}
      {tab === "modulos" && <TabModulos modules={moduleProgress} />}
      {tab === "audio" && <TabAudio details={data.audioDetails} />}
      {tab === "quizzes" && <TabQuizzes details={data.quizDetails} />}
      {tab === "fotos" && (
        <PhotoGallery
          photos={data.photos}
          studentId={studentId}
          onPhotoApproved={handlePhotoApproved}
        />
      )}
      {tab === "escritura" && <TabEscritura details={data.writingDetails} />}
      {tab === "simulacros" && (
        <TabSimulacros studentId={studentId} studentName={student.fullName} />
      )}

      {/* Message sent success */}
      {messageSent && (
        <div className="fixed top-4 right-4 bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-sm text-green-300 z-50 animate-pulse">
          Mensaje enviado correctamente
        </div>
      )}

      {/* Message modal */}
      {showMessage && (
        <MessageModal
          studentId={studentId}
          studentName={student.fullName}
          variables={{
            streak: String(streak.current),
            days: String(overview.daysCompleted),
            score: String(overview.avgQuizScore),
          }}
          onClose={() => setShowMessage(false)}
          onSent={() => {
            setShowMessage(false);
            setMessageSent(true);
            setTimeout(() => setMessageSent(false), 3000);
          }}
        />
      )}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p
        className={`text-xl font-bold ${highlight ? "text-orange-400" : ""}`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Tab: Resumen ── */
function TabResumen({
  overview,
  streak,
}: {
  overview: StudentData["overview"];
  streak: StudentData["streak"];
}) {
  const metrics = [
    { label: "Días completados", value: `${overview.daysCompleted}/${overview.totalDays}` },
    { label: "Horas de audio", value: `${overview.totalListenHours}h` },
    { label: "Velocidad promedio", value: `${overview.avgPlaybackSpeed}x` },
    { label: "Quizzes aprobados", value: `${overview.quizzesPassedPercent}%` },
    { label: "Prom. quiz", value: `${overview.avgQuizScore}%` },
    { label: "Fotos subidas", value: `${overview.photosUploaded}` },
    { label: "Fotos pendientes", value: `${overview.photosPending}`, warn: overview.photosPending > 0 },
    { label: "Fotos aprobadas", value: `${overview.photosApproved}` },
    { label: "Ejercicios escritura", value: `${overview.writingSubmissions}` },
    { label: "Racha actual", value: `${streak.current}` },
    { label: "Mejor racha", value: `${streak.longest}` },
    {
      label: "Última actividad",
      value: streak.lastActivity
        ? new Date(streak.lastActivity).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "short",
          })
        : "Ninguna",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="bg-white/5 border border-white/10 rounded-xl p-3"
        >
          <p className="text-[10px] text-gray-500 uppercase">{m.label}</p>
          <p
            className={`text-lg font-bold mt-0.5 ${
              m.warn ? "text-yellow-400" : ""
            }`}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Módulos ── */
function TabModulos({
  modules,
}: {
  modules: StudentData["moduleProgress"];
}) {
  return (
    <div className="space-y-3">
      {modules.map((m) => (
        <div
          key={m.moduleNumber}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              {m.moduleIcon} {m.moduleName}
            </span>
            <span className="text-xs text-gray-400">
              {m.daysCompleted}/{m.totalDays} días
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ width: `${m.percent}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-right">
            {m.percent}%
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Audio ── */
function TabAudio({
  details,
}: {
  details: StudentData["audioDetails"];
}) {
  if (details.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8 text-sm">
        Sin progreso de audio registrado.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {details.map((a) => (
        <div
          key={a.dayNumber}
          className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              Día {a.dayNumber}
            </p>
            <p className="text-xs text-gray-500 truncate">{a.title}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-right shrink-0">
            <div>
              <p className="font-bold">{a.playbackSpeed}x</p>
              <p className="text-gray-500">vel.</p>
            </div>
            <div>
              <p className="font-bold">{a.completionPercent}%</p>
              <p className="text-gray-500">compl.</p>
            </div>
            <div>
              <p className="font-bold">
                {Math.round(a.totalListened / 60)}m
              </p>
              <p className="text-gray-500">escuchado</p>
            </div>
            <span
              className={`text-xs ${
                a.isCompleted ? "text-green-400" : "text-gray-600"
              }`}
            >
              {a.isCompleted ? "✓" : "○"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Quizzes ── */
function TabQuizzes({
  details,
}: {
  details: StudentData["quizDetails"];
}) {
  if (details.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8 text-sm">
        Sin quizzes completados.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {details.map((q, i) => (
        <div
          key={`${q.dayNumber}-${i}`}
          className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              Día {q.dayNumber}
            </p>
            <p className="text-xs text-gray-500 truncate">{q.title}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-right shrink-0">
            <div>
              <p className="font-bold">
                {q.score}/{q.totalQuestions}
              </p>
              <p className="text-gray-500">score</p>
            </div>
            {q.timeSpent != null && (
              <div>
                <p className="font-bold">
                  {Math.round(q.timeSpent / 60)}m
                </p>
                <p className="text-gray-500">tiempo</p>
              </div>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                q.passed
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {q.passed ? "Aprobado" : "Reprobado"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Escritura ── */
function TabEscritura({
  details,
}: {
  details: StudentData["writingDetails"];
}) {
  if (details.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8 text-sm">
        Sin ejercicios de escritura.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {details.map((w) => (
        <div
          key={w.dayNumber}
          className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              Día {w.dayNumber}
            </p>
            <p className="text-xs text-gray-500 truncate">{w.title}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-right shrink-0">
            <div>
              <p className="font-bold">{w.wordCount}</p>
              <p className="text-gray-500">palabras</p>
            </div>
            {w.timeSpent != null && (
              <div>
                <p className="font-bold">
                  {Math.round(w.timeSpent / 60)}m
                </p>
                <p className="text-gray-500">tiempo</p>
              </div>
            )}
            <p className="text-[10px] text-gray-500">
              {new Date(w.submittedAt).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Simulacros ── */
interface SimulacroInfo {
  id: string;
  number: number;
  title: string;
  isActive: boolean;
  isBaseline: boolean;
  requiredModuleNumber: number | null;
  hasAttempt: boolean;
  isCompleted: boolean;
  totalScore: number | null;
  isUnlocked: boolean;
  unlockedBy: string | null;
  unlockedAt: string | null;
  unlockedReason: string | null;
}

function TabSimulacros({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [simulacros, setSimulacros] = useState<SimulacroInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [confirmExamId, setConfirmExamId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    // Fetch exams + unlocks in parallel
    Promise.all([
      fetch("/api/coordinator/monthly-exams").then((r) => r.json()),
      fetch(`/api/coordinator/students/${studentId}/unlocks`).then((r) =>
        r.json()
      ),
    ])
      .then(([examsData, unlocksData]) => {
        const exams = examsData.exams || [];
        const unlocks = unlocksData.unlocks || [];
        const unlockMap = new Map(
          unlocks.map((u: { examId: string; unlockedBy: string; createdAt: string; reason: string | null }) => [
            u.examId,
            u,
          ])
        );

        setSimulacros(
          exams.map(
            (e: {
              id: string;
              number: number;
              title: string;
              isActive: boolean;
              isBaseline?: boolean;
              requiredModuleNumber?: number | null;
              hasAttempts?: boolean;
              isCompleted?: boolean;
              avgScore?: number | null;
            }) => {
              const unlock = unlockMap.get(e.id) as
                | { unlockedBy: string; createdAt: string; reason: string | null }
                | undefined;
              return {
                id: e.id,
                number: e.number,
                title: e.title,
                isActive: e.isActive,
                isBaseline: e.isBaseline ?? false,
                requiredModuleNumber: e.requiredModuleNumber ?? null,
                hasAttempt: false,
                isCompleted: false,
                totalScore: null,
                isUnlocked: !!unlock,
                unlockedBy: unlock?.unlockedBy ?? null,
                unlockedAt: unlock?.createdAt ?? null,
                unlockedReason: unlock?.reason ?? null,
              };
            }
          )
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleUnlock = async (examId: string) => {
    setUnlocking(examId);
    try {
      const res = await fetch(
        `/api/coordinator/students/${studentId}/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId, reason: reason.trim() || undefined }),
        }
      );
      if (res.ok) {
        setSimulacros((prev) =>
          prev.map((s) =>
            s.id === examId
              ? {
                  ...s,
                  isUnlocked: true,
                  unlockedBy: "Tú",
                  unlockedAt: new Date().toISOString(),
                  unlockedReason: reason.trim() || null,
                }
              : s
          )
        );
        setConfirmExamId(null);
        setReason("");
      }
    } catch {
      // ignore
    } finally {
      setUnlocking(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-2">
        Simulacros de {studentName.split(" ")[0]}. Puedes desbloquear
        manualmente los que requieren completar un módulo previo.
      </p>
      {simulacros.map((s) => (
        <div
          key={s.id}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-sm">{s.title}</p>
              {s.requiredModuleNumber && !s.isBaseline && (
                <p className="text-[10px] text-gray-500">
                  Requiere completar módulo {s.requiredModuleNumber}
                </p>
              )}
              {s.isBaseline && (
                <p className="text-[10px] text-green-500">
                  Disponible desde el día 1
                </p>
              )}
            </div>

            {s.isCompleted ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">
                {s.totalScore != null ? `${s.totalScore}%` : "Completado"}
              </span>
            ) : s.isUnlocked ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400">
                Desbloqueado
              </span>
            ) : s.isBaseline ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">
                Abierto
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-500">
                Bloqueado
              </span>
            )}
          </div>

          {/* Unlock info */}
          {s.isUnlocked && (
            <p className="text-[10px] text-purple-400 mb-2">
              Desbloqueado por {s.unlockedBy}
              {s.unlockedAt &&
                ` el ${new Date(s.unlockedAt).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                })}`}
              {s.unlockedReason && ` — ${s.unlockedReason}`}
            </p>
          )}

          {/* Unlock button */}
          {!s.isBaseline && !s.isUnlocked && !s.isCompleted && (
            <>
              {confirmExamId === s.id ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-yellow-300">
                    ¿Desbloquear {s.title} para{" "}
                    {studentName.split(" ")[0]}?
                  </p>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-purple-500/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUnlock(s.id)}
                      disabled={unlocking === s.id}
                      className="flex-1 py-1.5 rounded-lg bg-purple-500/80 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50 transition-colors"
                    >
                      {unlocking === s.id
                        ? "Desbloqueando..."
                        : "Confirmar desbloqueo"}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmExamId(null);
                        setReason("");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmExamId(s.id)}
                  className="w-full py-1.5 rounded-lg border border-purple-500/30 text-purple-400 text-xs font-semibold hover:bg-purple-500/10 transition-colors"
                >
                  🔓 Desbloquear
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
