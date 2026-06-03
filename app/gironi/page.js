"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getTornei, getGironi, getBracket } from "@/app/utils/db";

export default function GironiPubblici() {
  const [tornei, setTornei] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [activeGirone, setActiveGirone] = useState("A");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("iniziali"); // "iniziali", "intermedi", "finali"

  const getSlug = (nomeTorneo) => {
    if (!nomeTorneo) return "";
    return nomeTorneo.toLowerCase().trim().replace(/\s+/g, '_');
  };

  useEffect(() => {
    getTornei().then(parsed => {
      const attivi = parsed.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione");
      setTornei(attivi);
      if (attivi.length > 0) setSelectedTorneo(attivi[0].nome);
    });
  }, []);

  useEffect(() => {
    if (!selectedTorneo) return;
    setActiveTab("iniziali");
    const slug = getSlug(selectedTorneo);
    
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

  const gironiDisponibili = config ? Array.from({ length: config.numGironi || 0 }, (_, i) => String.fromCharCode(65 + i)) : [];

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

  const getAllBracketMatches = () => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const isGroups = bracketConfig.subPhaseType === "groups";

    const matchIds = Object.keys(assignments)
      .map(k => k.replace(/-L$|-R$/, ''))
      .filter((v, i, a) => a.indexOf(v) === i)
      .filter(mid => {
        if (isGroups) {
          return mid.endsWith("-s1") || mid.endsWith("-s2") || mid.endsWith("-f1") || mid.endsWith("-f3");
        }
        return !mid.includes("-A-") && !mid.includes("-B-") && !mid.match(/-(?:A|B)-\d/) && !mid.match(/-(?:A|B)-m\d/);
      });

    return matchIds.map(mid => ({
        id: mid, label: mid.toUpperCase(), left: assignments[`${mid}-L`], right: assignments[`${mid}-R`],
        scoreL: metadata[mid]?.scoreL, scoreR: metadata[mid]?.scoreR, time: metadata[mid]?.time, court: metadata[mid]?.court
    }));
  };

  const getIntermediateGroupStats = (groupKey) => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const stats = {};
    const teams = [
      assignments[`${groupKey}-0`],
      assignments[`${groupKey}-1`],
      assignments[`${groupKey}-2`],
      assignments[`${groupKey}-3`]
    ].filter(t => t && t !== "—" && t !== "Slot Libero");

    teams.forEach(t => {
      stats[t] = { nome: t, giocate: 0, vinte: 0, perse: 0, pf: 0, ps: 0, punti: 0 };
    });

    const pairMaps = [
      [0, 3],
      [1, 2],
      [0, 2],
      [1, 3],
      [0, 1],
      [2, 3]
    ];

    pairMaps.forEach((pair, idx) => {
      const teamL = assignments[`${groupKey}-${pair[0]}`];
      const teamR = assignments[`${groupKey}-${pair[1]}`];
      if (!teamL || !teamR || !stats[teamL] || !stats[teamR]) return;

      const mKey = `${groupKey}-m${idx}`;
      const meta = metadata[mKey] || {};
      const s1L = parseInt(meta.scoreL || 0);
      const s1R = parseInt(meta.scoreR || 0);
      if (s1L === 0 && s1R === 0) return;

      stats[teamL].giocate++;
      stats[teamR].giocate++;
      stats[teamL].pf += s1L;
      stats[teamR].pf += s1R;
      stats[teamL].ps += s1R;
      stats[teamR].ps += s1L;

      if (s1L > s1R) {
        stats[teamL].vinte++;
        stats[teamL].punti++;
        stats[teamR].perse++;
      } else {
        stats[teamR].vinte++;
        stats[teamR].punti++;
        stats[teamL].perse++;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.punti !== a.punti) return b.punti - a.punti;
      const qzA = a.ps === 0 ? a.pf : a.pf / a.ps;
      const qzB = b.ps === 0 ? b.pf : b.pf / b.ps;
      return qzB - qzA;
    });
  };

  const getIntermediateGroupMatches = (groupKey) => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const teams = [
      assignments[`${groupKey}-0`],
      assignments[`${groupKey}-1`],
      assignments[`${groupKey}-2`],
      assignments[`${groupKey}-3`]
    ];

    const matchPairs = [
      { l: 0, r: 3, label: "Gara 1" },
      { l: 1, r: 2, label: "Gara 2" },
      { l: 0, r: 2, label: "Gara 3" },
      { l: 1, r: 3, label: "Gara 4" },
      { l: 0, r: 1, label: "Gara 5" },
      { l: 2, r: 3, label: "Gara 6" }
    ];

    return matchPairs
      .map((pair, idx) => {
        const teamL = teams[pair.l];
        const teamR = teams[pair.r];
        const mKey = `${groupKey}-m${idx}`;
        return {
          label: pair.label,
          left: teamL,
          right: teamR,
          meta: metadata[mKey] || {}
        };
      })
      .filter(m => m.left && m.left !== "—" && m.left !== "Slot Libero" && m.right && m.right !== "—" && m.right !== "Slot Libero");
  };

  const renderIntermediateGroupForSpectator = (groupKey, title, color) => {
    const stats = getIntermediateGroupStats(groupKey);
    const matches = getIntermediateGroupMatches(groupKey);
    const titleColor = color === "gold" ? "text-yellow-600" : "text-gray-500";
    const badgeColor = color === "gold" ? "bg-yellow-400 text-white shadow-sm" : "bg-gray-400 text-white shadow-sm";
    
    return (
      <div className="space-y-6 mb-12">
        <h3 className={`text-lg font-black uppercase tracking-tighter text-center ${titleColor}`}>{title}</h3>
        
        {/* Card-based Standings */}
        <div className="space-y-3">
          {stats.map((team, idx) => {
            const quotient = team.ps === 0 ? team.pf : (team.pf / team.ps).toFixed(3);
            const isQualified = idx < 2;
            return (
              <div key={team.nome} className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between ${isQualified ? (color === "gold" ? 'border-l-4 border-l-yellow-400' : 'border-l-4 border-l-gray-400') : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isQualified ? badgeColor : 'bg-gray-100 text-gray-500'}`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#0a1628] text-sm truncate uppercase tracking-tight">{team.nome}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      G: <span className="text-[#0a1628] font-bold">{team.giocate}</span> | 
                      V/P: <span className="text-green-600 font-bold">{team.vinte}</span>/<span className="text-red-500 font-bold">{team.perse}</span> | 
                      Quoz: <span className="text-blue-600 font-bold">{quotient}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-[#0a1628] tracking-tighter leading-none">{team.punti}</p>
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">Punti</p>
                </div>
              </div>
            );
          })}
          {stats.length === 0 && (
            <p className="text-center text-gray-400 italic text-xs py-4">In attesa dei risultati del primo turno.</p>
          )}
        </div>

        {/* Stacked Matches List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {matches.map((m, idx) => {
            const hasScore = m.meta?.scoreL || m.meta?.scoreR;
            const scoreL = parseInt(m.meta?.scoreL || 0);
            const scoreR = parseInt(m.meta?.scoreR || 0);
            const isWinnerL = hasScore && scoreL > scoreR;
            const isWinnerR = hasScore && scoreR > scoreL;

            return (
              <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                  <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{m.label}</span>
                  <div className="flex gap-1.5">
                    {m.meta?.time && <span className="text-[9px] font-black text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{m.meta.time}</span>}
                    {m.meta?.court && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">C.{m.meta.court}</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerL ? 'text-[#0a1628] font-black' : 'text-gray-500'}`}>{m.left || "Slot Libero"}</span>
                    <span className={`text-sm font-black ${isWinnerL ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? scoreL : "-"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerR ? 'text-[#0a1628] font-black' : 'text-gray-500'}`}>{m.right || "Slot Libero"}</span>
                    <span className={`text-sm font-black ${isWinnerR ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? scoreR : "-"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
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
        stats[name] = { nome: name, giocate: 0, vinte: 0, perse: 0, puntiFatti: 0, puntiSubiti: 0, score: 0 };
      }
    }

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

  const renderInitialStandingsTable = () => {
    const rankings = calculateRanking();
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-8 text-left">
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <h3 className="text-sm font-black text-[#0a1628] uppercase tracking-wider">Classifica Girone {activeGirone}</h3>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[320px]">
            <thead className="bg-gray-50/20 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-4 py-3 w-10">Pos</th>
                <th className="px-2 py-3">Squadra</th>
                <th className="px-2 py-3 text-center w-8">G</th>
                <th className="px-2 py-3 text-center w-14">V/P</th>
                <th className="px-2 py-3 text-center w-12">PF</th>
                <th className="px-2 py-3 text-center w-12">PS</th>
                <th className="px-2 py-3 text-center w-16">Quoz.</th>
                <th className="px-4 py-3 text-right w-16">Punti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-bold">
              {rankings.map((team, idx) => {
                const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                return (
                  <tr key={team.nome} className={`hover:bg-blue-50/20 transition-all ${idx < 2 ? 'bg-yellow-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${idx < 2 ? 'bg-yellow-400 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-900 truncate max-w-[120px]">{team.nome}</td>
                    <td className="px-2 py-3 text-center text-gray-400">{team.giocate}</td>
                    <td className="px-2 py-3 text-center whitespace-nowrap">
                      <span className="text-green-600">{team.vinte}</span>
                      <span className="text-gray-200 mx-0.5">/</span>
                      <span className="text-red-500">{team.perse}</span>
                    </td>
                    <td className="px-2 py-3 text-center text-gray-600">{team.puntiFatti}</td>
                    <td className="px-2 py-3 text-center text-gray-400">{team.puntiSubiti}</td>
                    <td className="px-2 py-3 text-center text-[#0a1628]">{quotient}</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-[#0a1628]">{team.score}</td>
                  </tr>
                );
              })}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-400 italic">Nessun dato disponibile.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  const schedule = config ? getSchedule(config.teamCounts[activeGirone], activeGirone, config.gironeAssignments[activeGirone] || {}) : [];
  const bracketMatches = getAllBracketMatches();
  const matchMetadata = config?.matchMetadata || {};
  const gironeSets = config?.gironeSets || {};

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Navbar Semplice */}
      <header style={{backgroundColor: "#0a1628"}} className="text-white py-4 px-6 flex justify-between items-center shadow-md border-b-2 border-[#FFD700]">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="BVI Logo" width={40} height={40} />
          <h1 className="text-xl font-bold tracking-tight">BVI Tornei</h1>
        </div>
        <a href="/" className="text-sm font-bold bg-[#FFD700] text-[#0a1628] px-4 py-1.5 rounded-full hover:bg-yellow-500">HOME</a>
      </header>

      <div className="max-w-4xl mx-auto mt-8 px-4">
        {/* Header Sezione */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Torneo Attivo
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter">{selectedTorneo || "Nessun Torneo"}</h2>
          <p className="text-gray-500 font-bold mt-2 uppercase text-xs tracking-[0.3em]">Gironi & Calendario</p>
        </div>

        {config ? (
          <>
            {/* Phase Navigation Tabs */}
            {bracketConfig && (
              <div className="flex bg-gray-200/60 p-1.5 rounded-2xl mb-8 max-w-md mx-auto border border-gray-200">
                <button
                  onClick={() => setActiveTab("iniziali")}
                  className={`flex-1 py-3 text-center rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all ${activeTab === "iniziali" ? 'bg-[#0a1628] text-white shadow-md' : 'text-gray-500 hover:text-[#0a1628]'}`}
                >
                  Gironi Iniziali 📋
                </button>
                {bracketConfig.phaseType === "gold_silver" && bracketConfig.subPhaseType === "groups" && (
                  <button
                    onClick={() => setActiveTab("intermedi")}
                    className={`flex-1 py-3 text-center rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all ${activeTab === "intermedi" ? 'bg-[#0a1628] text-white shadow-md' : 'text-gray-500 hover:text-[#0a1628]'}`}
                  >
                    Gironi Intermedi 🏆
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("finali")}
                  className={`flex-1 py-3 text-center rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all ${activeTab === "finali" ? 'bg-[#0a1628] text-white shadow-md' : 'text-gray-500 hover:text-[#0a1628]'}`}
                >
                  Fasi Finali ⚔️
                </button>
              </div>
            )}

            {/* Gironi Iniziali */}
            {activeTab === "iniziali" && (
              <>
                {/* Tab Gironi */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 justify-center no-scrollbar">
                  {gironiDisponibili.map(g => (
                    <button
                      key={g}
                      onClick={() => setActiveGirone(g)}
                      className={`px-5 py-2.5 rounded-xl font-black transition-all text-xs ${
                        activeGirone === g 
                        ? 'bg-[#0a1628] text-white shadow-lg' 
                        : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      GIRONE {g}
                    </button>
                  ))}
                </div>

                {/* Classifica Girone */}
                {renderInitialStandingsTable()}

                {/* Info Girone */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6 flex justify-around text-center text-xs">
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Modalità</p>
                        <p className="font-bold text-[#0a1628] mt-0.5">{config.gironeTypes[activeGirone]}</p>
                    </div>
                    <div className="border-x border-gray-100 px-6 sm:px-8">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Formula</p>
                        <p className="font-bold text-[#0a1628] mt-0.5">{config.gironeSets[activeGirone]}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Squadre</p>
                        <p className="font-bold text-[#0a1628] mt-0.5">{config.teamCounts[activeGirone]}</p>
                    </div>
                </div>

                {/* Schedule */}
                <div className="space-y-4 text-left">
                  {schedule.length > 0 ? schedule.map((match, idx) => {
                    const meta = matchMetadata[`${activeGirone}-${idx}`] || {};
                    const hasScore = meta.s1L || meta.s1R;
                    
                    const s1L = parseInt(meta.s1L || 0);
                    const s1R = parseInt(meta.s1R || 0);
                    const s2L = parseInt(meta.s2L || 0);
                    const s2R = parseInt(meta.s2R || 0);
                    const s3L = parseInt(meta.s3L || 0);
                    const s3R = parseInt(meta.s3R || 0);

                    // Determine winner based on sets or 1 set
                    let isWinnerL = false;
                    let isWinnerR = false;
                    if (hasScore) {
                      if (gironeSets[activeGirone] === "3 set") {
                        let winL = 0, winR = 0;
                        if (s1L > s1R) winL++; else if (s1R > s1L) winR++;
                        if (s2L > s2R) winL++; else if (s2R > s2L) winR++;
                        if (s3L > s3R) winL++; else if (s3R > s3L) winR++;
                        isWinnerL = winL > winR;
                        isWinnerR = winR > winL;
                      } else {
                        isWinnerL = s1L > s1R;
                        isWinnerR = s1R > s1L;
                      }
                    }

                    return (
                      <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Partita {idx + 1}</span>
                          <div className="flex gap-1.5">
                            {meta.time && <span className="text-[9px] font-black text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{meta.time}</span>}
                            {meta.court && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">C.{meta.court}</span>}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Team Left */}
                          <div className="flex justify-between items-center">
                            <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerL ? 'text-[#0a1628] font-black' : 'text-gray-500'}`}>{match.left}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-black ${isWinnerL ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? s1L : "-"}</span>
                              {gironeSets[activeGirone] === "3 set" && hasScore && (
                                <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-1 rounded">({s2L}, {s3L})</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Team Right */}
                          <div className="flex justify-between items-center">
                            <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerR ? 'text-[#0a1628] font-black' : 'text-gray-500'}`}>{match.right}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-black ${isWinnerR ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? s1R : "-"}</span>
                              {gironeSets[activeGirone] === "3 set" && hasScore && (
                                <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-1 rounded">({s2R}, {s3R})</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold italic text-xs">Nessuna partita schedulata per questo girone.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Gironi Intermedi */}
            {activeTab === "intermedi" && bracketConfig && bracketConfig.phaseType === "gold_silver" && bracketConfig.subPhaseType === "groups" && (
              <div className="space-y-12 text-left">
                <div>
                  <h2 className="text-xl font-black text-yellow-600 uppercase tracking-tighter mb-6 text-center">🏆 Gironi Intermedi GOLD</h2>
                  {renderIntermediateGroupForSpectator("gold-A", "Girone Gold A", "gold")}
                  {config?.numGironi === 4 && renderIntermediateGroupForSpectator("gold-B", "Girone Gold B", "gold")}
                </div>
                
                <div className="border-t border-dashed border-gray-200 my-10"></div>
                
                <div>
                  <h2 className="text-xl font-black text-gray-500 uppercase tracking-tighter mb-6 text-center">🥈 Gironi Intermedi SILVER</h2>
                  {renderIntermediateGroupForSpectator("silver-A", "Girone Silver A", "silver")}
                  {config?.numGironi === 4 && renderIntermediateGroupForSpectator("silver-B", "Girone Silver B", "silver")}
                </div>
              </div>
            )}

            {/* Fasi Finali */}
            {activeTab === "finali" && bracketConfig && (
              <div className="space-y-6 text-left">
                {bracketMatches.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {bracketMatches.map((m, idx) => {
                      const scoreL = parseInt(m.scoreL || 0);
                      const scoreR = parseInt(m.scoreR || 0);
                      const hasScore = m.scoreL || m.scoreR;
                      const isWinnerL = hasScore && scoreL > scoreR;
                      const isWinnerR = hasScore && scoreR > scoreL;

                      return (
                        <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                          <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{m.label}</span>
                            <div className="flex gap-1.5">
                              {m.time && <span className="text-[9px] font-black text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{m.time}</span>}
                              {m.court && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">C.{m.court}</span>}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerL ? 'text-[#0a1628] font-black' : 'text-gray-500'}`}>{m.left || "TBD"}</span>
                              <span className={`text-sm font-black ${isWinnerL ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? scoreL : "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerR ? 'text-[#0a1628] font-black' : 'text-gray-500'}`}>{m.right || "TBD"}</span>
                              <span className={`text-sm font-black ${isWinnerR ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? scoreR : "-"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold italic text-xs">Tabellone non ancora generato per questo torneo.</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm">
            <p className="text-gray-400 font-bold italic">Configurazione non disponibile per questo torneo.</p>
          </div>
        )}
      </div>
    </main>
  );
}
