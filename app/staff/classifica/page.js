"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getGironi, getBracket } from "@/app/utils/db";
import { calculateUnifiedRanking, getSchedule as getScheduleShared } from "@/app/utils/ranking";

const capitalizeWord = (word) => {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const capitalizeName = (nameStr) => {
  if (!nameStr) return "";
  return nameStr.split(/\s+/).map(capitalizeWord).join(" ");
};

const splitNames = (name) => {
  if (!name) return [""];
  let parts = [];
  if (name.includes(" & ")) {
    parts = name.split(" & ");
  } else if (name.includes(" / ")) {
    parts = name.split(" / ");
  } else if (name.includes(" - ")) {
    parts = name.split(" - ");
  } else if (name.includes("/")) {
    parts = name.split("/");
  } else {
    parts = [name];
  }
  return parts.map((p) => p.trim());
};

const formatPlayerName = (fullName) => {
  if (!fullName) return "";
  const cleanName = fullName.trim();
  if (!cleanName) return "";
  if (
    cleanName.toLowerCase().startsWith("slot") ||
    cleanName === "—" ||
    cleanName.toLowerCase().startsWith("vincente") ||
    cleanName.toLowerCase().startsWith("perdente") ||
    cleanName === "TBD"
  ) {
    return cleanName;
  }

  // Se contiene già un punto o l'ultima parte è una singola lettera, è già formattato
  const parts = cleanName.split(/\s+/);
  const lastPart = parts[parts.length - 1];
  if (cleanName.includes(".") || lastPart.length === 1 || (lastPart.length === 2 && lastPart.endsWith("."))) {
    if (lastPart.length === 1) {
      return cleanName + ".";
    }
    return cleanName;
  }

  if (parts.length < 2) return capitalizeName(cleanName);
  const firstName = parts[0];
  const surname = parts.slice(1).join(" ");
  const firstNameCap = capitalizeName(firstName);
  const surnameCap = capitalizeName(surname);
  const initial = firstNameCap.charAt(0).toUpperCase();
  return `${surnameCap} ${initial}.`;
};

function ClassificaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTour = searchParams.get("tour");

  const [tornei, setTornei] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [activeGirone, setActiveGirone] = useState("A");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);

  useEffect(() => {
    getTornei().then(parsed => {
      const attivi = parsed.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione" || t.stato === "Concluso");
      setTornei(attivi);
      
      if (urlTour && attivi.some(t => t.nome === urlTour)) {
        setSelectedTorneo(urlTour);
      } else if (attivi.length > 0) {
        setSelectedTorneo(attivi[0].nome);
      }
    });
  }, [urlTour]);

  useEffect(() => {
    if (!selectedTorneo) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    getGironi(slug).then(savedConfig => {
      setConfig(savedConfig);
    });
    getBracket(slug).then(data => {
      setBracketConfig(data);
    });
  }, [selectedTorneo]);

  const calculateRanking = () => {
    if (!config || !config.gironeAssignments || !config.gironeAssignments[activeGirone]) return [];
    const assignments = config.gironeAssignments[activeGirone];
    const teamCount = config.teamCounts[activeGirone] || 0;
    const metadata = config.matchMetadata || {};
    const isThreeSets = config.gironeSets?.[activeGirone] === "3 set";

    const stats = {};
    for (let i = 0; i < teamCount; i++) {
      const name = assignments[i];
      if (name && name !== "—" && name !== "Slot Libero") {
        stats[name] = { nome: name, giocate: 0, vinte: 0, perse: 0, setVinti: 0, setPersi: 0, puntiFatti: 0, puntiSubiti: 0, score: 0 };
      }
    }

    const getSchedule = (numTeams, gironeId, assignments = {}) => {
      return getScheduleShared(numTeams, gironeId, assignments, config?.gironeTypes, config?.gironeSets, config?.matchMetadata);
    };

    const schedule = getSchedule(teamCount, activeGirone, assignments);
    schedule.forEach((match, i) => {
        const meta = metadata[`${activeGirone}-${i}`];
        if (!meta) return;
        
        const teamL = match.left;
        const teamR = match.right;
        
        if (!stats[teamL] || !stats[teamR]) return;

        const s1L = parseInt(meta.s1L || 0), s1R = parseInt(meta.s1R || 0);
        const s2L = parseInt(meta.s2L || 0), s2R = parseInt(meta.s2R || 0);
        const s3L = parseInt(meta.s3L || 0), s3R = parseInt(meta.s3R || 0);

        if (s1L === 0 && s1R === 0) return;

        stats[teamL].giocate++; stats[teamR].giocate++;
        stats[teamL].puntiFatti += (s1L + s2L + s3L);
        stats[teamL].puntiSubiti += (s1R + s2R + s3R);
        stats[teamR].puntiFatti += (s1R + s2R + s3R);
        stats[teamR].puntiSubiti += (s1L + s2L + s3L);
        
        let matchWinL = 0;
        if (isThreeSets) {
            let setsL = 0, setsR = 0;
            if (s1L > s1R) setsL++; else if (s1R > s1L) setsR++;
            if (s2L > s2R) setsL++; else if (s2R > s2L) setsR++;
            if (s3L > s3R) setsL++; else if (s3R > s3L) setsR++;
            stats[teamL].setVinti += setsL; stats[teamL].setPersi += setsR;
            stats[teamR].setVinti += setsR; stats[teamR].setPersi += setsL;
            matchWinL = setsL > setsR ? 1 : 0;
        } else {
            stats[teamL].setVinti += (s1L > s1R ? 1 : 0);
            stats[teamL].setPersi += (s1R > s1L ? 1 : 0);
            stats[teamR].setVinti += (s1R > s1L ? 1 : 0);
            stats[teamR].setPersi += (s1L > s1R ? 1 : 0);
            matchWinL = s1L > s1R ? 1 : 0;
        }

        if (matchWinL) { stats[teamL].vinte++; stats[teamL].score++; stats[teamR].perse++; }
        else { stats[teamR].vinte++; stats[teamR].score++; stats[teamL].perse++; }
    });

    return Object.values(stats).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const qzTeamA = a.puntiSubiti === 0 ? a.puntiFatti : a.puntiFatti / a.puntiSubiti;
        const qzTeamB = b.puntiSubiti === 0 ? b.puntiFatti : b.puntiFatti / b.puntiSubiti;
        return qzTeamB - qzTeamA;
    });
  };

  const rankings = calculateRanking();
  const gironiDisponibili = config ? Array.from({ length: config.numGironi || 0 }, (_, i) => String.fromCharCode(65 + i)) : [];

  const selectedTorneoObj = tornei.find(t => t.nome === selectedTorneo);
  const isConcluso = selectedTorneoObj?.stato === "Concluso";

  const getWinnerOfMatch = (matchId) => {
    const assignments = bracketConfig?.bracketAssignments || {};
    const metadata = bracketConfig?.bracketMetadata || {};
    const meta = metadata[matchId] || {};
    const scoreL = parseInt(meta.scoreL || 0);
    const scoreR = parseInt(meta.scoreR || 0);
    if (scoreL === 0 && scoreR === 0) return null;
    return scoreL > scoreR ? assignments[`${matchId}-L`] : assignments[`${matchId}-R`];
  };

  const getLoserOfMatch = (matchId) => {
    const assignments = bracketConfig?.bracketAssignments || {};
    const metadata = bracketConfig?.bracketMetadata || {};
    const meta = metadata[matchId] || {};
    const scoreL = parseInt(meta.scoreL || 0);
    const scoreR = parseInt(meta.scoreR || 0);
    if (scoreL === 0 && scoreR === 0) return null;
    return scoreL > scoreR ? assignments[`${matchId}-R`] : assignments[`${matchId}-L`];
  };

  const renderFinalStandings = () => {
    const isGoldSilver = bracketConfig?.phaseType === "gold_silver";

    if (isGoldSilver) {
      const goldRank = [
        getWinnerOfMatch("gold-f1") || "Da determinare",
        getLoserOfMatch("gold-f1") || "Da determinare",
        getWinnerOfMatch("gold-f3") || "Da determinare",
        getLoserOfMatch("gold-f3") || "Da determinare",
      ];
      
      const silverRank = [
        getWinnerOfMatch("silver-f1") || "Da determinare",
        getLoserOfMatch("silver-f1") || "Da determinare",
        getWinnerOfMatch("silver-f3") || "Da determinare",
        getLoserOfMatch("silver-f3") || "Da determinare",
      ];
      
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* Gold Standings Card */}
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border-t-8 border-yellow-400">
            <h3 className="text-2xl font-black text-[#0D3D31] uppercase tracking-tighter mb-6 flex items-center gap-2">
              🏆 Classifica Finale GOLD
            </h3>
            <div className="space-y-4">
              {goldRank.map((team, idx) => {
                const colors = [
                  "bg-yellow-400 text-white shadow-sm", // 1st
                  "bg-gray-300 text-white shadow-sm", // 2nd
                  "bg-amber-600 text-white shadow-sm", // 3rd
                  "bg-gray-100 text-gray-400" // 4th
                ];
                const labels = ["1° Classificato", "2° Classificato", "3° Classificato", "4° Classificato"];
                return (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${colors[idx]}`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-black text-lg text-[#0D3D31]">{team}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{labels[idx]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Silver Standings Card */}
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border-t-8 border-gray-400">
            <h3 className="text-2xl font-black text-[#0D3D31] uppercase tracking-tighter mb-6 flex items-center gap-2">
              🥈 Classifica Finale SILVER
            </h3>
            <div className="space-y-4">
              {silverRank.map((team, idx) => {
                const colors = [
                  "bg-gray-400 text-white shadow-sm", // 1st
                  "bg-gray-300 text-white shadow-sm", // 2nd
                  "bg-amber-600 text-white shadow-sm", // 3rd
                  "bg-gray-100 text-gray-400" // 4th
                ];
                const labels = ["1° Silver", "2° Silver", "3° Silver", "4° Silver"];
                return (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${colors[idx]}`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-black text-lg text-[#0D3D31]">{team}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{labels[idx]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    } else {
      // Double Elimination Standings
      const doubleRank = [
        getWinnerOfMatch("grand-final") || "Da determinare",
        getLoserOfMatch("grand-final") || "Da determinare",
        getLoserOfMatch("lb-f") || "Da determinare",
        getLoserOfMatch("lb-s2") || "Da determinare",
      ];

      return (
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border-t-8 border-blue-600 max-w-2xl mx-auto mt-6">
          <h3 className="text-2xl font-black text-[#0D3D31] uppercase tracking-tighter mb-6 flex items-center gap-2 justify-center">
            🏆 Classifica Finale
          </h3>
          <div className="space-y-4">
            {doubleRank.map((team, idx) => {
              const colors = [
                "bg-yellow-400 text-white shadow-sm", // 1st
                "bg-gray-300 text-white shadow-sm", // 2nd
                "bg-amber-600 text-white shadow-sm", // 3rd
                "bg-gray-100 text-gray-400" // 4th
              ];
              const labels = ["1° Classificato", "2° Classificato", "3° Classificato", "4° Classificato"];
              return (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${colors[idx]}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-black text-lg text-[#0D3D31]">{team}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{labels[idx]}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <main className="min-h-screen pb-20 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h2 className="text-3xl md:text-5xl font-black text-[#0D3D31] uppercase tracking-tighter">Classifiche 📊</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Verifica PF/PS e Quoziente</p>
            </div>
            <select 
                className="w-full md:w-auto bg-white border-2 border-gray-100 rounded-2xl px-4 py-4 font-bold text-[#0D3D31] shadow-xl outline-none focus:border-[#0D3D31]"
                value={selectedTorneo}
                onChange={(e) => setSelectedTorneo(e.target.value)}
            >
                {tornei.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
            </select>
        </div>

        {isConcluso && (
          <div className="mb-10">
            {renderFinalStandings()}
          </div>
        )}

        {config && (config.rankingType || "avulsa") === "gironi" && (
          <div className="flex flex-wrap gap-2 mb-6">
            {gironiDisponibili.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGirone(g)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeGirone === g
                    ? "bg-[#0D3D31] text-white shadow-md"
                    : "bg-white text-gray-400 hover:text-[#0D3D31] border border-gray-100 shadow-sm"
                }`}
              >
                Girone {g}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
            <div className="overflow-x-auto no-scrollbar">
                {config && (config.rankingType || "avulsa") === "avulsa" ? (
                  <table className="w-full text-left min-w-[600px] md:min-w-0">
                      <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b bg-white">
                          <tr>
                              <th className="px-6 py-6">Pos</th>
                              <th className="px-6 py-6">Squadra</th>
                              <th className="px-4 py-6 text-center">Girone</th>
                              <th className="px-4 py-6 text-center">V</th>
                              <th className="px-4 py-6 text-center">PF</th>
                              <th className="px-4 py-6 text-center">PS</th>
                              <th className="px-6 py-6 text-right">Quoz.</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {calculateUnifiedRanking(config).map((team, idx) => {
                              const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                              const isGold = idx < 12;
                              return (
                                  <tr key={team.nome} className={`hover:bg-blue-50/20 transition-all ${isGold ? 'bg-yellow-50/30' : ''}`}>
                                      <td className="px-6 py-6">
                                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${isGold ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                              {idx + 1}
                                          </span>
                                      </td>
                                      <td className="px-6 py-6">
                                          <div className="leading-tight block font-black text-[#0D3D31] text-lg mb-1">
                                            {splitNames(team.nome).map(formatPlayerName).map((player, pIdx) => (
                                              <span key={pIdx} className="block truncate max-w-[200px]">
                                                {player}
                                              </span>
                                            ))}
                                          </div>
                                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                              {isGold ? "Qualificato Gold" : "Qualificato Silver"}
                                          </p>
                                      </td>
                                      <td className="px-4 py-6 text-center">
                                          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-blue-50 text-blue-600 border border-blue-100/50">
                                              Girone {team.girone}
                                          </span>
                                      </td>
                                      <td className="px-4 py-6 text-center font-black text-green-600">{team.vinte}</td>
                                      <td className="px-4 py-6 text-center font-bold text-gray-600">{team.puntiFatti}</td>
                                      <td className="px-4 py-6 text-center font-bold text-gray-400">{team.puntiSubiti}</td>
                                      <td className="px-6 py-6 text-right font-black text-[#0D3D31] font-mono">{quotient}</td>
                                  </tr>
                              );
                          })}
                          {(!config || calculateUnifiedRanking(config).length === 0) && (
                              <tr>
                                  <td colSpan="7" className="py-20 text-center text-gray-400 font-bold italic">
                                      Nessun dato disponibile. Inserisci i risultati nei gironi.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left min-w-[600px] md:min-w-0">
                      <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b bg-white">
                          <tr>
                              <th className="px-6 py-6">Pos</th>
                              <th className="px-6 py-6">Squadra</th>
                              <th className="px-4 py-6 text-center">V</th>
                              <th className="px-4 py-6 text-center">PF</th>
                              <th className="px-4 py-6 text-center">PS</th>
                              <th className="px-6 py-6 text-right">Quoz.</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {calculateRanking().map((team, idx) => {
                              const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                              const isQualified = idx < 2;
                              return (
                                  <tr key={team.nome} className={`hover:bg-blue-50/20 transition-all ${isQualified ? 'bg-yellow-50/30' : ''}`}>
                                      <td className="px-6 py-6">
                                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${isQualified ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                              {idx + 1}
                                          </span>
                                      </td>
                                      <td className="px-6 py-6">
                                          <div className="leading-tight block font-black text-[#0D3D31] text-lg mb-1">
                                            {splitNames(team.nome).map(formatPlayerName).map((player, pIdx) => (
                                              <span key={pIdx} className="block truncate max-w-[200px]">
                                                {player}
                                              </span>
                                            ))}
                                          </div>
                                      </td>
                                      <td className="px-4 py-6 text-center font-black text-green-600">{team.vinte}</td>
                                      <td className="px-4 py-6 text-center font-bold text-gray-600">{team.puntiFatti}</td>
                                      <td className="px-4 py-6 text-center font-bold text-gray-400">{team.puntiSubiti}</td>
                                      <td className="px-6 py-6 text-right font-black text-[#0D3D31] font-mono">{quotient}</td>
                                  </tr>
                              );
                          })}
                          {(!config || calculateRanking().length === 0) && (
                              <tr>
                                  <td colSpan="6" className="py-20 text-center text-gray-400 font-bold italic">
                                      Nessun dato disponibile. Inserisci i risultati nei gironi.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
                )}
            </div>
        </div>
      </div>
    </main>
  );
}

export default function StaffClassifica() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
      <ClassificaContent />
    </Suspense>
  );
}
