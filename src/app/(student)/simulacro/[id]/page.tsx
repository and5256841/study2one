"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

interface Option {
  id: string;
  letter: string;
  text: string;
}

interface Question {
  id: string;
  order: number;
  caseText: string | null;
  questionText: string;
  competency: string | null;
  options: Option[];
}

interface SimulacroData {
  id: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  questions: Question[];
}

interface Results {
  score: { correct: number; total: number; percentage: number };
  tabSwitches: number;
  competencyReport: Record<string, { correct: number; total: number }>;
}

export default function SimulacroPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<SimulacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/simulacro/${id}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) {
          alert(d.error);
          router.push("/dashboard");
          return;
        }
        setData(d);
        setTimeLeft(d.durationMinutes * 60);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, router]);

  // Timer
  useEffect(() => {
    if (!started || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, submitted]);

  // Tab switch detection
  useEffect(() => {
    if (!started || submitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [started, submitted]);

  const handleStart = () => {
    setStarted(true);
    startTimeRef.current = Date.now();
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const formattedAnswers = Object.entries(answers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }));

    try {
      const res = await fetch(`/api/simulacro/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: formattedAnswers,
          tabSwitches,
          timeSpentSeconds: timeSpent,
        }),
      });
      const result = await res.json();
      setResults(result);
      setSubmitted(true);
    } catch (error) {
      console.error("Submit error:", error);
    }
    setSubmitting(false);
  }, [answers, id, tabSwitches, submitting, submitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Cargando simulacro...</div>
      </div>
    );
  }

  if (!data) return null;

  // Results Screen
  if (submitted && results) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Resultados</h1>
          <p className="text-gray-400">{data.title}</p>
        </div>

        {/* Score */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-5xl font-bold mb-2">
            {results.score.percentage >= 60 ? "✅" : "📚"} {results.score.percentage}%
          </p>
          <p className="text-gray-400">
            {results.score.correct} de {results.score.total} correctas
          </p>
          {results.tabSwitches > 0 && (
            <p className="text-yellow-400 text-sm mt-2">
              ⚠️ Cambios de pestana detectados: {results.tabSwitches}
            </p>
          )}
        </div>

        {/* Competency Report */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Por competencia</h3>
          <div className="space-y-2">
            {Object.entries(results.competencyReport).map(([comp, stats]) => {
              const pct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={comp} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-24 truncate">{comp}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 60 ? "bg-green-400" : "bg-orange-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-12 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-3 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  // Start Screen
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{data.title}</h1>
          <p className="text-gray-400">{data.totalQuestions} preguntas</p>
          <p className="text-gray-400">{data.durationMinutes} minutos</p>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 max-w-sm text-center">
          <p className="text-yellow-300 text-sm font-medium mb-1">Importante</p>
          <ul className="text-yellow-200/80 text-xs space-y-1 text-left list-disc pl-4">
            <li>No cambies de pestana (se registran los cambios)</li>
            <li>El tiempo corre automaticamente</li>
            <li>Responde todas las preguntas antes de enviar</li>
          </ul>
        </div>

        <button
          onClick={handleStart}
          className="px-8 py-3 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
        >
          Comenzar simulacro
        </button>
      </div>
    );
  }

  // Exam Interface
  const question = data.questions[currentQ];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-2 flex items-center justify-between z-50">
        <span className="text-sm text-gray-400">
          {currentQ + 1}/{data.totalQuestions}
        </span>
        <span className={`font-mono font-bold ${timeLeft < 300 ? "text-red-400" : "text-white"}`}>
          {formatTime(timeLeft)}
        </span>
        <span className="text-xs text-gray-500">
          {answeredCount}/{data.totalQuestions}
        </span>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-4">
        {question.caseText && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <p className="text-sm text-gray-300 leading-relaxed">{question.caseText}</p>
          </div>
        )}

        <p className="font-medium">{question.questionText}</p>

        <div className="space-y-2">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(question.id, opt.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                answers[question.id] === opt.id
                  ? "bg-green-500/20 border-green-500/50 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              <span className="font-semibold mr-2">{opt.letter}.</span>
              {opt.text}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setCurrentQ((prev) => Math.max(0, prev - 1))}
          disabled={currentQ === 0}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30"
        >
          Anterior
        </button>

        {currentQ < data.totalQuestions - 1 ? (
          <button
            onClick={() => setCurrentQ((prev) => prev + 1)}
            className="flex-1 py-2 bg-white/10 border border-white/10 rounded-lg text-sm font-medium"
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 bg-gradient-to-r from-orange-600 to-orange-400 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Enviando..." : `Enviar (${answeredCount}/${data.totalQuestions})`}
          </button>
        )}
      </div>
    </div>
  );
}
