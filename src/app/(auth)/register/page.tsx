"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const cohortId = searchParams.get("cohort");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          documentId,
          password,
          phone,
          university,
          cohortId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrarse");
      } else {
        router.push("/pending");
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold">
          study<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">2one</span>
        </h1>
        <p className="text-gray-400 mt-2">Registro de estudiante</p>
        {cohortId && (
          <p className="text-green-400 text-sm mt-1">Inscripción por QR detectada</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-1 font-medium">Nombre completo *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="María García Rodríguez"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1 font-medium">Correo electrónico *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1 font-medium">Número de documento *</label>
          <input
            type="text"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder="1234567890"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1 font-medium">Contraseña *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1 font-medium">Teléfono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="3001234567"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1 font-medium">Universidad</label>
          <input
            type="text"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="Tu universidad"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 mt-2"
        >
          {loading ? "Registrando..." : "Registrarme"}
        </button>

        <p className="text-center text-sm text-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-green-400 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Cargando...</p></div>}>
      <RegisterForm />
    </Suspense>
  );
}
