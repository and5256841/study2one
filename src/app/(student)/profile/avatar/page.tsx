"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AvatarOption {
  code: string;
  label: string;
  category: string;
  url: string;
}

interface AvatarData {
  current: {
    code: string;
    url: string;
    pseudonym: string;
  };
  options: AvatarOption[];
}

export default function AvatarPage() {
  const router = useRouter();
  const [data, setData] = useState<AvatarData | null>(null);
  const [selectedCode, setSelectedCode] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile/avatar")
      .then((res) => res.json())
      .then((data: AvatarData) => {
        setData(data);
        setSelectedCode(data.current.code);
        setPseudonym(data.current.pseudonym || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getSelectedUrl = () => {
    if (!data) return "";
    const option = data.options.find((o) => o.code === selectedCode);
    return option?.url || data.current.url;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: selectedCode, pseudonym }),
      });
      if (res.ok) {
        router.push("/profile");
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setSaving(false);
  };

  if (loading || !data) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 w-32 bg-white/5 rounded-full mx-auto" />
          <div className="h-8 bg-white/5 rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }

  // Agrupar emojis por categoría
  const categories = {
    caras: data.options.filter((o) => o.category === "caras"),
    estudio: data.options.filter((o) => o.category === "estudio"),
    medico: data.options.filter((o) => o.category === "medico"),
    gestos: data.options.filter((o) => o.category === "gestos"),
  };

  const categoryLabels = {
    caras: "Caras",
    estudio: "Estudio",
    medico: "Profesionales de salud",
    gestos: "Gestos",
  };

  return (
    <div className="px-4 py-6 space-y-5 pb-32">
      <div className="text-center">
        <h2 className="text-xl font-bold">Personaliza tu avatar</h2>
        <p className="text-gray-400 text-sm">Elige un emoji que te represente</p>
      </div>

      {/* Current Avatar Preview */}
      <div className="flex justify-center">
        <div className="w-28 h-28 rounded-full bg-white/10 p-3 flex items-center justify-center">
          <img
            src={getSelectedUrl()}
            alt="Avatar"
            className="w-20 h-20"
          />
        </div>
      </div>

      {/* Pseudonym */}
      <div>
        <label className="block text-sm text-gray-400 mb-1.5 font-medium">
          Seudónimo (visible en el ranking)
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

      {/* Emoji Categories */}
      {Object.entries(categories).map(([key, emojis]) => (
        <div key={key}>
          <p className="text-sm text-gray-400 font-medium mb-2">
            {categoryLabels[key as keyof typeof categoryLabels]}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {emojis.map((emoji) => (
              <button
                key={emoji.code}
                onClick={() => setSelectedCode(emoji.code)}
                className={`p-2 rounded-xl border transition-all ${
                  selectedCode === emoji.code
                    ? "border-green-400 bg-green-500/10 scale-110"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <img
                  src={emoji.url}
                  alt={emoji.label}
                  className="w-10 h-10 mx-auto"
                />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Attribution */}
      <p className="text-center text-xs text-gray-600">
        Emojis por{" "}
        <a
          href="https://twemoji.twitter.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 underline"
        >
          Twemoji
        </a>{" "}
        (CC BY 4.0)
      </p>

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
