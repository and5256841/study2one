"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ExamInfo {
  id: string;
  number: number;
  title: string;
  mode: string;
  isActive: boolean;
  totalSections: number;
  totalQuestions: number;
  totalAttempts: number;
  completedAttempts: number;
  avgScore: number | null;
}

interface Cohort {
  id: string;
  name: string;
  startDate: string;
  isActive: boolean;
}

interface Schedule {
  id: string;
  cohortId: string;
  cohortName: string;
  examId: string;
  examNumber: number;
  startDay: number;
  sectionSchedule: { sectionNumber: number; globalDay: number }[];
  scheduledBy: string;
  createdAt: string;
}

export default function CoordinatorMonthlyExamsPage() {
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Scheduling form state
  const [schedulingExam, setSchedulingExam] = useState<string | null>(null);
  const [selectedCohort, setSelectedCohort] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/coordinator/monthly-exams").then((r) => r.json()),
      fetch("/api/coordinator/cohorts").then((r) => r.json()),
      fetch("/api/coordinator/cohort-exam-schedule").then((r) => r.json()),
    ])
      .then(([examsData, cohortsData, schedulesData]) => {
        setExams(examsData.exams || []);
        setCohorts(cohortsData.cohorts || []);
        setSchedules(schedulesData.schedules || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (examId: string, currentActive: boolean) => {
    setToggling(examId);
    try {
      const res = await fetch(`/api/coordinator/monthly-exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setExams((prev) =>
          prev.map((e) =>
            e.id === examId ? { ...e, isActive: !currentActive } : e
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  };

  const createSchedule = async (examId: string) => {
    if (!selectedCohort || !selectedWeek) return;
    setSchedulingLoading(true);
    try {
      const res = await fetch("/api/coordinator/cohort-exam-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId: selectedCohort,
          examId,
          startWeek: selectedWeek,
        }),
      });
      if (res.ok) {
        // Refresh schedules
        const data = await fetch("/api/coordinator/cohort-exam-schedule").then(
          (r) => r.json()
        );
        setSchedules(data.schedules || []);
        setSchedulingExam(null);
        setSelectedCohort("");
        setSelectedWeek(1);
      } else {
        const err = await res.json();
        alert(err.error || "Error al programar");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setSchedulingLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm("¿Eliminar esta programación?")) return;
    try {
      const res = await fetch(
        `/api/coordinator/cohort-exam-schedule/${scheduleId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Simulacros Mensuales</h1>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 bg-white/5 rounded-xl animate-pulse mb-4"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Simulacros Mensuales</h1>
      <p className="text-gray-400 text-sm mb-6">
        Programa simulacros por cohorte y revisa métricas de los estudiantes.
      </p>

      <div className="space-y-6">
        {exams.map((exam) => {
          const examSchedules = schedules.filter(
            (s) => s.examId === exam.id
          );

          return (
            <div
              key={exam.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg">{exam.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {exam.mode === "CONTINUOUS"
                      ? "Modo continuo"
                      : "Modo semanal"}{" "}
                    · {exam.totalSections} secciones · {exam.totalQuestions}{" "}
                    preguntas
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/monthly-exams/${exam.id}`}
                    className="px-3 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 text-sm font-semibold transition-colors"
                  >
                    Métricas
                  </Link>
                  <button
                    onClick={() => toggleActive(exam.id, exam.isActive)}
                    disabled={toggling === exam.id}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      exam.isActive
                        ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                        : "bg-white/10 text-gray-400 border border-white/10 hover:bg-white/20"
                    } disabled:opacity-50`}
                  >
                    {exam.isActive ? "Activo" : "Inactivo"}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xl font-bold">{exam.totalAttempts}</div>
                  <div className="text-xs text-gray-500">Intentos</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xl font-bold">
                    {exam.completedAttempts}
                  </div>
                  <div className="text-xs text-gray-500">Completados</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xl font-bold">
                    {exam.avgScore !== null ? `${exam.avgScore}%` : "—"}
                  </div>
                  <div className="text-xs text-gray-500">Promedio</div>
                </div>
              </div>

              {/* Schedules */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400">
                    Programación por cohorte
                  </h3>
                  <button
                    onClick={() =>
                      setSchedulingExam(
                        schedulingExam === exam.id ? null : exam.id
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                  >
                    {schedulingExam === exam.id
                      ? "Cancelar"
                      : "+ Programar"}
                  </button>
                </div>

                {/* Existing schedules */}
                {examSchedules.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {examSchedules.map((sch) => (
                      <div
                        key={sch.id}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {sch.cohortName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Semana{" "}
                            {Math.ceil(sch.startDay / 5)} — Días{" "}
                            {sch.startDay} a {sch.startDay + 7}
                            {" "}(8 secciones en 2 semanas)
                          </p>
                        </div>
                        <button
                          onClick={() => deleteSchedule(sch.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 mb-3">
                    Sin programación. Presiona &quot;+ Programar&quot; para asignar a
                    una cohorte.
                  </p>
                )}

                {/* Scheduling form */}
                {schedulingExam === exam.id && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Cohorte
                      </label>
                      <select
                        value={selectedCohort}
                        onChange={(e) => setSelectedCohort(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 rounded-lg p-2 text-sm text-gray-200"
                      >
                        <option value="">Seleccionar cohorte...</option>
                        {cohorts
                          .filter((c) => c.isActive)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Semana de inicio (1-24)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={selectedWeek}
                        onChange={(e) =>
                          setSelectedWeek(parseInt(e.target.value) || 1)
                        }
                        className="w-full bg-white/10 border border-white/10 rounded-lg p-2 text-sm text-gray-200"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Secciones 1-5 en semana {selectedWeek}, secciones 6-8 en
                        semana {selectedWeek + 1}. Dias{" "}
                        {(selectedWeek - 1) * 5 + 1} a{" "}
                        {(selectedWeek - 1) * 5 + 8}.
                      </p>
                    </div>

                    <button
                      onClick={() => createSchedule(exam.id)}
                      disabled={
                        !selectedCohort || schedulingLoading
                      }
                      className="w-full py-2 rounded-lg bg-green-500/80 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      {schedulingLoading
                        ? "Programando..."
                        : "Programar simulacro"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
