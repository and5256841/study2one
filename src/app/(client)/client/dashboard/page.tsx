"use client";

import { useEffect, useState } from "react";

interface ClientData {
  totalCohorts: number;
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  avgDaysCompleted: number;
  avgQuizScore: number;
  cohorts: { id: string; name: string; studentCount: number; simulacroCount: number }[];
}

export default function ClientDashboard() {
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/dashboard")
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
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Metricas</h2>
        <p className="text-gray-400 text-sm">Vista ejecutiva del programa</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{data?.totalStudents || 0}</p>
          <p className="text-gray-400 text-xs">Estudiantes</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{data?.activeStudents || 0}</p>
          <p className="text-gray-400 text-xs">Activos</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{data?.avgDaysCompleted || 0}</p>
          <p className="text-gray-400 text-xs">Prom. dias</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{data?.avgQuizScore || 0}%</p>
          <p className="text-gray-400 text-xs">Prom. quiz</p>
        </div>
      </div>

      {/* Cohorts */}
      {data?.cohorts && data.cohorts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3">Cohortes</h3>
          <div className="space-y-2">
            {data.cohorts.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-gray-500 text-xs">{c.studentCount} estudiantes</p>
                </div>
                <span className="text-gray-400 text-xs">{c.simulacroCount} simulacros</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Rate */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-2">Tasa de compromiso</h3>
        <div className="bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"
            style={{ width: `${data?.totalStudents ? Math.round((data.activeStudents / data.totalStudents) * 100) : 0}%` }}
          />
        </div>
        <p className="text-gray-400 text-xs mt-2">
          {data?.totalStudents ? Math.round((data.activeStudents / data.totalStudents) * 100) : 0}% de estudiantes activos en los ultimos 3 dias
        </p>
      </div>
    </div>
  );
}
