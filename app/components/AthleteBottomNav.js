"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  {
    name: "Home",
    path: "/atleta/dashboard",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "Tornei",
    path: "/atleta/iscrizioni",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
      </svg>
    ),
  },
  {
    name: "Iscriviti",
    path: "/atleta/iscriviti",
    center: true,
    icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    name: "Gironi",
    path: "/atleta/gironi",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
      </svg>
    ),
  },
  {
    name: "Profilo",
    path: "/atleta/profilo",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
];

export default function AthleteBottomNav({ notificheCount = 0 }) {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      // Nascondi quando si scrolla velocemente verso il basso, mostra quando si torna su
      if (currentY > lastScrollY + 10 && currentY > 100) {
        setVisible(false);
      } else if (currentY < lastScrollY - 5) {
        setVisible(true);
      }
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className={`xl:hidden fixed bottom-0 left-0 right-0 z-[200] transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {/* Blur background */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]" />

      <div className="relative flex items-end justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          if (item.center) {
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="relative -top-5 flex items-center justify-center w-16 h-16 rounded-[1.4rem] bg-[#0a1628] text-[#FFD700] shadow-[0_8px_30px_rgba(10,22,40,0.4)] border-4 border-white active:scale-90 transition-transform"
                aria-label="Iscriviti"
              >
                {item.icon()}
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="relative flex flex-col items-center gap-1 py-3 px-3 flex-1 active:scale-90 transition-transform"
              aria-label={item.name}
            >
              {/* Notifiche badge su Profilo */}
              {item.name === "Home" && notificheCount > 0 && (
                <span className="absolute top-2 right-[calc(50%-8px)] w-4 h-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">
                  {notificheCount > 9 ? "9+" : notificheCount}
                </span>
              )}

              <span
                className={`transition-all duration-200 ${
                  isActive ? "text-[#0a1628] scale-110" : "text-gray-400"
                }`}
              >
                {item.icon(isActive)}
              </span>

              {/* Active dot */}
              <span
                className={`text-[9px] font-black uppercase tracking-widest transition-all ${
                  isActive ? "text-[#0a1628]" : "text-gray-300"
                }`}
              >
                {item.name}
              </span>

              {isActive && (
                <span className="absolute top-2 w-1 h-1 rounded-full bg-[#FFD700]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Safe area spacer for iOS */}
      <div className="h-safe-area-inset-bottom bg-transparent" />
    </nav>
  );
}
