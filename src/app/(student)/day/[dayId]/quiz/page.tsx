"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Option {
  id: string;
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionOrder: number;
  caseText: string | null;
  questionText: string;
  explanation: string;
  options: Option[];
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const dayId = params.dayId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isExamDay, setIsExamDay] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; optionId: string; isCorrect: boolean }[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Timer (only for exam days)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/quiz/${dayId}`);
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions);
          setIsExamDay(data.isExamDay ?? false);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
      setLoading(false);
    };
    fetchQuestions();
  }, [dayId]);

  // Start timer when exam begins (questions loaded + isExamDay)
  useEffect(() => {
    if (isExamDay && questions.length > 0 && !quizCompleted) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isExamDay, questions.length, quizCompleted]);

  const handleSelectOption = (optionId: string) => {
    if (showFeedback) return;
    setSelectedOption(optionId);
  };

  const handleConfirm = () => {
    if (!selectedOption) return;

    const currentQuestion = questions[currentIndex];
    const selectedOpt = currentQuestion.options.find(o => o.id === selectedOption);
    const isCorrect = selectedOpt?.isCorrect || false;

    setAnswers([...answers, {
      questionId: currentQuestion.id,
      optionId: selectedOption,
      isCorrect,
    }]);
    setShowFeedback(true);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      // Quiz terminado
      if (timerRef.current) clearInterval(timerRef.current);
      setQuizCompleted(true);
      // Enviar resultados al servidor
      const finalAnswers = [...answers];
      const score = finalAnswers.filter(a => a.isCorrect).length;
      try {
        await fetch(`/api/quiz/${dayId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: finalAnswers,
            score,
            ...(isExamDay ? { timeSpentSeconds: elapsedSeconds } : {}),
          }),
        });
      } catch (error) {
        console.error("Error submitting quiz:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Cargando preguntas...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="px-4 py-6 text-center space-y-4">
        <h2 className="text-xl font-bold">Quiz del Día {dayId}</h2>
        <p className="text-gray-400">Las preguntas para este día aún no están disponibles.</p>
        <Link
          href={`/day/${dayId}`}
          className="inline-block px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-all"
        >
          ← Volver al día
        </Link>
      </div>
    );
  }

  if (quizCompleted) {
    const score = answers.filter(a => a.isCorrect).length;
    const total = questions.length;
    const percentage = Math.round((score / total) * 100);

    return (
      <div className="px-4 py-6 space-y-6 text-center">
        <div className="pt-8">
          <div className={`text-6xl mb-4 ${percentage >= 70 ? "" : ""}`}>
            {percentage === 100 ? "🏆" : percentage >= 70 ? "🎉" : percentage >= 40 ? "💪" : "📚"}
          </div>
          <h2 className="text-2xl font-bold">
            {percentage === 100 ? "¡Perfecto!" : percentage >= 70 ? "¡Muy bien!" : percentage >= 40 ? "¡Buen intento!" : "¡Sigue practicando!"}
          </h2>
          <p className="text-gray-400 mt-2">
            Obtuviste {score} de {total} correctas
          </p>
        </div>

        {/* Score visual */}
        <div className="flex justify-center gap-3">
          {answers.map((answer, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                answer.isCorrect
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {answer.isCorrect ? "✓" : "✗"}
            </div>
          ))}
        </div>

        {/* Percentage bar */}
        <div className="max-w-xs mx-auto">
          <div className="bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentage >= 70 ? "bg-gradient-to-r from-green-400 to-green-500" : "bg-gradient-to-r from-orange-400 to-orange-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">{percentage}% de acierto</p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Link
            href={`/day/${dayId}`}
            className="block w-full py-3 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl text-center hover:shadow-lg transition-all"
          >
            Volver al día {dayId}
          </Link>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/10 transition-all"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const correctOption = currentQuestion.options.find(o => o.isCorrect);

  return (
    <div className="px-4 py-6 space-y-4 pb-32">
      {/* Progress header — with timer for exam days */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          {isExamDay ? `Examen · ` : ""}Pregunta {currentIndex + 1} de {questions.length}
        </p>
        {isExamDay ? (
          <span className="text-xs font-mono bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2 py-0.5 rounded-lg">
            ⏱ {formatTime(elapsedSeconds)}
          </span>
        ) : (
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i < currentIndex
                    ? answers[i]?.isCorrect ? "bg-green-400" : "bg-red-400"
                    : i === currentIndex
                    ? "bg-orange-400"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Exam day progress bar */}
      {isExamDay && (
        <div className="bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
            style={{ width: `${((currentIndex + (showFeedback ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      )}

      {/* Case text */}
      {currentQuestion.caseText && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <p className="text-xs text-blue-400 font-semibold uppercase mb-2">Contexto</p>
          <p className="text-gray-300 text-sm leading-relaxed">{currentQuestion.caseText}</p>
        </div>
      )}

      {/* Question */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-white font-medium leading-relaxed">{currentQuestion.questionText}</p>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {currentQuestion.options.map((option) => {
          let optionStyle = "bg-white/5 border-white/10 hover:bg-white/10";

          if (showFeedback) {
            if (option.isCorrect) {
              optionStyle = "bg-green-500/10 border-green-500/40 text-green-300";
            } else if (option.id === selectedOption && !option.isCorrect) {
              optionStyle = "bg-red-500/10 border-red-500/40 text-red-300";
            } else {
              optionStyle = "bg-white/5 border-white/5 opacity-50";
            }
          } else if (option.id === selectedOption) {
            optionStyle = "bg-orange-500/10 border-orange-500/40 text-orange-300";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option.id)}
              disabled={showFeedback}
              className={`w-full text-left p-4 border rounded-xl transition-all flex gap-3 items-start ${optionStyle}`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                showFeedback && option.isCorrect
                  ? "bg-green-500/30 text-green-300"
                  : showFeedback && option.id === selectedOption && !option.isCorrect
                  ? "bg-red-500/30 text-red-300"
                  : option.id === selectedOption
                  ? "bg-orange-500/30 text-orange-300"
                  : "bg-white/10 text-gray-400"
              }`}>
                {option.letter}
              </span>
              <span className="text-sm leading-relaxed">{option.text}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`rounded-xl p-4 ${
          answers[answers.length - 1]?.isCorrect
            ? "bg-green-500/10 border border-green-500/20"
            : "bg-red-500/10 border border-red-500/20"
        }`}>
          <p className={`font-semibold text-sm mb-2 ${
            answers[answers.length - 1]?.isCorrect ? "text-green-400" : "text-red-400"
          }`}>
            {answers[answers.length - 1]?.isCorrect ? "¡Correcto!" : `Incorrecto. La respuesta es ${correctOption?.letter}.`}
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Action Button */}
      <div className="fixed bottom-20 left-4 right-4">
        {!showFeedback ? (
          <button
            onClick={handleConfirm}
            disabled={!selectedOption}
            className={`w-full py-3.5 font-semibold rounded-xl transition-all ${
              selectedOption
                ? "bg-gradient-to-r from-orange-600 to-orange-400 text-white hover:shadow-lg"
                : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/10"
            }`}
          >
            Confirmar respuesta
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3.5 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            {currentIndex < questions.length - 1 ? "Siguiente pregunta →" : "Ver resultados →"}
          </button>
        )}
      </div>
    </div>
  );
}
