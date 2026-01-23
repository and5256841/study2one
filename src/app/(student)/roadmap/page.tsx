"use client";

import Link from "next/link";

const modules = [
  { number: 1, name: "Lectura Crítica", icon: "📖", weeks: "Semana 1-2" },
  { number: 2, name: "Razonamiento Cuantitativo", icon: "🔢", weeks: "Semana 3-4" },
  { number: 3, name: "Competencias Ciudadanas", icon: "🏛️", weeks: "Semana 5" },
  { number: 4, name: "Comunicación Escrita", icon: "✍️", weeks: "Semana 6" },
  { number: 5, name: "Inglés", icon: "🌎", weeks: "Semana 7" },
  { number: 6, name: "Pensamiento Científico", icon: "🔬", weeks: "Semana 8" },
  { number: 7, name: "Fundamentación Dx y Tx", icon: "🩺", weeks: "Semana 9-10" },
  { number: 8, name: "Atención en Salud PyP", icon: "🏥", weeks: "Semana 11-12" },
];

export default function RoadmapPage() {
  const currentModule = 1;
  const completedDays = 0;
  const totalDays = 120;
  const progressPercent = Math.round((completedDays / totalDays) * 100);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Tu Plan de Estudio</h2>
        <p className="text-gray-400 text-sm">8 módulos para dominar el Saber Pro</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-gray-400 text-xs mt-2 text-right">
          {completedDays} de {totalDays} días • {progressPercent}% completado
        </p>
      </div>

      {/* Module Timeline */}
      <div className="relative pl-5 space-y-3">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-white/10" />

        {modules.map((mod) => {
          const isCurrent = mod.number === currentModule;
          const isLocked = mod.number > currentModule;

          return (
            <div
              key={mod.number}
              className={`relative bg-white/5 border rounded-2xl p-4 transition-all ${
                isCurrent
                  ? "border-orange-500/50 shadow-lg shadow-orange-500/10"
                  : isLocked
                  ? "border-white/5 opacity-50"
                  : "border-green-500/30"
              }`}
            >
              {/* Dot */}
              <div
                className={`absolute -left-5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
                  isCurrent
                    ? "bg-orange-500 shadow-lg shadow-orange-500/50"
                    : isLocked
                    ? "bg-gray-600"
                    : "bg-green-500"
                }`}
              />

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    {mod.weeks}
                  </p>
                  <h3 className="font-semibold mt-0.5">
                    {mod.icon} {mod.name}
                  </h3>
                </div>
                {isCurrent && (
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                    En curso
                  </span>
                )}
                {isLocked && (
                  <span className="text-xs text-gray-500">🔒</span>
                )}
              </div>

              {isCurrent && (
                <Link
                  href="/day/1"
                  className="block mt-3 w-full py-2 bg-gradient-to-r from-orange-600 to-orange-400 text-white text-sm font-semibold rounded-lg text-center"
                >
                  Continuar →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
