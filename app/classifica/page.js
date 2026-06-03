"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getTornei, getGironi, getBracket } from "@/app/utils/db";

export default function ClassificaPubblica() {
  const [tornei, setTornei] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [activeGirone, setActiveGirone] = useState("A");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTornei().then(parsed => {
      setTornei(parsed);
      if (parsed.length > 0) setSelectedTorneo(parsed[0].nome);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedTorneo) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    
    const fetchLive = () => {
      getGironi(slug).then(data => {
        setConfig(data);
      });
      getBracket(slug).then(data => {
        setBracketConfig(data);
      });
    };

    fetchLive();
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
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
            matchWinL = setsL > setsR ? 1 : 0;
        } else {
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
    const fontStack = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

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
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border-t-8 border-blue-600 max-w-2xl mx-auto">
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
    <main className="min-h-screen bg-gray-50 pb-20 text-[#0a1628]">
      <header style={{backgroundColor: "#0a1628"}} className="text-white py-6 px-8 flex justify-between items-center shadow-lg border-b-4 border-[#FFD700]">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="BVI Logo" width={50} height={50} />
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Classifica Live</h1>
            <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-[0.3em]">Real-time Rankings</p>
          </div>
        </div>
        <a href="/" className="bg-[#FFD700] text-[#0a1628] px-6 py-2 rounded-full font-black text-sm hover:scale-105 transition-transform">HOME</a>
      </header>

      <div className="max-w-6xl mx-auto mt-10 px-4">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <select className="bg-transparent text-2xl font-black focus:outline-none"
                    value={selectedTorneo} onChange={(e) => setSelectedTorneo(e.target.value)}>
                    {tornei.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                </select>
            </div>
            {!isConcluso && (
              <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
                  {gironiDisponibili.map(g => (
                      <button key={g} onClick={() => setActiveGirone(g)}
                          className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeGirone === g ? 'bg-[#0a1628] text-white shadow-md' : 'text-gray-400 hover:text-[#0a1628]'}`}>
                          GIRONE {g}
                      </button>
                  ))}
              </div>
            )}
        </div>

        {isConcluso ? (
          renderFinalStandings()
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pos</th>
                        <th className="px-4 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Squadra</th>
                        <th className="px-4 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">G</th>
                        <th className="px-4 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">V/P</th>
                        <th className="px-4 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">PF</th>
                        <th className="px-4 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">PS</th>
                        <th className="px-4 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quoz.</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Punti</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {rankings.map((team, idx) => {
                        const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                        return (
                            <tr key={team.nome} className={`hover:bg-blue-50/30 transition-colors ${idx < 2 ? 'bg-yellow-50/20' : ''}`}>
                                <td className="px-8 py-6">
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-4 py-6">
                                    <p className="font-bold text-lg">{team.nome}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase">{idx < 2 ? "Qualificata Gold" : "Qualificata Silver"}</p>
                                </td>
                                <td className="px-4 py-6 text-center font-bold text-gray-500">{team.giocate}</td>
                                <td className="px-4 py-6 text-center font-black">
                                    <span className="text-green-600">{team.vinte}</span>
                                    <span className="mx-1 text-gray-200">/</span>
                                    <span className="text-red-500">{team.perse}</span>
                                </td>
                                <td className="px-4 py-6 text-center font-bold text-gray-600">{team.puntiFatti}</td>
                                <td className="px-4 py-6 text-center font-bold text-gray-400">{team.puntiSubiti}</td>
                                <td className="px-4 py-6 text-center font-black text-[#0a1628] bg-gray-50/30">{quotient}</td>
                                <td className="px-8 py-6 text-right">
                                    <span className="text-2xl font-black text-[#0a1628]">{team.score}</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
