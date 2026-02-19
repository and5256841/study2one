"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ModuleData {
  number: number;
  name: string;
  icon: string;
  weeks: string;
  description: string;
  totalWeeks: number;
  totalDays: number;
  startDay: number;
  endDay: number;
  status: "completed" | "in_progress" | "locked";
  completedDays: number;
  nextDay: number;
  dateRange: {
    start: string;
    end: string;
    formatted: string;
  };
}

interface RoadmapData {
  cohort: {
    id: string;
    name: string;
    startDate: string;
  };
  currentDay: number;
  maxUnlockedDay: number;
  currentModule: {
    number: number;
    name: string;
    icon: string;
  };
  modules: ModuleData[];
  progress: {
    completedDays: number;
    totalDays: number;
    percentage: number;
  };
}

export default function RoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/student/roadmap")
      .then((res) => {
        if (!res.ok) throw new Error("Error cargando roadmap");
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-400"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-red-400">{error || "Error cargando datos"}</p>
        <p className="text-gray-400 text-sm mt-2">
          Contacta a tu coordinador si el problema persiste.
        </p>
      </div>
    );
  }

  const { modules, progress, cohort } = data;

  return (
    <div className="px-4 py-6 space-y-4 pb-24">
      <div className="text-center">
        <h2 className="text-xl font-bold">Tu Plan de Estudio</h2>
        <p className="text-gray-400 text-sm">
          {cohort.name} - 25 semanas para dominar el Saber Pro
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Progreso general</span>
          <span className="text-xs font-semibold text-green-400">{progress.percentage}%</span>
        </div>
        <div className="bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <p className="text-gray-500 text-xs mt-2 text-right">
          {progress.completedDays} de {progress.totalDays} dias completados
        </p>
      </div>

      {/* Module Timeline */}
      <div className="relative pl-5 space-y-3">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-white/10" />

        {modules.map((mod) => {
          const isCompleted = mod.status === "completed";
          const isCurrent = mod.status === "in_progress";
          const isLocked = mod.status === "locked";

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
                className={`absolute -left-5 top-6 w-3 h-3 rounded-full ${
                  isCompleted
                    ? "bg-green-500"
                    : isCurrent
                    ? "bg-orange-500 shadow-lg shadow-orange-500/50"
                    : "bg-gray-600"
                }`}
              />

              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">{mod.weeks}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-xs text-gray-400">{mod.dateRange.formatted}</span>
                  </div>
                  <h3 className="font-semibold mt-1 flex items-center gap-2">
                    <span className="text-lg">{mod.icon}</span>
                    <span>{mod.name}</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{mod.description}</p>
                  {!isLocked && (
                    <p className="text-xs text-gray-400 mt-2">
                      {mod.completedDays}/{mod.totalDays} dias • {mod.totalWeeks} semanas
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  {isCompleted && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                      Completado
                    </span>
                  )}
                  {isCurrent && (
                    <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                      En curso
                    </span>
                  )}
                  {isLocked && <span className="text-gray-600">🔒</span>}
                </div>
              </div>

              {/* Progress bar del módulo */}
              {!isLocked && (
                <div className="mt-3 bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCompleted ? "bg-green-500" : "bg-orange-500"
                    }`}
                    style={{
                      width: `${(mod.completedDays / mod.totalDays) * 100}%`,
                    }}
                  />
                </div>
              )}

              {isCurrent && (
                <Link
                  href={`/day/${mod.nextDay}`}
                  className="block mt-3 w-full py-2 bg-gradient-to-r from-orange-600 to-orange-400 text-white text-sm font-semibold rounded-lg text-center"
                >
                  Continuar Dia {mod.nextDay} →
                </Link>
              )}

              {isCompleted && (
                <Link
                  href={`/day/${mod.startDay}`}
                  className="block mt-3 w-full py-2 bg-white/10 text-white text-sm font-semibold rounded-lg text-center hover:bg-white/20 transition"
                >
                  Repasar modulo
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Info del cohort */}
      <div className="text-center text-xs text-gray-500 pt-4">
        Inicio del programa:{" "}
        {new Date(cohort.startDate).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
    </div>
  );
}
