"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface CompetencyBreakdown {
  [key: string]: { correct: number; total: number };
}

interface AnswerDetail {
  questionId: string;
  questionText: string;
  explanation: string | null;
  competency: string | null;
  selectedOptionId: string | null;
  selectedLetter: string | null;
  isCorrect: boolean;
  options: { id: string; letter: string; text: string; isCorrect: boolean }[];
}

interface SectionResult {
  sectionNumber: number;
  title: string;
  isWriting: boolean;
  totalQuestions: number;
  totalCorrect: number;
  percentage: number;
  timeSpentSeconds: number;
  durationMinutes: number;
  tabSwitches: number;
  writingContent: string | null;
  writingWordCount: number | null;
  status: string;
  competencyBreakdown: CompetencyBreakdown;
  answers: AnswerDetail[];
}

interface ResultData {
  examTitle: string;
  examNumber: number;
  isCompleted: boolean;
  totalScore: number | null;
  sections: SectionResult[];
}

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/monthly-exam/${examId}/results`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No hay resultados");
        return r.json();
      })
      .then(setData)
      .catch(() => router.push(`/examen/${examId}`))
      .finally(() => setLoading(false));
  }, [examId, router]);

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const mcSections = data.sections.filter((s) => !s.isWriting && s.status === "SUBMITTED");
  const totalCorrect = mcSections.reduce((s, sec) => s + sec.totalCorrect, 0);
  const totalQuestions = mcSections.reduce((s, sec) => s + sec.totalQuestions, 0);
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="p-4 max-w-4xl mx-auto pb-32">
      <Link
        href="/examen"
        className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block"
      >
        ← Volver a simulacros
      </Link>

      <h1 className="text-2xl font-bold mb-1">{data.examTitle}</h1>
      <p className="text-gray-400 text-sm mb-6">Resultados detallados</p>

      {/* Overall score card */}
      <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/20 rounded-2xl p-6 mb-8 text-center">
        <div className="text-5xl font-black text-green-400 mb-1">
          {data.totalScore !== null ? `${data.totalScore}%` : `${overallPct}%`}
        </div>
        <p className="text-gray-400">
          {totalCorrect} de {totalQuestions} preguntas MC correctas
        </p>
      </div>

      {/* Section-by-section results */}
      <div className="space-y-4">
        {data.sections.map((sec) => {
          const isExpanded = expandedSection === sec.sectionNumber;
          const timeMin = Math.floor(sec.timeSpentSeconds / 60);
          const timeSec = sec.timeSpentSeconds % 60;

          return (
            <div
              key={sec.sectionNumber}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Section header */}
              <button
                onClick={() =>
                  setExpandedSection(isExpanded ? null : sec.sectionNumber)
                }
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left"
              >
                <div>
                  <h3 className="font-bold">
                    {sec.sectionNumber}. {sec.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {sec.isWriting
                      ? `${sec.writingWordCount ?? 0} palabras`
                      : `${sec.totalCorrect}/${sec.totalQuestions} correctas`}
                    {" · "}
                    {timeMin}m {timeSec}s / {sec.durationMinutes}m
                    {sec.tabSwitches > 0 && (
                      <span className="text-yellow-500 ml-2">
                        ⚠ {sec.tabSwitches} tab-switch
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!sec.isWriting && (
                    <span
                      className={`text-lg font-bold ${
                        sec.percentage >= 60
                          ? "text-green-400"
                          : "text-orange-400"
                      }`}
                    >
                      {sec.percentage}%
                    </span>
                  )}
                  <span className="text-gray-500">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-white/10 p-5">
                  {/* Competency breakdown */}
                  {Object.keys(sec.competencyBreakdown).length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3">
                        Por competencia
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(sec.competencyBreakdown).map(
                          ([comp, { correct, total }]) => {
                            const pct =
                              total > 0 ? Math.round((correct / total) * 100) : 0;
                            return (
                              <div
                                key={comp}
                                className="bg-white/5 rounded-lg p-3"
                              >
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-300 capitalize">
                                    {comp.replace(/_/g, " ")}
                                  </span>
                                  <span
                                    className={`font-bold ${
                                      pct >= 60
                                        ? "text-green-400"
                                        : "text-orange-400"
                                    }`}
                                  >
                                    {correct}/{total} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      pct >= 60 ? "bg-green-500" : "bg-orange-500"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* Writing content */}
                  {sec.isWriting && sec.writingContent && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">
                        Tu ensayo
                      </h4>
                      <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                        {sec.writingContent}
                      </div>
                    </div>
                  )}

                  {/* Answer review (MC only) */}
                  {!sec.isWriting && sec.answers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-3">
                        Revisión de respuestas
                      </h4>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {sec.answers.map((ans, idx) => {
                          const correctOpt = ans.options.find(
                            (o) => o.isCorrect
                          );
                          return (
                            <div
                              key={ans.questionId}
                              className={`p-4 rounded-lg border ${
                                ans.isCorrect
                                  ? "border-green-500/20 bg-green-500/5"
                                  : "border-red-500/20 bg-red-500/5"
                              }`}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <span
                                  className={`text-xs font-bold mt-0.5 ${
                                    ans.isCorrect
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {idx + 1}.
                                </span>
                                <p className="text-sm text-gray-300">
                                  {ans.questionText}
                                </p>
                              </div>

                              <div className="ml-5 text-xs space-y-1">
                                {ans.selectedLetter && (
                                  <p>
                                    <span className="text-gray-500">
                                      Tu respuesta:{" "}
                                    </span>
                                    <span
                                      className={
                                        ans.isCorrect
                                          ? "text-green-400"
                                          : "text-red-400"
                                      }
                                    >
                                      {ans.selectedLetter}
                                    </span>
                                  </p>
                                )}
                                {!ans.isCorrect && correctOpt && (
                                  <p>
                                    <span className="text-gray-500">
                                      Correcta:{" "}
                                    </span>
                                    <span className="text-green-400">
                                      {correctOpt.letter}
                                    </span>
                                  </p>
                                )}
                                {ans.explanation && (
                                  <p className="text-gray-500 mt-1 italic">
                                    {ans.explanation}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
