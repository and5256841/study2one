import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4">⏳</div>
      <h1 className="text-2xl font-bold mb-2">Registro enviado</h1>
      <p className="text-gray-400 max-w-xs mb-6">
        Tu solicitud de matrícula ha sido enviada. El coordinador debe aprobar
        tu inscripción antes de que puedas acceder a la plataforma.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Recibirás un correo electrónico cuando seas aprobado.
      </p>
      <Link
        href="/login"
        className="text-green-400 hover:underline text-sm"
      >
        Volver al inicio de sesión
      </Link>
    </div>
  );
}
