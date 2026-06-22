"use client";

import { useState, useEffect } from "react";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getGironi } from "@/app/utils/db";
import { calculateSingleGroupStats, calculateUnifiedRanking } from "@/app/utils/ranking";

export default function StaffClassifiche() {
  const [torneiAttivi, setTorneiAttivi] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    getTornei().then(parsedTornei => {
      const attivi = parsedTornei.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione");
      setTorneiAttivi(attivi);
      
      const params = new URLSearchParams(window.location.search);
      const urlTour = params.get('tour');
      
      if (urlTour && attivi.some(t => t.nome === urlTour)) {
        setSelectedTorneo(urlTour);
      } else if (attivi.length > 0) {
        setSelectedTorneo(attivi[0].nome);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedTorneo) return;
    setIsLoaded(false);
    
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    getGironi(slug).then(data => {
      setConfig(data);
      setIsLoaded(true);
    });
  }, [selectedTorneo]);

  const sortGroupStats = (statsList) => {
    return [...statsList].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const quotientA = a.puntiSubiti === 0 ? a.puntiFatti : a.puntiFatti / a.puntiSubiti;
      const quotientB = b.puntiSubiti === 0 ? b.puntiFatti : b.puntiFatti / b.puntiSubiti;
      if (quotientB !== quotientA) return quotientB - quotientA;
      return b.puntiFatti - a.puntiFatti;
    });
  };

  const getColors = (color) => {
    switch (color) {
      case 'blue': return { main: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-100', light: 'bg-blue-50/50' };
      case 'red': return { main: 'bg-red-500', text: 'text-red-500', border: 'border-red-100', light: 'bg-red-50/50' };
      case 'yellow': return { main: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-100', light: 'bg-yellow-50/50' };
      case 'purple': return { main: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-100', light: 'bg-purple-50/50' };
      case 'green': return { main: 'bg-green-600', text: 'text-green-600', border: 'border-green-100', light: 'bg-green-50/50' };
      case 'orange': return { main: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-100', light: 'bg-orange-50/50' };
      case 'pink': return { main: 'bg-pink-500', text: 'text-pink-600', border: 'border-pink-100', light: 'bg-pink-50/50' };
      case 'cyan': return { main: 'bg-cyan-600', text: 'text-cyan-600', border: 'border-cyan-100', light: 'bg-cyan-50/50' };
      default: return { main: 'bg-gray-600', text: 'text-gray-600', border: 'border-gray-100', light: 'bg-gray-50/50' };
    }
  };

  const allGironi = [
    { id: 'A', colorClass: 'blue' },
    { id: 'B', colorClass: 'red' },
    { id: 'C', colorClass: 'yellow' },
    { id: 'D', colorClass: 'purple' },
    { id: 'E', colorClass: 'green' },
    { id: 'F', colorClass: 'orange' },
    { id: 'G', colorClass: 'pink' },
    { id: 'H', colorClass: 'cyan' },
    { id: 'I', colorClass: 'blue' },
    { id: 'J', colorClass: 'red' },
    { id: 'K', colorClass: 'yellow' },
    { id: 'L', colorClass: 'purple' },
  ];

  const hasConfig = config && config.numGironi;
  const isUnified = config?.rankingType === "avulsa";

  return (
    <main className="min-h-screen bg-[#f8faff] pb-20">
      <StaffHeader />

      <div className="max-w-[1200px] mx-auto px-4 mt-6 md:mt-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-[#295dab] uppercase tracking-tighter leading-none">Classifiche Staff 📊</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">
              Classifica avulsa e posizioni dei gironi
            </p>
          </div>
          <select 
            className="w-full md:w-64 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-[#295dab] text-sm shadow-xl cursor-pointer"
            value={selectedTorneo}
            onChange={(e) => setSelectedTorneo(e.target.value)}
          >
            {torneiAttivi.length > 0 ? torneiAttivi.map(t => (
              <option key={t.id} value={t.nome}>{t.nome}</option>
            )) : (
              <option>Nessun torneo attivo</option>
            )}
          </select>
        </div>

        {!isLoaded ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#295dab]"></div>
          </div>
        ) : !hasConfig ? (
          <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-gray-100 text-center space-y-3">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Gironi non ancora configurati</p>
            <p className="text-xs text-gray-300">
              Configura i gironi e assegna le squadre nella sezione "Gironi" per visualizzare le classifiche.
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Header info */}
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Tipo Classifica Attiva:</span>
                <span className="bg-green-100 text-green-700 text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border border-green-200">
                  {isUnified ? "Classifica Avulsa (Unica)" : "Classifiche Separate (Gironi)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Stato Pubblicazione:</span>
                <span className={`text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border ${
                  config.pubblicato 
                    ? "bg-green-100 text-green-700 border-green-200" 
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }`}>
                  {config.pubblicato ? "🟢 Pubblicato" : "🟡 Bozza"}
                </span>
              </div>
            </div>

            {/* Classification Rendering */}
            {isUnified ? (
              // 1. Unified standings (Avulsa)
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 pl-1 border-l-4 border-[#295dab] pl-2">
                  Classifica Avulsa (Generale)
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-[#295dab] uppercase tracking-wider border-b border-gray-100">
                        <th className="py-4 px-4 text-center w-12">#</th>
                        <th className="py-4 px-4">Squadra</th>
                        <th className="py-4 px-4 text-center w-12">Gir.</th>
                        <th className="py-4 px-4 text-center w-12">G</th>
                        <th className="py-4 px-4 text-center w-12">V</th>
                        <th className="py-4 px-4 text-center w-12">P</th>
                        <th className="py-4 px-4 text-center w-16">PF</th>
                        <th className="py-4 px-4 text-center w-16">PS</th>
                        <th className="py-4 px-4 text-center w-16">Diff.</th>
                        <th className="py-4 px-4 text-center w-20">Quoz.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {calculateUnifiedRanking(config).map((team, idx) => {
                        const isTop = idx === 0;
                        const diff = team.puntiFatti - team.puntiSubiti;
                        const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                        return (
                          <tr key={team.nome} className={`hover:bg-gray-50/50 transition-colors ${isTop ? 'bg-green-50/20' : ''}`}>
                            <td className="py-3.5 px-4 text-center font-black text-gray-400">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4 font-black text-[#295dab] max-w-[200px] truncate">
                              {team.nome}
                            </td>
                            <td className="py-3.5 px-4 text-center font-black text-gray-500">
                              {team.girone}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-700">{team.giocate}</td>
                            <td className="py-3.5 px-4 text-center font-black text-green-700">{team.vinte}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-red-500">{team.perse}</td>
                            <td className="py-3.5 px-4 text-center font-semibold text-gray-600">{team.puntiFatti}</td>
                            <td className="py-3.5 px-4 text-center font-semibold text-gray-600">{team.puntiSubiti}</td>
                            <td className={`py-3.5 px-4 text-center font-black ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="py-3.5 px-4 text-center font-black text-[#295dab]">{quotient}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // 2. Separate standings (Gironi)
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {allGironi.slice(0, config.numGironi).map((g) => {
                  const c = getColors(g.colorClass);
                  const rawStats = calculateSingleGroupStats(g.id, config);
                  const stats = sortGroupStats(rawStats);
                  
                  return (
                    <div key={g.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-md space-y-4">
                      <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                        <span className={`w-3.5 h-3.5 rounded-full ${c.main}`}></span>
                        <h3 className={`text-md font-black uppercase tracking-widest ${c.text}`}>
                          Girone {g.id}
                        </h3>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-50 shadow-inner">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50/70 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50">
                              <th className="py-3 px-3 text-center w-10">#</th>
                              <th className="py-3 px-3">Squadra</th>
                              <th className="py-3 px-3 text-center w-8">G</th>
                              <th className="py-3 px-3 text-center w-8">V</th>
                              <th className="py-3 px-3 text-center w-8">P</th>
                              <th className="py-3 px-3 text-center w-12">PF</th>
                              <th className="py-3 px-3 text-center w-12">PS</th>
                              <th className="py-3 px-3 text-center w-12">Quoz.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs">
                            {stats.map((team, idx) => {
                              const isTop = idx === 0;
                              const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                              return (
                                <tr key={team.nome} className={`hover:bg-gray-50/30 transition-colors ${isTop ? c.light : ''}`}>
                                  <td className="py-2.5 px-3 text-center font-black text-gray-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-[#295dab] truncate max-w-[150px]">
                                    {team.nome}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-gray-600">{team.giocate}</td>
                                  <td className="py-2.5 px-3 text-center font-black text-green-700">{team.vinte}</td>
                                  <td className="py-2.5 px-3 text-center font-semibold text-red-500">{team.perse}</td>
                                  <td className="py-2.5 px-3 text-center text-gray-500">{team.puntiFatti}</td>
                                  <td className="py-2.5 px-3 text-center text-gray-500">{team.puntiSubiti}</td>
                                  <td className="py-2.5 px-3 text-center font-black text-[#295dab]">{quotient}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
