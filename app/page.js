"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getTornei } from "@/app/utils/db";

export default function Home() {
  const [torneiLive, setTorneiLive] = useState([]);
  const [torneiAperti, setTorneiAperti] = useState([]);
  const [torneiConclusi, setTorneiConclusi] = useState([]);

  useEffect(() => {
    // Leggi i tornei dal database per mostrarli in home
    getTornei().then(allTornei => {
      // Filtriamo i tornei in programmazione per la sezione live
      const live = allTornei.filter(t => t.stato === "In Programmazione");
      setTorneiLive(live);

      // Mostriamo i tornei che sono "Iscrizioni Aperte" (o non hanno stato impostato, escludendo conclusi/in programmazione)
      const aperti = allTornei.filter(t => t.stato === "Iscrizioni Aperte" || (!t.stato && t.stato !== "Concluso" && t.stato !== "In Programmazione"));
      setTorneiAperti(aperti.slice(0, 6)); // Mostriamo un massimo di 6 tornei in home

      // Mostriamo i tornei conclusi
      const conclusi = allTornei.filter(t => t.stato === "Concluso");
      setTorneiConclusi(conclusi);
    });
  }, []);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f4f7f6" }}>

      {/* Header */}
      <header style={{ backgroundColor: "#0D3D31" }} className="text-white py-4 px-8 flex flex-col sm:flex-row justify-between items-center shadow-md gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Baia Beach Cup Logo" width={50} height={50} className="rounded-full" />
          <h1 className="text-2xl font-bold" style={{ color: "#C3562B" }}>Baia Beach Cup</h1>
        </div>
        <nav className="flex gap-6 items-center">
          <div className="flex gap-4">
            {/* <a href="/atleta" className="hover:text-yellow-400 text-sm font-medium text-gray-300 transition-colors">Area Atleta</a> */}
            <a href="/staff" className="hover:text-yellow-400 text-sm font-medium text-gray-300 transition-colors">Area Staff</a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-8 flex justify-center text-center">
        <div className="max-w-3xl flex flex-col items-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 rounded-full"></div>
            <Image
              src="/logo.png"
              alt="Baia Beach Cup Logo"
              width={160}
              height={160}
              className="object-contain relative drop-shadow-xl"
              priority
            />
          </div>


          {torneiLive.length > 0 && (
            <div className="w-full max-w-xl bg-white rounded-3xl p-6 border-2 border-red-500/30 shadow-xl flex flex-col items-center gap-6 mt-2 ring-8 ring-red-500/5">
              <div className="flex items-center gap-2 px-3.5 py-1 bg-red-100 text-red-800 text-xs font-black rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Torneo in Corso 🔴
              </div>
              
              <div className="w-full flex flex-col gap-6 divide-y divide-gray-100">
                {torneiLive.map((t, idx) => (
                  <div key={idx} className={`w-full text-center flex flex-col items-center ${idx > 0 ? "pt-6" : ""}`}>
                    <h3 className="text-2xl sm:text-3xl font-black text-[#0D3D31] leading-tight mb-2">
                      {t.nome}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      <span className="text-xs font-bold text-gray-500 bg-gray-50 inline-block px-3 py-1 rounded-lg">
                        {t.categoria || 'Categoria Libera'}
                      </span>
                      <span className="text-xs font-bold text-gray-500 bg-gray-50 inline-block px-3 py-1 rounded-lg">
                        📅 {t.data}
                      </span>
                      {t.location && (
                        <span className="text-xs font-semibold text-gray-400 bg-gray-50 inline-block px-3 py-1 rounded-lg">
                          📍 {t.location}
                        </span>
                      )}
                    </div>
                    <a
                      href={`/gironi?tour=${encodeURIComponent(t.nome)}`}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-red-600 hover:bg-red-700 transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-center flex items-center justify-center gap-2"
                    >
                      🏆 SEGUI IN DIRETTA
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sezione Tornei in Evidenza */}
      <section className="px-4 sm:px-8 pb-24 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b-2 pb-4" style={{ borderColor: "#C3562B" }}>
          <span className="text-3xl">🔥</span>
          <h3 className="text-2xl font-extrabold" style={{ color: "#0D3D31" }}>
            Tornei in Evidenza
          </h3>
        </div>

        {torneiAperti.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-md text-center border border-gray-100 flex flex-col items-center">
            <span className="text-6xl mb-4">🏖️</span>
            <h4 className="text-xl font-bold text-gray-800 mb-2">Nessun torneo programmato</h4>
            <p className="text-gray-500 font-medium">Al momento non ci sono tornei aperti per l'iscrizione. Torna a trovarci presto per non perderti i prossimi eventi!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {torneiAperti.map((t, i) => (
              <div key={i} className="bg-white rounded-3xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden flex flex-col transition-all hover:-translate-y-2">
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                      Iscrizioni Aperte
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
                  <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                    {t.tipoIscrizione === "esterno" && t.googleFormUrl ? (
                      <a
                        href={t.googleFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 text-center rounded-xl font-bold text-sm text-[#0D3D31] hover:bg-gray-50 transition-colors border-2"
                        style={{ borderColor: "#0D3D31" }}
                      >
                        📋 Iscriviti
                      </a>
                    ) : (
                      <a
                        href={`/iscrizioni?tour=${encodeURIComponent(t.nome)}`}
                        className="flex-1 py-3 text-center rounded-xl font-bold text-sm text-[#0D3D31] hover:bg-gray-50 transition-colors border-2"
                        style={{ borderColor: "#0D3D31" }}
                      >
                        📋 Iscriviti
                      </a>
                    )}
                    <a href={`/gironi?tour=${encodeURIComponent(t.nome)}`} className="flex-1 py-3 text-center rounded-xl font-bold text-sm text-white bg-[#0D3D31] hover:bg-opacity-90 transition-colors shadow-sm">
                      🏆 Gironi
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
                  <div className="mt-auto pt-6 border-t border-gray-100">
                    <a
                      href={`/classifica?tour=${encodeURIComponent(t.nome)}`}
                      className="block w-full py-3 text-center rounded-xl font-bold text-sm text-[#0D3D31] bg-yellow-400 hover:bg-yellow-500 transition-colors shadow-md"
                    >
                      🏆 Vedi Classifica Finale
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* Footer */}
      <footer className="text-white py-8 px-8 mt-auto border-t-2" style={{ borderColor: "#C3562B", backgroundColor: "#0D3D31" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Baia Beach Cup Logo" width={40} height={40} className="rounded-full bg-white p-0.5" />
            <h4 className="text-lg font-bold" style={{ color: "#C3562B" }}>Baia Beach Cup</h4>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300 font-medium">Seguici su Instagram</span>
            <a
              href="https://www.instagram.com/beachvolleyinstitutebvi/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center bg-gradient-to-tr from-[#f9ce3f] via-[#e1306c] to-[#833ab4] p-2.5 rounded-xl shadow-lg border border-white/10"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </footer>

    </main>
  );
}
