"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem("bvi_cookie_consent");
    if (!consent) {
      // Small timeout to make the entry transition feel smooth
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("bvi_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("bvi_cookie_consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-[#0D3D31] text-white rounded-[2rem] p-6 shadow-2xl z-[999] border border-white/10 flex flex-col gap-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">🍪</span>
        <div className="space-y-1">
          <h4 className="font-black text-sm uppercase tracking-wider text-[#C3562B]">Informativa sui Cookie</h4>
          <p className="text-xs text-gray-300 leading-relaxed font-semibold">
            Questo sito utilizza i cookie per migliorare la tua esperienza di navigazione, gestire le iscrizioni ai tornei e analizzare il traffico.
          </p>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button 
          onClick={handleDecline}
          className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/5"
        >
          Solo Necessari
        </button>
        <button 
          onClick={handleAccept}
          className="flex-1 py-3 bg-[#C3562B] text-[#0D3D31] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-yellow-500/10"
        >
          Accetta Tutti
        </button>
      </div>
    </div>
  );
}
