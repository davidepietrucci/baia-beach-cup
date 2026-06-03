"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getGironi, getBracket, saveBracket } from "@/app/utils/db";

const getSchedule = (numTeams, gironeId, assignments = {}, gironeTypes = {}, gironeSets = {}, matchMetadata = {}) => {
  const getName = (idx) => assignments[idx] && assignments[idx] !== "—" && assignments[idx] !== "Slot Libero" ? assignments[idx] : `Slot ${idx + 1}`;
  const type = gironeTypes?.[gironeId] || "Pool";
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
      const meta = matchMetadata?.[`${gironeId}-${idx}`] || {};
      const s1L = parseInt(meta.s1L || 0);
      const s1R = parseInt(meta.s1R || 0);
      if (s1L === 0 && s1R === 0) return { winner: `Vincente G${idx + 1}`, loser: `Perdente G${idx + 1}` };
      
      if (gironeSets?.[gironeId] === "3 set") {
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
  return [];
};

function TabelloneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTour = searchParams.get("tour");

  const [torneiAttivi, setTorneiAttivi] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [phaseType, setPhaseType] = useState("gold_silver"); // "gold_silver" o "double"
  const [subPhaseType, setSubPhaseType] = useState("direct"); // "direct" o "playoff"
  const [bracketSize, setBracketSize] = useState(8); // 4, 8, 16
  const [bracketAssignments, setBracketAssignments] = useState({});
  const [bracketMetadata, setBracketMetadata] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [numGironi, setNumGironi] = useState(4);

  useEffect(() => {
    getTornei().then(parsed => {
      const attivi = parsed.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione");
      setTorneiAttivi(attivi);
      if (urlTour && attivi.some(t => t.nome === urlTour)) setSelectedTorneo(urlTour);
      else if (attivi.length > 0) setSelectedTorneo(attivi[0].nome);
    });
  }, [urlTour]);

  useEffect(() => {
    if (!selectedTorneo) return;
    setIsLoaded(false);
    
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    
    getGironi(slug).then(gConfig => {
      if (gConfig) {
        setNumGironi(gConfig.numGironi || 4);
      } else {
        setNumGironi(4);
      }
    });

    getBracket(slug).then(config => {
      if (config) {
        setPhaseType(config.phaseType || "gold_silver");
        setSubPhaseType(config.subPhaseType || "direct");
        setBracketSize(config.bracketSize || 8);
        setBracketAssignments(config.bracketAssignments || {});
        setBracketMetadata(config.bracketMetadata || {});
      } else {
        setPhaseType("gold_silver"); setSubPhaseType("direct"); setBracketSize(8); setBracketAssignments({}); setBracketMetadata({});
      }
      setIsLoaded(true);
    });
  }, [selectedTorneo]);

  // Auto-save whenever configurations change (after they have been fully loaded)
  useEffect(() => {
    if (!selectedTorneo || !isLoaded) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const config = { phaseType, subPhaseType, bracketSize, bracketAssignments, bracketMetadata };
    
    // Save to localStorage immediately
    localStorage.setItem(`bvi_bracket_v1_${slug}`, JSON.stringify(config));

    // Debounced save to cloud db
    const handler = setTimeout(() => {
      saveBracket(slug, config);
    }, 1000);

    return () => clearTimeout(handler);
  }, [phaseType, subPhaseType, bracketSize, bracketAssignments, bracketMetadata, selectedTorneo, isLoaded]);

  const getIntermediateRanking = (groupKey) => {
    const stats = {};
    const teams = [
      bracketAssignments[`${groupKey}-0`],
      bracketAssignments[`${groupKey}-1`],
      bracketAssignments[`${groupKey}-2`],
      bracketAssignments[`${groupKey}-3`]
    ];

    teams.forEach(t => {
      if (t && t !== "—" && t !== "Slot Libero") {
        stats[t] = { nome: t, punti: 0, pf: 0, ps: 0 };
      }
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
      const teamL = teams[pair[0]];
      const teamR = teams[pair[1]];
      if (!teamL || !teamR || !stats[teamL] || !stats[teamR]) return;

      const mKey = `${groupKey}-m${idx}`;
      const meta = bracketMetadata[mKey] || {};
      const s1L = parseInt(meta.scoreL || 0);
      const s1R = parseInt(meta.scoreR || 0);
      if (s1L === 0 && s1R === 0) return;

      stats[teamL].pf += s1L;
      stats[teamR].pf += s1R;
      stats[teamL].ps += s1R;
      stats[teamR].ps += s1L;

      if (s1L > s1R) {
        stats[teamL].punti++;
      } else {
        stats[teamR].punti++;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.punti !== a.punti) return b.punti - a.punti;
      const qzA = a.ps === 0 ? a.pf : a.pf / a.ps;
      const qzB = b.ps === 0 ? b.pf : b.pf / b.ps;
      return qzB - qzA;
    }).map(s => s.nome);
  };

  const getIntermediateGroupStats = (groupKey) => {
    const stats = {};
    const teams = [
      bracketAssignments[`${groupKey}-0`],
      bracketAssignments[`${groupKey}-1`],
      bracketAssignments[`${groupKey}-2`],
      bracketAssignments[`${groupKey}-3`]
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
      const teamL = bracketAssignments[`${groupKey}-${pair[0]}`];
      const teamR = bracketAssignments[`${groupKey}-${pair[1]}`];
      if (!teamL || !teamR || !stats[teamL] || !stats[teamR]) return;

      const mKey = `${groupKey}-m${idx}`;
      const meta = bracketMetadata[mKey] || {};
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

  useEffect(() => {
    if (!isLoaded) return;
    const newAssignments = { ...bracketAssignments };
    let changed = false;

    const resolveWinner = (matchId) => {
      const left = bracketAssignments[`${matchId}-L`];
      const right = bracketAssignments[`${matchId}-R`];

      // Se uno dei due lati è un Bye ("—") e l'altro ha una squadra reale/valida, avanza l'altra squadra
      if (left === "—" && right && right !== "—") return right;
      if (right === "—" && left && left !== "—") return left;

      const meta = bracketMetadata[matchId] || {};
      const scoreL = parseInt(meta.scoreL || 0);
      const scoreR = parseInt(meta.scoreR || 0);
      if (scoreL === 0 && scoreR === 0) return null;
      return scoreL > scoreR ? left : right;
    };

    const resolveLoser = (matchId) => {
      const left = bracketAssignments[`${matchId}-L`];
      const right = bracketAssignments[`${matchId}-R`];

      // Se uno dei due lati è un Bye ("—"), il perdente è "—"
      if (left === "—" && right && right !== "—") return "—";
      if (right === "—" && left && left !== "—") return "—";

      const meta = bracketMetadata[matchId] || {};
      const scoreL = parseInt(meta.scoreL || 0);
      const scoreR = parseInt(meta.scoreR || 0);
      if (scoreL === 0 && scoreR === 0) return null;
      return scoreL > scoreR ? right : left;
    };

    const update = (targetKey, value) => {
      if (value && newAssignments[targetKey] !== value) {
        newAssignments[targetKey] = value;
        changed = true;
      }
    };

    if (phaseType === "gold_silver" && subPhaseType === "direct") {
      ["gold", "silver"].forEach(p => {
          update(`${p}-s1-L`, resolveWinner(`${p}-q1`));
          update(`${p}-s1-R`, resolveWinner(`${p}-q2`));
          update(`${p}-s2-L`, resolveWinner(`${p}-q3`));
          update(`${p}-s2-R`, resolveWinner(`${p}-q4`));
          update(`${p}-f1-L`, resolveWinner(`${p}-s1`));
          update(`${p}-f1-R`, resolveWinner(`${p}-s2`));
          update(`${p}-f3-L`, resolveLoser(`${p}-s1`));
          update(`${p}-f3-R`, resolveLoser(`${p}-s2`));
      });
    }

    if (phaseType === "gold_silver" && subPhaseType === "groups") {
      const gA_rank = getIntermediateRanking("gold-A");
      const gB_rank = numGironi === 4 ? getIntermediateRanking("gold-B") : [];
      const sA_rank = getIntermediateRanking("silver-A");
      const sB_rank = numGironi === 4 ? getIntermediateRanking("silver-B") : [];

      const getRankedInt = (rankArr, pos, fallback) => rankArr?.[pos] || fallback;

      if (numGironi === 4) {
        // Gold Semis
        update("gold-s1-L", getRankedInt(gA_rank, 0, "1° Gold A"));
        update("gold-s1-R", getRankedInt(gB_rank, 1, "2° Gold B"));
        update("gold-s2-L", getRankedInt(gB_rank, 0, "1° Gold B"));
        update("gold-s2-R", getRankedInt(gA_rank, 1, "2° Gold A"));

        // Gold Finals
        update("gold-f1-L", resolveWinner("gold-s1"));
        update("gold-f1-R", resolveWinner("gold-s2"));
        update("gold-f3-L", resolveLoser("gold-s1"));
        update("gold-f3-R", resolveLoser("gold-s2"));

        // Silver Semis
        update("silver-s1-L", getRankedInt(sA_rank, 0, "1° Silver A"));
        update("silver-s1-R", getRankedInt(sB_rank, 1, "2° Silver B"));
        update("silver-s2-L", getRankedInt(sB_rank, 0, "1° Silver B"));
        update("silver-s2-R", getRankedInt(sA_rank, 1, "2° Silver A"));

        // Silver Finals
        update("silver-f1-L", resolveWinner("silver-s1"));
        update("silver-f1-R", resolveWinner("silver-s2"));
        update("silver-f3-L", resolveLoser("silver-s1"));
        update("silver-f3-R", resolveLoser("silver-s2"));
      } else {
        // numGironi === 2
        // Gold Finals
        update("gold-f1-L", getRankedInt(gA_rank, 0, "1° Gold"));
        update("gold-f1-R", getRankedInt(gA_rank, 1, "2° Gold"));
        update("gold-f3-L", getRankedInt(gA_rank, 2, "3° Gold"));
        update("gold-f3-R", getRankedInt(gA_rank, 3, "4° Gold"));

        // Silver Finals
        update("silver-f1-L", getRankedInt(sA_rank, 0, "1° Silver"));
        update("silver-f1-R", getRankedInt(sA_rank, 1, "2° Silver"));
        update("silver-f3-L", getRankedInt(sA_rank, 2, "3° Silver"));
        update("silver-f3-R", getRankedInt(sA_rank, 3, "4° Silver"));
      }
    }

    if (phaseType === "double") {
      update(`wb-s1-L`, resolveWinner(`wb-q1`)); update(`wb-s1-R`, resolveWinner(`wb-q2`));
      update(`wb-s2-L`, resolveWinner(`wb-q3`)); update(`wb-s2-R`, resolveWinner(`wb-q4`));
      update(`wb-f-L`, resolveWinner(`wb-s1`)); update(`wb-f-R`, resolveWinner(`wb-s2`));
      update(`lb-f-L`, resolveWinner(`lb-s1`)); update(`lb-f-R`, resolveWinner(`lb-s2`));
      update(`grand-final-L`, resolveWinner(`wb-f`));
      update(`grand-final-R`, resolveWinner(`lb-f`));
    }

    if (changed) setBracketAssignments(newAssignments);
  }, [bracketMetadata, bracketAssignments, isLoaded, phaseType, subPhaseType, numGironi]);

  const handleAutoFill = async () => {
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const gConfig = await getGironi(slug);
    if (!gConfig) { alert("Nessuna configurazione gironi!"); return; }
    const numGironi = gConfig.numGironi || 0;
    const newAssignments = { ...bracketAssignments };
    
    const getRanking = (gid) => {
        const teams = gConfig.gironeAssignments[gid] || {};
        const meta = gConfig.matchMetadata || {};
        const isThreeSets = gConfig.gironeSets?.[gid] === "3 set";
        const stats = {};
        for(let i=0; i<(gConfig.teamCounts[gid]||0); i++) {
            const n = teams[i]; if(n && n!=="—" && n!=="Slot Libero") stats[n] = { nome: n, punti: 0, pf: 0, ps: 0 };
        }
        
        const schedule = getSchedule(gConfig.teamCounts[gid] || 0, gid, teams, gConfig.gironeTypes, gConfig.gironeSets, gConfig.matchMetadata);
        schedule.forEach((match, i) => {
            const m = meta[`${gid}-${i}`];
            if (!m) return;
            const l = match.left;
            const r = match.right;
            if(!stats[l] || !stats[r]) return;
            const s1L = parseInt(m.s1L||0), s1R = parseInt(m.s1R||0);
            const s2L = parseInt(m.s2L||0), s2R = parseInt(m.s2R||0);
            const s3L = parseInt(m.s3L||0), s3R = parseInt(m.s3R||0);
            if(s1L===0 && s1R===0) return;
            stats[l].pf += (s1L + s2L + s3L);
            stats[r].pf += (s1R + s2R + s3R);
            stats[l].ps += (s1R + s2R + s3R);
            stats[r].ps += (s1L + s2L + s3L);
            
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
            if(matchWinL) stats[l].punti++; else stats[r].punti++;
        });

        return Object.values(stats).sort((a,b) => {
            if (b.punti !== a.punti) return b.punti - a.punti;
            const qzTeamA = a.ps === 0 ? a.pf : a.pf / a.ps;
            const qzTeamB = b.ps === 0 ? b.pf : b.pf / b.ps;
            return qzTeamB - qzTeamA;
        }).map(s=>s.nome);
    };

    const rankings = {};
    for(let i=0; i<numGironi; i++) { const gid = String.fromCharCode(65+i); rankings[gid] = getRanking(gid); }
    const getRanked = (gid, pos) => {
      const count = gConfig.teamCounts[gid] || 0;
      if (pos >= count) return "—";
      return rankings[gid]?.[pos] || `TBD ${pos+1}° ${gid}`;
    };

    if (phaseType === "gold_silver" && subPhaseType === "groups") {
      // Clean previous intermediate results to avoid stale data
      const cleanedMetadata = { ...bracketMetadata };
      Object.keys(cleanedMetadata).forEach(key => {
        if (key.startsWith("gold-") || key.startsWith("silver-")) {
          delete cleanedMetadata[key];
        }
      });
      setBracketMetadata(cleanedMetadata);

      if (numGironi === 2) {
        newAssignments['gold-A-0'] = getRanked('A', 0);
        newAssignments['gold-A-1'] = getRanked('B', 0);
        newAssignments['gold-A-2'] = getRanked('A', 1);
        newAssignments['gold-A-3'] = getRanked('B', 1);

        newAssignments['silver-A-0'] = getRanked('A', 2);
        newAssignments['silver-A-1'] = getRanked('B', 2);
        newAssignments['silver-A-2'] = getRanked('A', 3);
        newAssignments['silver-A-3'] = getRanked('B', 3);
      } else if (numGironi === 4) {
        newAssignments['gold-A-0'] = getRanked('A', 0);
        newAssignments['gold-A-1'] = getRanked('B', 1);
        newAssignments['gold-A-2'] = getRanked('C', 0);
        newAssignments['gold-A-3'] = getRanked('D', 1);

        newAssignments['gold-B-0'] = getRanked('B', 0);
        newAssignments['gold-B-1'] = getRanked('A', 1);
        newAssignments['gold-B-2'] = getRanked('D', 0);
        newAssignments['gold-B-3'] = getRanked('C', 1);

        newAssignments['silver-A-0'] = getRanked('A', 2);
        newAssignments['silver-A-1'] = getRanked('B', 3);
        newAssignments['silver-A-2'] = getRanked('C', 2);
        newAssignments['silver-A-3'] = getRanked('D', 3);

        newAssignments['silver-B-0'] = getRanked('B', 2);
        newAssignments['silver-B-1'] = getRanked('A', 3);
        newAssignments['silver-B-2'] = getRanked('D', 2);
        newAssignments['silver-B-3'] = getRanked('C', 3);
      }
    } else {
      if (numGironi === 2) {
          setBracketSize(4);
          const p = phaseType === "gold_silver" ? "gold" : "wb";
          newAssignments[`${p}-s1-L`] = getRanked('A', 0); newAssignments[`${p}-s1-R`] = getRanked('B', 1);
          newAssignments[`${p}-s2-L`] = getRanked('B', 0); newAssignments[`${p}-s2-R`] = getRanked('A', 1);
          if (phaseType === "gold_silver") {
              newAssignments['silver-s1-L'] = getRanked('A', 2); newAssignments['silver-s1-R'] = getRanked('B', 3);
              newAssignments['silver-s2-L'] = getRanked('B', 2); newAssignments['silver-s2-R'] = getRanked('A', 3);
          }
      } else if (numGironi === 4) {
          setBracketSize(8);
          const p = phaseType === "gold_silver" ? "gold" : "wb";
          newAssignments[`${p}-q1-L`] = getRanked('A', 0); newAssignments[`${p}-q1-R`] = getRanked('B', 1);
          newAssignments[`${p}-q2-L`] = getRanked('C', 0); newAssignments[`${p}-q2-R`] = getRanked('D', 1);
          newAssignments[`${p}-q3-L`] = getRanked('B', 0); newAssignments[`${p}-q3-R`] = getRanked('A', 1);
          newAssignments[`${p}-q4-L`] = getRanked('D', 0); newAssignments[`${p}-q4-R`] = getRanked('C', 1);
          if (phaseType === "gold_silver") {
              newAssignments['silver-q1-L'] = getRanked('A', 2); newAssignments['silver-q1-R'] = getRanked('B', 3);
              newAssignments['silver-q2-L'] = getRanked('C', 2); newAssignments['silver-q2-R'] = getRanked('D', 3);
              newAssignments['silver-q3-L'] = getRanked('B', 2); newAssignments['silver-q3-R'] = getRanked('A', 3);
              newAssignments['silver-q4-L'] = getRanked('D', 2); newAssignments['silver-q4-R'] = getRanked('C', 3);
          }
      }
    }

    setBracketAssignments(newAssignments);
    alert(`Tabellone generato! 🏆`);
  };

  const handleSave = async () => {
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const config = { phaseType, subPhaseType, bracketSize, bracketAssignments, bracketMetadata };
    localStorage.setItem(`bvi_bracket_v1_${slug}`, JSON.stringify(config));
    await saveBracket(slug, config);
    alert(`Salvataggio completato! 🏆`);
  };

  const handleMetadataChange = (matchId, field, value) => {
    setBracketMetadata(prev => ({ ...prev, [matchId]: { ...(prev[matchId] || {}), [field]: value } }));
  };

  const renderMatch = (matchId, label, color = "blue") => {
    const meta = bracketMetadata[matchId] || {};
    const borderClass = color === "gold" ? "hover:border-yellow-500" : color === "silver" ? "hover:border-gray-400" : "hover:border-blue-600";
    return (
      <div className={`bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm group ${borderClass} transition-all min-w-[200px]`}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
          <div className="flex gap-2">
            <input type="text" placeholder="Ora" value={meta.time || ""} onChange={(e) => handleMetadataChange(matchId, 'time', e.target.value)} className="w-12 text-[10px] border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none bg-white text-gray-900" />
            <input type="text" placeholder="C." value={meta.court || ""} onChange={(e) => handleMetadataChange(matchId, 'court', e.target.value)} className="w-8 text-[10px] border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none bg-white text-gray-900" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Team A" value={bracketAssignments[`${matchId}-L`] || ""} onChange={(e) => setBracketAssignments(p => ({...p, [`${matchId}-L`]: e.target.value}))} className="flex-1 text-xs font-bold border-b border-gray-100 outline-none py-1 bg-white text-gray-900" />
            <input type="text" placeholder="-" value={meta.scoreL || ""} onChange={(e) => handleMetadataChange(matchId, 'scoreL', e.target.value)} className="w-8 h-8 bg-gray-50 text-gray-900 rounded text-center text-xs font-black focus:bg-[#0a1628] focus:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Team B" value={bracketAssignments[`${matchId}-R`] || ""} onChange={(e) => setBracketAssignments(p => ({...p, [`${matchId}-R`]: e.target.value}))} className="flex-1 text-xs font-bold border-b border-gray-100 outline-none py-1 bg-white text-gray-900" />
            <input type="text" placeholder="-" value={meta.scoreR || ""} onChange={(e) => handleMetadataChange(matchId, 'scoreR', e.target.value)} className="w-8 h-8 bg-gray-50 text-gray-900 rounded text-center text-xs font-black focus:bg-[#0a1628] focus:text-white" />
          </div>
        </div>
      </div>
    );
  };

  const renderGroupMatch = (groupKey, matchIdx, label, teamL, teamR) => {
    const matchId = `${groupKey}-m${matchIdx}`;
    const meta = bracketMetadata[matchId] || {};
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:border-blue-400 transition-all min-w-[200px]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
          <div className="flex gap-2">
            <input type="text" placeholder="Ora" value={meta.time || ""} onChange={(e) => handleMetadataChange(matchId, 'time', e.target.value)} className="w-12 text-[10px] border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none bg-white text-gray-900" />
            <input type="text" placeholder="C." value={meta.court || ""} onChange={(e) => handleMetadataChange(matchId, 'court', e.target.value)} className="w-8 text-[10px] border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none bg-white text-gray-900" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs font-bold truncate text-[#0a1628]" title={teamL}>{teamL || "Slot Libero"}</span>
            <input type="text" placeholder="-" value={meta.scoreL || ""} onChange={(e) => handleMetadataChange(matchId, 'scoreL', e.target.value)} className="w-8 h-8 bg-gray-50 text-gray-900 rounded text-center text-xs font-black focus:bg-[#0a1628] focus:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs font-bold truncate text-[#0a1628]" title={teamR}>{teamR || "Slot Libero"}</span>
            <input type="text" placeholder="-" value={meta.scoreR || ""} onChange={(e) => handleMetadataChange(matchId, 'scoreR', e.target.value)} className="w-8 h-8 bg-gray-50 text-gray-900 rounded text-center text-xs font-black focus:bg-[#0a1628] focus:text-white" />
          </div>
        </div>
      </div>
    );
  };

  const renderIntermediateGroup = (groupKey, title, color) => {
    const stats = getIntermediateGroupStats(groupKey);
    const teams = [
      bracketAssignments[`${groupKey}-0`],
      bracketAssignments[`${groupKey}-1`],
      bracketAssignments[`${groupKey}-2`],
      bracketAssignments[`${groupKey}-3`]
    ];

    const matchPairs = [
      { l: 0, r: 3, label: "Gara 1" },
      { l: 1, r: 2, label: "Gara 2" },
      { l: 0, r: 2, label: "Gara 3" },
      { l: 1, r: 3, label: "Gara 4" },
      { l: 0, r: 1, label: "Gara 5" },
      { l: 2, r: 3, label: "Gara 6" }
    ];

    const titleColor = color === "gold" ? "text-yellow-600" : "text-gray-500";
    
    return (
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mb-12">
        <h3 className={`text-xl font-black uppercase mb-6 ${titleColor}`}>{title}</h3>
        
        {/* Standings Table */}
        <div className="overflow-x-auto mb-8 border border-gray-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Squadra</th>
                <th className="px-4 py-3 text-center">G</th>
                <th className="px-4 py-3 text-center">V / P</th>
                <th className="px-4 py-3 text-center">PF</th>
                <th className="px-4 py-3 text-center">PS</th>
                <th className="px-4 py-3 text-center">Quoz.</th>
                <th className="px-4 py-3 text-right">Punti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {stats.map((team, idx) => {
                const quotient = team.ps === 0 ? team.pf : (team.pf / team.ps).toFixed(3);
                return (
                  <tr key={team.nome} className="hover:bg-blue-50/20">
                    <td className="px-4 py-3">
                      <span className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-500 text-[10px] font-black">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{team.nome}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{team.giocate}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-green-600">{team.vinte}</span>
                      <span className="mx-1 text-gray-200">/</span>
                      <span className="text-red-500">{team.perse}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{team.pf}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{team.ps}</td>
                    <td className="px-4 py-3 text-center text-[#0a1628]">{quotient}</td>
                    <td className="px-4 py-3 text-right text-lg font-black text-[#0a1628]">{team.punti}</td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-400 italic">Nessuna squadra assegnata. Clicca su GENERA.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Matches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchPairs.map((pair, idx) => {
            const teamL = teams[pair.l];
            const teamR = teams[pair.r];
            if (!teamL || teamL === "—" || teamL === "Slot Libero" || !teamR || teamR === "—" || teamR === "Slot Libero") return null;
            return (
              <div key={idx}>
                {renderGroupMatch(groupKey, idx, pair.label, teamL, teamR)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFinalsForGroups = (p, title, color) => {
    return (
      <div className="mb-16">
        <h3 className={`text-xl font-black uppercase mb-6 ${color==='gold'?'text-yellow-600':'text-gray-500'}`}>{title}</h3>
        {numGironi === 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mb-10">
            <div><h4 className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Semifinale 1</h4>{renderMatch(`${p}-s1`,'SF1',color)}</div>
            <div><h4 className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Semifinale 2</h4>{renderMatch(`${p}-s2`,'SF2',color)}</div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl">
          <div><h4 className="text-[10px] font-black text-red-400 mb-2 uppercase tracking-widest">Finale 3°/4°</h4>{renderMatch(`${p}-f3`,'BRONZO',color)}</div>
          <div><h4 className="text-[10px] font-black text-yellow-500 mb-2 uppercase tracking-widest">Finale 1°/2°</h4>{renderMatch(`${p}-f1`,'ORO',color)}</div>
        </div>
      </div>
    );
  };

  const renderSection = (p, title, color) => (
    <div className="mb-16">
      <h3 className={`text-2xl font-black uppercase mb-8 ${color==='gold'?'text-yellow-600':color==='silver'?'text-gray-500':'text-blue-600'}`}>{title}</h3>
      {bracketSize===8 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 overflow-x-auto no-scrollbar">
          {renderMatch(`${p}-q1`,'M1',color)} {renderMatch(`${p}-q2`,'M2',color)} {renderMatch(`${p}-q3`,'M3',color)} {renderMatch(`${p}-q4`,'M4',color)}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mb-10">
        {renderMatch(`${p}-s1`,'S1',color)} {renderMatch(`${p}-s2`,'S2',color)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl">
        <div><h4 className="text-[10px] font-black text-red-400 mb-2 uppercase tracking-widest">Finale 3°/4°</h4>{renderMatch(`${p}-f3`,'BRONZO',color)}</div>
        <div><h4 className="text-[10px] font-black text-yellow-500 mb-2 uppercase tracking-widest">Finale 1°/2°</h4>{renderMatch(`${p}-f1`,'ORO',color)}</div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen pb-20 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-7xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
                <h2 className="text-3xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Tabellone ⚔️</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Progressione Automatica Vincitori</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select 
                    className="flex-1 md:flex-none bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-[#0a1628] text-sm shadow-xl"
                    value={selectedTorneo}
                    onChange={(e) => setSelectedTorneo(e.target.value)}
                >
                    {torneiAttivi.length > 0 ? torneiAttivi.map(t => (
                        <option key={t.id} value={t.nome}>{t.nome}</option>
                    )) : (
                        <option value="">Nessun torneo attivo</option>
                    )}
                </select>
                <select className="flex-1 md:flex-none bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-[#0a1628] text-sm shadow-xl" value={phaseType} onChange={e=>setPhaseType(e.target.value)}>
                    <option value="double">Doppia Elim.</option>
                    <option value="gold_silver">Gold & Silver</option>
                </select>
                {phaseType === "gold_silver" && (
                  <select className="flex-1 md:flex-none bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-[#0a1628] text-sm shadow-xl" value={subPhaseType} onChange={e=>setSubPhaseType(e.target.value)}>
                      <option value="direct">⚡ Eliminazione Diretta</option>
                      <option value="groups">🔄 Gironi Intermedi + Finali</option>
                  </select>
                )}
                <button onClick={handleAutoFill} disabled={!selectedTorneo} className="flex-1 md:flex-none bg-[#FFD700] text-[#0a1628] px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">🔄 GENERA</button>
                <button onClick={handleSave} disabled={!selectedTorneo} className="flex-1 md:flex-none bg-[#10B981] hover:bg-[#059669] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">💾 SALVA</button>
            </div>
        </div>

        {!isLoaded ? (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#0a1628] border-t-transparent rounded-full animate-spin"></div>
            </div>
        ) : torneiAttivi.length === 0 ? (
            <div className="bg-white p-12 md:p-24 rounded-[3.5rem] shadow-2xl border border-gray-100 text-center relative overflow-hidden mt-10">
                <div className="relative z-10">
                    <div className="text-9xl mb-10 inline-block">🏆</div>
                    <h3 className="text-3xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter mb-6">Nessun Torneo Attivo</h3>
                    <p className="text-gray-400 mb-12 max-w-lg mx-auto text-sm md:text-lg font-bold uppercase tracking-widest leading-relaxed">
                        Crea un nuovo torneo nella sezione gestione o imposta lo stato su "Iscrizioni Aperte" o "In Programmazione" per configurare il tabellone.
                    </p>
                </div>
            </div>
        ) : phaseType === "double" ? (
            <div className="space-y-16">
                {renderSection("wb", "Winners Bracket 🏆", "blue")}
                <div className="bg-gray-100/30 p-6 md:p-10 rounded-[2.5rem] border border-gray-100">{renderSection("lb", "Losers Bracket 🔄", "silver")}</div>
                <section className="bg-[#0a1628] p-8 md:p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full -mr-32 -mt-32"></div>
                    <h3 className="text-2xl md:text-4xl font-black text-[#FFD700] uppercase mb-8 text-center relative z-10 tracking-tighter">GRAND FINAL 👑</h3>
                    <div className="max-w-xl mx-auto relative z-10">{renderMatch('grand-final', 'Finalissima', 'gold')}</div>
                </section>
            </div>
        ) : subPhaseType === "groups" ? (
            <div className="space-y-16">
                <section>
                  <h2 className="text-2xl md:text-4xl font-black text-yellow-600 uppercase tracking-tighter mb-8">🏆 Gironi Intermedi GOLD</h2>
                  {renderIntermediateGroup("gold-A", "Girone Gold A", "gold")}
                  {numGironi === 4 && renderIntermediateGroup("gold-B", "Girone Gold B", "gold")}
                  {renderFinalsForGroups("gold", "Fasi Finali GOLD 🏆", "gold")}
                </section>

                <div className="border-t-4 border-dashed border-gray-200 my-16"></div>

                <section>
                  <h2 className="text-2xl md:text-4xl font-black text-gray-500 uppercase tracking-tighter mb-8">🥈 Gironi Intermedi SILVER</h2>
                  {renderIntermediateGroup("silver-A", "Girone Silver A", "silver")}
                  {numGironi === 4 && renderIntermediateGroup("silver-B", "Girone Silver B", "silver")}
                  {renderFinalsForGroups("silver", "Fasi Finali SILVER 🥈", "silver")}
                </section>
            </div>
        ) : (
            <div className="space-y-16">
                {renderSection("gold", "🏆 Tabellone GOLD (Eliminazione Diretta)", "gold")}
                <div className="border-t-4 border-dashed border-gray-100 my-10"></div>
                {renderSection("silver", "🥈 Tabellone SILVER (Eliminazione Diretta)", "silver")}
            </div>
        )}
      </div>
    </main>
  );
}
export default function StaffTabellone() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
      <TabelloneContent />
    </Suspense>
  );
}
