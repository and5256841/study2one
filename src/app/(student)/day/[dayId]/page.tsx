"use client";

import { useParams } from "next/navigation";
import AudioPlayer from "@/components/audio/AudioPlayer";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";

interface DayData {
  id: string;
  globalDay: number;
  dayNumber: number;
  title: string;
  audioUrl: string | null;
  summary: string | null;
  isExamDay: boolean;
  moduleName: string;
  moduleNumber: number;
  moduleIcon: string | null;
  audioProgress: {
    isCompleted: boolean;
    completionPercentage: number;
    lastPositionSeconds: number;
  } | null;
  quizCompleted: boolean;
  quizScore: { score: number; total: number } | null;
  photoUploaded: boolean;
  photoApproved: boolean;
}

export default function DayPage() {
  const params = useParams();
  const dayId = params.dayId as string;

  const [dayData, setDayData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioCompleted, setAudioCompleted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoApproved, setPhotoApproved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch day content + student progress
  const fetchDayData = useCallback(async () => {
    try {
      const res = await fetch(`/api/day/${dayId}`);
      if (res.ok) {
        const data: DayData = await res.json();
        setDayData(data);
        setAudioCompleted(data.audioProgress?.isCompleted ?? false);
        setQuizCompleted(data.quizCompleted);
        setPhotoUploaded(data.photoUploaded);
        setPhotoApproved(data.photoApproved);
      }
    } catch (error) {
      console.error("Error fetching day data:", error);
    }
    setLoading(false);
  }, [dayId]);

  useEffect(() => {
    fetchDayData();
  }, [fetchDayData]);

  const handleAudioComplete = async () => {
    setAudioCompleted(true);
    if (!dayData?.id) return;
    try {
      await fetch(`/api/audio/${dayData.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTime: 0, percentage: 100, playbackSpeed: 1.0 }),
      });
    } catch (error) {
      console.error("Error marking audio complete:", error);
    }
  };

  const handleAudioProgress = async (percentage: number, currentTime: number) => {
    if (!dayData?.id) return;
    try {
      await fetch(`/api/audio/${dayData.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTime, percentage, playbackSpeed: 1.0 }),
      });
    } catch (error) {
      console.error("Error saving audio progress:", error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("photoType", "CUADERNILLO");

    try {
      const res = await fetch(`/api/photos/${dayId}`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setPhotoUploaded(true);
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
    setPhotoUploading(false);
  };

  if (loading) {
    return (
      <div className="px-4 py-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">Cargando contenido del día...</p>
      </div>
    );
  }

  if (!dayData) {
    return (
      <div className="px-4 py-6 text-center space-y-4">
        <p className="text-gray-400">Contenido no disponible para este día.</p>
        <Link href="/dashboard" className="text-orange-400 text-sm hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  // === EXAM DAY ===
  if (dayData.isExamDay) {
    return (
      <div className="px-4 py-6 space-y-6 pb-32">
        <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Volver al inicio
        </Link>
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            {dayData.moduleIcon} {dayData.moduleName} · Examen Diario
          </p>
          <h2 className="text-xl font-bold mt-1">Día {dayData.globalDay}</h2>
          <p className="text-gray-400 text-sm mt-1">{dayData.title}</p>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 space-y-4">
          <div className="text-4xl text-center">📋</div>
          <h3 className="font-bold text-center text-lg">Examen Diario — 15 Preguntas</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-orange-400">•</span>15 preguntas de selección múltiple con casos clínicos</li>
            <li className="flex gap-2"><span className="text-orange-400">•</span>Feedback inmediato después de cada respuesta</li>
            <li className="flex gap-2"><span className="text-orange-400">•</span>Cronómetro visible — sin límite de tiempo</li>
            <li className="flex gap-2"><span className="text-orange-400">•</span>Necesitas ≥ 10 correctas para mantener tu racha</li>
          </ul>
        </div>

        {dayData.quizCompleted && dayData.quizScore && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
            <p className="text-green-400 font-semibold text-sm">✓ Examen completado</p>
            <p className="text-gray-400 text-xs mt-1">
              {dayData.quizScore.score}/{dayData.quizScore.total} correctas
            </p>
          </div>
        )}

        <Link
          href={`/day/${dayId}/quiz`}
          className="block w-full py-4 text-center font-bold text-white bg-gradient-to-r from-orange-600 to-orange-400 rounded-xl hover:shadow-lg transition-all text-lg"
        >
          {dayData.quizCompleted ? "Repetir examen" : "Iniciar examen →"}
        </Link>
      </div>
    );
  }

  // === NORMAL DAY ===
  const dayCompleted = audioCompleted && quizCompleted && photoUploaded;

  return (
    <div className="px-4 py-6 space-y-4 pb-32">
      <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
        ← Volver al inicio
      </Link>
      {/* Day Header */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          {dayData.moduleIcon} {dayData.moduleName}
        </p>
        <h2 className="text-xl font-bold mt-1">Día {dayData.globalDay}</h2>
        <p className="text-gray-400 text-sm mt-1">{dayData.title}</p>
      </div>

      {/* Day completed banner */}
      {dayCompleted && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-green-400 font-semibold text-sm">¡Día completado!</p>
            <p className="text-gray-400 text-xs">Audio + Quiz + Evidencia enviados</p>
          </div>
        </div>
      )}

      {/* Progress checklist */}
      <div className="flex gap-2">
        <div className={`flex-1 flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl border ${
          audioCompleted ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/5 border-white/10 text-gray-500"
        }`}>
          <span>{audioCompleted ? "✓" : "○"}</span>
          <span>Audio</span>
        </div>
        <div className={`flex-1 flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl border ${
          quizCompleted ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/5 border-white/10 text-gray-500"
        }`}>
          <span>{quizCompleted ? "✓" : "○"}</span>
          <span>Quiz</span>
        </div>
        <div className={`flex-1 flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl border ${
          photoUploaded ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/5 border-white/10 text-gray-500"
        }`}>
          <span>{photoUploaded ? "✓" : "○"}</span>
          <span>Evidencia</span>
        </div>
      </div>

      {/* Audio Player */}
      {dayData.audioUrl ? (
        <AudioPlayer
          audioUrl={dayData.audioUrl}
          title={dayData.title}
          sectionLabel={`Día ${dayData.globalDay} de ${dayData.moduleIcon} ${dayData.moduleName}`}
          onComplete={handleAudioComplete}
          onProgress={handleAudioProgress}
        />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-gray-400 text-sm">Audio no disponible aún para este día.</p>
        </div>
      )}

      {/* Summary Card */}
      {dayData.summary && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-2">Resumen del día</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{dayData.summary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* Quiz — siempre desbloqueado */}
        <Link
          href={`/day/${dayId}/quiz`}
          className="block w-full py-3 text-center font-semibold rounded-xl transition-all bg-gradient-to-r from-orange-600 to-orange-400 text-white hover:shadow-lg"
        >
          {quizCompleted ? (
            <span>✓ Quiz completado — Repetir</span>
          ) : (
            <span>Hacer Quiz →</span>
          )}
        </Link>

        {/* Ejercicio de escritura — solo Módulo 4 (Comunicación Escrita) */}
        {dayData.moduleNumber === 4 && (
          <Link
            href={`/day/${dayId}/write`}
            className="block w-full py-3 text-center font-semibold rounded-xl transition-all bg-gradient-to-r from-blue-700 to-blue-500 text-white hover:shadow-lg"
          >
            ✍️ Práctica de escritura →
          </Link>
        )}

        {/* Photo Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        {photoApproved ? (
          <div className="w-full py-3 border font-medium rounded-xl flex items-center justify-center gap-2 bg-green-500/10 border-green-500/30 text-green-400">
            <span>✓</span> Evidencia aprobada
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={photoUploading}
            className={`w-full py-3 border font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
              photoUploaded
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
            }`}
          >
            {photoUploading ? (
              <>Subiendo...</>
            ) : photoUploaded ? (
              <><span>⏳</span> Evidencia en revisión</>
            ) : (
              <><span>📷</span> Subir evidencia de estudio</>
            )}
          </button>
        )}

        {/* Photo guidance message */}
        {!photoUploaded && !photoApproved && (
          <p className="text-xs text-gray-500 text-center leading-relaxed px-2">
            Puedes subir mapas mentales, cuadros sinópticos o el resultado de los cuadernillos.
            <span className="text-gray-600"> No subas fotos personales.</span>
          </p>
        )}
      </div>
    </div>
  );
}
