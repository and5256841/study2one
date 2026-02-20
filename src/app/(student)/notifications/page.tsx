"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  templateKey: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  COORDINATOR_MESSAGE: "✉️",
  REMINDER: "⏰",
  STREAK: "🔥",
  ACHIEVEMENT: "🏆",
  ANNOUNCEMENT: "📢",
  SIMULACRO: "📝",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = (p: number) => {
    fetch(`/api/notifications?page=${p}`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(
      () => {}
    );
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications/read-all", { method: "PATCH" }).catch(
      () => {}
    );
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-3">
        <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Volver al inicio
        </Link>
        <h2 className="text-xl font-bold">Notificaciones</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="px-4 py-6 space-y-4 pb-32 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
        ← Volver al inicio
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Notificaciones</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-400">
              {unreadCount} sin leer
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No tienes notificaciones.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`w-full text-left rounded-xl p-4 border transition-all ${
                n.isRead
                  ? "bg-white/[0.02] border-white/5"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">
                  {TYPE_ICONS[n.type] || "📬"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-semibold text-sm ${
                        n.isRead ? "text-gray-400" : "text-white"
                      }`}
                    >
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-sm mt-0.5 ${
                      n.isRead ? "text-gray-600" : "text-gray-300"
                    }`}
                  >
                    {n.body}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {new Date(n.createdAt).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
