"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface UpcomingDay {
  globalDay: number;
  dayInModule: number;
  moduleNumber: number;
  moduleName: string;
  moduleIcon: string;
  title: string;
  dailyContentId: string | null;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface DashboardData {
  studentName: string;
  currentDay: number;
  maxUnlockedDay: number;
  currentModule: { number: number; name: string; icon: string };
  upcomingDays: UpcomingDay[];
  streak: { current: number; longest: number };
  progress: { completedDays: number; totalDays: number; percentage: number };
  cohort: { id: string; name: string; startDate: string };
  error?: string;
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-48" />
          <div className="h-20 bg-white/5 rounded-2xl" />
          <div className="h-48 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-400 text-lg font-semibold mb-2">Error</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  const studentName = data?.studentName || "Estudiante";
  const currentDay = data?.currentDay || 1;
  const currentModule = data?.currentModule || { number: 1, name: "Lectura Critica", icon: "📖" };
  const upcomingDays = data?.upcomingDays || [];
  const streak = data?.streak?.current || 0;
  const longestStreak = data?.streak?.longest || 0;
  const completedDays = data?.progress?.completedDays || 0;
  const progressPct = data?.progress?.percentage || 0;

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">Hola, {studentName}</h2>
        <p className="text-gray-400 text-sm">Tu progreso de hoy</p>
      </div>

      {/* Streak Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
        <div className="text-3xl">{streak > 0 ? "🔥" : "💤"}</div>
        <div className="flex-1">
          <p className="text-2xl font-bold">{streak} {streak === 1 ? "dia" : "dias"}</p>
          <p className="text-gray-400 text-sm">Racha actual</p>
        </div>
        {longestStreak > 0 && (
          <div className="text-right">
            <p className="text-sm font-semibold text-yellow-400">{longestStreak}</p>
            <p className="text-gray-500 text-[10px]">Record</p>
          </div>
        )}
      </div>

      {/* Today's Content Card */}
      {upcomingDays.length > 0 && upcomingDays[0] && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{currentModule.icon}</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Hoy - Dia {currentDay}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              upcomingDays[0].isCompleted
                ? "bg-green-500/20 text-green-400"
                : "bg-orange-500/20 text-orange-400"
            }`}>
              {upcomingDays[0].isCompleted ? "Completado" : "Pendiente"}
            </span>
          </div>
          <h3 className="text-lg font-semibold mb-1">{currentModule.name}</h3>
          <p className="text-gray-400 text-sm mb-4">
            Escucha el audio del dia y completa el quiz de 3 preguntas.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">🎧</span>
              <span className="text-gray-300">Audio del dia</span>
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
            {upcomingDays[0].isCompleted ? "Revisar" : "Comenzar"} dia {currentDay} →
          </Link>
        </div>
      )}

      {/* Upcoming Days */}
      {upcomingDays.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Proximos dias</h3>
          <div className="space-y-2">
            {upcomingDays.slice(1).map((day) => (
              <Link
                key={day.globalDay}
                href={day.isUnlocked ? `/day/${day.globalDay}` : "#"}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  day.isUnlocked
                    ? "bg-white/5 hover:bg-white/10 cursor-pointer"
                    : "bg-white/2 opacity-50 cursor-not-allowed"
                } ${day.isCompleted ? "border border-green-500/30" : ""}`}
              >
                <span className="text-lg">{day.moduleIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    Dia {day.globalDay}: {day.title}
                  </p>
                  <p className="text-gray-500 text-xs">{day.moduleName}</p>
                </div>
                {day.isCompleted ? (
                  <span className="text-green-400 text-sm">✓</span>
                ) : day.isUnlocked ? (
                  <span className="text-gray-500 text-xs">→</span>
                ) : (
                  <span className="text-gray-600 text-sm">🔒</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Progress Overview */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold mb-3">Progreso general</h3>
        <div className="bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-gray-400 text-xs mt-2 text-right">{completedDays} de 120 dias completados</p>
      </div>
    </div>
  );
}
