"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PCOnlyGate from "@/components/monthly-exam/PCOnlyGate";
import ExamTimer from "@/components/monthly-exam/ExamTimer";
import QuestionNavigator from "@/components/monthly-exam/QuestionNavigator";
import ConfirmSubmitModal from "@/components/monthly-exam/ConfirmSubmitModal";
import {
  playWarningSound,
  playCompletionSound,
  playTimeUpSound,
} from "@/lib/exam-sounds";

interface Option {
  id: string;
  letter: string;
  text: string;
}

interface Question {
  id: string;
  questionOrder: number;
  caseText: string | null;
  questionText: string;
  options: Option[];
}

interface SectionInfo {
  id: string;
  sectionNumber: number;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  isWriting: boolean;
}

interface SectionData {
  section: SectionInfo;
  sectionAttemptId: string;
  startedAt: string;
  timeSpentSeconds: number;
  serverElapsedSeconds: number;
  isTimeExpired: boolean;
  tabSwitches: number;
  writingContent: string | null;
  questions: Question[];
  savedAnswers: Record<string, string | null>;
}

// Research metrics types
interface AnswerEvent {
  questionId: string;
  selectedOptionId: string | null;
  previousOptionId: string | null;
  eventType: "SELECTED" | "CHANGED" | "CLEARED";
  isCorrect: boolean;
  timestamp: string;
}

interface QuestionViewEvent {
  questionId: string;
  viewedAt: string;
  leftAt: string | null;
  durationSeconds: number | null;
}

