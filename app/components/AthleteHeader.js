"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function AthleteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const menuItems = [
    { name: "Dashboard", path: "/atleta/dashboard", emoji: "🏠" },
    { name: "Le Mie Iscrizioni", path: "/atleta/iscrizioni", emoji: "📋" },
    { name: "Gironi & Calendario", path: "/atleta/gironi", emoji: "🏐" },
    { name: "Iscriviti", path: "/atleta/iscriviti", emoji: "➕" },
    { name: "Notifiche", path: "/atleta/notifiche", emoji: "🔔" },
    { name: "Profilo & Documenti", path: "/atleta/profilo", emoji: "👤" },
    { name: "Classifica", path: "/atleta/classifica", emoji: "🏆" },
  ];

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  return (
    <header
      className="bg-white/95 backdrop-blur-sm py-3 px-4 md:px-8 flex justify-between items-center shadow-sm border-b sticky top-0 z-[100]"
      style={{ borderColor: "#FFD700" }}
    >
      {/* Logo + Title */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/atleta/dashboard")}>
        <Image src="/logo.png" alt="BVI Logo" width={36} height={36} className="object-contain" />
        <h1 className="text-base font-black uppercase tracking-tighter hidden sm:block" style={{ color: "#0a1628" }}>
          BVI Atleta
        </h1>
      </div>

      {/* Desktop Navigation — solo xl+ */}
      <nav className="hidden xl:flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
        {menuItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
              pathname === item.path
                ? "bg-[#0a1628] text-white shadow-md"
                : "text-gray-400 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            {item.name}
          </a>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Avatar + nome — visible su sm+ */}
        <div
          className="hidden sm:flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => router.push("/atleta/profilo")}
        >
          <div className="w-8 h-8 rounded-full bg-[#0a1628] flex items-center justify-center text-[#FFD700] font-black text-xs border-2 border-[#FFD700]">
            {initials}
          </div>
          <span className="font-black text-[10px] text-[#0a1628] uppercase tracking-widest hidden md:block">
            {session?.user?.name?.split(" ")[0] || "Atleta"}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="hidden sm:block hover:underline font-black text-red-400 text-[10px] uppercase tracking-widest xl:block"
        >
          Esci
        </button>

        {/* Mobile hamburger — solo xl hidden */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="xl:hidden w-9 h-9 flex items-center justify-center bg-gray-100 rounded-xl text-[#0a1628] active:scale-90 transition-transform"
          aria-label="Menu"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[110] xl:hidden backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[80vw] max-w-[18rem] bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0a1628]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFD700] flex items-center justify-center text-[#0a1628] font-black text-base">
                  {initials}
                </div>
                <div>
                  <p className="font-black text-white text-xs uppercase tracking-wider">
                    {session?.user?.name?.split(" ")[0] || "Atleta"}
                  </p>
                  <p className="text-[9px] font-bold text-[#FFD700]/70 truncate max-w-[100px]">
                    {session?.user?.email || ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="text-white/50 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
              {menuItems.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-black transition-all ${
                    pathname === item.path
                      ? "bg-[#0a1628] text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-lg">{item.emoji}</span>
                  {item.name}
                </a>
              ))}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Disconnetti
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
