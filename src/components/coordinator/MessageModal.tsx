"use client";

import { useState } from "react";
import { MESSAGE_TEMPLATES, fillTemplate } from "@/lib/message-templates";

interface MessageModalProps {
  studentId: string;
  studentName: string;
  /** Optional pre-filled variables for templates */
  variables?: Record<string, string | number>;
  onClose: () => void;
  onSent: () => void;
}

export default function MessageModal({
  studentId,
  studentName,
  variables = {},
  onClose,
  onSent,
}: MessageModalProps) {
  const [selectedKey, setSelectedKey] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const templates = MESSAGE_TEMPLATES.filter((t) => t.key !== "custom");
  const selected = MESSAGE_TEMPLATES.find((t) => t.key === selectedKey);

  const firstName = studentName.split(" ")[0];
  const allVars = { name: firstName, ...variables };

  const previewTitle = selected
    ? selectedKey === "custom"
      ? customTitle
      : fillTemplate(selected.title, allVars)
    : "";
  const previewBody = selected
    ? selectedKey === "custom"
      ? customBody
      : fillTemplate(selected.body, allVars)
    : "";

  const canSend =
    selectedKey &&
    (selectedKey !== "custom" || (customTitle.trim() && customBody.trim()));

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch(
        `/api/coordinator/students/${studentId}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateKey: selectedKey,
            customTitle: selectedKey === "custom" ? customTitle.trim() : undefined,
            customBody: selectedKey === "custom" ? customBody.trim() : undefined,
            variables: allVars,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al enviar");
        return;
      }

      onSent();
    } catch {
      setError("Error de conexión");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10">
          <h3 className="font-bold text-lg">Enviar mensaje</h3>
          <p className="text-sm text-gray-400">
            Para: <span className="text-white">{studentName}</span>
          </p>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Template selector */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">
              Tipo de mensaje
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedKey(t.key)}
                  className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                    selectedKey === t.key
                      ? t.category === "alert"
                        ? "bg-red-500/10 border-red-500/30 text-red-300"
                        : "bg-green-500/10 border-green-500/30 text-green-300"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="mr-1.5">{t.icon}</span>
                  {t.title}
                </button>
              ))}
              <button
                onClick={() => setSelectedKey("custom")}
                className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                  selectedKey === "custom"
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/[0.07]"
                }`}
              >
                <span className="mr-1.5">✉️</span>
                Mensaje libre
              </button>
            </div>
          </div>

          {/* Custom message fields */}
          {selectedKey === "custom" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Título
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Título del mensaje"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Cuerpo
                </label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedKey && selectedKey !== "custom" && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase mb-1">
                Vista previa
              </p>
              <p className="font-semibold text-sm">{previewTitle}</p>
              <p className="text-sm text-gray-300 mt-1">{previewBody}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-white/10 flex gap-3">
          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className="flex-1 py-2.5 rounded-xl bg-purple-500/80 hover:bg-purple-500 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            {sending ? "Enviando..." : "Enviar mensaje"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
