"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getGironi, getBracket } from "@/app/utils/db";

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
      const getName = (idx) => assignments[idx] && assignments[idx] !== "—" && assignments[idx] !== "Slot Libero" ? assignments[idx] : `Slot ${idx + 1}`;
      const type = config?.gironeTypes?.[gironeId] || "Pool";
      if (!numTeams || numTeams < 2) return [];

      if (type === "Girone all'italiana") {
        const rrMatches = [];
        for (let i = 0; i < numTeams; i++) {
          for (let j = i + 1; j < numTeams; j++) {
            rrMatches.push({ left: getName(i), right: getName(j) });
          }
        }
        return rrMatches;
      }

      if (numTeams === 2) return [{ left: getName(0), right: getName(1) }];
      if (numTeams === 3) return [
        { left: getName(0), right: getName(2) },
        { left: getName(1), right: getName(2) },
        { left: getName(0), right: getName(1) }
      ];
      if (numTeams === 4) {
        const getResult = (idx) => {
          const meta = config?.matchMetadata?.[`${gironeId}-${idx}`] || {};
          const s1L = parseInt(meta.s1L || 0);
          const s1R = parseInt(meta.s1R || 0);
          if (s1L === 0 && s1R === 0) return { winner: `Vincente G${idx + 1}`, loser: `Perdente G${idx + 1}` };
          
          if (config?.gironeSets?.[gironeId] === "3 set") {
            let winL = 0, winR = 0;
            if (s1L > s1R) winL++; else if (s1R > s1L) winR++;
            if (parseInt(meta.s2L || 0) > parseInt(meta.s2R || 0)) winL++; else if (parseInt(meta.s2R || 0) > parseInt(meta.s2L || 0)) winR++;
            if (parseInt(meta.s3L || 0) > parseInt(meta.s3R || 0)) winL++; else if (parseInt(meta.s3R || 0) > parseInt(meta.s3L || 0)) winR++;
            
            if (winL > winR) return { winner: idx === 0 ? getName(0) : getName(1), loser: idx === 0 ? getName(3) : getName(2) };
            return { winner: idx === 0 ? getName(3) : getName(2), loser: idx === 0 ? getName(0) : getName(1) };
          }

          if (s1L > s1R) return { winner: idx === 0 ? getName(0) : getName(1), loser: idx === 0 ? getName(3) : getName(2) };
          return { winner: idx === 0 ? getName(3) : getName(2), loser: idx === 0 ? getName(0) : getName(1) };
        };

        const g1 = getResult(0);
        const g2 = getResult(1);

        return [
          { left: getName(0), right: getName(3) },
          { left: getName(1), right: getName(2) },
          { left: g1.winner, right: g2.winner },
          { left: g1.loser, right: g2.loser }
        ];
      }
      if (numTeams === 5) return [
        { left: getName(0), right: getName(4) },
        { left: getName(1), right: getName(3) },
        { left: getName(2), right: getName(4) },
        { left: getName(0), right: getName(1) },
        { left: getName(2), right: getName(3) }
      ];
      return [];
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
            <h3 className="text-2xl font-black text-[#0a1628] uppercase tracking-tighter mb-6 flex items-center gap-2">
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
                        <p className="font-black text-lg text-[#0a1628]">{team}</p>
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
            <h3 className="text-2xl font-black text-[#0a1628] uppercase tracking-tighter mb-6 flex items-center gap-2">
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
                        <p className="font-black text-lg text-[#0a1628]">{team}</p>
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
          <h3 className="text-2xl font-black text-[#0a1628] uppercase tracking-tighter mb-6 flex items-center gap-2 justify-center">
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
                      <p className="font-black text-lg text-[#0a1628]">{team}</p>
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
                <h2 className="text-3xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter">Classifiche 📊</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Verifica PF/PS e Quoziente</p>
            </div>
            <select 
                className="w-full md:w-auto bg-white border-2 border-gray-100 rounded-2xl px-4 py-4 font-bold text-[#0a1628] shadow-xl outline-none focus:border-[#0a1628]"
                value={selectedTorneo}
                onChange={(e) => setSelectedTorneo(e.target.value)}
            >
                {tornei.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
            </select>
        </div>

        {isConcluso ? (
          renderFinalStandings()
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
              <div className="bg-gray-50/50 p-4 border-b flex gap-2 overflow-x-auto no-scrollbar">
                  {gironiDisponibili.map(g => (
                      <button
                          key={g}
                          onClick={() => setActiveGirone(g)}
                          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${activeGirone === g ? 'bg-[#0a1628] text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:text-gray-600'}`}
                      >
                          GIRONE {g}
                      </button>
                  ))}
              </div>

              <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[800px] md:min-w-0">
                      <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b bg-white">
                          <tr>
                              <th className="px-6 py-6">Pos</th>
                              <th className="px-6 py-6">Squadra</th>
                              <th className="px-4 py-6 text-center">G</th>
                              <th className="px-4 py-6 text-center">V / P</th>
                              <th className="px-4 py-6 text-center">PF</th>
                              <th className="px-4 py-6 text-center">PS</th>
                              <th className="px-4 py-6 text-center bg-gray-50/30">Quoz.</th>
                              <th className="px-6 py-6 text-right">Punti</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {rankings.map((team, idx) => {
                              const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                              return (
                                  <tr key={team.nome} className={`hover:bg-blue-50/20 transition-all ${idx < 2 ? 'bg-yellow-50/30' : ''}`}>
                                      <td className="px-6 py-6">
                                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${idx < 2 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                              {idx + 1}
                                          </span>
                                      </td>
                                      <td className="px-6 py-6">
                                          <p className="font-black text-[#0a1628] text-lg leading-none mb-1">{team.nome}</p>
                                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                              {idx < 2 ? "Qualificato Gold" : "Qualificato Silver"}
                                          </p>
                                      </td>
                                      <td className="px-4 py-6 text-center font-bold text-gray-400">{team.giocate}</td>
                                      <td className="px-4 py-6 text-center whitespace-nowrap">
                                          <span className="text-green-600 font-black">{team.vinte}</span>
                                          <span className="mx-1 text-gray-200">/</span>
                                          <span className="text-red-500 font-black">{team.perse}</span>
                                      </td>
                                      <td className="px-4 py-6 text-center font-bold text-gray-600">{team.puntiFatti}</td>
                                      <td className="px-4 py-6 text-center font-bold text-gray-400">{team.puntiSubiti}</td>
                                      <td className="px-4 py-6 text-center font-black text-[#0a1628] bg-gray-50/30">{quotient}</td>
                                      <td className="px-6 py-6 text-right">
                                          <span className="text-3xl font-black text-[#0a1628]">{team.score}</span>
                                      </td>
                                  </tr>
                              );
                          })}
                          {rankings.length === 0 && (
                              <tr>
                                  <td colSpan="8" className="py-20 text-center text-gray-400 font-bold italic">
                                      Nessun dato disponibile. Inserisci i risultati nei gironi.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
        )}
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
