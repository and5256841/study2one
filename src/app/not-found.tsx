import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-extrabold text-gray-600">404</h1>
      <p className="text-gray-400 mt-3 text-lg">Página no encontrada</p>
      <Link
        href="/dashboard"
        className="mt-6 px-6 py-3 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
