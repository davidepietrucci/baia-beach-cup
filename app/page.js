"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getTornei, getMvp } from "@/app/utils/db";
import MvpVotingModal from "@/app/components/MvpVotingModal";

const defaultTestSponsors = [
  { id: "s1", nome: "Mikasa", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Mikasa_Sports_logo.svg", linkUrl: "https://mikasasports.co.jp/en/" },
  { id: "s2", nome: "Decathlon", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/12/Decathlon_Logo.svg", linkUrl: "https://www.decathlon.it" },
  { id: "s3", nome: "Red Bull", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Red_Bull_Logo.svg", linkUrl: "https://www.redbull.com" },
  { id: "s4", nome: "Wilson", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/07/Wilson_Sporting_Goods_logo.svg", linkUrl: "https://www.wilson.com" }
];

export default function Home() {
  const [torneiLive, setTorneiLive] = useState([]);
  const [torneiConclusi, setTorneiConclusi] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [countdownData, setCountdownData] = useState({ enabled: false, date: "", label: "" });
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
  const [sponsors, setSponsors] = useState([]);
  const [mvpData, setMvpData] = useState({ attivo: false, candidati: [], titolo: "Vota l'MVP del Torneo" });
  const [isMvpModalOpen, setIsMvpModalOpen] = useState(false);
  const [userHasVoted, setUserHasVoted] = useState(false);

  const displaySponsors = sponsors && sponsors.length > 0 ? sponsors : defaultTestSponsors;

  
  let baseSponsors = [...displaySponsors];
  while (baseSponsors.length < 10) {
    baseSponsors = [...baseSponsors, ...displaySponsors];
  }
  const doubleSponsors = [...baseSponsors, ...baseSponsors];

  useEffect(() => {
    
    getTornei().then(allTornei => {
      
      const live = allTornei.filter(t => t.stato === "In Programmazione");
      setTorneiLive(live);

      
      const conclusi = allTornei.filter(t => t.stato === "Concluso");
      setTorneiConclusi(conclusi);
    });

    
    fetch("/api/db?type=countdown", { cache: "no-store" })
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setCountdownData(json.data);
        }
      })
      .catch(err => console.error("Error fetching countdown:", err));

    
    fetch("/api/db?type=sponsors", { cache: "no-store" })
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setSponsors(json.data);
        }
      })
      .catch(err => console.error("Error fetching sponsors:", err));

    getMvp().then(data => {
      if (data) {
        setMvpData(data);
        
        if (typeof window !== "undefined") {
          const sessionId = data.sessionId || "default";
          const storageKey = `baia_beach_cup_mvp_voted_${sessionId}`;
          setUserHasVoted(localStorage.getItem(storageKey) === "true");
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!countdownData.enabled || !countdownData.date) {
      setTimeLeft(prev => ({ ...prev, expired: true }));
      return;
    }

    const calculateTimeLeft = () => {
      const difference = +new Date(countdownData.date) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          expired: false
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [countdownData]);

  useEffect(() => {
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const totalScroll = docHeight - winHeight;
      if (totalScroll > 0) {
        setScrollProgress(window.scrollY / totalScroll);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    
    const timer = setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      clearTimeout(timer);
    };
  }, [torneiLive, torneiConclusi]);

  return (
    <main className="min-h-[140vh] flex flex-col relative">
      {}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url('/bg_main.jpg')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: `center ${scrollProgress * 100}%`
        }}
      />



      {}
      <div className="w-full flex justify-center mt-10 px-4 relative z-20">
        <div className="relative group">
          <div className="absolute inset-0 bg-[#295dab]/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
          <Image
            src="/logo_v2.png"
            alt="Baia Beach Cup Logo"
            width={200}
            height={200}
            className="relative rounded-full bg-white/10 p-3 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/10 w-44 h-44 sm:w-56 sm:h-56"
            priority
          />
        </div>
      </div>

      {}
      {mvpData.attivo && (
        <div className="w-full max-w-xl mx-auto mt-8 px-4 relative z-20 animate-fade-in">
          <div className="relative overflow-hidden bg-gradient-to-r from-[#295dab] to-[#1e3a8a] text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C3562B]/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="text-center sm:text-left relative z-10">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#C3562B] bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE VOTING
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight leading-none">{mvpData.titolo || "Vota l'MVP del Torneo"}</h3>
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-1">
                {userHasVoted ? "Grazie per aver espresso la tua preferenza!" : "Vota il tuo giocatore preferito del torneo"}
              </p>
            </div>

            <button 
              onClick={() => setIsMvpModalOpen(true)}
              className="relative z-10 px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md hover:scale-[1.05] active:scale-[0.95] cursor-pointer bg-[#C3562B] hover:bg-orange-600 text-white w-full sm:w-auto text-center font-bold"
            >
              {userHasVoted ? "Voto Registrato ✔️" : "Vota Ora 🗳️"}
            </button>
          </div>
        </div>
      )}

      {}
      <div className="w-full flex justify-center mt-6 relative z-20">
        <a
          href="https://www.instagram.com/baia_beach_cup/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.05] active:scale-[0.97]"
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          <span className="tracking-wider uppercase">Seguici su Instagram</span>
        </a>
      </div>

      {}
      {torneiLive.length > 0 && (
        <section className="pt-10 pb-6 px-4 sm:px-8 flex flex-col items-center justify-center text-center relative z-20 gap-6">
          {torneiLive.map((t, idx) => (
            <div
              key={idx}
              className="w-full max-w-xl rounded-[2.5rem] flex flex-col items-center justify-end border border-gray-200 shadow-2xl relative overflow-hidden group min-h-[380px] sm:min-h-[440px] p-8 sm:p-10"
              style={t.immagineRiquadro ? {} : { background: "#ffffff" }}
            >
              {}
              {t.immagineRiquadro && (
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ backgroundImage: `url('${t.immagineRiquadro}')` }}
                />
              )}
              
              {}
              {t.immagineRiquadro && (
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent transition-opacity duration-300 group-hover:opacity-90" />
              )}

              <div className="relative z-10 w-full flex justify-center">
                <a
                  href={`/gironi?tour=${encodeURIComponent(t.nome)}`}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-black text-xs text-[#295dab] bg-[#f2d022] hover:bg-yellow-400 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] uppercase tracking-widest w-full sm:w-auto"
                >
                  Guarda Gironi e Tabellone
                </a>
              </div>
            </div>
          ))}
        </section>
      )}

      {}
      {torneiConclusi.length > 0 && (
        <section className="px-4 sm:px-8 pb-24 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8 border-b-2 pb-4" style={{ borderColor: "#cbd5e1" }}>
            <span className="text-3xl"></span>
            <h3 className="text-2xl font-extrabold" style={{ color: "#295dab" }}>
              Tornei Conclusi
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {torneiConclusi.map((t, i) => (
              <div key={i} className="bg-white rounded-3xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden flex flex-col transition-all hover:-translate-y-2">
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                      Concluso
                    </span>
                    <span className="text-sm font-semibold text-gray-400">{t.data}</span>
                  </div>
                  <h4 className="text-2xl font-black mb-2 leading-tight" style={{ color: "#295dab" }}>{t.nome}</h4>
                  <div className="flex flex-col gap-2 mb-6">
                    <span className="text-sm font-bold text-gray-500 bg-gray-50 inline-block px-3 py-1 rounded-lg self-start">
                      {(t.categoria ? t.categoria.replace(/maschile 2x2/gi, "2x2") : "") || 'Categoria Libera'}
                    </span>
                    {t.location && (
                      <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5 pl-1">
                        📍 {t.location}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-6 border-t border-gray-100 text-center text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-50/50 rounded-xl py-3">
                    🏆 Torneo Concluso
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {}
      {displaySponsors.length > 0 && (
        <section className="w-full py-8 sm:py-10 mt-auto relative overflow-hidden">
          <div className="w-full text-center">
            <div className="mb-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-white/75 backdrop-blur-sm px-4 py-1.5 rounded-full inline-block border border-white/50 shadow-sm select-none">
                Powered by
              </span>
            </div>

            <div
              className="relative overflow-hidden w-full select-none animate-marquee-paused"
              style={{
                maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)"
              }}
            >
              <div className="animate-marquee flex items-center gap-6 sm:gap-8">
                {doubleSponsors.map((sp, idx) => (
                  <div
                    key={idx}
                    className="w-28 h-28 sm:w-36 sm:h-36 bg-white rounded-[1.8rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 flex items-center justify-center transition-all hover:scale-105 hover:shadow-[0_12px_40px_rgba(41,93,171,0.12)] active:scale-95 duration-300 shrink-0 p-4 sm:p-6"
                  >
                    {sp.linkUrl ? (
                      <a href={sp.linkUrl} target="_blank" rel="noopener noreferrer" title={sp.nome} className="w-full h-full flex items-center justify-center cursor-pointer">
                        <img
                          src={sp.logoUrl}
                          alt={sp.nome}
                          className="max-w-full max-h-full object-contain opacity-95 hover:opacity-100 transition-opacity duration-300"
                        />
                      </a>
                    ) : (
                      <img
                        src={sp.logoUrl}
                        alt={sp.nome}
                        title={sp.nome}
                        className="max-w-full max-h-full object-contain opacity-95 transition-opacity"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {}
      <MvpVotingModal 
        isOpen={isMvpModalOpen}
        onClose={() => setIsMvpModalOpen(false)}
        mvpData={mvpData}
        onVoteSuccess={(updatedData) => {
          setMvpData(updatedData);
          setUserHasVoted(true);
        }}
      />

      {}
      <footer className="w-full text-center py-6 mt-10 relative z-20">
        <a
          href="/staff"
          className="text-[10px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-900 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 transition-all"
        >
          Area Staff
        </a>
      </footer>

    </main>
  );
}
