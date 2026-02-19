"use client";

import { useState } from "react";

interface Photo {
  id: string;
  dayNumber: number;
  title: string;
  photoUrl: string | null;
  thumbnailUrl: string | null;
  photoType: string;
  uploadedAt: string;
  isApproved: boolean;
  approvedAt: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  studentId: string;
  onPhotoApproved: (photoId: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  CUADERNILLO: "Cuadernillo",
  MIND_MAP: "Mapa mental",
  NOTES: "Apuntes",
  OTHER: "Otro",
};

export default function PhotoGallery({
  photos,
  studentId,
  onPhotoApproved,
}: PhotoGalleryProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const pending = photos.filter((p) => !p.isApproved && p.photoUrl);
  const approved = photos.filter((p) => p.isApproved);

  const handleApprove = async (photo: Photo) => {
    setApproving(photo.id);
    try {
      const res = await fetch(
        `/api/coordinator/students/${studentId}/photos/${photo.id}`,
        { method: "PATCH" }
      );
      if (res.ok) {
        onPhotoApproved(photo.id);
        setLightboxPhoto(null);
        setConfirmId(null);
      }
    } catch {
      // ignore
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending photos */}
      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-yellow-400 mb-3">
            Pendientes de aprobación ({pending.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pending.map((photo) => (
              <div
                key={photo.id}
                className="relative group bg-white/5 border border-yellow-500/20 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setLightboxPhoto(photo)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.photoUrl!}
                  alt={`Día ${photo.dayNumber}`}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs font-semibold truncate">
                    Día {photo.dayNumber}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {TYPE_LABELS[photo.photoType] || photo.photoType}
                  </p>
                </div>
                <div className="absolute top-1 right-1">
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">
                    Pendiente
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved photos */}
      {approved.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-400 mb-3">
            Aprobadas ({approved.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {approved.map((photo) => (
              <div
                key={photo.id}
                className="bg-white/5 border border-green-500/20 rounded-xl p-3 text-center"
              >
                <div className="w-full h-20 flex items-center justify-center text-3xl text-green-400 mb-2">
                  ✓
                </div>
                <p className="text-xs font-semibold">Día {photo.dayNumber}</p>
                <p className="text-[10px] text-gray-500">
                  {TYPE_LABELS[photo.photoType] || photo.photoType}
                </p>
                <p className="text-[10px] text-green-500 mt-1">
                  Aprobada{" "}
                  {photo.approvedAt
                    ? new Date(photo.approvedAt).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <p className="text-center text-gray-500 py-6 text-sm">
          Este estudiante no ha subido evidencias fotográficas.
        </p>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => {
            setLightboxPhoto(null);
            setConfirmId(null);
          }}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto.photoUrl!}
              alt={`Día ${lightboxPhoto.dayNumber}`}
              className="w-full max-h-[60vh] object-contain rounded-t-2xl bg-black"
            />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    Día {lightboxPhoto.dayNumber} —{" "}
                    {TYPE_LABELS[lightboxPhoto.photoType] ||
                      lightboxPhoto.photoType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(lightboxPhoto.uploadedAt).toLocaleDateString(
                      "es-CO",
                      { day: "numeric", month: "long", year: "numeric" }
                    )}
                  </p>
                </div>
              </div>

              {confirmId === lightboxPhoto.id ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 space-y-3">
                  <p className="text-sm text-red-300">
                    ¿Aprobar esta evidencia? La imagen se eliminará del servidor
                    permanentemente.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(lightboxPhoto)}
                      disabled={approving === lightboxPhoto.id}
                      className="flex-1 py-2 rounded-xl bg-green-500/80 hover:bg-green-500 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                    >
                      {approving === lightboxPhoto.id
                        ? "Aprobando..."
                        : "Sí, aprobar y eliminar imagen"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(lightboxPhoto.id)}
                  className="w-full py-2.5 rounded-xl bg-green-500/80 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
                >
                  Aprobar evidencia
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
