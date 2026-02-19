"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { generateCredentialPDF } from "@/lib/generate-credential-pdf";
import EcgWaveform from "@/components/EcgWaveform";
import { getStudentRhythmFromActivity } from "@/lib/ecg-rhythms";

interface Student {
  id: string;
  fullName: string;
  email: string;
  pseudonym: string | null;
  streak: number;
  lastActivity: string | null;
  daysCompleted: number;
  quizzesTaken: number;
  photosUploaded: number;
  avgQuizScore: number;
}

interface CohortData {
  id: string;
  name: string;
  startDate: string;
  isActive: boolean;
}

export default function CohortDetailPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const router = useRouter();
  const [cohort, setCohort] = useState<CohortData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Toggle active/inactive
  const [toggling, setToggling] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  // Enrollment form
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollPseudonym, setEnrollPseudonym] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");

  const fetchData = () => {
    fetch(`/api/coordinator/cohorts/${cohortId}`)
      .then((r) => {
        if (r.status === 401) {
          setUnauthorized(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setCohort(data.cohort);
        setStudents(data.students || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [cohortId]);

  useEffect(() => {
    if (unauthorized) {
      router.push("/login");
    }
  }, [unauthorized, router]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim() === cohort?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/coordinator/cohorts/${cohortId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCohort((prev) => prev ? { ...prev, name: data.cohort.name } : prev);
      }
    } catch {
      // ignore
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  };

  const handleToggleActive = async () => {
    if (!cohort) return;

    // If active, require confirmation first
    if (cohort.isActive && !confirmDeactivate) {
      setConfirmDeactivate(true);
      return;
    }

    setToggling(true);
    setConfirmDeactivate(false);
    try {
      const res = await fetch(`/api/coordinator/cohorts/${cohortId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !cohort.isActive }),
      });
      if (res.ok) {
        const data = await res.json();
        setCohort((prev) => prev ? { ...prev, isActive: data.cohort.isActive } : prev);
      }
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollEmail.trim() || !enrollName.trim()) return;
    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");

    try {
      const res = await fetch(
        `/api/coordinator/cohorts/${cohortId}/enroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: enrollEmail.trim(),
            fullName: enrollName.trim(),
            pseudonym: enrollPseudonym.trim() || undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setEnrollError(data.error || "Error al matricular");
        setEnrolling(false);
        return;
      }

      generateCredentialPDF({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        cohortName: data.cohortName,
      });

      setEnrollSuccess(
        `${data.fullName} matriculado exitosamente. PDF descargado.`
      );
      setEnrollEmail("");
      setEnrollName("");
      setEnrollPseudonym("");
      fetchData();
    } catch {
      setEnrollError("Error de conexion");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mb-6" />
        <div className="h-40 bg-white/5 rounded-xl animate-pulse mb-6" />
        <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="p-4 text-center text-gray-500">
        Cohorte no encontrada
      </div>
    );
  }

  const startDate = new Date(cohort.startDate);
  const today = new Date();
  const diffMs = today.getTime() - startDate.getTime();
  const daysSinceStart = Math.max(0, Math.floor(diffMs / 86400000));

  return (
    <div className="p-4 max-w-4xl mx-auto pb-32">
      <Link
        href="/cohorts"
        className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block"
      >
        &larr; Volver a cohortes
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                disabled={savingName}
                className="text-2xl font-bold bg-white/5 border border-purple-500/50 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-purple-400 w-72"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="px-3 py-1.5 rounded-lg bg-green-500/80 hover:bg-green-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {savingName ? "..." : "Guardar"}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{cohort.name}</h1>
              <button
                onClick={() => {
                  setEditName(cohort.name);
                  setEditingName(true);
                }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                title="Editar nombre"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}

          {/* Active/Inactive badge */}
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

        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
          <span>
            Inicio:{" "}
            {startDate.toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span>Dia {daysSinceStart} del calendario</span>
          <span>{students.length} estudiantes</span>
        </div>

        {/* Toggle active/deactivate */}
        <div className="mt-3 flex items-center gap-3">
          {confirmDeactivate ? (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              <span className="text-sm text-red-300">
                Desactivar esta cohorte? Los estudiantes no podran acceder.
              </span>
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                className="px-3 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {toggling ? "..." : "Confirmar"}
              </button>
              <button
                onClick={() => setConfirmDeactivate(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors ${
                cohort.isActive
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
              }`}
            >
              {toggling
                ? "..."
                : cohort.isActive
                ? "Desactivar cohorte"
                : "Reactivar cohorte"}
            </button>
          )}
        </div>
      </div>

      {/* Enrollment form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
        <h3 className="font-bold mb-4">Matricular nuevo estudiante</h3>

        {enrollError && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-300">
            {enrollError}
          </div>
        )}
        {enrollSuccess && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4 text-sm text-green-300">
            {enrollSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Correo electronico *
            </label>
            <input
              type="email"
              value={enrollEmail}
              onChange={(e) => setEnrollEmail(e.target.value)}
              placeholder="estudiante@email.com"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Nombre completo *
            </label>
            <input
              type="text"
              value={enrollName}
              onChange={(e) => setEnrollName(e.target.value)}
              placeholder="Maria Garcia Lopez"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Pseudonimo
            </label>
            <input
              type="text"
              value={enrollPseudonym}
              onChange={(e) => setEnrollPseudonym(e.target.value)}
              placeholder="Mariposa Azul"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        <button
          onClick={handleEnroll}
          disabled={enrolling || !enrollEmail.trim() || !enrollName.trim()}
          className="px-6 py-2.5 rounded-xl bg-purple-500/80 hover:bg-purple-500 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {enrolling ? "Matriculando..." : "Matricular y descargar PDF"}
        </button>
      </div>

      {/* Students list */}
      <h3 className="font-bold mb-4">
        Estudiantes ({students.length})
      </h3>

      {students.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No hay estudiantes en esta cohorte.
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((s) => {
            const lastAct = s.lastActivity
              ? new Date(s.lastActivity)
              : null;
            const daysAgo = lastAct
              ? Math.floor(
                  (today.getTime() - lastAct.getTime()) / 86400000
                )
              : null;
            const rhythm = getStudentRhythmFromActivity(
              s.lastActivity,
              s.streak,
              s.avgQuizScore
            );

            return (
              <Link
                key={s.id}
                href={`/coordinator/students/${s.id}`}
                className="block bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm">{s.fullName}</span>
                    <span className="text-gray-500 text-xs ml-2">{s.email}</span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      daysAgo === null
                        ? "text-gray-600"
                        : daysAgo === 0
                        ? "text-green-400"
                        : daysAgo <= 2
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {daysAgo === null
                      ? "Sin actividad"
                      : daysAgo === 0
                      ? "Hoy"
                      : daysAgo === 1
                      ? "Ayer"
                      : `Hace ${daysAgo}d`}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <EcgWaveform rhythm={rhythm.type} size="sm" />
                  <span>{s.daysCompleted} dias</span>
                  <span>{s.avgQuizScore}% quiz</span>
                  <span>{s.photosUploaded} fotos</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
