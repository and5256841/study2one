"use client";

interface ConfirmSubmitModalProps {
  totalQuestions: number;
  answeredCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmSubmitModal({
  totalQuestions,
  answeredCount,
  onConfirm,
  onCancel,
}: ConfirmSubmitModalProps) {
  const unanswered = totalQuestions - answeredCount;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-3">Confirmar entrega</h3>
        <p className="text-gray-300 mb-2">
          Has respondido <span className="text-green-400 font-bold">{answeredCount}</span> de{" "}
          <span className="font-bold">{totalQuestions}</span> preguntas.
        </p>
        {unanswered > 0 && (
          <p className="text-orange-400 text-sm mb-4">
            Tienes {unanswered} pregunta{unanswered > 1 ? "s" : ""} sin responder.
            Las preguntas no respondidas se contarán como incorrectas.
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-semibold transition-colors"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-green-500/80 hover:bg-green-500 text-white font-semibold transition-colors"
          >
            Entregar
          </button>
        </div>
      </div>
    </div>
  );
}
