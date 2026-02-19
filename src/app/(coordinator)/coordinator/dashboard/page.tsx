"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EcgWaveform from "@/components/EcgWaveform";
import { getStudentRhythm } from "@/lib/ecg-rhythms";

interface TopStudent {
  id: string;
  name: string;
  daysCompleted: number;
  streak: number;
  quizAvg: number;
}

interface AtRiskStudent {
  id: string;
  name: string;
  daysInactive: number;
  streak: number;
  daysCompleted: number;
  quizAvg: number;
}

interface ModuleProgress {
  moduleNumber: number;
  moduleName: string;
  moduleIcon: string;
  avgPercent: number;
}

interface DashboardData {
  totalStudents: number;
  pendingEnrollments: number;
  activeToday: number;
  inactiveStudents: number;
  avgDaysCompleted: number;
  avgQuizScore: number;
  avgAudioSpeed: number;
  photosPending: number;
  topStudents: TopStudent[];
  atRiskStudents: AtRiskStudent[];
  moduleProgress: ModuleProgress[];
}

export default function CoordinatorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/coordinator/dashboard")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-48" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl" />
            ))}
          </div>
          <div className="h-48 bg-white/5 rounded-xl" />
          <div className="h-48 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Estudiantes",
      value: data?.totalStudents || 0,
      dotColor: "bg-blue-400",
      color: "text-blue-400",
    },
    {
      label: "Activos hoy",
      value: data?.activeToday || 0,
      dotColor: "bg-green-400",
      color: "text-green-400",
    },
    {
      label: "Inactivos (3d+)",
      value: data?.inactiveStudents || 0,
      dotColor: "bg-yellow-400",
      color: "text-yellow-400",
    },
    {
      label: "Fotos pendientes",
      value: data?.photosPending || 0,
      dotColor: "bg-orange-400",
      color: "text-orange-400",
    },
  ];

  return (
    <div className="px-4 py-6 space-y-5 pb-32 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Panel Coordinador</h2>
        <p className="text-gray-400 text-sm">Vista general del programa</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/5 border border-white/10 rounded-xl p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${stat.dotColor}`} />
              <span className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </span>
            </div>
            <p className="text-gray-400 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Metrics */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-3">Metricas generales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricItem
            label="Prom. dias completados"
            value={`${data?.avgDaysCompleted || 0}`}
            sub="de 125"
          />
          <MetricItem
            label="Prom. quiz"
            value={`${data?.avgQuizScore || 0}%`}
          />
          <MetricItem
            label="Vel. audio prom."
            value={`${data?.avgAudioSpeed || 1.0}x`}
          />
          <MetricItem
            label="Matrículas pendientes"
            value={`${data?.pendingEnrollments || 0}`}
          />
        </div>
      </div>

      {/* Two-column: At Risk + Top Students */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* At Risk */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
          <h3 className="font-semibold text-sm text-red-400 mb-3">
            Estudiantes en riesgo
          </h3>
          {data?.atRiskStudents && data.atRiskStudents.length > 0 ? (
            <div className="space-y-2">
              {data.atRiskStudents.map((s) => {
                const rhythm = getStudentRhythm({
                  daysInactive: s.daysInactive,
                  streak: s.streak,
                  avgQuizScore: s.quizAvg,
                });
                return (
                  <Link
                    key={s.id}
                    href={`/coordinator/students/${s.id}`}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {s.daysCompleted} dias · {s.quizAvg}% quiz
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <EcgWaveform rhythm={rhythm.type} size="sm" />
                      <span className="text-xs text-red-400 font-medium">
                        {s.daysInactive >= 999
                          ? "Sin actividad"
                          : `${s.daysInactive}d`}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">
              No hay estudiantes en riesgo
            </p>
          )}
        </div>

        {/* Top Students */}
        <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4">
          <h3 className="font-semibold text-sm text-green-400 mb-3">
            Mejores estudiantes
          </h3>
          {data?.topStudents && data.topStudents.length > 0 ? (
            <div className="space-y-2">
              {data.topStudents.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/coordinator/students/${s.id}`}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-500 w-5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {s.daysCompleted} dias · {s.quizAvg}% quiz
                      </p>
                    </div>
                  </div>
                  {s.streak > 0 && (
                    <div className="shrink-0">
                      <EcgWaveform rhythm="normal-sinus" size="sm" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">
              Sin datos de estudiantes
            </p>
          )}
        </div>
      </div>

      {/* Module Progress */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-3">
          Progreso promedio por modulo
        </h3>
        <div className="space-y-3">
          {data?.moduleProgress?.map((m) => (
            <div key={m.moduleNumber}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">
                  {m.moduleIcon} {m.moduleName}
                </span>
                <span className="text-xs text-gray-500">{m.avgPercent}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${m.avgPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        {(data?.pendingEnrollments || 0) > 0 && (
          <Link
            href="/coordinator/enrollments"
            className="block w-full py-3 bg-orange-500/20 border border-orange-500/30 text-orange-400 font-medium rounded-xl text-center"
          >
            {data?.pendingEnrollments} matriculas pendientes →
          </Link>
        )}
        <Link
          href="/coordinator/students"
          className="block w-full py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-xl text-center hover:bg-white/10 transition-all"
        >
          Ver todos los estudiantes →
        </Link>
        <Link
          href="/coordinator/cohorts"
          className="block w-full py-3 bg-white/5 border border-white/10 text-gray-300 font-medium rounded-xl text-center hover:bg-white/10 transition-all"
        >
          Gestionar cohortes →
        </Link>
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}
