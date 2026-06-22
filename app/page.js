"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getTornei } from "@/app/utils/db";

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

  const displaySponsors = sponsors && sponsors.length > 0 ? sponsors : defaultTestSponsors;

  // Assicuriamoci che ci siano abbastanza elementi prima di duplicare per il marquee loop
  let baseSponsors = [...displaySponsors];
  while (baseSponsors.length < 10) {
    baseSponsors = [...baseSponsors, ...displaySponsors];
  }
  const doubleSponsors = [...baseSponsors, ...baseSponsors];

  useEffect(() => {
    // Leggi i tornei dal database per mostrarli in home
    getTornei().then(allTornei => {
      // Filtriamo i tornei in programmazione per la sezione live
      const live = allTornei.filter(t => t.stato === "In Programmazione");
      setTorneiLive(live);

      // Mostriamo i tornei conclusi
      const conclusi = allTornei.filter(t => t.stato === "Concluso");
      setTorneiConclusi(conclusi);
    });

    // Leggi le impostazioni del countdown
    fetch("/api/db?type=countdown")
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setCountdownData(json.data);
        }
      })
      .catch(err => console.error("Error fetching countdown:", err));

    // Leggi gli sponsor dal database
    fetch("/api/db?type=sponsors")
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setSponsors(json.data);
        }
      })
      .catch(err => console.error("Error fetching sponsors:", err));
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

    // Esegui dopo un piccolo ritardo per attendere il rendering del DOM e il calcolo delle altezze
    const timer = setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      clearTimeout(timer);
    };
  }, [torneiLive, torneiConclusi]);

  return (
    <main className="min-h-[140vh] flex flex-col relative">
      {/* Sfondo fisso con effetto parallasse mappato sullo scorrimento della pagina */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "linear-gradient(rgba(244, 247, 246, 0.90), rgba(244, 247, 246, 0.90)), url('/bg_main.jpg')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: `center ${scrollProgress * 100}%`
        }}
      />

      {/* Header */}
      <header
        style={{ backgroundImage: "linear-gradient(to right, #0D3D31, #581c87)" }}
        className="relative text-white py-5 px-8 flex flex-col sm:flex-row justify-center items-center shadow-lg gap-4"
      >
        <div className="flex items-center gap-3.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase">
            Baia Beach Cup
          </h1>
        </div>
        <nav className="sm:absolute sm:right-8 flex items-center">
          {countdownData.enabled && !timeLeft.expired ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-white/15 backdrop-blur-lg px-5 py-3 rounded-full border border-white/15 shadow-xl text-sm sm:text-base font-black">
              <span className="text-yellow-400 animate-pulse text-base sm:text-lg">⚡</span>
              <span className="text-gray-300 uppercase tracking-widest text-[10px] hidden lg:inline">
                {countdownData.label || "Inizio"}:
              </span>
              <span className="font-mono text-white tracking-wide flex items-center gap-1.5 sm:gap-2">
                <span>{timeLeft.days}<span className="text-yellow-300 text-xs sm:text-sm ml-0.5 font-bold">g</span></span>
                <span className="text-white/20 font-light">:</span>
                <span>{timeLeft.hours}<span className="text-yellow-300 text-xs sm:text-sm ml-0.5 font-bold">o</span></span>
                <span className="text-white/20 font-light">:</span>
                <span>{timeLeft.minutes}<span className="text-yellow-300 text-xs sm:text-sm ml-0.5 font-bold">m</span></span>
                <span className="text-white/20 font-light">:</span>
                <span className="text-red-400">{timeLeft.seconds}<span className="text-red-400/80 text-xs sm:text-sm ml-0.5 font-bold">s</span></span>
              </span>
            </div>
          ) : (
            <a
              href="/staff"
              className="text-xs font-black uppercase tracking-widest text-gray-200 hover:text-white transition-all bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-full border border-white/10 hover:border-white/30 hover:scale-[1.03] active:scale-[0.97]"
            >
              Area Staff
            </a>
          )}
        </nav>
      </header>

      {/* Logo Centrato (Al posto del vecchio countdown) */}
      <div className="w-full flex justify-center mt-10 px-4 relative z-20">
        <div className="relative group">
          <div className="absolute inset-0 bg-[#0d3d31]/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
          <Image
            src="/logo.png"
            alt="Baia Beach Cup Logo"
            width={200}
            height={200}
            className="relative rounded-full bg-white/10 p-3 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/10 w-44 h-44 sm:w-56 sm:h-56"
            priority
          />
        </div>
      </div>

      {/* Bottone Instagram (Subito sotto il countdown o l'header) */}
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

      {/* Hero Section / Live Event Center */}
      {torneiLive.length > 0 && (
        <section className="pt-10 pb-6 px-4 sm:px-8 flex flex-col items-center justify-center text-center relative z-20 gap-6">
          {torneiLive.map((t, idx) => (
            <div
              key={idx}
              style={{ backgroundImage: "linear-gradient(135deg, #0d3d31 0%, #1e1b4b 100%)" }}
              className="w-full max-w-xl rounded-[2.5rem] p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-6 border border-white/10 shadow-2xl ring-8 ring-white/5 relative overflow-hidden group"
            >
              {/* Glow effect */}
              <div className="absolute -inset-x-20 top-0 h-40 bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>

              <div className="relative z-10 flex flex-col items-center gap-4 w-full">
                <div className="w-full">
                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tight">
                    {t.nome}
                  </h3>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    <span className="text-[10px] font-black text-gray-200 bg-white/10 px-3 py-1 rounded-lg uppercase tracking-wider">
                      {t.categoria || 'Categoria Libera'}
                    </span>
                    <span className="text-[10px] font-black text-gray-200 bg-white/10 px-3 py-1 rounded-lg uppercase tracking-wider">
                      📅 {t.data}
                    </span>
                    {t.location && (
                      <span className="text-[10px] font-black text-gray-200 bg-white/10 px-3 py-1 rounded-lg uppercase tracking-wider">
                        📍 {t.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full mt-4">
                  <a
                    href={`/gironi?tour=${encodeURIComponent(t.nome)}`}
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-black text-xs text-[#0D3D31] bg-white hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] uppercase tracking-widest w-full sm:w-auto"
                  >
                    📊 Guarda Gironi e Tabellone
                  </a>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Sezione Tornei Conclusi */}
      {torneiConclusi.length > 0 && (
        <section className="px-4 sm:px-8 pb-24 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8 border-b-2 pb-4" style={{ borderColor: "#cbd5e1" }}>
            <span className="text-3xl">🏁</span>
            <h3 className="text-2xl font-extrabold" style={{ color: "#0D3D31" }}>
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
                  <h4 className="text-2xl font-black mb-2 leading-tight" style={{ color: "#0D3D31" }}>{t.nome}</h4>
                  <div className="flex flex-col gap-2 mb-6">
                    <span className="text-sm font-bold text-gray-500 bg-gray-50 inline-block px-3 py-1 rounded-lg self-start">
                      {t.categoria || 'Categoria Libera'}
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
      {/* Sezione Sponsor */}
      {displaySponsors.length > 0 && (
        <section className="w-full bg-white/70 backdrop-blur-md border-t border-gray-200/40 py-4 mt-auto relative overflow-hidden">
          <div className="w-full text-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Powered by</h3>

            <div
              className="relative overflow-hidden w-full select-none animate-marquee-paused"
              style={{
                maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)"
              }}
            >
              <div className="animate-marquee flex items-center gap-16">
                {doubleSponsors.map((sp, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center justify-center transition-all hover:scale-105 active:scale-95 duration-300 mx-4 shrink-0"
                  >
                    {sp.linkUrl ? (
                      <a href={sp.linkUrl} target="_blank" rel="noopener noreferrer" title={sp.nome} className="block cursor-pointer">
                        <img
                          src={sp.logoUrl}
                          alt={sp.nome}
                          className="h-8 sm:h-10 w-auto object-contain opacity-95 hover:opacity-100 transition-all duration-300"
                        />
                      </a>
                    ) : (
                      <img
                        src={sp.logoUrl}
                        alt={sp.nome}
                        title={sp.nome}
                        className="h-8 sm:h-10 w-auto object-contain opacity-95 hover:opacity-100 transition-all duration-300"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pb-1 text-center">
            <a href="/staff" className="text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-500 transition-colors">
              Area Staff 🔒
            </a>
          </div>
        </section>
      )}

    </main>
  );
}
