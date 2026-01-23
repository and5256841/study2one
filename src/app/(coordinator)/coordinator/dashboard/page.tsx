"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  totalStudents: number;
  pendingEnrollments: number;
  activeToday: number;
  inactiveStudents: number;
  avgDaysCompleted: number;
  avgQuizScore: number;
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
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Estudiantes", value: data?.totalStudents || 0, icon: "👥", color: "text-blue-400" },
    { label: "Activos hoy", value: data?.activeToday || 0, icon: "✅", color: "text-green-400" },
    { label: "Inactivos (3d+)", value: data?.inactiveStudents || 0, icon: "⚠️", color: "text-yellow-400" },
    { label: "Matriculas pendientes", value: data?.pendingEnrollments || 0, icon: "📋", color: "text-orange-400" },
  ];

  return (
    <div className="px-4 py-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Panel Coordinador</h2>
        <p className="text-gray-400 text-sm">Vista general del programa</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{stat.icon}</span>
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
            <p className="text-gray-400 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Metrics */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Metricas generales</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Promedio dias completados</span>
          <span className="font-semibold">{data?.avgDaysCompleted || 0} dias</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Promedio quiz</span>
          <span className="font-semibold">{data?.avgQuizScore || 0}%</span>
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
      </div>
    </div>
  );
}
