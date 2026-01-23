"use client";

import { useEffect, useState } from "react";

interface Student {
  id: string;
  name: string;
  email: string;
  pseudonym: string | null;
  university: string | null;
  streak: number;
  lastActivity: string | null;
  daysCompleted: number;
  quizzesTaken: number;
  avgQuizScore: number;
  photosUploaded: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/coordinator/students")
      .then((res) => res.json())
      .then((d) => setStudents(d.students || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return { label: "Sin actividad", color: "text-gray-500" };
    const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return { label: "Hoy", color: "text-green-400" };
    if (days === 1) return { label: "Ayer", color: "text-green-400" };
    if (days <= 3) return { label: `Hace ${days}d`, color: "text-yellow-400" };
    return { label: `Hace ${days}d`, color: "text-red-400" };
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold">Estudiantes</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Estudiantes</h2>
        <p className="text-gray-400 text-sm">{students.length} matriculados</p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
      />

      {/* Students List */}
      <div className="space-y-2">
        {filtered.map((student) => {
          const activity = getActivityStatus(student.lastActivity);
          return (
            <div
              key={student.id}
              className="bg-white/5 border border-white/10 rounded-xl p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{student.name}</p>
                  <p className="text-gray-500 text-xs truncate">{student.email}</p>
                </div>
                <span className={`text-xs font-medium ${activity.color}`}>
                  {activity.label}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{student.daysCompleted} dias</span>
                <span>{student.avgQuizScore}% quiz</span>
                <span>{student.streak > 0 ? `🔥${student.streak}` : "—"}</span>
                <span>{student.photosUploaded} fotos</span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            {search ? "No se encontraron resultados" : "No hay estudiantes matriculados"}
          </p>
        )}
      </div>
    </div>
  );
}
