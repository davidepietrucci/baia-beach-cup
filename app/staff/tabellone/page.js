"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getGironi, getBracket, saveBracket } from "@/app/utils/db";
import { calculateUnifiedRanking } from "@/app/utils/ranking";

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
  const [teamCounts, setTeamCounts] = useState({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4 });

  const [numGoldGironiOpt, setNumGoldGironiOpt] = useState(0); // 0 = Auto
  const [teamsPerGoldGirone, setTeamsPerGoldGirone] = useState(4);
  const [numSilverGironiOpt, setNumSilverGironiOpt] = useState(0); // 0 = Auto
  const [teamsPerSilverGirone, setTeamsPerSilverGirone] = useState(4);
  const [groupCompositionMethod, setGroupCompositionMethod] = useState("girone"); // "girone" or "classifica"
  const [teamsToGold, setTeamsToGold] = useState(8);
  const [teamsToSilver, setTeamsToSilver] = useState(8);

  let goldSlots = 0;
  let silverSlots = 0;
  for (let i = 0; i < numGironi; i++) {
    const gid = String.fromCharCode(65 + i);
    const count = teamCounts[gid] || 0;
    goldSlots += Math.min(2, count);
    silverSlots += Math.min(2, Math.max(0, count - 2));
  }
  const autoNumGoldGironi = goldSlots > 4 ? 2 : 1;
  const autoNumSilverGironi = silverSlots > 4 ? 2 : 1;

  const numGoldGironi = numGoldGironiOpt > 0 ? numGoldGironiOpt : autoNumGoldGironi;
  const numSilverGironi = numSilverGironiOpt > 0 ? numSilverGironiOpt : autoNumSilverGironi;

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
        setTeamCounts(gConfig.teamCounts || { A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4 });
      } else {
        setNumGironi(4);
        setTeamCounts({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4 });
      }
    });

    getBracket(slug).then(config => {
      if (config) {
        setPhaseType(config.phaseType || "gold_silver");
        setSubPhaseType(config.subPhaseType || "direct");
        setBracketSize(config.bracketSize || 8);
        setBracketAssignments(config.bracketAssignments || {});
        setBracketMetadata(config.bracketMetadata || {});
        setNumGoldGironiOpt(config.numGoldGironi || 0);
        setTeamsPerGoldGirone(config.teamsPerGoldGirone || 4);
        setNumSilverGironiOpt(config.numSilverGironi || 0);
        setTeamsPerSilverGirone(config.teamsPerSilverGirone || 4);
        setGroupCompositionMethod(config.groupCompositionMethod || "girone");
        setTeamsToGold(config.teamsToGold || 8);
        setTeamsToSilver(config.teamsToSilver || 8);
      } else {
        setPhaseType("gold_silver"); setSubPhaseType("direct"); setBracketSize(8); setBracketAssignments({}); setBracketMetadata({});
        setNumGoldGironiOpt(0); setTeamsPerGoldGirone(4); setNumSilverGironiOpt(0); setTeamsPerSilverGirone(4);
        setGroupCompositionMethod("girone");
        setTeamsToGold(8);
        setTeamsToSilver(8);
      }
      setIsLoaded(true);
    });
  }, [selectedTorneo]);

  // Auto-save whenever configurations change (after they have been fully loaded)
  useEffect(() => {
    if (!selectedTorneo || !isLoaded) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const config = { 
      phaseType, 
      subPhaseType, 
      bracketSize, 
      bracketAssignments, 
      bracketMetadata,
      numGoldGironi: numGoldGironiOpt,
      teamsPerGoldGirone,
      numSilverGironi: numSilverGironiOpt,
      teamsPerSilverGirone,
      groupCompositionMethod,
      teamsToGold,
      teamsToSilver
    };
    
    // Save to localStorage immediately
    localStorage.setItem(`bvi_bracket_v1_${slug}`, JSON.stringify(config));

    // Debounced save to cloud db
    const handler = setTimeout(() => {
      saveBracket(slug, config);
    }, 1000);

    return () => clearTimeout(handler);
  }, [phaseType, subPhaseType, bracketSize, bracketAssignments, bracketMetadata, selectedTorneo, isLoaded, numGoldGironiOpt, teamsPerGoldGirone, numSilverGironiOpt, teamsPerSilverGirone, groupCompositionMethod, teamsToGold, teamsToSilver]);


  const getTeamsCountForGroup = (groupKey) => {
    if (groupKey.startsWith("gold-")) {
      return teamsPerGoldGirone || 4;
    } else {
      return teamsPerSilverGirone || 4;
    }
  };

  const getIntermediateGroupTeamsList = (groupKey) => {
    const limit = getTeamsCountForGroup(groupKey);
    const list = [];
    for (let i = 0; i < limit; i++) {
      list.push(bracketAssignments[`${groupKey}-${i}`]);
    }
    return list;
  };

  const getRoundRobinPairs = (numTeams) => {
    if (!numTeams || numTeams < 2) return [];
    const pairs = [];
    let count = 1;
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        pairs.push({ l: i, r: j, label: `Gara ${count++}` });
      }
    }
    return pairs;
  };

  const getIntermediateGroupStats = (groupKey) => {
    const stats = {};
    const numTeams = getTeamsCountForGroup(groupKey);
    const teams = getIntermediateGroupTeamsList(groupKey).filter(t => t && t !== "—" && t !== "Slot Libero");

    teams.forEach(t => {
      stats[t] = { nome: t, giocate: 0, vinte: 0, perse: 0, pf: 0, ps: 0, punti: 0 };
    });

    const pairMaps = getRoundRobinPairs(numTeams);

    pairMaps.forEach((pair, idx) => {
      const teamL = bracketAssignments[`${groupKey}-${pair.l}`];
      const teamR = bracketAssignments[`${groupKey}-${pair.r}`];
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

    const getIntermediateRanking = (groupKey) => {
      const stats = {};
      const numTeams = getTeamsCountForGroup(groupKey);
      const teams = getIntermediateGroupTeamsList(groupKey);

      teams.forEach(t => {
        if (t && t !== "—" && t !== "Slot Libero") {
          stats[t] = { nome: t, punti: 0, pf: 0, ps: 0 };
        }
      });

      const pairMaps = getRoundRobinPairs(numTeams);

      pairMaps.forEach((pair, idx) => {
        const teamL = teams[pair.l];
        const teamR = teams[pair.r];
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
          const hasOttavi = bracketAssignments[`${p}-o1-L`] !== undefined;
          const is16Teams = bracketAssignments[`${p}-o5-L`] !== undefined;
          if (hasOttavi) {
              if (is16Teams) {
                  update(`${p}-q1-L`, resolveWinner(`${p}-o1`));
                  update(`${p}-q1-R`, resolveWinner(`${p}-o2`));
                  update(`${p}-q2-L`, resolveWinner(`${p}-o3`));
                  update(`${p}-q2-R`, resolveWinner(`${p}-o4`));
                  update(`${p}-q3-L`, resolveWinner(`${p}-o5`));
                  update(`${p}-q3-R`, resolveWinner(`${p}-o6`));
                  update(`${p}-q4-L`, resolveWinner(`${p}-o7`));
                  update(`${p}-q4-R`, resolveWinner(`${p}-o8`));
              } else {
                  update(`${p}-q1-R`, resolveWinner(`${p}-o4`));
                  update(`${p}-q2-R`, resolveWinner(`${p}-o3`));
                  update(`${p}-q3-R`, resolveWinner(`${p}-o2`));
                  update(`${p}-q4-R`, resolveWinner(`${p}-o1`));
              }
          }
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
      let currentGoldSlots = 0;
      let currentSilverSlots = 0;
      for (let i = 0; i < numGironi; i++) {
        const gid = String.fromCharCode(65 + i);
        const count = teamCounts[gid] || 0;
        currentGoldSlots += Math.min(2, count);
        currentSilverSlots += Math.max(0, count - 2);
      }
      const currentNumGoldGironi = numGoldGironiOpt > 0 ? numGoldGironiOpt : (currentGoldSlots > 4 ? 2 : 1);
      const currentNumSilverGironi = numSilverGironiOpt > 0 ? numSilverGironiOpt : (currentSilverSlots > 4 ? 2 : 1);

      const gA_rank = getIntermediateRanking("gold-A");
      const gB_rank = currentNumGoldGironi >= 2 ? getIntermediateRanking("gold-B") : [];
      const gC_rank = currentNumGoldGironi >= 3 ? getIntermediateRanking("gold-C") : [];
      const gD_rank = currentNumGoldGironi >= 4 ? getIntermediateRanking("gold-D") : [];

      const sA_rank = getIntermediateRanking("silver-A");
      const sB_rank = currentNumSilverGironi >= 2 ? getIntermediateRanking("silver-B") : [];
      const sC_rank = currentNumSilverGironi >= 3 ? getIntermediateRanking("silver-C") : [];
      const sD_rank = currentNumSilverGironi >= 4 ? getIntermediateRanking("silver-D") : [];

      const getRankedInt = (rankArr, pos, fallback) => rankArr?.[pos] || fallback;

      if (currentNumGoldGironi === 4) {
        update("gold-s1-L", getRankedInt(gA_rank, 0, "1° Gold A"));
        update("gold-s1-R", getRankedInt(gB_rank, 0, "1° Gold B"));
        update("gold-s2-L", getRankedInt(gC_rank, 0, "1° Gold C"));
        update("gold-s2-R", getRankedInt(gD_rank, 0, "1° Gold D"));
      } else if (currentNumGoldGironi === 2) {
        update("gold-s1-L", getRankedInt(gA_rank, 0, "1° Gold A"));
        update("gold-s1-R", getRankedInt(gB_rank, 1, "2° Gold B"));
        update("gold-s2-L", getRankedInt(gB_rank, 0, "1° Gold B"));
        update("gold-s2-R", getRankedInt(gA_rank, 1, "2° Gold A"));
      } else if (currentNumGoldGironi === 1) {
        update("gold-s1-L", getRankedInt(gA_rank, 0, "1° Gold"));
        update("gold-s1-R", getRankedInt(gA_rank, 3, "4° Gold"));
        update("gold-s2-L", getRankedInt(gA_rank, 1, "2° Gold"));
        update("gold-s2-R", getRankedInt(gA_rank, 2, "3° Gold"));
      }
      update("gold-f1-L", resolveWinner("gold-s1"));
      update("gold-f1-R", resolveWinner("gold-s2"));
      update("gold-f3-L", resolveLoser("gold-s1"));
      update("gold-f3-R", resolveLoser("gold-s2"));

      if (currentNumSilverGironi === 4) {
        update("silver-s1-L", getRankedInt(sA_rank, 0, "1° Silver A"));
        update("silver-s1-R", getRankedInt(sB_rank, 0, "1° Silver B"));
        update("silver-s2-L", getRankedInt(sC_rank, 0, "1° Silver C"));
        update("silver-s2-R", getRankedInt(sD_rank, 0, "1° Silver D"));
      } else if (currentNumSilverGironi === 2) {
        update("silver-s1-L", getRankedInt(sA_rank, 0, "1° Silver A"));
        update("silver-s1-R", getRankedInt(sB_rank, 1, "2° Silver B"));
        update("silver-s2-L", getRankedInt(sB_rank, 0, "1° Silver B"));
        update("silver-s2-R", getRankedInt(sA_rank, 1, "2° Silver A"));
      } else if (currentNumSilverGironi === 1) {
        update("silver-s1-L", getRankedInt(sA_rank, 0, "1° Silver"));
        update("silver-s1-R", getRankedInt(sA_rank, 3, "4° Silver"));
        update("silver-s2-L", getRankedInt(sA_rank, 1, "2° Silver"));
        update("silver-s2-R", getRankedInt(sA_rank, 2, "3° Silver"));
      }
      update("silver-f1-L", resolveWinner("silver-s1"));
      update("silver-f1-R", resolveWinner("silver-s2"));
      update("silver-f3-L", resolveLoser("silver-s1"));
      update("silver-f3-R", resolveLoser("silver-s2"));
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
  }, [bracketMetadata, bracketAssignments, isLoaded, phaseType, subPhaseType, numGironi, teamCounts]);

  const handleAutoFill = async () => {
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const gConfig = await getGironi(slug);
    if (!gConfig) { alert("Nessuna configurazione gironi!"); return; }
    const numGironi = gConfig.numGironi || 0;
    const newAssignments = { ...bracketAssignments };
    const rType = gConfig.rankingType || "avulsa";
    
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
      const name = rankings[gid]?.[pos];
      if (name) return splitNames(name).map(formatPlayerName).join(" - ");
      return `TBD ${pos+1}° ${gid}`;
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

      // Clean existing assignments for all gold & silver group slots first
      Object.keys(newAssignments).forEach(key => {
        if (
          key.startsWith("gold-A-") || key.startsWith("gold-B-") || key.startsWith("gold-C-") || key.startsWith("gold-D-") ||
          key.startsWith("silver-A-") || key.startsWith("silver-B-") || key.startsWith("silver-C-") || key.startsWith("silver-D-")
        ) {
          delete newAssignments[key];
        }
      });

      // Calculate dynamically the target groups count
      let currentGoldSlots = 0;
      let currentSilverSlots = 0;
      for (let i = 0; i < numGironi; i++) {
        const gid = String.fromCharCode(65 + i);
        const count = gConfig.teamCounts[gid] || 0;
        currentGoldSlots += Math.min(2, count);
        currentSilverSlots += Math.min(2, Math.max(0, count - 2));
      }
      const autoNumGoldGironi = currentGoldSlots > 4 ? 2 : 1;
      const autoNumSilverGironi = currentSilverSlots > 4 ? 2 : 1;

      const currentNumGoldGironi = numGoldGironiOpt > 0 ? numGoldGironiOpt : autoNumGoldGironi;
      const currentNumSilverGironi = numSilverGironiOpt > 0 ? numSilverGironiOpt : autoNumSilverGironi;
      const currentTeamsPerGoldGirone = teamsPerGoldGirone || 4;
      const currentTeamsPerSilverGirone = teamsPerSilverGirone || 4;

      if (groupCompositionMethod === "classifica") {
        const rankingsUnified = calculateUnifiedRanking(gConfig).map(s => {
          if (!s.nome) return "";
          return splitNames(s.nome).map(formatPlayerName).join(" - ");
        });

        // 1. Gold Assignments
        const goldFilled = Array(currentNumGoldGironi).fill(0);
        const totalGoldTeamsNeeded = currentNumGoldGironi * currentTeamsPerGoldGirone;
        for (let idx = 0; idx < totalGoldTeamsNeeded; idx++) {
          const team = rankingsUnified[idx] || "—";
          const row = Math.floor(idx / currentNumGoldGironi);
          const col = idx % currentNumGoldGironi;
          const targetGroupIdx = (row % 2 === 0) ? col : (currentNumGoldGironi - 1 - col);
          const targetLetter = String.fromCharCode(65 + targetGroupIdx);
          const slotIdx = goldFilled[targetGroupIdx];
          if (slotIdx < currentTeamsPerGoldGirone) {
            newAssignments[`gold-${targetLetter}-${slotIdx}`] = team;
            goldFilled[targetGroupIdx]++;
          }
        }

        // 2. Silver Assignments
        const silverFilled = Array(currentNumSilverGironi).fill(0);
        const totalSilverTeamsNeeded = currentNumSilverGironi * currentTeamsPerSilverGirone;
        for (let idx = 0; idx < totalSilverTeamsNeeded; idx++) {
          const rankingIdx = totalGoldTeamsNeeded + idx;
          const team = rankingsUnified[rankingIdx] || "—";
          const row = Math.floor(idx / currentNumSilverGironi);
          const col = idx % currentNumSilverGironi;
          const targetGroupIdx = (row % 2 === 0) ? col : (currentNumSilverGironi - 1 - col);
          const targetLetter = String.fromCharCode(65 + targetGroupIdx);
          const slotIdx = silverFilled[targetGroupIdx];
          if (slotIdx < currentTeamsPerSilverGirone) {
            newAssignments[`silver-${targetLetter}-${slotIdx}`] = team;
            silverFilled[targetGroupIdx]++;
          }
        }
      } else {
        // 1. Gold Assignments
        const goldFilled = Array(currentNumGoldGironi).fill(0);
        for (let rank = 0; rank < 2; rank++) {
          for (let gIdx = 0; gIdx < numGironi; gIdx++) {
            const gid = String.fromCharCode(65 + gIdx);
            const count = gConfig.teamCounts[gid] || 0;
            if (rank < count) {
              const team = getRanked(gid, rank);
              const targetGroupIdx = (gIdx + rank) % currentNumGoldGironi;
              const targetLetter = String.fromCharCode(65 + targetGroupIdx);
              const slotIdx = goldFilled[targetGroupIdx];
              if (slotIdx < currentTeamsPerGoldGirone) {
                newAssignments[`gold-${targetLetter}-${slotIdx}`] = team;
                goldFilled[targetGroupIdx]++;
              }
            }
          }
        }

        // 2. Silver Assignments
        const silverFilled = Array(currentNumSilverGironi).fill(0);
        let maxTeams = 0;
        for (let i = 0; i < numGironi; i++) {
          const gid = String.fromCharCode(65 + i);
          maxTeams = Math.max(maxTeams, gConfig.teamCounts[gid] || 0);
        }
        for (let rank = 2; rank < Math.min(4, maxTeams); rank++) {
          for (let gIdx = 0; gIdx < numGironi; gIdx++) {
            const gid = String.fromCharCode(65 + gIdx);
            const count = gConfig.teamCounts[gid] || 0;
            if (rank < count) {
              const team = getRanked(gid, rank);
              const targetGroupIdx = (gIdx + rank) % currentNumSilverGironi;
              const targetLetter = String.fromCharCode(65 + targetGroupIdx);
              const slotIdx = silverFilled[targetGroupIdx];
              if (slotIdx < currentTeamsPerSilverGirone) {
                newAssignments[`silver-${targetLetter}-${slotIdx}`] = team;
                silverFilled[targetGroupIdx]++;
              }
            }
          }
        }

        // Pad remainder with "—" up to limit
        for (let targetGroupIdx = 0; targetGroupIdx < currentNumGoldGironi; targetGroupIdx++) {
          const targetLetter = String.fromCharCode(65 + targetGroupIdx);
          for (let slotIdx = goldFilled[targetGroupIdx]; slotIdx < currentTeamsPerGoldGirone; slotIdx++) {
            newAssignments[`gold-${targetLetter}-${slotIdx}`] = "—";
          }
        }
        for (let targetGroupIdx = 0; targetGroupIdx < currentNumSilverGironi; targetGroupIdx++) {
          const targetLetter = String.fromCharCode(65 + targetGroupIdx);
          for (let slotIdx = silverFilled[targetGroupIdx]; slotIdx < currentTeamsPerSilverGirone; slotIdx++) {
            newAssignments[`silver-${targetLetter}-${slotIdx}`] = "—";
          }
        }
      }
    } else {
      let totalSlots = 0;
      for (let i = 0; i < numGironi; i++) {
        const gid = String.fromCharCode(65 + i);
        totalSlots += gConfig.teamCounts[gid] || 0;
      }

      if (groupCompositionMethod === "classifica") {
        // Clean previous assignments
        Object.keys(newAssignments).forEach(key => {
          if (key.startsWith("gold-") || key.startsWith("silver-") || key.startsWith("wb-") || key.startsWith("lb-") || key.startsWith("grand-final-")) {
            delete newAssignments[key];
          }
        });

        const unifiedRanking = calculateUnifiedRanking(gConfig);
        const getTeamByRank = (rankIdx) => {
          if (unifiedRanking[rankIdx]) {
            const name = unifiedRanking[rankIdx].nome;
            return splitNames(name).map(formatPlayerName).join(" - ");
          }
          return `TBD ${rankIdx + 1}° Classificato`;
        };

        if (phaseType === "gold_silver" && subPhaseType === "direct") {
          const buildGoldDirect = (count) => {
            if (count === 4) {
              setBracketSize(4);
              newAssignments['gold-s1-L'] = getTeamByRank(0);
              newAssignments['gold-s1-R'] = getTeamByRank(3);
              newAssignments['gold-s2-L'] = getTeamByRank(1);
              newAssignments['gold-s2-R'] = getTeamByRank(2);
            } else if (count === 8) {
              setBracketSize(8);
              newAssignments['gold-q1-L'] = getTeamByRank(0);
              newAssignments['gold-q1-R'] = getTeamByRank(7);
              newAssignments['gold-q2-L'] = getTeamByRank(3);
              newAssignments['gold-q2-R'] = getTeamByRank(4);
              newAssignments['gold-q3-L'] = getTeamByRank(1);
              newAssignments['gold-q3-R'] = getTeamByRank(6);
              newAssignments['gold-q4-L'] = getTeamByRank(2);
              newAssignments['gold-q4-R'] = getTeamByRank(5);
            } else if (count === 12) {
              setBracketSize(8);
              newAssignments['gold-q1-L'] = getTeamByRank(0);
              newAssignments['gold-q2-L'] = getTeamByRank(1);
              newAssignments['gold-q3-L'] = getTeamByRank(2);
              newAssignments['gold-q4-L'] = getTeamByRank(3);

              newAssignments['gold-o1-L'] = getTeamByRank(4);
              newAssignments['gold-o1-R'] = getTeamByRank(11);
              newAssignments['gold-o2-L'] = getTeamByRank(5);
              newAssignments['gold-o2-R'] = getTeamByRank(10);
              newAssignments['gold-o3-L'] = getTeamByRank(6);
              newAssignments['gold-o3-R'] = getTeamByRank(9);
              newAssignments['gold-o4-L'] = getTeamByRank(7);
              newAssignments['gold-o4-R'] = getTeamByRank(8);
            } else if (count === 16) {
              setBracketSize(16);
              newAssignments['gold-o1-L'] = getTeamByRank(0);
              newAssignments['gold-o1-R'] = getTeamByRank(15);
              newAssignments['gold-o2-L'] = getTeamByRank(7);
              newAssignments['gold-o2-R'] = getTeamByRank(8);
              newAssignments['gold-o3-L'] = getTeamByRank(3);
              newAssignments['gold-o3-R'] = getTeamByRank(12);
              newAssignments['gold-o4-L'] = getTeamByRank(4);
              newAssignments['gold-o4-R'] = getTeamByRank(11);
              newAssignments['gold-o5-L'] = getTeamByRank(1);
              newAssignments['gold-o5-R'] = getTeamByRank(14);
              newAssignments['gold-o6-L'] = getTeamByRank(6);
              newAssignments['gold-o6-R'] = getTeamByRank(9);
              newAssignments['gold-o7-L'] = getTeamByRank(2);
              newAssignments['gold-o7-R'] = getTeamByRank(13);
              newAssignments['gold-o8-L'] = getTeamByRank(5);
              newAssignments['gold-o8-R'] = getTeamByRank(10);
            }
          };

          const buildSilverDirect = (count, goldOffset) => {
            if (count === 4) {
              newAssignments['silver-s1-L'] = getTeamByRank(goldOffset + 0);
              newAssignments['silver-s1-R'] = getTeamByRank(goldOffset + 3);
              newAssignments['silver-s2-L'] = getTeamByRank(goldOffset + 1);
              newAssignments['silver-s2-R'] = getTeamByRank(goldOffset + 2);
            } else if (count === 8) {
              newAssignments['silver-q1-L'] = getTeamByRank(goldOffset + 0);
              newAssignments['silver-q1-R'] = getTeamByRank(goldOffset + 7);
              newAssignments['silver-q2-L'] = getTeamByRank(goldOffset + 3);
              newAssignments['silver-q2-R'] = getTeamByRank(goldOffset + 4);
              newAssignments['silver-q3-L'] = getTeamByRank(goldOffset + 1);
              newAssignments['silver-q3-R'] = getTeamByRank(goldOffset + 6);
              newAssignments['silver-q4-L'] = getTeamByRank(goldOffset + 2);
              newAssignments['silver-q4-R'] = getTeamByRank(goldOffset + 5);
            } else if (count === 12) {
              newAssignments['silver-q1-L'] = getTeamByRank(goldOffset + 0);
              newAssignments['silver-q2-L'] = getTeamByRank(goldOffset + 1);
              newAssignments['silver-q3-L'] = getTeamByRank(goldOffset + 2);
              newAssignments['silver-q4-L'] = getTeamByRank(goldOffset + 3);

              newAssignments['silver-o1-L'] = getTeamByRank(goldOffset + 4);
              newAssignments['silver-o1-R'] = getTeamByRank(goldOffset + 11);
              newAssignments['silver-o2-L'] = getTeamByRank(goldOffset + 5);
              newAssignments['silver-o2-R'] = getTeamByRank(goldOffset + 10);
              newAssignments['silver-o3-L'] = getTeamByRank(goldOffset + 6);
              newAssignments['silver-o3-R'] = getTeamByRank(goldOffset + 9);
              newAssignments['silver-o4-L'] = getTeamByRank(goldOffset + 7);
              newAssignments['silver-o4-R'] = getTeamByRank(goldOffset + 8);
            } else if (count === 16) {
              newAssignments['silver-o1-L'] = getTeamByRank(goldOffset + 0);
              newAssignments['silver-o1-R'] = getTeamByRank(goldOffset + 15);
              newAssignments['silver-o2-L'] = getTeamByRank(goldOffset + 7);
              newAssignments['silver-o2-R'] = getTeamByRank(goldOffset + 8);
              newAssignments['silver-o3-L'] = getTeamByRank(goldOffset + 3);
              newAssignments['silver-o3-R'] = getTeamByRank(goldOffset + 12);
              newAssignments['silver-o4-L'] = getTeamByRank(goldOffset + 4);
              newAssignments['silver-o4-R'] = getTeamByRank(goldOffset + 11);
              newAssignments['silver-o5-L'] = getTeamByRank(goldOffset + 1);
              newAssignments['silver-o5-R'] = getTeamByRank(goldOffset + 14);
              newAssignments['silver-o6-L'] = getTeamByRank(goldOffset + 6);
              newAssignments['silver-o6-R'] = getTeamByRank(goldOffset + 9);
              newAssignments['silver-o7-L'] = getTeamByRank(goldOffset + 2);
              newAssignments['silver-o7-R'] = getTeamByRank(goldOffset + 13);
              newAssignments['silver-o8-L'] = getTeamByRank(goldOffset + 5);
              newAssignments['silver-o8-R'] = getTeamByRank(goldOffset + 10);
            }
          };

          buildGoldDirect(teamsToGold);
          buildSilverDirect(teamsToSilver, teamsToGold);
        } else if (phaseType === "double") {
          if (numGironi === 2) {
            setBracketSize(4);
            newAssignments['wb-s1-L'] = getTeamByRank(0);
            newAssignments['wb-s1-R'] = getTeamByRank(3);
            newAssignments['wb-s2-L'] = getTeamByRank(1);
            newAssignments['wb-s2-R'] = getTeamByRank(2);
          } else if (numGironi === 4) {
            setBracketSize(8);
            newAssignments['wb-q1-L'] = getTeamByRank(0);
            newAssignments['wb-q1-R'] = getTeamByRank(7);
            newAssignments['wb-q2-L'] = getTeamByRank(3);
            newAssignments['wb-q2-R'] = getTeamByRank(4);
            newAssignments['wb-q3-L'] = getTeamByRank(1);
            newAssignments['wb-q3-R'] = getTeamByRank(6);
            newAssignments['wb-q4-L'] = getTeamByRank(2);
            newAssignments['wb-q4-R'] = getTeamByRank(5);
          }
        }
      } else {
        // Classic "gironi" bracket fill (placements inside groups)
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
    }

    setBracketAssignments(newAssignments);
    alert(`Tabellone generato! 🏆`);
  };

  const handleSave = async () => {
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const calculatedBracketSize = (phaseType === "gold_silver" && subPhaseType === "direct")
      ? Math.max(teamsToGold, teamsToSilver)
      : bracketSize;

    const config = { 
      phaseType, 
      subPhaseType, 
      bracketSize: calculatedBracketSize, 
      bracketAssignments, 
      bracketMetadata,
      numGoldGironi: numGoldGironiOpt,
      teamsPerGoldGirone,
      numSilverGironi: numSilverGironiOpt,
      teamsPerSilverGirone,
      groupCompositionMethod,
      teamsToGold,
      teamsToSilver
    };
    localStorage.setItem(`bvi_bracket_v1_${slug}`, JSON.stringify(config));
    await saveBracket(slug, config);
    alert(`Salvataggio completato! 🏆`);
  };

  const handleDeleteBracket = async () => {
    if (!window.confirm("Sei sicuro di voler eliminare completamente il tabellone di questo torneo? Tutti i dati inseriti andranno persi.")) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    setBracketAssignments({});
    setBracketMetadata({});
    setPhaseType("gold_silver");
    setSubPhaseType("direct");
    setBracketSize(8);
    setNumGoldGironiOpt(0);
    setTeamsPerGoldGirone(4);
    setNumSilverGironiOpt(0);
    setTeamsPerSilverGirone(4);
    localStorage.removeItem(`bvi_bracket_v1_${slug}`);
    await saveBracket(slug, null);
    alert("Tabellone eliminato con successo! 🗑️");
  };

  const handleMetadataChange = (matchId, field, value) => {
    setBracketMetadata(prev => {
      const currentMeta = { ...(prev[matchId] || {}), [field]: value };
      const isMultiSet = (matchId.startsWith("gold-") || matchId.startsWith("silver-")) && (
        matchId.endsWith("-q1") || matchId.endsWith("-q2") || matchId.endsWith("-q3") || matchId.endsWith("-q4") ||
        matchId.endsWith("-s1") || matchId.endsWith("-s2") ||
        matchId.endsWith("-f1") || matchId.endsWith("-f3")
      );
      if (isMultiSet && ['s1L', 's1R', 's2L', 's2R', 's3L', 's3R'].includes(field)) {
        const getSetWinner = (sL, sR) => {
          if (sL === undefined || sL === "" || sR === undefined || sR === "") return null;
          const pL = parseInt(sL);
          const pR = parseInt(sR);
          if (isNaN(pL) || isNaN(pR)) return null;
          return pL > pR ? 'L' : pL < pR ? 'R' : null;
        };

        let winL = 0;
        let winR = 0;
        
        const w1 = getSetWinner(currentMeta.s1L, currentMeta.s1R);
        if (w1 === 'L') winL++; else if (w1 === 'R') winR++;
        
        const w2 = getSetWinner(currentMeta.s2L, currentMeta.s2R);
        if (w2 === 'L') winL++; else if (w2 === 'R') winR++;
        
        const w3 = getSetWinner(currentMeta.s3L, currentMeta.s3R);
        if (w3 === 'L') winL++; else if (w3 === 'R') winR++;
        
        currentMeta.scoreL = (winL > 0 || winR > 0) ? winL.toString() : "";
        currentMeta.scoreR = (winL > 0 || winR > 0) ? winR.toString() : "";
      }
      return { ...prev, [matchId]: currentMeta };
    });
  };

  const renderMatch = (matchId, label, color = "blue") => {
    const meta = bracketMetadata[matchId] || {};
    const borderClass = color === "gold" ? "hover:border-yellow-500" : color === "silver" ? "hover:border-gray-400" : "hover:border-blue-600";
    
    const isMultiSetMatch = (matchId.startsWith("gold-") || matchId.startsWith("silver-")) && (
      matchId.endsWith("-q1") || matchId.endsWith("-q2") || matchId.endsWith("-q3") || matchId.endsWith("-q4") ||
      matchId.endsWith("-s1") || matchId.endsWith("-s2") ||
      matchId.endsWith("-f1") || matchId.endsWith("-f3")
    );

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
            <input 
              type="text" 
              placeholder="Team A" 
              value={bracketAssignments[`${matchId}-L`] || ""} 
              onChange={(e) => setBracketAssignments(p => ({...p, [`${matchId}-L`]: e.target.value}))} 
              onBlur={(e) => {
                const val = e.target.value;
                if (val && val !== "—" && !val.includes(".") && val !== "Slot Libero" && !val.startsWith("TBD")) {
                  const formatted = splitNames(val).map(formatPlayerName).join(" - ");
                  setBracketAssignments(p => ({...p, [`${matchId}-L`]: formatted}));
                }
              }}
              className="flex-1 text-xs font-bold border-b border-gray-100 outline-none py-1 bg-white text-gray-900" 
            />
            <input 
              type="text" 
              placeholder="-" 
              value={meta.scoreL || ""} 
              onChange={(e) => !isMultiSetMatch && handleMetadataChange(matchId, 'scoreL', e.target.value)} 
              readOnly={isMultiSetMatch}
              className={`w-8 h-8 rounded text-center text-xs font-black focus:outline-none ${isMultiSetMatch ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-900 focus:bg-[#0a1628] focus:text-white'}`} 
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Team B" 
              value={bracketAssignments[`${matchId}-R`] || ""} 
              onChange={(e) => setBracketAssignments(p => ({...p, [`${matchId}-R`]: e.target.value}))} 
              onBlur={(e) => {
                const val = e.target.value;
                if (val && val !== "—" && !val.includes(".") && val !== "Slot Libero" && !val.startsWith("TBD")) {
                  const formatted = splitNames(val).map(formatPlayerName).join(" - ");
                  setBracketAssignments(p => ({...p, [`${matchId}-R`]: formatted}));
                }
              }}
              className="flex-1 text-xs font-bold border-b border-gray-100 outline-none py-1 bg-white text-gray-900" 
            />
            <input 
              type="text" 
              placeholder="-" 
              value={meta.scoreR || ""} 
              onChange={(e) => !isMultiSetMatch && handleMetadataChange(matchId, 'scoreR', e.target.value)} 
              readOnly={isMultiSetMatch}
              className={`w-8 h-8 rounded text-center text-xs font-black focus:outline-none ${isMultiSetMatch ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-900 focus:bg-[#0a1628] focus:text-white'}`} 
            />
          </div>
        </div>
        
        {isMultiSetMatch && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div className="grid grid-cols-4 gap-1 items-center text-center text-[9px] font-black text-gray-400 uppercase tracking-wider">
              <div>Set</div>
              <div>S1</div>
              <div>S2</div>
              <div>S3</div>
            </div>
            <div className="grid grid-cols-4 gap-1 items-center">
              <span className="text-[9px] font-bold text-gray-500 truncate text-center">A</span>
              <input type="text" placeholder="0" value={meta.s1L || ""} onChange={(e) => handleMetadataChange(matchId, 's1L', e.target.value)} className="w-full text-center text-[11px] border border-gray-200 rounded py-0.5 focus:outline-none bg-gray-50 text-gray-900 font-bold" />
              <input type="text" placeholder="0" value={meta.s2L || ""} onChange={(e) => handleMetadataChange(matchId, 's2L', e.target.value)} className="w-full text-center text-[11px] border border-gray-200 rounded py-0.5 focus:outline-none bg-gray-50 text-gray-900 font-bold" />
              <input type="text" placeholder="0" value={meta.s3L || ""} onChange={(e) => handleMetadataChange(matchId, 's3L', e.target.value)} className="w-full text-center text-[11px] border border-gray-200 rounded py-0.5 focus:outline-none bg-gray-50 text-gray-900 font-bold" />
            </div>
            <div className="grid grid-cols-4 gap-1 items-center">
              <span className="text-[9px] font-bold text-gray-500 truncate text-center">B</span>
              <input type="text" placeholder="0" value={meta.s1R || ""} onChange={(e) => handleMetadataChange(matchId, 's1R', e.target.value)} className="w-full text-center text-[11px] border border-gray-200 rounded py-0.5 focus:outline-none bg-gray-50 text-gray-900 font-bold" />
              <input type="text" placeholder="0" value={meta.s2R || ""} onChange={(e) => handleMetadataChange(matchId, 's2R', e.target.value)} className="w-full text-center text-[11px] border border-gray-200 rounded py-0.5 focus:outline-none bg-gray-50 text-gray-900 font-bold" />
              <input type="text" placeholder="0" value={meta.s3R || ""} onChange={(e) => handleMetadataChange(matchId, 's3R', e.target.value)} className="w-full text-center text-[11px] border border-gray-200 rounded py-0.5 focus:outline-none bg-gray-50 text-gray-900 font-bold" />
            </div>
          </div>
        )}
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
            <span className="flex-1 text-xs font-bold truncate text-[#0a1628]" title={teamL}>
              {teamL && teamL !== "—" && teamL !== "Slot Libero" ? splitNames(teamL).map(formatPlayerName).join(" - ") : (teamL || "Slot Libero")}
            </span>
            <input type="text" placeholder="-" value={meta.scoreL || ""} onChange={(e) => handleMetadataChange(matchId, 'scoreL', e.target.value)} className="w-8 h-8 bg-gray-50 text-gray-900 rounded text-center text-xs font-black focus:bg-[#0a1628] focus:text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs font-bold truncate text-[#0a1628]" title={teamR}>
              {teamR && teamR !== "—" && teamR !== "Slot Libero" ? splitNames(teamR).map(formatPlayerName).join(" - ") : (teamR || "Slot Libero")}
            </span>
            <input type="text" placeholder="-" value={meta.scoreR || ""} onChange={(e) => handleMetadataChange(matchId, 'scoreR', e.target.value)} className="w-8 h-8 bg-gray-50 text-gray-900 rounded text-center text-xs font-black focus:bg-[#0a1628] focus:text-white" />
          </div>
        </div>
      </div>
    );
  };

  const renderIntermediateGroup = (groupKey, title, color) => {
    const stats = getIntermediateGroupStats(groupKey);
    const numTeams = getTeamsCountForGroup(groupKey);
    const teams = getIntermediateGroupTeamsList(groupKey);
    const matchPairs = getRoundRobinPairs(numTeams);

    const titleColor = color === "gold" ? "text-yellow-600" : "text-gray-500";
    
    return (
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mb-12">
        <h3 className={`text-xl font-black uppercase mb-6 ${titleColor}`}>{title}</h3>

        {/* Composizione Girone (Modifica manuale) */}
        <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Composizione Girone (Modifica manuale)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: numTeams }, (_, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 font-sans">
                <span className="text-[10px] font-black text-gray-400">#{idx + 1}</span>
                <input
                  type="text"
                  value={bracketAssignments[`${groupKey}-${idx}`] || ""}
                  onChange={(e) => setBracketAssignments(p => ({ ...p, [`${groupKey}-${idx}`]: e.target.value }))}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val && val !== "—" && !val.includes(".") && val !== "Slot Libero" && !val.startsWith("TBD")) {
                      const formatted = splitNames(val).map(formatPlayerName).join(" - ");
                      setBracketAssignments(p => ({...p, [`${groupKey}-${idx}`]: formatted}));
                    }
                  }}
                  className="flex-1 bg-transparent border-none text-xs font-bold focus:outline-none text-[#0a1628] w-full"
                  placeholder="Slot Libero"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Standings Table */}
        <div className="overflow-x-auto mb-8 border border-gray-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Squadra</th>
                <th className="px-4 py-3 text-center">V</th>
                <th className="px-4 py-3 text-center">PF</th>
                <th className="px-4 py-3 text-center">PS</th>
                <th className="px-4 py-3 text-center">Quoz.</th>
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
                    <td className="px-4 py-3 text-gray-900">
                      {team.nome && team.nome !== "—" && team.nome !== "Slot Libero" ? splitNames(team.nome).map(formatPlayerName).join(" - ") : (team.nome || "")}
                    </td>
                    <td className="px-4 py-3 text-center text-green-600">{team.vinte}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{team.pf}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{team.ps}</td>
                    <td className="px-4 py-3 text-center text-[#0a1628]">{quotient}</td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400 italic">Nessuna squadra assegnata. Clicca su GENERA o scrivi nei campi sopra.</td>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mb-10">
          <div><h4 className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Semifinale 1</h4>{renderMatch(`${p}-s1`,'SF1',color)}</div>
          <div><h4 className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Semifinale 2</h4>{renderMatch(`${p}-s2`,'SF2',color)}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl">
          <div><h4 className="text-[10px] font-black text-red-400 mb-2 uppercase tracking-widest">Finale 3°/4°</h4>{renderMatch(`${p}-f3`,'BRONZO',color)}</div>
          <div><h4 className="text-[10px] font-black text-yellow-500 mb-2 uppercase tracking-widest">Finale 1°/2°</h4>{renderMatch(`${p}-f1`,'ORO',color)}</div>
        </div>
      </div>
    );
  };

  const getSectionBracketSize = (p) => {
    if (phaseType === "gold_silver" && subPhaseType === "direct") {
      return p === "gold" ? teamsToGold : teamsToSilver;
    }
    return bracketSize;
  };

  const renderSection = (p, title, color) => {
    const size = getSectionBracketSize(p);
    const hasOttavi = size === 12 || size === 16;
    const hasQuarti = size === 8 || size === 12 || size === 16;

    return (
      <div className="mb-16">
        <h3 className={`text-2xl font-black uppercase mb-8 ${color==='gold'?'text-yellow-600':color==='silver'?'text-gray-500':'text-blue-600'}`}>{title}</h3>
        
        {hasOttavi && (
          <div className="mb-10">
            <h4 className="text-[11px] font-black text-gray-400 mb-4 uppercase tracking-widest">Ottavi di finale</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto no-scrollbar">
              {Array.from({ length: size === 12 ? 4 : 8 }, (_, i) => (
                <div key={i}>
                  {renderMatch(`${p}-o${i + 1}`, `Ottavi ${i + 1}`, color)}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasQuarti && (
          <div className="mb-10">
            {hasOttavi && <h4 className="text-[11px] font-black text-gray-400 mb-4 uppercase tracking-widest">Quarti di finale</h4>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto no-scrollbar">
              {renderMatch(`${p}-q1`,'Quarti 1',color)} {renderMatch(`${p}-q2`,'Quarti 2',color)} {renderMatch(`${p}-q3`,'Quarti 3',color)} {renderMatch(`${p}-q4`,'Quarti 4',color)}
            </div>
          </div>
        )}

        <div className="mb-10">
          {hasOttavi && <h4 className="text-[11px] font-black text-gray-400 mb-4 uppercase tracking-widest">Semifinali</h4>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl">
            {renderMatch(`${p}-s1`,'S1',color)} {renderMatch(`${p}-s2`,'S2',color)}
          </div>
        </div>

        <div>
          {hasOttavi && <h4 className="text-[11px] font-black text-gray-400 mb-4 uppercase tracking-widest">Finali</h4>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl">
            <div><h4 className="text-[10px] font-black text-red-400 mb-2 uppercase tracking-widest">Finale 3°/4°</h4>{renderMatch(`${p}-f3`,'BRONZO',color)}</div>
            <div><h4 className="text-[10px] font-black text-yellow-500 mb-2 uppercase tracking-widest">Finale 1°/2°</h4>{renderMatch(`${p}-f1`,'ORO',color)}</div>
          </div>
        </div>
      </div>
    );
  };

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
                <button onClick={handleDeleteBracket} disabled={!selectedTorneo} className="flex-1 md:flex-none bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">🗑️ ELIMINA</button>
            </div>
        </div>

        {isLoaded && torneiAttivi.length > 0 && phaseType === "gold_silver" && (
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl mb-8 flex flex-col md:flex-row gap-6 items-stretch md:items-center justify-between">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {subPhaseType === "groups" ? (
                <>
                  {/* Gold Config */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest block">Configurazione Gironi Gold</span>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Numero Gironi</label>
                        <select 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] cursor-pointer"
                          value={numGoldGironiOpt}
                          onChange={(e) => setNumGoldGironiOpt(parseInt(e.target.value))}
                        >
                          <option value={0}>Auto (Calcolato: {autoNumGoldGironi})</option>
                          <option value={1}>1 Girone</option>
                          <option value={2}>2 Gironi</option>
                          <option value={3}>3 Gironi</option>
                          <option value={4}>4 Gironi</option>
                        </select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Squadre per Girone</label>
                        <select 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] cursor-pointer"
                          value={teamsPerGoldGirone}
                          onChange={(e) => setTeamsPerGoldGirone(parseInt(e.target.value))}
                        >
                          <option value={3}>3 Squadre</option>
                          <option value={4}>4 Squadre</option>
                          <option value={5}>5 Squadre</option>
                          <option value={6}>6 Squadre</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Silver Config */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Configurazione Gironi Silver</span>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Numero Gironi</label>
                        <select 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] cursor-pointer"
                          value={numSilverGironiOpt}
                          onChange={(e) => setNumSilverGironiOpt(parseInt(e.target.value))}
                        >
                          <option value={0}>Auto (Calcolato: {autoNumSilverGironi})</option>
                          <option value={1}>1 Girone</option>
                          <option value={2}>2 Gironi</option>
                          <option value={3}>3 Gironi</option>
                          <option value={4}>4 Gironi</option>
                        </select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Squadre per Girone</label>
                        <select 
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] cursor-pointer"
                          value={teamsPerSilverGirone}
                          onChange={(e) => setTeamsPerSilverGirone(parseInt(e.target.value))}
                        >
                          <option value={3}>3 Squadre</option>
                          <option value={4}>4 Squadre</option>
                          <option value={5}>5 Squadre</option>
                          <option value={6}>6 Squadre</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Teams to Gold Config */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest block">Squadre al Gold</span>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">Avanzano al Gold</label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] cursor-pointer"
                        value={teamsToGold}
                        onChange={(e) => setTeamsToGold(parseInt(e.target.value))}
                      >
                        <option value={4}>4 Squadre (Semifinali)</option>
                        <option value={8}>8 Squadre (Quarti)</option>
                        <option value={12}>12 Squadre (4 Ottavi + 4 Bye)</option>
                        <option value={16}>16 Squadre (8 Ottavi)</option>
                      </select>
                    </div>
                  </div>

                  {/* Teams to Silver Config */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Squadre al Silver</span>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">Avanzano al Silver</label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] cursor-pointer"
                        value={teamsToSilver}
                        onChange={(e) => setTeamsToSilver(parseInt(e.target.value))}
                      >
                        <option value={4}>4 Squadre (Semifinali)</option>
                        <option value={8}>8 Squadre (Quarti)</option>
                        <option value={12}>12 Squadre (4 Ottavi + 4 Bye)</option>
                        <option value={16}>16 Squadre (8 Ottavi)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Composition Method Config */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Metodo Composizione</span>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">
                    {subPhaseType === "groups" ? "Composizione Gironi" : "Composizione Tabellone"}
                  </label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] cursor-pointer"
                    value={groupCompositionMethod}
                    onChange={(e) => setGroupCompositionMethod(e.target.value)}
                  >
                    <option value="girone">
                      {subPhaseType === "groups" ? "Serpente per Gironi (Standard)" : "Classifica dei Gironi (Standard)"}
                    </option>
                    <option value="classifica">Classifica Avulsa (Complessiva)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-2xl p-4 md:max-w-xs flex items-center gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <p className="text-[9px] font-black text-[#0a1628]/80 uppercase tracking-wide leading-normal">
                Dopo aver modificato la configurazione o il metodo, clicca su <strong>GENERA</strong> per aggiornare il tabellone e riassegnare le squadre.
              </p>
            </div>
          </div>
        )}

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
                  {Array.from({ length: numGoldGironi }, (_, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const groupKey = `gold-${letter}`;
                    return (
                      <div key={groupKey}>
                        {renderIntermediateGroup(groupKey, `Girone Gold ${letter}`, "gold")}
                      </div>
                    );
                  })}
                  {renderFinalsForGroups("gold", "Fasi Finali GOLD 🏆", "gold")}
                </section>

                <div className="border-t-4 border-dashed border-gray-200 my-16"></div>

                <section>
                  <h2 className="text-2xl md:text-4xl font-black text-gray-500 uppercase tracking-tighter mb-8">🥈 Gironi Intermedi SILVER</h2>
                  {Array.from({ length: numSilverGironi }, (_, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const groupKey = `silver-${letter}`;
                    return (
                      <div key={groupKey}>
                        {renderIntermediateGroup(groupKey, `Girone Silver ${letter}`, "silver")}
                      </div>
                    );
                  })}
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
