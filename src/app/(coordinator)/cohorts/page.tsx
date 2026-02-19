"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CohortInfo {
  id: string;
  name: string;
  startDate: string;
  isActive: boolean;
  studentCount: number;
}

export default function CohortsListPage() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<CohortInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCohorts = () => {
    fetch("/api/coordinator/cohorts")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setCohorts(data.cohorts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCohorts();
  }, []);

  const createCohort = async () => {
    if (!newName.trim() || !newStartDate) return;
    setCreating(true);
    try {
      const res = await fetch("/api/coordinator/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), startDate: newStartDate }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName("");
        setNewStartDate("");
        fetchCohorts();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const getDaysElapsed = (startDate: string): number => {
    const start = new Date(startDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / 86400000));
  };

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Cohortes</h1>
        {[1, 2].map((i) => (
          <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse mb-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cohortes</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl bg-purple-500/80 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
        >
          + Nueva cohorte
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <h3 className="font-bold mb-4">Crear nueva cohorte</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Cohorte Febrero 2026"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={createCohort}
              disabled={creating || !newName.trim() || !newStartDate}
              className="px-6 py-2.5 rounded-xl bg-green-500/80 hover:bg-green-500 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              Crear
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cohorts list */}
      {cohorts.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No hay cohortes creadas. Crea tu primera cohorte para comenzar.
        </div>
      ) : (
        <div className="space-y-4">
          {cohorts.map((cohort) => {
            const daysElapsed = getDaysElapsed(cohort.startDate);
            return (
              <Link
                key={cohort.id}
                href={`/cohorts/${cohort.id}`}
                className="block bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">{cohort.name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Inicio:{" "}
                      {new Date(cohort.startDate).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      <span className="ml-2 text-gray-600">
                        ({daysElapsed} dias transcurridos)
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold">{cohort.studentCount}</div>
                      <div className="text-[10px] text-gray-500">estudiantes</div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        cohort.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-500"
                      }`}
                    >
                      {cohort.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
