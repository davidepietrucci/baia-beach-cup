"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getTornei } from "@/app/utils/db";

export default function Home() {
  const [torneiAperti, setTorneiAperti] = useState([]);
  const [torneiConclusi, setTorneiConclusi] = useState([]);

  useEffect(() => {
    // Leggi i tornei dal database per mostrarli in home
    getTornei().then(allTornei => {
      // Mostriamo i tornei che non sono conclusi, dando priorità a quelli "Iscrizioni Aperte"
      const aperti = allTornei.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione" || !t.stato);
      setTorneiAperti(aperti.slice(0, 6)); // Mostriamo un massimo di 6 tornei in home

      // Mostriamo i tornei conclusi
      const conclusi = allTornei.filter(t => t.stato === "Concluso");
      setTorneiConclusi(conclusi);
    });
  }, []);

  return (
    <main className="min-h-screen" style={{backgroundColor: "#f0f4ff"}}>
      
      {/* Header */}
      <header style={{backgroundColor: "#0a1628"}} className="text-white py-4 px-8 flex flex-col sm:flex-row justify-between items-center shadow-md gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="BVI Logo" width={50} height={50} className="rounded-full" />
          <h1 className="text-2xl font-bold" style={{color: "#FFD700"}}>BVI Tornei</h1>
        </div>
        <nav className="flex gap-6 items-center">
          <div className="flex gap-4">
            <a href="/atleta" className="hover:text-yellow-400 text-sm font-medium text-gray-300 transition-colors">Area Atleta</a>
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
              alt="BVI Logo" 
              width={160} 
              height={160} 
              className="object-contain relative drop-shadow-xl"
              priority
            />
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight" style={{color: "#0a1628"}}>
            #Live your passion
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 font-medium max-w-2xl leading-relaxed">
            Qui puoi iscriverti ai tornei attivi e guardare i risultati in diretta
          </p>
        </div>
      </section>

      {/* Sezione Tornei in Evidenza */}
      <section className="px-4 sm:px-8 pb-24 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b-2 pb-4" style={{borderColor: "#FFD700"}}>
          <span className="text-3xl">🔥</span>
          <h3 className="text-2xl font-extrabold" style={{color: "#0a1628"}}>
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
                    {t.stato === "In Programmazione" ? (
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Torneo Live
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Iscrizioni Aperte
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-400">{t.data}</span>
                  </div>
                  <h4 className="text-2xl font-black mb-2 leading-tight" style={{color: "#0a1628"}}>{t.nome}</h4>
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
                  {t.stato === "In Programmazione" ? (
                    <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        Torneo Live
                      </span>
                      <a href={`/gironi?tour=${encodeURIComponent(t.nome)}`} className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-[#0a1628] hover:bg-opacity-90 transition-colors shadow-sm text-center shrink-0">
                        🏆 Gironi
                      </a>
                    </div>
                  ) : (
                    <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                      {t.tipoIscrizione === "esterno" && t.googleFormUrl ? (
                        <a 
                          href={t.googleFormUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex-1 py-3 text-center rounded-xl font-bold text-sm text-[#0a1628] hover:bg-gray-50 transition-colors border-2" 
                          style={{borderColor: "#0a1628"}}
                        >
                          📋 Iscriviti
                        </a>
                      ) : (
                        <a 
                          href={`/iscrizioni?tour=${encodeURIComponent(t.nome)}`} 
                          className="flex-1 py-3 text-center rounded-xl font-bold text-sm text-[#0a1628] hover:bg-gray-50 transition-colors border-2" 
                          style={{borderColor: "#0a1628"}}
                        >
                          📋 Iscriviti
                        </a>
                      )}
                      <a href={`/gironi?tour=${encodeURIComponent(t.nome)}`} className="flex-1 py-3 text-center rounded-xl font-bold text-sm text-white bg-[#0a1628] hover:bg-opacity-90 transition-colors shadow-sm">
                        🏆 Gironi
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sezione Tornei Conclusi */}
      {torneiConclusi.length > 0 && (
        <section className="px-4 sm:px-8 pb-24 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8 border-b-2 pb-4" style={{borderColor: "#cbd5e1"}}>
            <span className="text-3xl">🏁</span>
            <h3 className="text-2xl font-extrabold" style={{color: "#0a1628"}}>
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
                  <h4 className="text-2xl font-black mb-2 leading-tight" style={{color: "#0a1628"}}>{t.nome}</h4>
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
                      className="block w-full py-3 text-center rounded-xl font-bold text-sm text-[#0a1628] bg-yellow-400 hover:bg-yellow-500 transition-colors shadow-md"
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

    </main>
  );
}
