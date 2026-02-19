"use client";

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentIndex: number;
  answeredSet: Set<string>;
  questionIds: string[];
  onNavigate: (index: number) => void;
}

export default function QuestionNavigator({
  totalQuestions,
  currentIndex,
  answeredSet,
  questionIds,
  onNavigate,
}: QuestionNavigatorProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Preguntas ({answeredSet.size}/{totalQuestions})
      </h3>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = answeredSet.has(questionIds[i]);

          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                isCurrent
                  ? "bg-blue-500 text-white ring-2 ring-blue-400"
                  : isAnswered
                  ? "bg-green-500/30 text-green-300 border border-green-500/40"
                  : "bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
