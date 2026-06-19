"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import AthleteBottomNav from "@/app/components/AthleteBottomNav";
import { getTornei, getGironi, getBracket } from "@/app/utils/db";
import { getSchedule as getScheduleShared } from "@/app/utils/ranking";

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

export default function AtletaGironi() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [torneiAttivi, setTorneiAttivi] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("iniziali");
  const [activeGirone, setActiveGirone] = useState("A");

  const nomeAtleta = session?.user?.name || "Davide P.";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta"); return;
    }

    if (status === "authenticated") {
      getTornei().then(parsed => {
        setTorneiAttivi(parsed);
        
        const params = new URLSearchParams(window.location.search);
        const urlTour = params.get("tour");
        
        if (urlTour && parsed.some(t => t.nome === urlTour)) {
          setSelectedTorneo(urlTour);
        } else {
          const attivi = parsed.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione");
          if (attivi.length > 0) {
            setSelectedTorneo(attivi[0].nome);
          } else if (parsed.length > 0) {
            setSelectedTorneo(parsed[0].nome);
          }
        }
      });
    }
  }, [router, status]);

  useEffect(() => {
    if (!selectedTorneo) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    
    const fetchLive = () => {
      getGironi(slug).then(parsed => {
        if (parsed) {
          setConfig(parsed);
          const gDisponibili = parsed.numGironi ? Array.from({ length: parsed.numGironi }, (_, i) => String.fromCharCode(65 + i)) : [];
          setActiveGirone(prev => {
            if (gDisponibili.length > 0 && !gDisponibili.includes(prev)) {
              return gDisponibili[0];
            }
            return prev;
          });
        } else {
          setConfig(null);
        }
      });

      getBracket(slug).then(bSaved => {
        if (bSaved) setBracketConfig(bSaved); else setBracketConfig(null);
      });
    };

    fetchLive();
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
  }, [selectedTorneo]);

  const getSchedule = (numTeams, gironeId, assignments = {}) => {
    return getScheduleShared(numTeams, gironeId, assignments, config?.gironeTypes, config?.gironeSets, config?.matchMetadata);
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
      <div className="space-y-3 mb-8">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Classifica Girone {activeGirone}</h3>
        {rankings.map((team, idx) => {
          const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
          const isQualified = idx < 2;
          const highlight = isMe(team.nome);
          return (
            <div key={team.nome} className={`bg-white rounded-2xl p-4 shadow-sm border ${highlight ? 'border-[#C3562B] ring-4 ring-[#C3562B]/5' : 'border-gray-100'} flex items-center justify-between transition-all hover:scale-[1.01] ${isQualified ? (highlight ? 'border-l-4 border-l-[#C3562B]' : 'border-l-4 border-l-yellow-400') : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isQualified ? 'bg-yellow-400 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-[#0D3D31] text-sm truncate uppercase tracking-tight">
                    {team.nome}
                    {highlight && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C3562B] ml-1.5"></span>}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5 whitespace-nowrap">
                    G: <span className="text-[#0D3D31] font-bold">{team.giocate}</span> | 
                    V/P: <span className="text-green-600 font-bold">{team.vinte}</span>/<span className="text-red-500 font-bold">{team.perse}</span> | 
                    Quoz: <span className="text-blue-600 font-bold">{quotient}</span>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-[#0D3D31] tracking-tighter leading-none">{team.score}</p>
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">Punti</p>
              </div>
            </div>
          );
        })}
        {rankings.length === 0 && (
          <p className="text-center text-gray-400 italic text-xs py-4">In attesa dei risultati di questo girone.</p>
        )}
      </div>
    );
  };

  const getAllBracketMatches = () => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const isGroups = bracketConfig?.subPhaseType === "groups";

    const isMatchCompleted = (matchId) => {
      const left = assignments[`${matchId}-L`];
      const right = assignments[`${matchId}-R`];
      if (!left && !right) return false;
      if (left === "—" || right === "—") return true;
      if (!left || !right || left.startsWith("TBD") || right.startsWith("TBD")) return false;
      if (left === "Slot Libero" || right === "Slot Libero") return false;
      const meta = metadata[matchId] || {};
      return meta.scoreL !== undefined && meta.scoreL !== "" && meta.scoreR !== undefined && meta.scoreR !== "";
    };

    const isRoundCompleted = (matchIds) => {
      return matchIds.every(id => isMatchCompleted(id));
    };

    const getRoundRobinPairs = (numTeams) => {
      if (!numTeams || numTeams < 2) return [];
      const pairs = [];
      for (let i = 0; i < numTeams; i++) {
        for (let j = i + 1; j < numTeams; j++) {
          pairs.push({ l: i, r: j });
        }
      }
      return pairs;
    };

    const areIntermediateGroupsCompleted = (prefix, numGroups, teamsPerGroup) => {
      for (let g = 0; g < numGroups; g++) {
        const letter = String.fromCharCode(65 + g);
        const groupKey = `${prefix}-${letter}`;
        const numTeams = teamsPerGroup || 4;
        const pairs = getRoundRobinPairs(numTeams);
        for (let m = 0; m < pairs.length; m++) {
          const pair = pairs[m];
          const teamL = assignments[`${groupKey}-${pair.l}`];
          const teamR = assignments[`${groupKey}-${pair.r}`];
          if (!teamL || teamL === "—" || teamL === "Slot Libero" || !teamR || teamR === "—" || teamR === "Slot Libero") {
            continue;
          }
          const matchId = `${groupKey}-m${m}`;
          const meta = metadata[matchId] || {};
          const hasScore = meta.scoreL !== undefined && meta.scoreL !== "" && meta.scoreR !== undefined && meta.scoreR !== "";
          if (!hasScore) return false;
        }
      }
      return true;
    };

    // Filtra quali ID partita sono attualmente visibili
    const visibleMatchIds = [];
    if (bracketConfig.phaseType === "gold_silver") {
      if (isGroups) {
        // --- GROUPS FLOW ---
        let goldSlots = 0;
        let silverSlots = 0;
        if (config && config.numGironi) {
          for (let i = 0; i < config.numGironi; i++) {
            const gid = String.fromCharCode(65 + i);
            const count = config.teamCounts?.[gid] || 0;
            goldSlots += Math.min(2, count);
            silverSlots += Math.min(2, Math.max(0, count - 2));
          }
        }
        const autoNumGoldGironi = goldSlots > 4 ? 2 : 1;
        const autoNumSilverGironi = silverSlots > 4 ? 2 : 1;

        const numGoldGironi = bracketConfig.numGoldGironi !== undefined && bracketConfig.numGoldGironi !== 0 ? bracketConfig.numGoldGironi : autoNumGoldGironi;
        const numSilverGironi = bracketConfig.numSilverGironi !== undefined && bracketConfig.numSilverGironi !== 0 ? bracketConfig.numSilverGironi : autoNumSilverGironi;
        const teamsPerGoldGirone = bracketConfig.teamsPerGoldGirone || 4;
        const teamsPerSilverGirone = bracketConfig.teamsPerSilverGirone || 4;

        const goldGroupsDone = areIntermediateGroupsCompleted("gold", numGoldGironi, teamsPerGoldGirone);
        const goldSemifinalsDone = isRoundCompleted(["gold-s1", "gold-s2"]);

        const silverGroupsDone = areIntermediateGroupsCompleted("silver", numSilverGironi, teamsPerSilverGirone);
        const silverSemifinalsDone = isRoundCompleted(["silver-s1", "silver-s2"]);

        if (goldGroupsDone) visibleMatchIds.push("gold-s1", "gold-s2");
        if (goldGroupsDone && goldSemifinalsDone) visibleMatchIds.push("gold-f3", "gold-f1");
        if (silverGroupsDone) visibleMatchIds.push("silver-s1", "silver-s2");
        if (silverGroupsDone && silverSemifinalsDone) visibleMatchIds.push("silver-f3", "silver-f1");
      } else {
        const tToGold = bracketConfig.teamsToGold || 8;
        const tToSilver = bracketConfig.teamsToSilver || 8;

        // Gold
        const goldOttavi = tToGold === 16 
          ? ["gold-o1", "gold-o2", "gold-o3", "gold-o4", "gold-o5", "gold-o6", "gold-o7", "gold-o8"]
          : tToGold === 12 
          ? ["gold-o1", "gold-o2", "gold-o3", "gold-o4"]
          : [];
        const goldQuarti = ["gold-q1", "gold-q2", "gold-q3", "gold-q4"];
        const goldSemifinali = ["gold-s1", "gold-s2"];
        const goldFinali = ["gold-f3", "gold-f1"];

        const goldOttaviDone = goldOttavi.length === 0 || isRoundCompleted(goldOttavi);
        const goldQuartiDone = isRoundCompleted(goldQuarti);
        const goldSemifinaliDone = isRoundCompleted(goldSemifinali);

        if (tToGold === 12 || tToGold === 16) visibleMatchIds.push(...goldOttavi);
        if (tToGold >= 8 && goldOttaviDone) visibleMatchIds.push(...goldQuarti);
        if (tToGold === 4 || (tToGold >= 8 && goldOttaviDone && goldQuartiDone)) visibleMatchIds.push(...goldSemifinali);
        if ((tToGold === 4 && goldSemifinaliDone) || (tToGold >= 8 && goldOttaviDone && goldQuartiDone && goldSemifinaliDone)) visibleMatchIds.push(...goldFinali);

        // Silver
        const silverOttavi = tToSilver === 16 
          ? ["silver-o1", "silver-o2", "silver-o3", "silver-o4", "silver-o5", "silver-o6", "silver-o7", "silver-o8"]
          : tToSilver === 12 
          ? ["silver-o1", "silver-o2", "silver-o3", "silver-o4"]
          : [];
        const silverQuarti = ["silver-q1", "silver-q2", "silver-q3", "silver-q4"];
        const silverSemifinali = ["silver-s1", "silver-s2"];
        const silverFinali = ["silver-f3", "silver-f1"];

        const silverOttaviDone = silverOttavi.length === 0 || isRoundCompleted(silverOttavi);
        const silverQuartiDone = isRoundCompleted(silverQuarti);
        const silverSemifinaliDone = isRoundCompleted(silverSemifinali);

        if (tToSilver === 12 || tToSilver === 16) visibleMatchIds.push(...silverOttavi);
        if (tToSilver >= 8 && silverOttaviDone) visibleMatchIds.push(...silverQuarti);
        if (tToSilver === 4 || (tToSilver >= 8 && silverOttaviDone && silverQuartiDone)) visibleMatchIds.push(...silverSemifinali);
        if ((tToSilver === 4 && silverSemifinaliDone) || (tToSilver >= 8 && silverOttaviDone && silverQuartiDone && silverSemifinaliDone)) visibleMatchIds.push(...silverFinali);
      }
    } else {
      // Doppia Eliminazione
      const wbQuarti = ["wb-q1", "wb-q2", "wb-q3", "wb-q4"];
      const wbSemifinali = ["wb-s1", "wb-s2"];
      const wbFinale = ["wb-f"];
      const lbSemifinali = ["lb-s1", "lb-s2"];
      const lbFinale = ["lb-f"];

      const wbQuartiDone = bracketConfig.bracketSize !== 8 || isRoundCompleted(wbQuarti);
      const wbSemifinaliDone = isRoundCompleted(wbSemifinali);
      const wbFinaleDone = isRoundCompleted(wbFinale);
      const lbSemifinaliDone = isRoundCompleted(lbSemifinali);
      const lbFinaleDone = isRoundCompleted(lbFinale);

      if (bracketConfig.bracketSize === 8) visibleMatchIds.push(...wbQuarti);
      if (wbQuartiDone) visibleMatchIds.push(...wbSemifinali);
      if (wbQuartiDone && wbSemifinaliDone) {
        visibleMatchIds.push(...wbFinale);
        visibleMatchIds.push(...lbSemifinali);
      }
      if (wbQuartiDone && wbSemifinaliDone && lbSemifinaliDone) visibleMatchIds.push(...lbFinale);
      if (wbQuartiDone && wbSemifinaliDone && lbSemifinaliDone && wbFinaleDone && lbFinaleDone) visibleMatchIds.push("grand-final");
    }

    const getSortOrder = (id) => {
      const parts = id.split('-');
      const round = parts[parts.length - 1]; // o1, q1, s1, f1, f3
      let weight = 0;
      if (round.startsWith('o')) weight = 10 + parseInt(round.slice(1));
      else if (round.startsWith('q')) weight = 20 + parseInt(round.slice(1));
      else if (round.startsWith('s')) weight = 30 + parseInt(round.slice(1));
      else if (round === 'f3') weight = 40;
      else if (round === 'f1') weight = 50;
      else weight = 60;

      if (id.startsWith('gold')) weight += 0;
      else if (id.startsWith('silver')) weight += 100;
      else if (id.startsWith('wb')) weight += 200;
      else if (id.startsWith('lb')) weight += 300;
      return weight;
    };

    return visibleMatchIds
      .filter(mid => assignments[`${mid}-L`] !== undefined || assignments[`${mid}-R`] !== undefined)
      .sort((a, b) => getSortOrder(a) - getSortOrder(b))
      .map(mid => ({
        id: mid, label: mid.toUpperCase(), left: assignments[`${mid}-L`], right: assignments[`${mid}-R`],
        scoreL: metadata[mid]?.scoreL, scoreR: metadata[mid]?.scoreR, time: metadata[mid]?.time, court: metadata[mid]?.court,
        s1L: metadata[mid]?.s1L, s1R: metadata[mid]?.s1R,
        s2L: metadata[mid]?.s2L, s2R: metadata[mid]?.s2R,
        s3L: metadata[mid]?.s3L, s3R: metadata[mid]?.s3R,
      }));
  };

  const getIntermediateGroupStats = (groupKey) => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const stats = {};

    const isGold = groupKey.startsWith("gold");
    const numTeams = isGold 
      ? (bracketConfig.teamsPerGoldGirone || 4) 
      : (bracketConfig.teamsPerSilverGirone || 4);

    const teams = [];
    for (let i = 0; i < numTeams; i++) {
      const t = assignments[`${groupKey}-${i}`];
      if (t && t !== "—" && t !== "Slot Libero") {
        teams.push(t);
      }
    }

    teams.forEach(t => {
      stats[t] = { nome: t, giocate: 0, vinte: 0, perse: 0, pf: 0, ps: 0, punti: 0 };
    });

    const getRoundRobinPairs = (n) => {
      const pairs = [];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          pairs.push({ l: i, r: j });
        }
      }
      return pairs;
    };

    const matchPairs = getRoundRobinPairs(numTeams);

    matchPairs.forEach((pair, idx) => {
      const teamL = assignments[`${groupKey}-${pair.l}`];
      const teamR = assignments[`${groupKey}-${pair.r}`];
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
    
    const isGold = groupKey.startsWith("gold");
    const numTeams = isGold 
      ? (bracketConfig.teamsPerGoldGirone || 4) 
      : (bracketConfig.teamsPerSilverGirone || 4);

    const teams = [];
    for (let i = 0; i < numTeams; i++) {
      teams.push(assignments[`${groupKey}-${i}`]);
    }

    const getRoundRobinPairs = (n) => {
      const pairs = [];
      let count = 1;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          pairs.push({ l: i, r: j, label: `Gara ${count++}` });
        }
      }
      return pairs;
    };

    const matchPairs = getRoundRobinPairs(numTeams);

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

  const renderIntermediateGroupForAthlete = (groupKey, title, color) => {
    const stats = getIntermediateGroupStats(groupKey);
    const matches = getIntermediateGroupMatches(groupKey);

    const titleColor = color === "gold" ? "text-yellow-600" : "text-gray-500";
    
    return (
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-gray-100 mb-12">
        <h3 className={`text-2xl font-black uppercase mb-6 ${titleColor}`}>{title}</h3>
        
        {/* Standings Table */}
        <div className="overflow-x-auto mb-8 border border-gray-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Squadra</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">G</th>
                <th className="px-4 py-3 text-center">V / P</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">PF</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">PS</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Quoz.</th>
                <th className="px-4 py-3 text-right">Punti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {stats.map((team, idx) => {
                const quotient = team.ps === 0 ? team.pf : (team.pf / team.ps).toFixed(3);
                const highlight = isMe(team.nome);
                return (
                  <tr key={team.nome} className={`hover:bg-blue-50/20 ${highlight ? 'bg-yellow-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${highlight ? 'bg-[#C3562B] text-[#0D3D31]' : 'bg-gray-100 text-gray-500'}`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      <span className="flex items-center gap-1.5 font-bold">
                        {team.nome}
                        {highlight && <span className="w-1.5 h-1.5 rounded-full bg-[#C3562B]"></span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">{team.giocate}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-green-600">{team.vinte}</span>
                      <span className="mx-1 text-gray-200">/</span>
                      <span className="text-red-500">{team.perse}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{team.pf}</td>
                    <td className="px-4 py-3 text-center text-gray-400 hidden sm:table-cell">{team.ps}</td>
                    <td className="px-4 py-3 text-center text-[#0D3D31] hidden sm:table-cell">{quotient}</td>
                    <td className="px-4 py-3 text-right text-lg font-black text-[#0D3D31]">{team.punti}</td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-400 italic">In attesa dei risultati del primo turno.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Matches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((m, idx) => (
            <div key={idx} className={`bg-white p-6 rounded-[2rem] border shadow-sm transition-all hover:scale-[1.02] ${isMe(m.left) || isMe(m.right) ? 'border-[#C3562B] ring-4 ring-[#C3562B]/5' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{m.label}</span>
                <div className="flex gap-1.5">
                  {m.meta?.time && <span className="text-[9px] font-black text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{m.meta.time}</span>}
                  {m.meta?.court && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">C.{m.meta.court}</span>}
                </div>
              </div>
              <div className="flex justify-between items-center gap-4">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className={`flex items-center gap-2 ${isMe(m.left) ? 'text-[#0D3D31]' : 'text-gray-500'}`}>
                    <p className="font-black text-sm truncate uppercase tracking-tighter">
                      {m.left && m.left !== "—" && m.left !== "Slot Libero" ? splitNames(m.left).map(formatPlayerName).join(" - ") : (m.left || "Slot Libero")}
                    </p>
                  </div>
                  <div className="h-px bg-gray-50 w-full relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 bg-white px-1.5 text-[8px] font-black text-gray-200 uppercase tracking-widest">Contro</span>
                  </div>
                  <div className={`flex items-center gap-2 ${isMe(m.right) ? 'text-[#0D3D31]' : 'text-gray-500'}`}>
                    <p className="font-black text-sm truncate uppercase tracking-tighter">
                      {m.right && m.right !== "—" && m.right !== "Slot Libero" ? splitNames(m.right).map(formatPlayerName).join(" - ") : (m.right || "Slot Libero")}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                  {m.meta?.scoreL || m.meta?.scoreR ? (
                    <p className="text-lg font-black text-[#0D3D31] tracking-tighter">{m.meta.scoreL}<span className="text-gray-300 mx-0.5">:</span>{m.meta.scoreR}</p>
                  ) : (
                    <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest text-center leading-tight">Attesa</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const gironiIds = config ? Array.from({ length: config.numGironi || 0 }, (_, i) => String.fromCharCode(65 + i)) : [];
  const bracketMatches = getAllBracketMatches();
  const isMe = (name) => name?.toLowerCase().includes(nomeAtleta.toLowerCase());

  if (status === "loading") return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#0D3D31] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f8faff] pb-28 xl:pb-10">
      <AthleteHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
            <div>
                <h2 className="text-4xl md:text-6xl font-black text-[#0D3D31] uppercase tracking-tighter leading-none">Gironi & Calendario</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-[0.3em] mt-4">Match in tempo reale 🏐</p>
            </div>
            
            <div className="w-full md:w-auto relative group">
                <div className="absolute inset-0 bg-[#0D3D31] rounded-3xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <select 
                    className="w-full md:w-auto relative bg-white border-4 border-white rounded-[2rem] px-8 py-5 font-black text-[#0D3D31] uppercase text-xs tracking-widest shadow-xl outline-none focus:ring-4 focus:ring-[#0D3D31]/5 transition-all appearance-none pr-14" 
                    value={selectedTorneo} 
                    onChange={e=>setSelectedTorneo(e.target.value)}
                >
                    {torneiAttivi.map(t=><option key={t.id} value={t.nome}>{t.nome}</option>)}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[#0D3D31]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </div>
        </div>

        {config && config.pubblicato ? (
          <>
            {/* Phase Navigation Tabs */}
            {bracketConfig && (
              <div className="flex bg-gray-200/60 p-1.5 rounded-2xl mb-8 max-w-md mx-auto border border-gray-200">
                <button
                  onClick={() => setActiveTab("iniziali")}
                  className={`flex-1 py-3 text-center rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all ${activeTab === "iniziali" ? 'bg-[#0D3D31] text-white shadow-md' : 'text-gray-500 hover:text-[#0D3D31]'}`}
                >
                  Gironi Iniziali 📋
                </button>
                {bracketConfig?.phaseType === "gold_silver" && bracketConfig?.subPhaseType === "groups" && (
                  <button
                    onClick={() => setActiveTab("intermedi")}
                    className={`flex-1 py-3 text-center rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all ${activeTab === "intermedi" ? 'bg-[#0D3D31] text-white shadow-md' : 'text-gray-500 hover:text-[#0D3D31]'}`}
                  >
                    Gironi Intermedi 🏆
                  </button>
                )}
                {bracketConfig?.tabellonePubblicato && (
                <button
                  onClick={() => setActiveTab("finali")}
                  className={`flex-1 py-3 text-center rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all ${activeTab === "finali" ? 'bg-[#0D3D31] text-white shadow-md' : 'text-gray-500 hover:text-[#0D3D31]'}`}
                >
                  Fasi Finali ⚔️
                </button>
                )}
              </div>
            )}

            {/* Gironi Iniziali */}
            {activeTab === "iniziali" && (
              <>
                {/* Tab Gironi */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 justify-start sm:justify-center no-scrollbar px-2">
                  {gironiIds.map(g => (
                    <button
                      key={g}
                      onClick={() => setActiveGirone(g)}
                      className={`px-5 py-2.5 rounded-xl font-black transition-all text-xs ${
                        activeGirone === g 
                        ? 'bg-[#0D3D31] text-white shadow-lg' 
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
                        <p className="font-bold text-[#0D3D31] mt-0.5">{config.gironeTypes[activeGirone]}</p>
                    </div>
                    <div className="border-x border-gray-100 px-6 sm:px-8">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Formula</p>
                        <p className="font-bold text-[#0D3D31] mt-0.5">{config.gironeSets[activeGirone]}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Squadre</p>
                        <p className="font-bold text-[#0D3D31] mt-0.5">{config.teamCounts[activeGirone]}</p>
                    </div>
                </div>

                {/* Schedule */}
                <div className="space-y-4 text-left">
                  {config && getSchedule(config.teamCounts[activeGirone], activeGirone, config.gironeAssignments[activeGirone] || {}).length > 0 ? (
                    getSchedule(config.teamCounts[activeGirone], activeGirone, config.gironeAssignments[activeGirone] || {}).map((match, idx) => {
                      const meta = config.matchMetadata?.[`${activeGirone}-${idx}`] || {};
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
                        if (config.gironeSets?.[activeGirone] === "3 set") {
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

                      const highlightedMatch = isMe(match.left) || isMe(match.right);

                      return (
                        <div key={idx} className={`bg-white rounded-2xl p-4 shadow-sm border ${highlightedMatch ? 'border-[#C3562B] ring-4 ring-[#C3562B]/5' : 'border-gray-100'}`}>
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
                              <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerL ? 'text-[#0D3D31] font-black' : 'text-gray-500'} ${isMe(match.left) ? 'text-[#0D3D31] underline decoration-[#C3562B] decoration-2' : ''}`}>
                                {match.left && match.left !== "—" && match.left !== "Slot Libero" ? splitNames(match.left).map(formatPlayerName).join(" - ") : (match.left || "Slot Libero")}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-black ${isWinnerL ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? s1L : "-"}</span>
                                {config.gironeSets?.[activeGirone] === "3 set" && hasScore && (
                                  <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-1 rounded">({s2L}, {s3L})</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Team Right */}
                            <div className="flex justify-between items-center">
                              <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerR ? 'text-[#0D3D31] font-black' : 'text-gray-500'} ${isMe(match.right) ? 'text-[#0D3D31] underline decoration-[#C3562B] decoration-2' : ''}`}>
                                {match.right && match.right !== "—" && match.right !== "Slot Libero" ? splitNames(match.right).map(formatPlayerName).join(" - ") : (match.right || "Slot Libero")}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-black ${isWinnerR ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? s1R : "-"}</span>
                                {config.gironeSets?.[activeGirone] === "3 set" && hasScore && (
                                  <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-1 rounded">({s2R}, {s3R})</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold italic text-xs">Nessuna partita schedulata per questo girone.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Gironi Intermedi */}
            {activeTab === "intermedi" && bracketConfig?.phaseType === "gold_silver" && bracketConfig?.subPhaseType === "groups" && (() => {
              let goldSlots = 0;
              let silverSlots = 0;
              if (config && config.numGironi) {
                for (let i = 0; i < config.numGironi; i++) {
                  const gid = String.fromCharCode(65 + i);
                  const count = config.teamCounts?.[gid] || 0;
                  goldSlots += Math.min(2, count);
                  silverSlots += Math.min(2, Math.max(0, count - 2));
                }
              }
              const autoNumGoldGironi = goldSlots > 4 ? 2 : 1;
              const autoNumSilverGironi = silverSlots > 4 ? 2 : 1;

              const numGoldGironi = bracketConfig.numGoldGironi !== undefined ? bracketConfig.numGoldGironi : autoNumGoldGironi;
              const numSilverGironi = bracketConfig.numSilverGironi !== undefined ? bracketConfig.numSilverGironi : autoNumSilverGironi;

              const goldGroups = [];
              for (let i = 0; i < numGoldGironi; i++) {
                const letter = String.fromCharCode(65 + i);
                goldGroups.push({ id: `gold-${letter}`, label: `Girone Gold ${letter}` });
              }

              const silverGroups = [];
              for (let i = 0; i < numSilverGironi; i++) {
                const letter = String.fromCharCode(65 + i);
                silverGroups.push({ id: `silver-${letter}`, label: `Girone Silver ${letter}` });
              }

              return (
                <div className="space-y-12 text-left">
                  <div>
                    <h2 className="text-xl font-black text-yellow-600 uppercase tracking-tighter mb-6 text-center">🏆 Gironi Intermedi GOLD</h2>
                    {goldGroups.map(g => renderIntermediateGroupForAthlete(g.id, g.label, "gold"))}
                  </div>
                  
                  <div className="border-t border-dashed border-gray-200 my-10"></div>
                  
                  <div>
                    <h2 className="text-xl font-black text-gray-500 uppercase tracking-tighter mb-6 text-center">🥈 Gironi Intermedi SILVER</h2>
                    {silverGroups.map(g => renderIntermediateGroupForAthlete(g.id, g.label, "silver"))}
                  </div>
                </div>
              );
            })()}

            {/* Fasi Finali */}
            {activeTab === "finali" && bracketConfig && bracketConfig.tabellonePubblicato && (
              <div className="space-y-6 text-left">
                {bracketMatches.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {bracketMatches.map((m, idx) => {
                      const scoreL = parseInt(m.scoreL || 0);
                      const scoreR = parseInt(m.scoreR || 0);
                      const hasScore = m.scoreL !== undefined && m.scoreL !== "";
                      const isWinnerL = hasScore && scoreL > scoreR;
                      const isWinnerR = hasScore && scoreR > scoreL;

                      const highlightedMatch = isMe(m.left) || isMe(m.right);
                      
                      const isMultiSetMatch = bracketConfig?.phaseType === "gold_silver" && (
                        m.id.endsWith("-q1") || m.id.endsWith("-q2") || m.id.endsWith("-q3") || m.id.endsWith("-q4") ||
                        m.id.endsWith("-s1") || m.id.endsWith("-s2") ||
                        m.id.endsWith("-f1") || m.id.endsWith("-f3")
                      );

                      return (
                        <div key={idx} className={`bg-white rounded-2xl p-4 shadow-sm border ${highlightedMatch ? 'border-[#C3562B] ring-4 ring-[#C3562B]/5' : 'border-gray-100'}`}>
                          <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{m.label}</span>
                            <div className="flex gap-1.5">
                              {m.time && <span className="text-[9px] font-black text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{m.time}</span>}
                              {m.court && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">C.{m.court}</span>}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerL ? 'text-[#0D3D31] font-black' : 'text-gray-500'} ${isMe(m.left) ? 'text-[#0D3D31] underline decoration-[#C3562B] decoration-2' : ''}`}>
                                {m.left && m.left !== "—" && m.left !== "Slot Libero" ? splitNames(m.left).map(formatPlayerName).join(" - ") : (m.left || "TBD")}
                              </span>
                              <span className={`text-sm font-black ${isWinnerL ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? scoreL : "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-xs uppercase font-bold truncate pr-4 ${isWinnerR ? 'text-[#0D3D31] font-black' : 'text-gray-500'} ${isMe(m.right) ? 'text-[#0D3D31] underline decoration-[#C3562B] decoration-2' : ''}`}>
                                {m.right && m.right !== "—" && m.right !== "Slot Libero" ? splitNames(m.right).map(formatPlayerName).join(" - ") : (m.right || "TBD")}
                              </span>
                              <span className={`text-sm font-black ${isWinnerR ? 'text-green-600' : 'text-gray-400'}`}>{hasScore ? scoreR : "-"}</span>
                            </div>
                            {isMultiSetMatch && hasScore && (scoreL > 0 || scoreR > 0) && (
                              <p className="text-[10px] text-gray-400 font-bold text-right mt-1.5 border-t border-gray-50 pt-1.5">
                                Set: ({m.s1L || 0}-{m.s1R || 0}, {m.s2L || 0}-{m.s2R || 0}{m.s3L || m.s3R ? `, ${m.s3L || 0}-${m.s3R || 0}` : ''})
                              </p>
                            )}
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
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
            <span className="text-5xl mb-4 block">⏳</span>
            <h3 className="text-lg font-black text-[#0D3D31] uppercase tracking-tight mb-2">Gironi in Elaborazione</h3>
            <p className="text-gray-400 font-medium text-xs max-w-sm mx-auto">
              {config ? "Lo staff sta completando la composizione dei gironi e dei calendari. Saranno visibili a breve!" : "I gironi per questo torneo non sono ancora stati configurati dallo staff."}
            </p>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} 
        className="fixed bottom-24 right-4 xl:bottom-8 xl:right-8 w-12 h-12 bg-[#0D3D31] text-[#C3562B] rounded-2xl shadow-2xl flex items-center justify-center text-lg border-2 border-[#C3562B] hover:scale-110 active:scale-90 transition-all z-50 md:hidden"
      >
        ↑
      </button>

      <AthleteBottomNav />
    </main>
  );
}
