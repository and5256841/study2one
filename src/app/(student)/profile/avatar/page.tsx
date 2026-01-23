"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STYLES = ["adventurer", "avataaars", "bottts", "fun-emoji", "lorelei", "pixel-art"];
const SEEDS = ["Felix", "Luna", "Max", "Cleo", "Buddy"];

export default function AvatarPage() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState("adventurer");
  const [selectedSeed, setSelectedSeed] = useState("Felix");
  const [pseudonym, setPseudonym] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile/avatar")
      .then((res) => res.json())
      .then((data) => {
        setSelectedStyle(data.current.style);
        setSelectedSeed(data.current.seed);
        setPseudonym(data.current.pseudonym || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getAvatarUrl = (style: string, seed: string) =>
    `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: selectedStyle, seed: selectedSeed, pseudonym }),
      });
      if (res.ok) {
        router.push("/profile");
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 w-32 bg-white/5 rounded-full mx-auto" />
          <div className="h-8 bg-white/5 rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5 pb-32">
      <div className="text-center">
        <h2 className="text-xl font-bold">Personaliza tu avatar</h2>
        <p className="text-gray-400 text-sm">Elige un estilo y personaje</p>
      </div>

      {/* Current Avatar Preview */}
      <div className="flex justify-center">
        <img
          src={getAvatarUrl(selectedStyle, selectedSeed)}
          alt="Avatar"
          className="w-28 h-28 rounded-full bg-white/10 p-2"
        />
      </div>

      {/* Pseudonym */}
      <div>
        <label className="block text-sm text-gray-400 mb-1.5 font-medium">
          Seudonimo (visible en el ranking)
        </label>
        <input
          type="text"
          value={pseudonym}
          onChange={(e) => setPseudonym(e.target.value)}
          placeholder="Ej: DrEstudio, MedFighter..."
          maxLength={20}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
        />
        <p className="text-gray-600 text-xs mt-1">3-20 caracteres</p>
      </div>

      {/* Style Selector */}
      <div>
        <p className="text-sm text-gray-400 font-medium mb-2">Estilo</p>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((style) => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={`p-2 rounded-xl border transition-all ${
                selectedStyle === style
                  ? "border-green-400 bg-green-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <img
                src={getAvatarUrl(style, selectedSeed)}
                alt={style}
                className="w-12 h-12 mx-auto"
              />
              <p className="text-[10px] text-gray-400 mt-1 text-center truncate">{style}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Seed Selector */}
      <div>
        <p className="text-sm text-gray-400 font-medium mb-2">Personaje</p>
        <div className="grid grid-cols-5 gap-2">
          {SEEDS.map((seed) => (
            <button
              key={seed}
              onClick={() => setSelectedSeed(seed)}
              className={`p-2 rounded-xl border transition-all ${
                selectedSeed === seed
                  ? "border-green-400 bg-green-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <img
                src={getAvatarUrl(selectedStyle, seed)}
                alt={seed}
                className="w-10 h-10 mx-auto"
              />
              <p className="text-[10px] text-gray-400 mt-1 text-center">{seed}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