export default function SectionExamPage() {
  const { examId, sectionId } = useParams<{
    examId: string;
    sectionId: string;
  }>();
  const router = useRouter();

  const [data, setData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // MC state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // confirmed answers
  const [preselected, setPreselected] = useState<string | null>(null); // option clicked but not confirmed

  // Writing state
  const [writingContent, setWritingContent] = useState("");

  // Timer / proctoring
  const [elapsed, setElapsed] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    totalCorrect: number;
    totalQuestions: number;
    isWriting: boolean;
    examCompleted: boolean;
  } | null>(null);

  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const hasBeenWarned = useRef(false);

  // Research metrics buffers (invisible to student)
  const answerEventsRef = useRef<AnswerEvent[]>([]);
  const questionViewsRef = useRef<QuestionViewEvent[]>([]);
  const currentViewRef = useRef<{ questionId: string; viewedAt: string } | null>(null);

  // Load section data
  useEffect(() => {
    fetch(`/api/monthly-exam/${examId}/section/${sectionId}`)
      .then(async (r) => {
        if (r.status === 410) {
          // Time expired — auto-submitted
          const err = await r.json();
          setError(err.error || "Tiempo agotado");
          return null;
        }
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Error");
        }
        return r.json();
      })
      .then((d: SectionData | null) => {
        if (!d) return;
        setData(d);
        // Use server-enforced elapsed time (accounts for offline time)
        setElapsed(d.serverElapsedSeconds);
        setTabSwitches(d.tabSwitches);
        setWritingContent(d.writingContent || "");

        // Restore saved MC answers
        const restored: Record<string, string> = {};
        for (const [qId, optId] of Object.entries(d.savedAnswers)) {
          if (optId) restored[qId] = optId;
        }
        setAnswers(restored);

        // Start tracking the first question view
        if (d.questions.length > 0 && !d.section.isWriting) {
          currentViewRef.current = {
            questionId: d.questions[0].id,
            viewedAt: new Date().toISOString(),
          };
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [examId, sectionId]);

  // Tab-switch detection
  useEffect(() => {
    const handler = () => {
      if (document.hidden && !submitted) {
        setTabSwitches((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [submitted]);

  // Beforeunload warning
  useEffect(() => {
    if (submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submitted]);

  // Track question views when navigating between questions
  useEffect(() => {
    if (!data || data.section.isWriting || submitted) return;

    // Close previous view
    if (currentViewRef.current) {
      const now = new Date();
      const viewed = new Date(currentViewRef.current.viewedAt);
      const duration = Math.floor((now.getTime() - viewed.getTime()) / 1000);
      questionViewsRef.current.push({
        questionId: currentViewRef.current.questionId,
        viewedAt: currentViewRef.current.viewedAt,
        leftAt: now.toISOString(),
        durationSeconds: duration,
      });
    }

    // Start new view
    const qId = data.questions[currentIndex]?.id;
    if (qId) {
      currentViewRef.current = {
        questionId: qId,
        viewedAt: new Date().toISOString(),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Build save payload
  const buildSavePayload = useCallback(() => {
    if (!data) return null;

    const payload: Record<string, unknown> = {
      timeSpentSeconds: elapsed,
      tabSwitches,
    };

    if (data.section.isWriting) {
      payload.writingContent = writingContent;
    } else {
      payload.answers = Object.entries(answers).map(([questionId, optionId]) => ({
        questionId,
        optionId,
      }));
    }

    // Drain metrics buffers
    if (answerEventsRef.current.length > 0) {
      payload.answerEvents = answerEventsRef.current.splice(0);
    }
    if (questionViewsRef.current.length > 0) {
      payload.questionViews = questionViewsRef.current.splice(0);
    }

    return payload;
  }, [data, elapsed, tabSwitches, answers, writingContent]);

  // Auto-save every 30s
  useEffect(() => {
    if (!data || submitted) return;

    autoSaveRef.current = setInterval(() => {
      const payload = buildSavePayload();
      if (!payload) return;

      fetch(`/api/monthly-exam/${examId}/section/${sectionId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 30000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [data, submitted, buildSavePayload, examId, sectionId]);

  // Preselect an option (first click — not yet confirmed)
  const preselectOption = useCallback(
    (optionId: string) => {
      if (submitted) return;
      // If clicking the same option that's already preselected, deselect
      if (preselected === optionId) {
        setPreselected(null);
      } else {
        setPreselected(optionId);
      }
    },
    [submitted, preselected]
  );

  // Confirm the preselected option (second click / confirm button)
  const confirmAnswer = useCallback(
    (questionId: string) => {
      if (submitted || !preselected) return;

      const previousOptionId = answers[questionId] || null;
      const eventType = previousOptionId ? "CHANGED" : "SELECTED";

      // Find if the selected option is correct (for research tracking)
      const question = data?.questions.find((q) => q.id === questionId);
      const selectedOpt = question?.options.find((o) => o.id === preselected);
      // We don't know isCorrect client-side (options don't include it), set false
      // The API/analytics will join with the actual isCorrect value

      answerEventsRef.current.push({
        questionId,
        selectedOptionId: preselected,
        previousOptionId,
        eventType,
        isCorrect: false, // determined server-side in analytics
        timestamp: new Date().toISOString(),
      });

      setAnswers((prev) => ({ ...prev, [questionId]: preselected }));
      setPreselected(null);

      // Ignore unused vars
      void selectedOpt;
    },
    [submitted, preselected, answers, data]
  );

  // Submit
  const doSubmit = useCallback(async () => {
    if (!data || submitting) return;
    setSubmitting(true);
    setShowConfirm(false);

    // Close current question view
    if (currentViewRef.current) {
      const now = new Date();
      const viewed = new Date(currentViewRef.current.viewedAt);
      questionViewsRef.current.push({
        questionId: currentViewRef.current.questionId,
        viewedAt: currentViewRef.current.viewedAt,
        leftAt: now.toISOString(),
        durationSeconds: Math.floor((now.getTime() - viewed.getTime()) / 1000),
      });
      currentViewRef.current = null;
    }

    const payload = buildSavePayload();
    if (!payload) {
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/monthly-exam/${examId}/section/${sectionId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Error al entregar");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setResult(json);
      playCompletionSound();
    } catch {
      alert("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }, [data, submitting, buildSavePayload, examId, sectionId]);

  // Time up → auto-submit
  const handleTimeUp = useCallback(() => {
    if (!submitted && !submitting) {
      playTimeUpSound();
      doSubmit();
    }
  }, [submitted, submitting, doSubmit]);

  const handleWarning = useCallback(
    (minutesLeft: number) => {
      if (!hasBeenWarned.current || minutesLeft === 1) {
        playWarningSound();
        hasBeenWarned.current = true;
      }
    },
    []
  );

  // ---- Render ----

  if (loading) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="h-12 bg-white/5 rounded-xl animate-pulse mb-4" />
        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-300 font-semibold">{error}</p>
          <button
            onClick={() => router.push(`/examen/${examId}`)}
            className="mt-4 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
          >
            Volver al examen
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // -- Submitted result screen --
  if (submitted && result) {
    const pct =
      !result.isWriting && result.totalQuestions > 0
        ? Math.round((result.totalCorrect / result.totalQuestions) * 100)
        : null;

    return (
      <div className="p-4 max-w-lg mx-auto mt-12 text-center">
        <div className="text-6xl mb-4">{pct !== null && pct >= 60 ? "🎉" : "📝"}</div>
        <h2 className="text-2xl font-bold mb-2">Sección entregada</h2>
        <p className="text-gray-400 mb-4">{data.section.title}</p>

        {pct !== null ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <div className="text-4xl font-bold text-green-400 mb-1">
              {pct}%
            </div>
            <p className="text-gray-400">
              {result.totalCorrect} de {result.totalQuestions} correctas
            </p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <p className="text-gray-300">Ensayo entregado correctamente</p>
          </div>
        )}

        {tabSwitches > 0 && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 mb-4 text-sm text-yellow-300">
            Se detectaron {tabSwitches} cambios de pestaña
          </div>
        )}

        <div className="space-y-3">
          {result.examCompleted ? (
            <button
              onClick={() => router.push(`/examen/${examId}/results`)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500/80 to-blue-500/80 text-white font-semibold"
            >
              Ver resultados del examen
            </button>
          ) : (
            <button
              onClick={() => router.push(`/examen/${examId}`)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold"
            >
              Volver al examen
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = data.section.isWriting
    ? null
    : data.questions[currentIndex];
  const answeredSet = new Set(Object.keys(answers));
  const questionIds = data.questions.map((q) => q.id);

  return (
    <PCOnlyGate>
      <div className="min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-sm lg:text-base truncate max-w-[200px] lg:max-w-none">
                {data.section.title}
              </h2>
              {!data.section.isWriting && (
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {answeredSet.size}/{data.section.totalQuestions} respondidas
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {tabSwitches > 0 && (
                <span className="text-xs text-yellow-500 hidden sm:inline">
                  {tabSwitches} tab-switch{tabSwitches > 1 ? "es" : ""}
                </span>
              )}
              <ExamTimer
                durationMinutes={data.section.durationMinutes}
                elapsedSeconds={elapsed}
                onTick={setElapsed}
                onTimeUp={handleTimeUp}
                onWarning={handleWarning}
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          {data.section.isWriting ? (
            /* ---- Writing section ---- */
            <div className="max-w-3xl mx-auto">
              {data.questions[0] && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
                  <h3 className="font-bold text-blue-300 mb-2">
                    Instrucciones
                  </h3>
                  <p className="text-gray-300 whitespace-pre-line">
                    {data.questions[0].questionText}
                  </p>
                </div>
              )}

              <div className="mb-3 flex justify-between text-sm text-gray-500">
                <span>Tu ensayo:</span>
                <span>
                  {
                    writingContent
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length
                  }{" "}
                  palabras
                </span>
              </div>

              <textarea
                value={writingContent}
                onChange={(e) => setWritingContent(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                placeholder="Escribe tu ensayo aquí..."
                className="w-full h-[400px] bg-white/5 border border-white/10 rounded-xl p-4 text-gray-200 resize-none focus:outline-none focus:border-blue-500/50 placeholder-gray-600"
              />

              <button
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
                className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-green-500/80 to-blue-500/80 hover:from-green-500 hover:to-blue-500 text-white font-semibold transition-all disabled:opacity-50"
              >
                Entregar ensayo
              </button>
            </div>
          ) : (
            /* ---- MC section ---- */
            <div className="flex gap-6">
              {/* Sidebar navigator (PC only) */}
              <div className="hidden lg:block w-56 shrink-0">
                <div className="sticky top-20">
                  <QuestionNavigator
                    totalQuestions={data.section.totalQuestions}
                    currentIndex={currentIndex}
                    answeredSet={answeredSet}
                    questionIds={questionIds}
                    onNavigate={(idx) => {
                      setPreselected(null);
                      setCurrentIndex(idx);
                    }}
                  />

                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={submitting}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-green-500/80 to-blue-500/80 hover:from-green-500 hover:to-blue-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
                  >
                    Entregar sección
                  </button>
                </div>
              </div>

              {/* Question area */}
              <div className="flex-1 min-w-0">
                {currentQuestion && (
                  <>
                    <div className="mb-2 text-xs text-gray-500">
                      Pregunta {currentIndex + 1} de{" "}
                      {data.section.totalQuestions}
                    </div>

                    {currentQuestion.caseText && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 text-sm text-gray-300 whitespace-pre-line max-h-[300px] overflow-y-auto">
                        {currentQuestion.caseText}
                      </div>
                    )}

                    <h3 className="text-lg font-semibold mb-4">
                      {currentQuestion.questionText}
                    </h3>

                    <div className="space-y-2 mb-4">
                      {currentQuestion.options.map((opt) => {
                        const isConfirmed =
                          answers[currentQuestion.id] === opt.id;
                        const isPreselected = preselected === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => preselectOption(opt.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                              isConfirmed
                                ? "bg-green-500/20 border-green-500/50 text-white"
                                : isPreselected
                                ? "bg-blue-500/20 border-blue-500/50 border-dashed text-white"
                                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                            }`}
                          >
                            <span className="font-bold mr-3 text-gray-500">
                              {opt.letter}.
                            </span>
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>

                    {/* Confirm/Change button */}
                    {preselected && (
                      <button
                        onClick={() => confirmAnswer(currentQuestion.id)}
                        className="w-full py-3 rounded-xl bg-blue-500/80 hover:bg-blue-500 text-white font-semibold text-sm transition-all mb-4"
                      >
                        {answers[currentQuestion.id]
                          ? "Cambiar respuesta"
                          : "Confirmar respuesta"}
                      </button>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => {
                          setPreselected(null);
                          setCurrentIndex((i) => Math.max(0, i - 1));
                        }}
                        disabled={currentIndex === 0}
                        className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold disabled:opacity-30 transition-colors"
                      >
                        Anterior
                      </button>

                      {currentIndex < data.questions.length - 1 ? (
                        <button
                          onClick={() => {
                            setPreselected(null);
                            setCurrentIndex((i) =>
                              Math.min(data.questions.length - 1, i + 1)
                            );
                          }}
                          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
                        >
                          Siguiente
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowConfirm(true)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500/80 to-blue-500/80 text-white text-sm font-semibold"
                        >
                          Entregar
                        </button>
                      )}
                    </div>

                    {/* Mobile submit button */}
                    <div className="lg:hidden mt-6">
                      <button
                        onClick={() => setShowConfirm(true)}
                        disabled={submitting}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500/80 to-blue-500/80 text-white font-semibold text-sm"
                      >
                        Entregar sección ({answeredSet.size}/
                        {data.section.totalQuestions})
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirm modal */}
        {showConfirm && (
          <ConfirmSubmitModal
            totalQuestions={
              data.section.isWriting ? 1 : data.section.totalQuestions
            }
            answeredCount={
              data.section.isWriting
                ? writingContent.trim().length > 0
                  ? 1
                  : 0
                : answeredSet.size
            }
            onConfirm={doSubmit}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    </PCOnlyGate>
  );
}
