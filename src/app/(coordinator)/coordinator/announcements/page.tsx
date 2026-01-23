"use client";

import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/coordinator/announcements");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/coordinator/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements((prev) => [data.announcement, ...prev]);
        setTitle("");
        setBody("");
        setShowForm(false);
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold">Anuncios</h2>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Anuncios</h2>
          <p className="text-gray-400 text-sm">{announcements.length} publicados</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-medium rounded-lg"
        >
          {showForm ? "Cancelar" : "+ Nuevo"}
        </button>
      </div>

      {/* New Announcement Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-purple-500/30 rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Titulo del anuncio"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
          />
          <textarea
            placeholder="Escribe el contenido del anuncio..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 resize-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-purple-600 text-white font-medium rounded-lg text-sm hover:bg-purple-500 transition-all disabled:opacity-50"
          >
            {submitting ? "Publicando..." : "Publicar anuncio"}
          </button>
        </form>
      )}

      {/* Announcements List */}
      {announcements.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay anuncios publicados.</p>
          <p className="text-gray-600 text-sm mt-1">Crea uno para comunicarte con tus estudiantes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{a.title}</h3>
                <span className="text-gray-500 text-xs whitespace-nowrap ml-2">
                  {new Date(a.createdAt).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
