"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PCOnlyGate from "@/components/monthly-exam/PCOnlyGate";

interface Section {
  id: string;
  sectionNumber: number;
  moduleNumber: number;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  isWriting: boolean;
  status: string;
  totalCorrect: number;
  timeSpentSeconds: number;
  tabSwitches: number;
  writingWordCount: number | null;
}

interface ExamData {
  id: string;
  number: number;
  title: string;
  mode: string;
  attemptId: string;
  isCompleted: boolean;
  totalScore: number | null;
  nextAvailableSection: number | null;
  sections: Section[];
}

const SECTION_ICONS: Record<number, string> = {
  1: "📖",
  2: "🔢",
  3: "🏛️",
  4: "✍️",
  5: "🇬🇧",
  6: "🩺",
  7: "🏥",
  8: "💊",
};

export default function ExamOverviewPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/monthly-exam/${examId}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Error");
        }
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-300 font-semibold">{error}</p>
          <button
            onClick={() => router.push("/examen")}
            className="mt-4 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
          >
            Volver a simulacros
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const completedCount = data.sections.filter(
    (s) => s.status === "SUBMITTED"
  ).length;

  return (
    <PCOnlyGate>
      <div className="p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/examen"
            className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block"
          >
            ← Volver a simulacros
          </Link>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span>
              {data.mode === "CONTINUOUS"
                ? "Modo continuo"
                : "Modo semanal"}
            </span>
            <span>
              {completedCount}/{data.sections.length} secciones completadas
            </span>
          </div>

          {data.isCompleted && data.totalScore !== null && (
            <div className="mt-4 bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-4">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold text-green-300">
                  Simulacro completado — Puntaje: {data.totalScore}%
                </p>
                <Link
                  href={`/examen/${examId}/results`}
                  className="text-sm text-green-400 underline hover:no-underline"
                >
                  Ver resultados detallados →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Mode info */}
        {data.mode === "CONTINUOUS" && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-sm text-blue-300">
            <strong>Modo continuo:</strong> Las secciones deben completarse en
            orden secuencial (1→2→...→8). Solo puedes iniciar la siguiente
            sección cuando hayas entregado la anterior.
          </div>
        )}

        {/* Sections grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.sections.map((sec) => {
            const isSubmitted = sec.status === "SUBMITTED";
            const isInProgress = sec.status === "IN_PROGRESS";
            const isLocked =
              data.mode === "CONTINUOUS" &&
              data.nextAvailableSection !== null &&
              sec.sectionNumber > data.nextAvailableSection &&
              !isSubmitted &&
              !isInProgress;

            const percentage =
              isSubmitted && !sec.isWriting && sec.totalQuestions > 0
                ? Math.round((sec.totalCorrect / sec.totalQuestions) * 100)
                : null;

            return (
              <div
                key={sec.id}
                className={`bg-white/5 border rounded-xl p-5 transition-all ${
                  isSubmitted
                    ? "border-green-500/30"
                    : isInProgress
                    ? "border-blue-500/30"
                    : isLocked
                    ? "border-white/5 opacity-50"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {SECTION_ICONS[sec.sectionNumber] || "📝"}
                    </span>
                    <div>
                      <h3 className="font-bold">{sec.title}</h3>
                      <p className="text-xs text-gray-500">
                        {sec.isWriting
                          ? "Ensayo argumentativo"
                          : `${sec.totalQuestions} preguntas`}{" "}
                        · {sec.durationMinutes} min
                      </p>
                    </div>
                  </div>

                  {isSubmitted && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400">
                      {percentage !== null ? `${percentage}%` : "Entregado"}
                    </span>
                  )}
                  {isInProgress && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                      En curso
                    </span>
                  )}
                  {isLocked && (
                    <span className="text-gray-600 text-lg">🔒</span>
                  )}
                </div>

                {isSubmitted ? (
                  <div className="text-sm text-gray-500">
                    {sec.isWriting
                      ? `${sec.writingWordCount ?? 0} palabras`
                      : `${sec.totalCorrect}/${sec.totalQuestions} correctas`}
                    {sec.tabSwitches > 0 && (
                      <span className="ml-2 text-yellow-500">
                        ⚠ {sec.tabSwitches} cambios de pestaña
                      </span>
                    )}
                  </div>
                ) : isLocked ? (
                  <p className="text-xs text-gray-600">
                    Completa la sección anterior primero
                  </p>
                ) : (
                  <Link
                    href={`/examen/${examId}/seccion/${sec.id}`}
                    className="block w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm transition-all mt-2"
                  >
                    {isInProgress ? "Continuar" : "Iniciar sección"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PCOnlyGate>
  );
}
