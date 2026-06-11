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
    { name: "Dashboard", path: "/atleta/dashboard" },
    { name: "Le Mie Iscrizioni", path: "/atleta/iscrizioni" },
    { name: "Gironi & Calendario", path: "/atleta/gironi" },
    { name: "Invia Iscrizione", path: "/atleta/iscriviti" },
    { name: "Profilo & Documenti", path: "/atleta/profilo" },
    { name: "Classifica", path: "/classifica" },
  ];

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className="bg-white py-3 px-4 md:px-8 flex justify-between items-center shadow-md border-b-4 sticky top-0 z-[100]" style={{borderColor: "#FFD700"}}>
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="BVI Logo" width={40} height={40} className="object-contain" />
        <h1 className="text-xl font-black uppercase tracking-tighter" style={{color: "#0a1628"}}>BVI Atleta</h1>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden xl:flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
        {menuItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              pathname === item.path
                ? "bg-[#0a1628] text-white shadow-md"
                : "text-gray-400 hover:text-gray-800"
            }`}
          >
            {item.name}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-full bg-[#0a1628] flex items-center justify-center text-[#FFD700] font-black text-xs border-2 border-[#FFD700]">
                {session?.user?.name ? session.user.name.charAt(0) : "A"}
            </div>
            <span className="font-black text-[10px] text-[#0a1628] uppercase tracking-widest">{session?.user?.name?.split(' ')[0] || "Atleta"}</span>
        </div>

        <button 
          onClick={handleLogout}
          className="hidden sm:block hover:underline font-black text-red-500 text-[10px] uppercase tracking-widest"
        >
          Esci
        </button>
        
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="xl:hidden w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl text-[#0a1628]"
        >
          {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
          ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-[110] xl:hidden backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-[85vw] max-w-[20rem] sm:w-80 bg-white shadow-2xl p-6 sm:p-8 flex flex-col gap-6 sm:gap-8 animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-4 sm:pb-6">
                <div className="flex items-center gap-3">
                    <Image src="/logo.png" alt="BVI Logo" width={40} height={40} />
                    <span className="font-black text-xl text-[#0a1628] tracking-tighter">MENU ATLETA</span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="text-2xl text-gray-400">✕</button>
            </div>
            
            <nav className="flex flex-col gap-2.5 sm:gap-3 overflow-y-auto max-h-[50vh] pr-1">
              {menuItems.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className={`p-4 sm:p-5 rounded-[1.5rem] text-sm font-black transition-all flex items-center justify-between group ${
                    pathname === item.path
                      ? "bg-[#0a1628] text-white shadow-xl scale-[1.02]"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`w-4 h-4 ${pathname === item.path ? 'text-[#FFD700]' : 'text-gray-300'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </a>
              ))}
            </nav>

            <div className="mt-auto space-y-3 sm:space-y-4">
                <div className="p-4 sm:p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0a1628] flex items-center justify-center text-[#FFD700] font-black text-base sm:text-lg border-2 border-[#FFD700]">
                        {session?.user?.name ? session.user.name.charAt(0) : "A"}
                    </div>
                    <div>
                        <p className="font-black text-[#0a1628] uppercase text-[10px] sm:text-xs tracking-widest">{session?.user?.name || "Atleta"}</p>
                        <p className="text-[9px] sm:text-[10px] font-bold text-blue-400">Livro Socio Attivo</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center p-5 bg-red-50 text-red-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-sm active:scale-95 transition-all"
                >
                    Disconnetti
                </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
