"use client";

import { useParams } from "next/navigation";
import AudioPlayer from "@/components/audio/AudioPlayer";
import Link from "next/link";
import { useState } from "react";

export default function DayPage() {
  const params = useParams();
  const dayId = params.dayId as string;
  const [audioCompleted, setAudioCompleted] = useState(false);

  // TODO: Fetch real data from API
  const dayData = {
    dayNumber: parseInt(dayId),
    title: "¿Qué es Lectura Crítica?",
    moduleName: "Lectura Crítica",
    audioUrl: "", // Will be Cloudinary URL
    summary: "Comprende qué evalúa el módulo de Lectura Crítica del Saber Pro y cómo prepararte.",
  };

  const handleAudioComplete = async () => {
    setAudioCompleted(true);
    try {
      await fetch(`/api/audio/${dayId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTime: 0, percentage: 100, playbackSpeed: 1.0 }),
      });
    } catch (error) {
      console.error("Error marking complete:", error);
    }
  };

  const handleAudioProgress = async (percentage: number, currentTime: number) => {
    try {
      await fetch(`/api/audio/${dayId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTime, percentage, playbackSpeed: 1.0 }),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  return (
    <div className="px-4 py-6 space-y-4 pb-32">
      {/* Day Header */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          {dayData.moduleName}
        </p>
        <h2 className="text-xl font-bold mt-1">Día {dayData.dayNumber}</h2>
        <p className="text-gray-400 text-sm mt-1">{dayData.title}</p>
      </div>

      {/* Audio Player */}
      <AudioPlayer
        audioUrl={dayData.audioUrl}
        title={dayData.title}
        sectionLabel={`Día ${dayData.dayNumber} de 15`}
        onComplete={handleAudioComplete}
        onProgress={handleAudioProgress}
      />

      {/* Summary Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-2">Resumen del día</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{dayData.summary}</p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Quiz Button */}
        <Link
          href={audioCompleted ? `/day/${dayId}/quiz` : "#"}
          className={`block w-full py-3 text-center font-semibold rounded-xl transition-all ${
            audioCompleted
              ? "bg-gradient-to-r from-orange-600 to-orange-400 text-white hover:shadow-lg"
              : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/10"
          }`}
          onClick={(e) => !audioCompleted && e.preventDefault()}
        >
          {audioCompleted ? "Comenzar Quiz →" : "🔒 Completa el audio para desbloquear"}
        </Link>

        {/* Photo Upload Button */}
        <button className="w-full py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
          <span>📷</span> Subir evidencia de estudio
        </button>
      </div>
    </div>
  );
}
