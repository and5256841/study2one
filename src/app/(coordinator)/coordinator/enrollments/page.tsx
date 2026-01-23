"use client";

import { useEffect, useState } from "react";

interface PendingStudent {
  id: string;
  fullName: string;
  email: string;
  university: string | null;
  phone: string | null;
  createdAt: string;
}

export default function EnrollmentsPage() {
  const [pending, setPending] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await fetch("/api/coordinator/enrollments");
      const data = await res.json();
      setPending(data.pending || []);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleAction = async (studentId: string, action: "APPROVED" | "REJECTED") => {
    setProcessing(studentId);
    try {
      await fetch("/api/coordinator/enrollments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action }),
      });
      setPending((prev) => prev.filter((s) => s.id !== studentId));
    } catch (error) {
      console.error("Error:", error);
    }
    setProcessing(null);
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold">Matriculas</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Matriculas Pendientes</h2>
        <p className="text-gray-400 text-sm">{pending.length} solicitudes</p>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-gray-400">No hay matriculas pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((student) => (
            <div
              key={student.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="mb-3">
                <p className="font-semibold">{student.fullName}</p>
                <p className="text-gray-400 text-sm">{student.email}</p>
                {student.university && (
                  <p className="text-gray-500 text-xs mt-0.5">{student.university}</p>
                )}
                <p className="text-gray-600 text-xs mt-1">
                  Registro: {new Date(student.createdAt).toLocaleDateString("es-CO")}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(student.id, "APPROVED")}
                  disabled={processing === student.id}
                  className="flex-1 py-2 bg-green-500/20 border border-green-500/30 text-green-400 font-medium rounded-lg text-sm hover:bg-green-500/30 transition-all disabled:opacity-50"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleAction(student.id, "REJECTED")}
                  disabled={processing === student.id}
                  className="flex-1 py-2 bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-lg text-sm hover:bg-red-500/30 transition-all disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
