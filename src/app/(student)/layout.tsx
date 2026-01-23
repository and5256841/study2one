"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/roadmap", label: "Roadmap", icon: "📚" },
  { href: "/leaderboard", label: "Ranking", icon: "🏆" },
  { href: "/profile", label: "Perfil", icon: "👤" },
];

export default function StudentLayout({
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
          study<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">2one</span>
        </h1>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "text-green-400"
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
