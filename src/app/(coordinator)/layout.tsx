"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/coordinator/dashboard", label: "Panel", icon: "📊" },
  { href: "/coordinator/students", label: "Alumnos", icon: "👥" },
  { href: "/coordinator/simulacros", label: "Simulacros", icon: "📝" },
  { href: "/cohorts", label: "Cohortes", icon: "🎓" },
  { href: "/coordinator/announcements", label: "Anuncios", icon: "📢" },
  { href: "/exam-days", label: "Exámenes", icon: "🧪" },
  { href: "/monthly-exams", label: "Mensuales", icon: "📅" },
];

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">
          study<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">2one</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
            Coordinador
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "text-purple-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
