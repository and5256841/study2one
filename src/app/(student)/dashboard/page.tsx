"use client";

import Link from "next/link";

export default function StudentDashboard() {
  // TODO: Fetch from API with real session data
  const studentName = "Estudiante";
  const currentDay = 1;
  const currentModule = "Lectura Crítica";
  const streak = 0;

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">Hola, {studentName}</h2>
        <p className="text-gray-400 text-sm">Tu progreso de hoy</p>
      </div>

      {/* Streak Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
        <div className="text-3xl">🔥</div>
        <div>
          <p className="text-2xl font-bold">{streak} días</p>
          <p className="text-gray-400 text-sm">Racha actual</p>
        </div>
      </div>

      {/* Today's Content Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Hoy - Día {currentDay}
          </span>
          <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full font-semibold">
            Pendiente
          </span>
        </div>
        <h3 className="text-lg font-semibold mb-1">{currentModule}</h3>
        <p className="text-gray-400 text-sm mb-4">
          Escucha el audio del día y completa el quiz de 3 preguntas.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">🎧</span>
            <span className="text-gray-300">Audio del día</span>
            <span className="ml-auto text-gray-500">~10 min</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">📝</span>
            <span className="text-gray-300">Quiz (3 preguntas)</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">📷</span>
            <span className="text-gray-300">Subir evidencia</span>
          </div>
        </div>

        <Link
          href={`/day/${currentDay}`}
          className="block mt-4 w-full py-3 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl text-center hover:shadow-lg hover:shadow-green-500/30 transition-all"
        >
          Comenzar día {currentDay} →
        </Link>
      </div>

      {/* Progress Overview */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold mb-3">Progreso general</h3>
        <div className="bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all"
            style={{ width: "0%" }}
          />
        </div>
        <p className="text-gray-400 text-xs mt-2 text-right">0 de 120 días completados</p>
      </div>
    </div>
  );
}
