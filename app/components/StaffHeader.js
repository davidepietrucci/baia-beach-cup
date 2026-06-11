"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { isUsingFirebase } from "@/app/utils/db";

export default function StaffHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    setDbConnected(isUsingFirebase());
    
    if (status === "unauthenticated") {
      router.push("/staff");
      return;
    }

    if (session?.user) {
      const userRole = session.user.role || "staff";
      setRole(userRole);
      setUsername(session.user.username || session.user.name || "Staff");

      if (userRole !== "admin" && pathname === "/staff/atleti") {
        router.push("/staff/dashboard");
      }
    }
  }, [router, pathname, session, status]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await signOut({ callbackUrl: "/staff" });
  };

  const menuItems = [
    { name: "Dashboard", path: "/staff/dashboard" },
    { name: "Iscrizioni", path: "/staff/iscrizioni" },
    { name: "Moduli Iscrizione", path: "/staff/moduli" },
    { name: "Anagrafica Atleti", path: "/staff/atleti" },
    { name: "Tornei", path: "/staff/tornei" },
    { name: "Gironi", path: "/staff/gironi" },
    { name: "Tabellone", path: "/staff/tabellone" },
    { name: "Classifica", path: "/staff/classifica" },
    { name: "Pagamenti", path: "/staff/pagamenti" },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (role === "staff" && item.name === "Anagrafica Atleti") {
      return false;
    }
    return true;
  });

  return (
    <header className="bg-white py-3 px-4 md:px-8 flex justify-between items-center shadow-md border-b-4 sticky top-0 z-[100]" style={{borderColor: "#0a1628"}}>
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="BVI Logo" width={40} height={40} className="object-contain" />
        <div className="flex flex-col">
          <h1 className="text-xl font-black uppercase tracking-tighter leading-none" style={{color: "#0a1628"}}>BVI Staff</h1>
          <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${dbConnected ? 'text-green-600' : 'text-amber-600'}`}>
            {dbConnected ? "Database: Cloud ☁️" : "Database: Locale ⚠️"}
          </span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden xl:flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
        {filteredMenuItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              pathname === item.path
                ? "bg-white text-[#0a1628] shadow-sm border border-gray-100"
                : "text-gray-400 hover:text-gray-800"
            }`}
          >
            {item.name}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {username && <span className="text-gray-500 hidden sm:inline text-xs font-bold uppercase tracking-widest">Ciao, {username}</span>}
        <button onClick={handleLogout} className="hidden sm:block hover:underline font-bold text-red-500 text-xs uppercase tracking-widest cursor-pointer bg-transparent border-none">Esci</button>
        
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="xl:hidden w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl text-[#0a1628]"
        >
          {isMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-[110] xl:hidden" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl p-6 flex flex-col gap-6 animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-4">
                <span className="font-black text-[#0a1628]">MENU STAFF</span>
                <button onClick={() => setIsMenuOpen(false)} className="text-2xl">✕</button>
            </div>
            <nav className="flex flex-col gap-2">
              {filteredMenuItems.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className={`p-4 rounded-2xl text-sm font-bold transition-all ${
                    pathname === item.path
                      ? "bg-[#0a1628] text-white shadow-lg"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t flex flex-col gap-2">
                {username && <span className="text-xs font-bold text-gray-500 text-center uppercase tracking-widest">Ciao, {username}</span>}
                <button onClick={handleLogout} className="w-full flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer border-none">
                    Esci dal Portale
                </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
