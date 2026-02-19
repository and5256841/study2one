"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EcgWaveform from "@/components/EcgWaveform";
import { ALL_RHYTHMS_ORDERED, getRhythmConfig, type EcgRhythmType } from "@/lib/ecg-rhythms";

export default function RhythmInfoPage() {
  const router = useRouter();
  const [currentRhythm, setCurrentRhythm] = useState<EcgRhythmType | null>(null);
  const [pseudonym, setPseudonym] = useState("");
  const [originalPseudonym, setOriginalPseudonym] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((d) => {
        setCurrentRhythm(d.rhythm?.type ?? null);
        setPseudonym(d.pseudonym ?? "");
        setOriginalPseudonym(d.pseudonym ?? "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSavePseudonym = async () => {
    if (pseudonym.length < 3 || pseudonym.length > 20) return;
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudonym }),
      });
      setOriginalPseudonym(pseudonym);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-48" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const pseudonymChanged = pseudonym !== originalPseudonym;

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white text-sm mb-3 transition-colors"
        >
          ← Volver al perfil
        </button>
        <h2 className="text-xl font-bold">Tu ritmo cardíaco académico</h2>
        <p className="text-gray-400 text-sm mt-1">
          Tu ritmo refleja tu actividad y desempeño en quizzes. Mejora tu racha y tus notas para subir de nivel.
        </p>
      </div>

      {/* Pseudonym Edit */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <label className="text-sm text-gray-400 block mb-2">Seudónimo (visible en ranking)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            maxLength={20}
            minLength={3}
            placeholder="Tu seudónimo..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
          {pseudonymChanged && (
            <button
              onClick={handleSavePseudonym}
              disabled={saving || pseudonym.length < 3}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? "..." : "Guardar"}
            </button>
          )}
        </div>
        <p className="text-gray-600 text-xs mt-1">3-20 caracteres</p>
      </div>

      {/* All 10 Rhythms */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">
          10 niveles de ritmo
        </h3>

        {ALL_RHYTHMS_ORDERED.map((rhythmType, index) => {
          const config = getRhythmConfig(rhythmType);
          const isCurrent = rhythmType === currentRhythm;

          return (
            <div
              key={rhythmType}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isCurrent
                  ? "bg-white/10 border-white/30 ring-1 ring-white/20"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {/* Level number */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  backgroundColor: `${config.color}20`,
                  color: config.color,
                }}
              >
                {index + 1}
              </div>

              {/* ECG Preview */}
              <div className="flex-shrink-0">
                <EcgWaveform rhythm={rhythmType} size="sm" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: isCurrent ? config.color : undefined }}>
                  {config.label}
                  {isCurrent && <span className="ml-1 text-[10px] opacity-70">(Tu ritmo)</span>}
                </p>
                <p className="text-gray-500 text-xs">{config.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-2">¿Cómo mejoro mi ritmo?</h3>
        <ul className="text-gray-400 text-sm space-y-1.5">
          <li>• Entra todos los días para mantener actividad</li>
          <li>• Aprueba los quizzes con buen puntaje</li>
          <li>• Mantén tu racha por 5+ días para alcanzar nivel élite</li>
          <li>• Tu ritmo se actualiza en tiempo real</li>
        </ul>
      </div>
    </div>
  );
}
