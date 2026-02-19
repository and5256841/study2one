"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ExamSummary {
  id: string;
  number: number;
  title: string;
  mode: string;
  isActive: boolean;
  totalSections: number;
  sectionsCompleted: number;
  isCompleted: boolean;
  totalScore: number | null;
  hasAttempt: boolean;
  isBaseline: boolean;
  requiredModuleNumber: number | null;
  requiredModuleName: string | null;
  isLocked: boolean;
  isManuallyUnlocked: boolean;
}

export default function ExamenListPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/monthly-exam")
      .then((r) => r.json())
      .then((data) => setExams(data.exams || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Simulacros Mensuales</h1>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Simulacros Mensuales</h1>
      <p className="text-gray-400 text-sm mb-6">
        Practica con exámenes completos tipo Saber Pro. Cada simulacro tiene 8
        secciones con temporizador.
      </p>

      <div className="space-y-4">
        {exams.map((exam) => {
          const progress =
            exam.totalSections > 0
              ? Math.round((exam.sectionsCompleted / exam.totalSections) * 100)
              : 0;

          return (
            <div
              key={exam.id}
              className={`bg-white/5 border rounded-xl p-5 transition-all ${
                exam.isLocked
                  ? "border-white/5 opacity-70"
                  : "border-white/10 hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg">
                    {exam.isLocked && <span className="mr-1.5">🔒</span>}
                    {exam.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {exam.mode === "CONTINUOUS"
                      ? "Modo continuo — secciones en orden"
                      : "Modo semanal — secciones en cualquier orden"}
                  </p>
                </div>
                {exam.isCompleted ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                    {exam.totalScore !== null
                      ? `${exam.totalScore}%`
                      : "Completado"}
                  </span>
                ) : exam.isManuallyUnlocked ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    Desbloqueado
                  </span>
                ) : exam.hasAttempt ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    En progreso
                  </span>
                ) : exam.isLocked ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-500 border border-gray-500/30">
                    Bloqueado
                  </span>
                ) : !exam.isActive ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-500 border border-gray-500/30">
                    No disponible
                  </span>
                ) : null}
              </div>

              {/* Locked message */}
              {exam.isLocked && exam.requiredModuleName && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3 text-sm text-gray-400">
                  Completa el módulo {exam.requiredModuleName} para desbloquear
                  este simulacro.
                </div>
              )}

              {/* Progress bar */}
              {exam.hasAttempt && !exam.isLocked && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {exam.sectionsCompleted}/{exam.totalSections} secciones
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {exam.isLocked ? (
                <div className="text-center py-2.5 text-gray-600 text-sm">
                  🔒 Requiere completar módulo previo
                </div>
              ) : exam.isActive ? (
                <Link
                  href={
                    exam.isCompleted
                      ? `/examen/${exam.id}/results`
                      : `/examen/${exam.id}`
                  }
                  className="block w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-green-500/80 to-blue-500/80 hover:from-green-500 hover:to-blue-500 text-white font-semibold text-sm transition-all"
                >
                  {exam.isCompleted
                    ? "Ver resultados"
                    : exam.hasAttempt
                    ? "Continuar"
                    : "Comenzar"}
                </Link>
              ) : (
                <div className="text-center py-2.5 text-gray-600 text-sm">
                  Pendiente de activación
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
