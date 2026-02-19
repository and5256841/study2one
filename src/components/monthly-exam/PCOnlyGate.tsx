"use client";

import { useState, useEffect } from "react";

export default function PCOnlyGate({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile || dismissed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-8 max-w-md text-center">
        <div className="text-5xl mb-4">💻</div>
        <h2 className="text-xl font-bold text-yellow-300 mb-3">
          Usa un computador
        </h2>
        <p className="text-gray-300 mb-6">
          Los simulacros mensuales están diseñados para realizarse en un
          computador de escritorio o portátil. La experiencia en dispositivos
          móviles es limitada.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="w-full py-3 rounded-xl bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-200 font-semibold transition-colors"
        >
          Continuar de todos modos
        </button>
      </div>
    </div>
  );
}
