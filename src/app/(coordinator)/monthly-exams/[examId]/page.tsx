"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SectionResult {
  sectionNumber: number;
  title: string;
  status: string;
  totalCorrect: number;
  totalQuestions: number;
  isWriting: boolean;
  timeSpentSeconds: number;
  tabSwitches: number;
  totalAnswerChanges: number;
  writingWordCount: number | null;
}

interface StudentResult {
  studentId: string;
  studentName: string;
  isCompleted: boolean;
  totalScore: number | null;
  startedAt: string;
  sections: SectionResult[];
}

interface ExamSection {
  id: string;
  sectionNumber: number;
  title: string;
  totalQuestions: number;
  isWriting: boolean;
  durationMinutes: number;
}

interface AnalyticsData {
  exam: {
    id: string;
    title: string;
    number: number;
    mode: string;
    sections: ExamSection[];
  };
  studentResults: StudentResult[];
  aggregates: {
    totalAttempts: number;
    completedAttempts: number;
    avgScore: number | null;
    medianScore: number | null;
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function ExamAnalyticsPage() {
  const { examId } = useParams<{ examId: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/coordinator/monthly-exams/${examId}/analytics`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-white/5 rounded animate-pulse mb-4 w-64" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-gray-400">
        Simulacro no encontrado
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/monthly-exams"
            className="text-xs text-gray-500 hover:text-gray-300 mb-1 block"
          >
            ← Volver a simulacros
          </Link>
          <h1 className="text-2xl font-bold">{data.exam.title}</h1>
          <p className="text-gray-400 text-sm">
            {data.exam.mode === "CONTINUOUS" ? "Modo continuo" : "Modo semanal"}{" "}
            · {data.exam.sections.length} secciones
          </p>
        </div>
        <a
          href={`/api/coordinator/monthly-exams/${examId}/export`}
          className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 text-sm font-semibold transition-colors"
        >
          Exportar CSV
        </a>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{data.aggregates.totalAttempts}</div>
          <div className="text-xs text-gray-500">Intentos</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">{data.aggregates.completedAttempts}</div>
          <div className="text-xs text-gray-500">Completados</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">
            {data.aggregates.avgScore !== null
              ? `${data.aggregates.avgScore}%`
              : "—"}
          </div>
          <div className="text-xs text-gray-500">Promedio</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">
            {data.aggregates.medianScore !== null
              ? `${data.aggregates.medianScore}%`
              : "—"}
          </div>
          <div className="text-xs text-gray-500">Mediana</div>
        </div>
      </div>

      {/* Student results table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="font-semibold">
            Resultados por estudiante ({data.studentResults.length})
          </h2>
        </div>

        {data.studentResults.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Ningún estudiante ha iniciado este simulacro
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.studentResults.map((student) => (
              <div key={student.studentId}>
                {/* Student row */}
                <button
                  onClick={() =>
                    setExpandedStudent(
                      expandedStudent === student.studentId
                        ? null
                        : student.studentId
                    )
                  }
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {student.studentName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {student.sections.filter((s) => s.status === "SUBMITTED")
                        .length}
                      /8 secciones ·{" "}
                      {student.sections.reduce(
                        (sum, s) => sum + s.totalAnswerChanges,
                        0
                      )}{" "}
                      cambios de respuesta
                    </p>
                  </div>
                  <div className="text-right">
                    {student.isCompleted ? (
                      <span className="text-green-400 font-bold">
                        {student.totalScore}%
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                        En progreso
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">
                    {expandedStudent === student.studentId ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded detail */}
                {expandedStudent === student.studentId && (
                  <div className="px-4 pb-4 bg-white/[0.02]">
                    <div className="grid grid-cols-1 gap-2">
                      {data.exam.sections.map((section) => {
                        const result = student.sections.find(
                          (s) => s.sectionNumber === section.sectionNumber
                        );
                        if (!result) {
                          return (
                            <div
                              key={section.id}
                              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                            >
                              <span className="text-xs text-gray-600 w-6">
                                {section.sectionNumber}
                              </span>
                              <span className="text-sm text-gray-500 flex-1">
                                {section.title}
                              </span>
                              <span className="text-xs text-gray-600">
                                No iniciada
                              </span>
                            </div>
                          );
                        }

                        const pct =
                          !result.isWriting && result.totalQuestions > 0
                            ? Math.round(
                                (result.totalCorrect / result.totalQuestions) *
                                  100
                              )
                            : null;

                        return (
                          <div
                            key={section.id}
                            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                          >
                            <span className="text-xs text-gray-500 w-6">
                              {section.sectionNumber}
                            </span>
                            <span className="text-sm flex-1 truncate">
                              {section.title}
                            </span>

                            {/* Score */}
                            {result.status === "SUBMITTED" ? (
                              <span
                                className={`text-sm font-semibold ${
                                  pct !== null && pct >= 60
                                    ? "text-green-400"
                                    : "text-orange-400"
                                }`}
                              >
                                {pct !== null
                                  ? `${pct}%`
                                  : result.isWriting
                                  ? `${result.writingWordCount || 0} pal.`
                                  : "—"}
                              </span>
                            ) : (
                              <span className="text-xs text-yellow-400">
                                {result.status === "IN_PROGRESS"
                                  ? "En curso"
                                  : "No iniciada"}
                              </span>
                            )}

                            {/* Time */}
                            <span className="text-xs text-gray-500 w-16 text-right">
                              {formatTime(result.timeSpentSeconds)}
                            </span>

                            {/* Answer changes */}
                            {result.totalAnswerChanges > 0 && (
                              <span className="text-xs text-purple-400">
                                {result.totalAnswerChanges} cambios
                              </span>
                            )}

                            {/* Tab switches */}
                            {result.tabSwitches > 0 && (
                              <span className="text-xs text-yellow-500">
                                {result.tabSwitches} tabs
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
