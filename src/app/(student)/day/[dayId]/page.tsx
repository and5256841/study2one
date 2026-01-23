"use client";

import { useParams } from "next/navigation";
import AudioPlayer from "@/components/audio/AudioPlayer";
import Link from "next/link";
import { useState, useRef } from "react";

export default function DayPage() {
  const params = useParams();
  const dayId = params.dayId as string;
  const [audioCompleted, setAudioCompleted] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dayNumber = parseInt(dayId);

  // Títulos por día del Módulo 1
  const dayTitles: Record<number, string> = {
    1: "¿Qué es Lectura Crítica?",
    2: "Estructura del Examen",
    3: "Las 3 Afirmaciones del ICFES",
    4: "Las 12 Evidencias - Parte 1",
    5: "Las 12 Evidencias - Parte 2",
    6: "Las 12 Evidencias - Parte 3",
    7: "Textos Continuos Informativos",
    8: "Textos Continuos Literarios",
    9: "Textos Discontinuos - Tablas y Gráficas",
    10: "Textos Discontinuos - Infografías y Mixtos",
    11: "Estrategias Integradas por Nivel",
    12: "Anatomía de las Preguntas ICFES",
    13: "Banco de Preguntas Explicadas - Parte 1",
    14: "Banco de Preguntas Explicadas - Parte 2",
    15: "Consolidación Final y Preparación",
  };

  const daySummaries: Record<number, string> = {
    1: "La lectura crítica implica comprender, interpretar y evaluar textos. Es fundamental para la medicina basada en evidencia.",
    2: "El examen tiene 35 preguntas: 26% literal, 40% inferencial, 34% crítico. 70% son textos continuos informativos.",
    3: "Afirmación 1: contenidos locales. Afirmación 2: articulación global. Afirmación 3: reflexión y evaluación.",
    4: "Nivel literal: significado de palabras en contexto, función de conectores, localización de información explícita.",
    5: "Nivel inferencial: estructura del texto, función de párrafos, relaciones lógicas entre ideas, voces del texto.",
    6: "Nivel crítico: supuestos implícitos, estrategias retóricas, sesgos, validez de argumentos.",
    7: "Ensayos, artículos de opinión, textos expositivos y argumentativos. Representan el 70% del examen.",
    8: "Cuentos, novelas, poemas. Requieren identificar recursos literarios y propósito estético.",
    9: "Tablas de datos, gráficas de barras y líneas. Habilidad fundamental para interpretar estudios clínicos.",
    10: "Infografías, cómics, textos mixtos. Lectura no lineal que combina elementos verbales y visuales.",
    11: "Sistema integrado de estrategias para identificar rápidamente el nivel de cada pregunta.",
    12: "Cómo están construidas las preguntas del ICFES: stem, opciones, distractores comunes.",
    13: "Práctica con preguntas modelo del ICFES con explicación detallada de cada respuesta.",
    14: "Más práctica con preguntas de nivel inferencial y crítico con análisis de distractores.",
    15: "Consolidación de estrategias, simulación de condiciones reales, tips para el día del examen.",
  };

  const dayData = {
    dayNumber,
    title: dayTitles[dayNumber] || `Día ${dayNumber}`,
    moduleName: "Lectura Crítica",
    audioUrl: `/api/audio/file/${dayId}`,
    summary: daySummaries[dayNumber] || "Contenido del día.",
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("photoType", "STUDY_EVIDENCE");

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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={photoUploading}
          className={`w-full py-3 border font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
            photoUploaded
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
          }`}
        >
          {photoUploading ? (
            <>Subiendo...</>
          ) : photoUploaded ? (
            <><span>✓</span> Evidencia subida</>
          ) : (
            <><span>📷</span> Subir evidencia de estudio</>
          )}
        </button>
      </div>
    </div>
  );
}
