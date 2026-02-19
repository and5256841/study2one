"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EcgWaveform from "@/components/EcgWaveform";
import { type EcgRhythmType } from "@/lib/ecg-rhythms";

interface ProfileData {
  name: string;
  email: string;
  pseudonym: string | null;
  rhythm: { type: EcgRhythmType; label: string; color: string; description: string };
  university: string | null;
  enrollmentStatus: string;
  memberSince: string;
  streak: { current: number; longest: number };
  stats: {
    audioCompleted: number;
    quizzesTaken: number;
    quizzesPassed: number;
    quizzesFailed: number;
    avgQuizScore: number;
    photosUploaded: number;
  };
  audioStats: {
    totalListenedSeconds: number;
    totalListenedFormatted: string;
    mostUsedSpeed: number;
  };
  simulacroStats: {
    total: number;
    completed: number;
    avgScore: number;
  };
  platformTime: {
    totalSeconds: number;
    formatted: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (res.status === 401) { window.location.href = "/login"; return null; }
        return res.json();
      })
      .then((d) => { if (d) setProfile(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    // POST to signout then redirect to login (avoid loop)
    const res = await fetch("/api/auth/csrf");
    const { csrfToken } = await res.json();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `csrfToken=${csrfToken}`,
    });
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-white/5 rounded-full w-20 mx-auto" />
          <div className="h-6 bg-white/5 rounded w-32 mx-auto" />
          <div className="h-32 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const statusLabel: Record<string, string> = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
  };

  const statusColor: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-500/20",
    APPROVED: "text-green-400 bg-green-500/20",
    REJECTED: "text-red-400 bg-red-500/20",
  };

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      {/* ECG Rhythm & Name */}
      <div className="text-center">
        <Link href="/profile/rhythm" className="inline-block group">
          <div className="mx-auto bg-white/5 border border-white/10 rounded-2xl p-3 group-hover:border-white/20 transition-all">
            <EcgWaveform rhythm={profile.rhythm.type} size="md" showLabel />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Toca para ver todos los ritmos</p>
        </Link>
        <h2 className="text-xl font-bold mt-3">{profile.name}</h2>
        {profile.pseudonym && (
          <p className="text-gray-400 text-sm">@{profile.pseudonym}</p>
        )}
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[profile.enrollmentStatus] || ""}`}>
          {statusLabel[profile.enrollmentStatus] || profile.enrollmentStatus}
        </span>
      </div>

      {/* Info Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Email</span>
          <span className="text-sm truncate ml-2">{profile.email}</span>
        </div>
        {profile.university && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Universidad</span>
            <span className="text-sm">{profile.university}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Miembro desde</span>
          <span className="text-sm">
            {new Date(profile.memberSince).toLocaleDateString("es-CO", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Time Stats */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-sm text-gray-400 mb-3">Tiempo en la plataforma</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-3xl font-bold">{profile.platformTime.formatted}</p>
            <p className="text-gray-500 text-xs">Tiempo total</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{profile.audioStats.totalListenedFormatted}</p>
            <p className="text-gray-500 text-xs">Escuchando audios</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
          <span className="text-gray-400 text-sm">Velocidad favorita</span>
          <span className="font-semibold">{profile.audioStats.mostUsedSpeed}x</span>
        </div>
      </div>

      {/* Streak Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.streak.current}</p>
          <p className="text-gray-400 text-xs">Racha actual 🔥</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.streak.longest}</p>
          <p className="text-gray-400 text-xs">Mejor racha</p>
        </div>
      </div>

      {/* Quiz Stats */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="font-semibold text-sm text-gray-400 mb-3">Quizzes diarios</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-bold">{profile.stats.quizzesTaken}</p>
            <p className="text-gray-500 text-xs">Intentos</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-400">{profile.stats.quizzesPassed}</p>
            <p className="text-gray-500 text-xs">Aprobados</p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-400">{profile.stats.quizzesFailed}</p>
            <p className="text-gray-500 text-xs">Reprobados</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
          <span className="text-gray-400 text-sm">Promedio</span>
          <span className="font-semibold">{profile.stats.avgQuizScore}%</span>
        </div>
      </div>

      {/* Audio & Photos Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.stats.audioCompleted}</p>
          <p className="text-gray-400 text-xs">Audios completados</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.stats.photosUploaded}</p>
          <p className="text-gray-400 text-xs">Fotos subidas</p>
        </div>
      </div>

      {/* Simulacros Stats */}
      {profile.simulacroStats.total > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold text-sm text-gray-400 mb-3">Simulacros</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold">{profile.simulacroStats.total}</p>
              <p className="text-gray-500 text-xs">Iniciados</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">{profile.simulacroStats.completed}</p>
              <p className="text-gray-500 text-xs">Completados</p>
            </div>
            <div>
              <p className="text-xl font-bold">{profile.simulacroStats.avgScore}%</p>
              <p className="text-gray-500 text-xs">Promedio</p>
            </div>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/10 transition-all"
      >
        Cerrar sesion
      </button>
    </div>
  );
}
