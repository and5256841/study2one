"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ExamDay {
  id: string;
  dayNumber: number;
  title: string;
  questionCount: number;
}

export default function ExamDaysPage() {
  const [days, setDays] = useState<ExamDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/coordinator/exam-days")
      .then((r) => r.json())
      .then(setDays)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Exámenes Diarios</h2>
        <p className="text-gray-400 text-sm mt-1">
          Módulo 6 — Fundamentación Dx y Tx · Días 26–30
        </p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : days.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm">
            No hay días de examen en la base de datos.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Ejecuta el script <code>seed-exam-days-module6.mjs</code>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <Link
              key={day.id}
              href={`/coordinator/exam-days/${day.dayNumber}`}
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-all"
            >
              <div>
                <p className="font-semibold text-sm">Día {day.dayNumber}</p>
                <p className="text-gray-400 text-xs mt-0.5">{day.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                    day.questionCount >= 15
                      ? "bg-green-500/20 text-green-400"
                      : day.questionCount > 0
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {day.questionCount}/15 preguntas
                </span>
                <span className="text-gray-500">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
