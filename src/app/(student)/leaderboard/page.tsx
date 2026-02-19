"use client";

import { useEffect, useState } from "react";
import EcgWaveform from "@/components/EcgWaveform";
import { type EcgRhythmType } from "@/lib/ecg-rhythms";

interface LeaderboardEntry {
  id: string;
  name: string;
  rhythmType: EcgRhythmType;
  rhythmColor: string;
  rank: number;
  streak: number;
  completedDays: number;
  quizzesPassed: number;
  score: number;
  isCurrentUser: boolean;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => {
        if (res.status === 401) { window.location.href = "/login"; return null; }
        return res.json();
      })
      .then((d) => { if (d) setEntries(d.leaderboard || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold text-center">Ranking</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Ranking</h2>
        <p className="text-gray-400 text-sm">Competencia sana entre estudiantes</p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay datos de ranking aun.</p>
          <p className="text-gray-600 text-sm mt-1">Completa dias para aparecer aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                entry.isCurrentUser
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {entry.rank <= 3 ? (
                  <span className="text-xl">{getMedalEmoji(entry.rank)}</span>
                ) : (
                  <span className="text-gray-400 font-bold text-sm">{entry.rank}</span>
                )}
              </div>

              {/* ECG Rhythm */}
              <div className="flex-shrink-0">
                <EcgWaveform rhythm={entry.rhythmType} size="xs" />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${entry.isCurrentUser ? "text-green-400" : ""}`}>
                  {entry.name} {entry.isCurrentUser && "(Tu)"}
                </p>
                <p className="text-gray-500 text-xs">
                  {entry.completedDays} dias - {entry.streak > 0 ? `🔥 ${entry.streak}` : "Sin racha"}
                </p>
              </div>

              {/* Score */}
              <div className="text-right">
                <p className="font-bold text-sm">{entry.score}</p>
                <p className="text-gray-500 text-[10px]">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
