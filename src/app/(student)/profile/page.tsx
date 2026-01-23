"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProfileData {
  name: string;
  email: string;
  pseudonym: string | null;
  university: string | null;
  enrollmentStatus: string;
  memberSince: string;
  streak: { current: number; longest: number };
  stats: {
    audioCompleted: number;
    quizzesTaken: number;
    avgQuizScore: number;
    photosUploaded: number;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((d) => setProfile(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    window.location.href = "/api/auth/signout";
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
    <div className="px-4 py-6 space-y-5">
      {/* Avatar & Name */}
      <div className="text-center">
        <Link href="/profile/avatar" className="inline-block relative group">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <span className="absolute bottom-0 right-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs border border-white/30 group-hover:bg-white/30">✏️</span>
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
          <span className="text-sm">{profile.email}</span>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.streak.current}</p>
          <p className="text-gray-400 text-xs">Racha actual</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.streak.longest}</p>
          <p className="text-gray-400 text-xs">Mejor racha</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.stats.audioCompleted}</p>
          <p className="text-gray-400 text-xs">Audios completados</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.stats.avgQuizScore}%</p>
          <p className="text-gray-400 text-xs">Promedio quiz</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.stats.quizzesTaken}</p>
          <p className="text-gray-400 text-xs">Quizzes hechos</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{profile.stats.photosUploaded}</p>
          <p className="text-gray-400 text-xs">Fotos subidas</p>
        </div>
      </div>

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
