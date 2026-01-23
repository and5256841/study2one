"use client";

import { useEffect, useState } from "react";

interface Simulacro {
  id: string;
  title: string;
  scheduledDate: string;
  durationMinutes: number;
  totalQuestions: number;
  isActive: boolean;
  _count: { questions: number; attempts: number };
}

export default function SimulacrosPage() {
  const [simulacros, setSimulacros] = useState<Simulacro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/coordinator/simulacros")
      .then((res) => res.json())
      .then((d) => setSimulacros(d.simulacros || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold">Simulacros</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Simulacros</h2>
        <p className="text-gray-400 text-sm">{simulacros.length} creados</p>
      </div>

      {simulacros.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-gray-400">No hay simulacros creados</p>
          <p className="text-gray-600 text-sm mt-1">Usa la API para crear simulacros con preguntas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {simulacros.map((sim) => (
            <div key={sim.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{sim.title}</h3>
                  <p className="text-gray-500 text-xs">
                    {new Date(sim.scheduledDate).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  sim.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                }`}>
                  {sim.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>{sim._count.questions} preguntas</span>
                <span>{sim.durationMinutes} min</span>
                <span>{sim._count.attempts} intentos</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
