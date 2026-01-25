"use client";

import { useEffect, useState } from "react";

interface Cohort {
  id: string;
  name: string;
  studentCount: number;
  simulacroCount: number;
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/dashboard")
      .then((res) => res.json())
      .then((d) => setCohorts(d.cohorts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold">Cohortes</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Cohortes</h2>
        <p className="text-gray-400 text-sm">{cohorts.length} cohortes asignadas</p>
      </div>

      {cohorts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay cohortes asignadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cohorts.map((c) => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="font-semibold">{c.name}</h3>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>{c.studentCount} estudiantes</span>
                <span>{c.simulacroCount} simulacros</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
