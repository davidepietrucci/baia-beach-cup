"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
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

export default function GironiPubblici() {
  const [tornei, setTornei] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("gironi"); // "gironi", "partite", "finali"
  const [fasiFinaliCategory, setFasiFinaliCategory] = useState("gold"); // "gold" or "silver"
  const [viewMode, setViewMode] = useState("campoMare"); // "campoMare" or "campoMonte"
  const [loading, setLoading] = useState(true);
  const [hoveredMatch, setHoveredMatch] = useState(null); // { roundKey, matchNum }

  const getHighlightedMatches = (round, num) => {
    if (!round || !num) return new Set();
    const highlighted = new Set();
    highlighted.add(`${round}-${num}`);
    
    // Go Forward
    const getNextMatch = (r, n) => {
      if (r === "r32") return { round: "r16", num: Math.floor((n - 1) / 2) + 1 };
      if (r === "r16") return { round: "qf", num: Math.floor((n - 1) / 2) + 1 };
      if (r === "qf") return { round: "sf", num: Math.floor((n - 1) / 2) + 1 };
      if (r === "sf") return [
        { round: "f", num: 1 },
        { round: "f", num: 2 }
      ];
      return null;
    };
    
    let queue = [{ r: round, n: num }];
    while (queue.length > 0) {
      const nextQueue = [];
      for (const item of queue) {
        const next = getNextMatch(item.r, item.n);
        if (next) {
          if (Array.isArray(next)) {
            for (const n of next) {
              highlighted.add(`${n.round}-${n.num}`);
              nextQueue.push({ r: n.round, n: n.num });
            }
          } else {
            highlighted.add(`${next.round}-${next.num}`);
            nextQueue.push({ r: next.round, n: next.num });
          }
        }
      }
      queue = nextQueue;
    }
    
    // Go Backward
    const getPrevMatches = (r, n) => {
      if (r === "f") return [
        { round: "sf", num: 1 },
        { round: "sf", num: 2 }
      ];
      if (r === "sf") return [
        { round: "qf", num: 2 * n - 1 },
        { round: "qf", num: 2 * n }
      ];
      if (r === "qf") return [
        { round: "r16", num: 2 * n - 1 },
        { round: "r16", num: 2 * n }
      ];
      if (r === "r16") return [
        { round: "r32", num: 2 * n - 1 },
        { round: "r32", num: 2 * n }
      ];
      return null;
    };
    
    let backQueue = [{ r: round, n: num }];
    while (backQueue.length > 0) {
      const nextQueue = [];
      for (const item of backQueue) {
        const prevs = getPrevMatches(item.r, item.n);
        if (prevs) {
          for (const p of prevs) {
            highlighted.add(`${p.round}-${p.num}`);
            nextQueue.push({ r: p.round, n: p.num });
          }
        }
      }
      backQueue = nextQueue;
    }
    return highlighted;
  };

  const highlightedMatches = getHighlightedMatches(hoveredMatch?.roundKey, hoveredMatch?.matchNum);

  // 1. Carica l'elenco dei tornei e determina quello da visualizzare
  useEffect(() => {
    getTornei().then((parsed) => {
      setTornei(parsed);

      const params = new URLSearchParams(window.location.search);
      const urlTour = params.get("tour");

      if (urlTour && parsed.some((t) => t.nome === urlTour)) {
        setSelectedTorneo(urlTour);
      } else {
        // Cerca tornei attivi per primi
        const attivi = parsed.filter(
          (t) => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione"
        );
        if (attivi.length > 0) {
          setSelectedTorneo(attivi[0].nome);
        } else if (parsed.length > 0) {
          setSelectedTorneo(parsed[0].nome);
        }
      }
      setLoading(false);
    });
  }, []);

  // 2. Caricamento live dei gironi e dei bracket del torneo selezionato
  useEffect(() => {
    if (!selectedTorneo) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, "_");

    const fetchLive = () => {
      getGironi(slug).then((data) => {
        setConfig(data);
      });
      getBracket(slug).then((data) => {
        setBracketConfig(data);
      });
    };

    fetchLive();
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
  }, [selectedTorneo]);

  // Auto-switch tab if only bracket is published
  useEffect(() => {
    const isPub = !!(config && config.pubblicato);
    const isBracketPub = !!(bracketConfig && bracketConfig.tabellonePubblicato);
    if (isBracketPub && !isPub) {
      setActiveTab("finali");
    }
  }, [config, bracketConfig]);

  const selectedTorneoObj = tornei.find((t) => t.nome === selectedTorneo);
  const isConcluso = selectedTorneoObj?.stato === "Concluso";
  const isPublished = config && config.pubblicato;
  const isBracketPublished = bracketConfig && bracketConfig.tabellonePubblicato;
  const rankingType = config?.rankingType || "avulsa";

  // 3. Calcola la lista dei gironi iniziali
  const getInitialGroupsList = (currentConfig = config) => {
    const list = [];
    if (currentConfig && currentConfig.numGironi) {
      for (let i = 0; i < currentConfig.numGironi; i++) {
        const label = String.fromCharCode(65 + i);
        list.push({ id: label, label: `Girone ${label}`, type: "iniziale" });
      }
    }
    return list;
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return Infinity; // Put untimed matches at the end
    const parts = timeStr.trim().split(":");
    if (parts.length < 2) return Infinity;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return Infinity;
    return hours * 60 + minutes;
  };

  const sortMatchesChronologically = (matches) => {
    return [...matches].sort((a, b) => {
      const timeA = parseTimeToMinutes(a.meta?.time);
      const timeB = parseTimeToMinutes(b.meta?.time);
      if (timeA !== timeB) return timeA - timeB;
      const courtA = parseInt(a.meta?.court) || 0;
      const courtB = parseInt(b.meta?.court) || 0;
      return courtA - courtB;
    });
  };

  const getAllInitialMatches = () => {
    const initialGroups = getInitialGroupsList();
    let all = [];
    initialGroups.forEach((group) => {
      const schedule = getScheduleFixed(
        config?.teamCounts?.[group.id] || 0,
        group.id,
        config?.gironeAssignments?.[group.id] || {}
      );
      schedule.forEach((m, idx) => {
        all.push({
          left: m.left,
          right: m.right,
          meta: config?.matchMetadata?.[`${group.id}-${idx}`] || {},
          gironeId: group.id,
          idx: idx
        });
      });
    });
    return all;
  };

  // 4. Calcola la lista dei gironi intermedi (Gold/Silver) se presenti
  const getIntermediateGroupsList = () => {
    const list = [];
    if (
      bracketConfig &&
      bracketConfig.phaseType === "gold_silver" &&
      bracketConfig.subPhaseType === "groups"
    ) {
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

      for (let i = 0; i < numGoldGironi; i++) {
        const letter = String.fromCharCode(65 + i);
        list.push({ id: `gold-${letter}`, label: `Gold ${letter} 🏆`, type: "intermedio", category: "gold" });
      }
      for (let i = 0; i < numSilverGironi; i++) {
        const letter = String.fromCharCode(65 + i);
        list.push({ id: `silver-${letter}`, label: `Silver ${letter} 🥈`, type: "intermedio", category: "silver" });
      }
    }
    return list;
  };

  // Logica per il calendario incontri
  const getSchedule = (numTeams, gironeId, assignments = {}) => {
    return getScheduleShared(numTeams, gironeId, assignments, config?.gironeTypes, config?.gironeSets, config?.matchMetadata);
  };

  // Fix fontName typo
  const getScheduleFixed = (numTeams, gironeId, assignments = {}) => {
    return getScheduleShared(numTeams, gironeId, assignments, config?.gironeTypes, config?.gironeSets, config?.matchMetadata);
  };

  const getGroupTeams = (groupId, type) => {
    if (type === "intermedio") {
      if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
      const assignments = bracketConfig.bracketAssignments;
      const isGold = groupId.startsWith("gold");
      const numTeams = isGold 
        ? (bracketConfig.teamsPerGoldGirone || 4) 
        : (bracketConfig.teamsPerSilverGirone || 4);
      const teams = [];
      for (let i = 0; i < numTeams; i++) {
        teams.push(assignments[`${groupId}-${i}`]);
      }
      return teams.filter((t) => t && t !== "—" && t !== "Slot Libero");
    } else {
      if (!config || !config.gironeAssignments || !config.gironeAssignments[groupId]) return [];
      const assignments = config.gironeAssignments[groupId];
      const teamCount = config.teamCounts[groupId] || 0;
      const list = [];
      for (let i = 0; i < teamCount; i++) {
        const name = assignments[i];
        if (name && name !== "—" && name !== "Slot Libero") {
          list.push(name);
        }
      }
      return list;
    }
  };

  const calculateRanking = (groupId) => {
    if (!config || !config.gironeAssignments || !config.gironeAssignments[groupId]) return [];

    const assignments = config.gironeAssignments[groupId];
    const teamCount = config.teamCounts[groupId] || 0;
    const metadata = config.matchMetadata || {};
    const isThreeSets = config.gironeSets?.[groupId] === "3 set";

    const stats = {};
    for (let i = 0; i < teamCount; i++) {
      const name = assignments[i];
      if (name && name !== "—" && name !== "Slot Libero") {
        stats[name] = {
          nome: name,
          giocate: 0,
          vinte: 0,
          perse: 0,
          puntiFatti: 0,
          puntiSubiti: 0,
          score: 0,
        };
      }
    }

    const schedule = getScheduleFixed(teamCount, groupId, assignments);
    schedule.forEach((match, i) => {
      const meta = metadata[`${groupId}-${i}`];
      if (!meta) return;

      const teamL = match.left;
      const teamR = match.right;

      if (!stats[teamL] || !stats[teamR]) return;

      const s1L = parseInt(meta.s1L || 0),
        s1R = parseInt(meta.s1R || 0);
      const s2L = parseInt(meta.s2L || 0),
        s2R = parseInt(meta.s2R || 0);
      const s3L = parseInt(meta.s3L || 0),
        s3R = parseInt(meta.s3R || 0);
      if (s1L === 0 && s1R === 0) return;

      stats[teamL].giocate++;
      stats[teamR].giocate++;
      stats[teamL].puntiFatti += s1L + s2L + s3L;
      stats[teamL].puntiSubiti += s1R + s2R + s3R;
      stats[teamR].puntiFatti += s1R + s2R + s3R;
      stats[teamR].puntiSubiti += s1L + s2L + s3L;

      let matchWinL = 0;
      if (isThreeSets) {
        let setsL = 0,
          setsR = 0;
        if (s1L > s1R) setsL++;
        else if (s1R > s1L) setsR++;
        if (s2L > s2R) setsL++;
        else if (s2R > s2L) setsR++;
        if (s3L > s3R) setsL++;
        else if (s3R > s3L) setsR++;
        matchWinL = setsL > setsR ? 1 : 0;
      } else {
        matchWinL = s1L > s1R ? 1 : 0;
      }
      if (matchWinL) {
        stats[teamL].vinte++;
        stats[teamL].score++;
        stats[teamR].perse++;
      } else {
        stats[teamR].vinte++;
        stats[teamR].score++;
        stats[teamL].perse++;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const qzTeamA = a.puntiSubiti === 0 ? a.puntiFatti : a.puntiFatti / a.puntiSubiti;
      const qzTeamB = b.puntiSubiti === 0 ? b.puntiFatti : b.puntiFatti / b.puntiSubiti;
      return qzTeamB - qzTeamA;
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
          meta: metadata[mKey] || {},
        };
      })
      .filter(
        (m) =>
          m.left &&
          m.left !== "—" &&
          m.left !== "Slot Libero" &&
          m.right &&
          m.right !== "—" &&
          m.right !== "Slot Libero"
      );
  };

  // Restituisce la lista di partite playoff lineare
  const getPlayoffMatchesList = () => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const list = [];

    const getMatchData = (id, label) => {
      const left = assignments[`${id}-L`] || "TBD";
      const right = assignments[`${id}-R`] || "TBD";
      const meta = metadata[id] || {};
      return { id, label, left, right, meta };
    };

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
      let count = 1;
      for (let i = 0; i < numTeams; i++) {
        for (let j = i + 1; j < numTeams; j++) {
          pairs.push({ l: i, r: j, label: `Gara ${count++}` });
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

    if (bracketConfig.phaseType === "gold_silver") {
      const isGroups = bracketConfig.subPhaseType === "groups";
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

        if (goldGroupsDone) {
          list.push({
            title: "Semifinali Gold 🏆",
            matches: [getMatchData("gold-s1", "Semifinale 1"), getMatchData("gold-s2", "Semifinale 2")],
          });
        }
        if (goldGroupsDone && goldSemifinalsDone) {
          list.push({
            title: "Finali Gold 🏆",
            matches: [getMatchData("gold-f3", "Finale 3°/4° Posto"), getMatchData("gold-f1", "Finale 1°/2° Posto")],
          });
        }

        if (silverGroupsDone) {
          list.push({
            title: "Semifinali Silver 🥈",
            matches: [getMatchData("silver-s1", "Semifinale 1"), getMatchData("silver-s2", "Semifinale 2")],
          });
        }
        if (silverGroupsDone && silverSemifinalsDone) {
          list.push({
            title: "Finali Silver 🥈",
            matches: [getMatchData("silver-f3", "Finale 3°/4° Posto"), getMatchData("silver-f1", "Finale 1°/2° Posto")],
          });
        }
      } else {
        // --- DIRECT FLOW ---
        const tToGold = bracketConfig.teamsToGold || 8;
        const tToSilver = bracketConfig.teamsToSilver || 8;

        // Gold round matches definition
        const goldOttaviMatches = tToGold === 16 
          ? ["gold-o1", "gold-o2", "gold-o3", "gold-o4", "gold-o5", "gold-o6", "gold-o7", "gold-o8"]
          : tToGold === 12 
          ? ["gold-o1", "gold-o2", "gold-o3", "gold-o4"]
          : [];
        const goldQuartiMatches = ["gold-q1", "gold-q2", "gold-q3", "gold-q4"];
        const goldSemifinaliMatches = ["gold-s1", "gold-s2"];

        // Silver round matches definition
        const silverOttaviMatches = tToSilver === 16 
          ? ["silver-o1", "silver-o2", "silver-o3", "silver-o4", "silver-o5", "silver-o6", "silver-o7", "silver-o8"]
          : tToSilver === 12 
          ? ["silver-o1", "silver-o2", "silver-o3", "silver-o4"]
          : [];
        const silverQuartiMatches = ["silver-q1", "silver-q2", "silver-q3", "silver-q4"];
        const silverSemifinaliMatches = ["silver-s1", "silver-s2"];

        // Completion status
        const goldOttaviDone = goldOttaviMatches.length === 0 || isRoundCompleted(goldOttaviMatches);
        const goldQuartiDone = isRoundCompleted(goldQuartiMatches);
        const goldSemifinaliDone = isRoundCompleted(goldSemifinaliMatches);

        const silverOttaviDone = silverOttaviMatches.length === 0 || isRoundCompleted(silverOttaviMatches);
        const silverQuartiDone = isRoundCompleted(silverQuartiMatches);
        const silverSemifinaliDone = isRoundCompleted(silverSemifinaliMatches);

        // Gold additions
        if (tToGold === 12 || tToGold === 16) {
          list.push({
            title: "Ottavi Gold 🏆",
            matches: tToGold === 16 
              ? [
                  getMatchData("gold-o1", "Ottavo 1"), getMatchData("gold-o2", "Ottavo 2"),
                  getMatchData("gold-o3", "Ottavo 3"), getMatchData("gold-o4", "Ottavo 4"),
                  getMatchData("gold-o5", "Ottavo 5"), getMatchData("gold-o6", "Ottavo 6"),
                  getMatchData("gold-o7", "Ottavo 7"), getMatchData("gold-o8", "Ottavo 8")
                ]
              : [
                  getMatchData("gold-o1", "Ottavo 1"), getMatchData("gold-o2", "Ottavo 2"),
                  getMatchData("gold-o3", "Ottavo 3"), getMatchData("gold-o4", "Ottavo 4")
                ]
          });
        }

        if (tToGold >= 8 && goldOttaviDone) {
          list.push({
            title: "Quarti Gold 🏆",
            matches: [
              getMatchData("gold-q1", "Quarto 1"), getMatchData("gold-q2", "Quarto 2"),
              getMatchData("gold-q3", "Quarto 3"), getMatchData("gold-q4", "Quarto 4")
            ]
          });
        }

        const canShowGoldSemifinali = tToGold === 4 || (tToGold >= 8 && goldOttaviDone && goldQuartiDone);
        if (canShowGoldSemifinali) {
          list.push({
            title: "Semifinali Gold 🏆",
            matches: [getMatchData("gold-s1", "Semifinale 1"), getMatchData("gold-s2", "Semifinale 2")],
          });
        }

        if (canShowGoldSemifinali && goldSemifinaliDone) {
          list.push({
            title: "Finali Gold 🏆",
            matches: [getMatchData("gold-f3", "Finale 3°/4° Posto"), getMatchData("gold-f1", "Finale 1°/2° Posto")],
          });
        }

        // Silver additions
        if (tToSilver === 12 || tToSilver === 16) {
          list.push({
            title: "Ottavi Silver 🥈",
            matches: tToSilver === 16 
              ? [
                  getMatchData("silver-o1", "Ottavo 1"), getMatchData("silver-o2", "Ottavo 2"),
                  getMatchData("silver-o3", "Ottavo 3"), getMatchData("silver-o4", "Ottavo 4"),
                  getMatchData("silver-o5", "Ottavo 5"), getMatchData("silver-o6", "Ottavo 6"),
                  getMatchData("silver-o7", "Ottavo 7"), getMatchData("silver-o8", "Ottavo 8")
                ]
              : [
                  getMatchData("silver-o1", "Ottavo 1"), getMatchData("silver-o2", "Ottavo 2"),
                  getMatchData("silver-o3", "Ottavo 3"), getMatchData("silver-o4", "Ottavo 4")
                ]
          });
        }

        if (tToSilver >= 8 && silverOttaviDone) {
          list.push({
            title: "Quarti Silver 🥈",
            matches: [
              getMatchData("silver-q1", "Quarto 1"), getMatchData("silver-q2", "Quarto 2"),
              getMatchData("silver-q3", "Quarto 3"), getMatchData("silver-q4", "Quarto 4")
            ]
          });
        }

        const canShowSilverSemifinali = tToSilver === 4 || (tToSilver >= 8 && silverOttaviDone && silverQuartiDone);
        if (canShowSilverSemifinali) {
          list.push({
            title: "Semifinali Silver 🥈",
            matches: [getMatchData("silver-s1", "Semifinale 1"), getMatchData("silver-s2", "Semifinale 2")],
          });
        }

        if (canShowSilverSemifinali && silverSemifinaliDone) {
          list.push({
            title: "Finali Silver 🥈",
            matches: [getMatchData("silver-f3", "Finale 3°/4° Posto"), getMatchData("silver-f1", "Finale 1°/2° Posto")],
          });
        }
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

      if (bracketConfig.bracketSize === 8) {
        list.push({
          title: "Quarti Vincenti (Winners QF) 🏆",
          matches: [
            getMatchData("wb-q1", "Winners Quarto 1"),
            getMatchData("wb-q2", "Winners Quarto 2"),
            getMatchData("wb-q3", "Winners Quarto 3"),
            getMatchData("wb-q4", "Winners Quarto 4"),
          ],
        });
      }
      if (wbQuartiDone) {
        list.push({
          title: "Semifinali Vincenti (Winners SF) 🏆",
          matches: [getMatchData("wb-s1", "Winners Semifinale 1"), getMatchData("wb-s2", "Winners Semifinale 2")],
        });
      }
      if (wbQuartiDone && wbSemifinaliDone) {
        list.push({
          title: "Finale Vincenti (Winners Final) 🏆",
          matches: [getMatchData("wb-f", "Finale Vincenti")],
        });
        list.push({
          title: "Semifinali Perdenti (Losers SF) 🔄",
          matches: [getMatchData("lb-s1", "Losers Semifinale 1"), getMatchData("lb-s2", "Losers Semifinale 2")],
        });
      }
      if (wbQuartiDone && wbSemifinaliDone && lbSemifinaliDone) {
        list.push({
          title: "Finale Perdenti (Losers Final) 🔄",
          matches: [getMatchData("lb-f", "Finale Perdenti")],
        });
      }
      if (wbQuartiDone && wbSemifinaliDone && lbSemifinaliDone && wbFinaleDone && lbFinaleDone) {
        list.push({ title: "Grand Final 👑", matches: [getMatchData("grand-final", "Finalissima")] });
      }
    }

    return list.filter((group) => group.matches.some((m) => m.left !== "TBD" || m.right !== "TBD"));
  };





  // Rendering del singolo blocco partita SofaScore
  const renderMatchRow = (teamL, teamR, meta, idx, matchKeyPrefix, gironeId = null, matchLabel = null) => {
    const isPlayoffMatch = !gironeId;
    const scoreL = isPlayoffMatch 
      ? parseInt(meta?.scoreL || 0) 
      : parseInt(meta?.s1L || meta?.scoreL || 0);
    const scoreR = isPlayoffMatch 
      ? parseInt(meta?.scoreR || 0) 
      : parseInt(meta?.s1R || meta?.scoreR || 0);
    const hasScore = isPlayoffMatch
      ? (meta?.scoreL !== undefined && meta?.scoreL !== "")
      : ((meta?.s1L !== undefined && meta?.s1L !== "") || (meta?.scoreL !== undefined && meta?.scoreL !== ""));

    // Altri set per partite a 3 set
    const s2L = parseInt(meta?.s2L || 0);
    const s2R = parseInt(meta?.s2R || 0);
    const s3L = parseInt(meta?.s3L || 0);
    const s3R = parseInt(meta?.s3R || 0);
    const isThreeSets = gironeId ? config?.gironeSets?.[gironeId] === "3 set" : false;

    const isMultiSetPlayoff = isPlayoffMatch && bracketConfig?.phaseType === "gold_silver" && (
      (matchLabel && (matchLabel.startsWith("Quarto") || matchLabel.startsWith("Semifinale") || matchLabel.startsWith("Finale"))) ||
      (matchKeyPrefix && (matchKeyPrefix.includes("Semifinali") || matchKeyPrefix.includes("Finali") || matchKeyPrefix.includes("Quarti")))
    );

    let isWinnerL = false;
    let isWinnerR = false;
    if (hasScore && (scoreL > 0 || scoreR > 0)) {
      if (isThreeSets) {
        let winL = 0,
          winR = 0;
        const s1L = parseInt(meta?.s1L || 0);
        const s1R = parseInt(meta?.s1R || 0);
        if (s1L > s1R) winL++;
        else if (s1R > s1L) winR++;
        if (s2L > s2R) winL++;
        else if (s2R > s2L) winR++;
        if (s3L > s3R) winL++;
        else if (s3R > s3L) winR++;
        isWinnerL = winL > winR;
        isWinnerR = winR > winL;
      } else {
        isWinnerL = scoreL > scoreR;
        isWinnerR = scoreR > scoreL;
      }
    }

    const namesL = splitNames(teamL).map(formatPlayerName);
    const namesR = splitNames(teamR).map(formatPlayerName);

    const getFontSizeClass = (namesArray) => {
      const maxL = Math.max(...namesArray.map((n) => n.length));
      if (maxL > 20) return "text-[13px] sm:text-[15px]";
      if (maxL > 15) return "text-[14px] sm:text-[16px]";
      if (maxL > 10) return "text-[15px] sm:text-[17px]";
      return "text-[16px] sm:text-[18px]";
    };

    const fontSizeL = getFontSizeClass(namesL);
    const fontSizeR = getFontSizeClass(namesR);

    const showResultsColors = hasScore && (scoreL > 0 || scoreR > 0);

    return (
      <div
        key={idx}
        id={`${matchKeyPrefix}-${idx}`}
        className="bg-white rounded-[1.6rem] p-5 border border-gray-100 shadow-sm flex flex-col gap-3 transition-all"
      >
        <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
          <span>{matchLabel || (gironeId ? `Girone ${gironeId.replace("gold-", "Gold ").replace("silver-", "Silver ")}` : `Gara ${idx + 1}`)}</span>
          <div className="flex gap-1.5">
            {meta?.time && (
              <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-lg text-[10px] font-bold">{meta.time}</span>
            )}
            {meta?.court && (
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-black text-[10px]">
                Campo {meta.court}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-1.5">
          {/* Team Left */}
          <div className="flex-1 text-right min-w-0 pr-1">
            <span
              className={`font-bold break-words leading-tight block ${fontSizeL} ${
                showResultsColors
                  ? isWinnerL
                    ? "text-green-700 font-black"
                    : "text-red-600 font-bold"
                  : "text-gray-700 font-bold"
              }`}
            >
              {namesL.map((name, pIdx) => (
                <span key={pIdx} className="block">
                  {name}
                </span>
              ))}
            </span>
          </div>

          {/* Score Badge */}
          <div className="shrink-0 flex flex-col items-center justify-center min-w-[70px]">
            {hasScore && (scoreL > 0 || scoreR > 0) && (
              <span className="text-[10px] font-black text-black uppercase tracking-wider mb-1.5">
                Finita
              </span>
            )}
            {hasScore && (scoreL > 0 || scoreR > 0) ? (
              <div className="text-[#0D3D31] font-black text-base sm:text-lg flex items-center gap-1.5">
                <span>{scoreL}</span>
                <span className="opacity-40">-</span>
                <span>{scoreR}</span>
              </div>
            ) : (
              <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-3.5 py-2 rounded-xl uppercase tracking-wider border border-gray-100">
                VS
              </span>
            )}
            {isThreeSets && hasScore && (scoreL > 0 || scoreR > 0) && (
              <span className="text-[10px] font-bold text-gray-400 mt-1">
                ({s2L}-{s2R}, {s3L}-{s3R})
              </span>
            )}
            {isMultiSetPlayoff && hasScore && (scoreL > 0 || scoreR > 0) && (
              <span className="text-[10px] font-bold text-gray-400 mt-1">
                ({meta?.s1L || 0}-{meta?.s1R || 0}, {meta?.s2L || 0}-{meta?.s2R || 0}{meta?.s3L || meta?.s3R ? `, ${meta.s3L || 0}-${meta.s3R || 0}` : ''})
              </span>
            )}
          </div>

          {/* Team Right */}
          <div className="flex-1 text-left min-w-0 pl-1">
            <span
              className={`font-bold break-words leading-tight block ${fontSizeR} ${
                showResultsColors
                  ? isWinnerR
                    ? "text-green-700 font-black"
                    : "text-red-600 font-bold"
                  : "text-gray-700 font-bold"
              }`}
            >
              {namesR.map((name, pIdx) => (
                <span key={pIdx} className="block">
                  {name}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render a bracket card in the public tree view
  const renderBracketCardPublic = (roundKey, matchNum, label) => {
    if (!bracketConfig) return null;
    const assignments = bracketConfig.bracketAssignments || {};
    const metadata = bracketConfig.bracketMetadata || {};

    const matchId = `${roundKey}-${matchNum}`;
    const teamL = assignments[`${matchId}-L`] || "";
    const teamR = assignments[`${matchId}-R`] || "";
    const meta = metadata[matchId] || {};

    const scoreL = meta.scoreL || "";
    const scoreR = meta.scoreR || "";

    const hasScore = scoreL !== "" && scoreR !== "";
    const isWinnerL = hasScore && parseInt(scoreL) > parseInt(scoreR);
    const isWinnerR = hasScore && parseInt(scoreR) > parseInt(scoreL);

    const time = meta.time || "";
    const court = meta.court || "";

    // Set scores list
    const sets = [];
    if (meta.s1L || meta.s1R) sets.push(`${meta.s1L || 0}-${meta.s1R || 0}`);
    if (meta.s2L || meta.s2R) sets.push(`${meta.s2L || 0}-${meta.s2R || 0}`);
    if (meta.s3L || meta.s3R) sets.push(`${meta.s3L || 0}-${meta.s3R || 0}`);

    const isHighlighted = highlightedMatches.has(matchId);

    const handleCardClick = () => {
      setHoveredMatch((prev) => {
        if (prev?.roundKey === roundKey && prev?.matchNum === matchNum) {
          return null;
        }
        return { roundKey, matchNum };
      });
    };

    return (
      <div 
        onClick={handleCardClick}
        onMouseEnter={() => setHoveredMatch({ roundKey, matchNum })}
        onMouseLeave={() => setHoveredMatch(null)}
        className={`bg-white rounded-2xl border-2 transition-all p-3.5 min-w-[210px] relative select-none cursor-pointer ${
          isHighlighted 
            ? "border-[#C3562B] shadow-md ring-2 ring-[#C3562B]/10 z-20 scale-[1.02]" 
            : "border-gray-100 shadow-sm hover:border-[#C3562B] hover:shadow-lg"
        }`}
      >
        {/* Card Header info */}
        <div className="flex justify-between items-center mb-2 border-b border-gray-50 pb-1">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
          <div className="flex gap-1 text-[8px] font-black uppercase">
            {time && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{time}</span>}
            {court && <span className="bg-orange-50 text-[#C3562B] px-1.5 py-0.5 rounded">C. {court}</span>}
          </div>
        </div>

        {/* Teams List */}
        <div className="space-y-1.5">
          {/* Team Left */}
          <div className="flex items-center justify-between text-xs">
            <span className={`truncate font-bold max-w-[145px] ${hasScore ? (isWinnerL ? "text-green-700 font-black" : "text-gray-400") : "text-gray-700"}`}>
              {teamL || "—"}
            </span>
            <span className={`w-5.5 h-5.5 rounded flex items-center justify-center font-black text-[11px] ${hasScore ? (isWinnerL ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400") : "bg-gray-50 text-gray-400"}`}>
              {scoreL !== "" ? scoreL : "-"}
            </span>
          </div>

          {/* Team Right */}
          <div className="flex items-center justify-between text-xs">
            <span className={`truncate font-bold max-w-[145px] ${hasScore ? (isWinnerR ? "text-green-700 font-black" : "text-gray-400") : "text-gray-700"}`}>
              {teamR || "—"}
            </span>
            <span className={`w-5.5 h-5.5 rounded flex items-center justify-center font-black text-[11px] ${hasScore ? (isWinnerR ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400") : "bg-gray-50 text-gray-400"}`}>
              {scoreR !== "" ? scoreR : "-"}
            </span>
          </div>
        </div>

        {/* Inline Set scores */}
        {sets.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-gray-50 text-[9px] text-gray-400 font-bold text-center">
            {sets.join(" , ")}
          </div>
        )}
      </div>
    );
  };

  // Connector lines drawing for public page
  const renderConnectorLinePublic = (roundKey, matchIndex, totalMatches, H) => {
    const itemHeight = H / totalMatches;
    const center = (matchIndex - 0.5) * itemHeight;

    const isEven = matchIndex % 2 === 0;
    const halfGap = itemHeight / 2;

    const verticalLineTop = isEven ? center - halfGap : center;
    const verticalLineHeight = halfGap;

    const sourceKey = `${roundKey}-${matchIndex}`;
    let targetKey = "";
    if (roundKey === "r32") targetKey = `r16-${Math.floor((matchIndex - 1) / 2) + 1}`;
    else if (roundKey === "r16") targetKey = `qf-${Math.floor((matchIndex - 1) / 2) + 1}`;
    else if (roundKey === "qf") targetKey = `sf-${Math.floor((matchIndex - 1) / 2) + 1}`;

    const isLineHighlighted = highlightedMatches.has(sourceKey) && highlightedMatches.has(targetKey);
    const lineColorClass = isLineHighlighted ? "bg-[#C3562B]" : "bg-gray-200";
    const lineZIndexClass = isLineHighlighted ? "z-10" : "z-0";

    return (
      <div className={`absolute inset-0 pointer-events-none ${lineZIndexClass}`}>
        {/* Horizontal segment leaving match card */}
        <div 
          className={`absolute ${lineColorClass}`}
          style={{
            top: `${center}px`,
            right: "-16px",
            width: "32px",
            height: "2px",
            transform: "translateY(-50%)"
          }}
        />

        {/* Vertical segment connecting the pair */}
        <div 
          className={`absolute ${lineColorClass}`}
          style={{
            top: `${verticalLineTop}px`,
            right: "-16px",
            width: "2px",
            height: `${verticalLineHeight}px`
          }}
        />

        {/* Horizontal segment extending to next round */}
        <div 
          className={`absolute ${lineColorClass}`}
          style={{
            top: `${isEven ? center - halfGap : center + halfGap}px`,
            right: "-32px",
            width: "16px",
            height: "2px",
            transform: "translateY(-50%)"
          }}
        />
      </div>
    );
  };

  // Dimension helpers for dynamic scaling
  const getDynamicTreeDimensions = () => {
    if (!bracketConfig) return { w: 1050, h: 800 };
    const size = bracketConfig.bracketSize || 16;
    if (size === 32) return { w: 1300, h: 1920 };
    if (size === 16) return { w: 1050, h: 960 };
    if (size === 8) return { w: 800, h: 560 };
    return { w: 550, h: 360 };
  };

  const { w: currentW, h: currentH } = getDynamicTreeDimensions();
  const sfHalfGap = currentH / 4;

  return (
    <main className="min-h-screen bg-[#f4f7f6] pb-24">
      {/* Header Mobile Premium */}
      <header
        style={{ backgroundColor: "#0D3D31" }}
        className="text-white py-4 px-5 flex justify-between items-center shadow-md border-b-4 border-[#C3562B] sticky top-0 z-50"
      >
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Baia Beach Cup Logo" width={32} height={32} />
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-none">Baia Beach Cup Live</h1>
          </div>
        </div>
        <a
          href="/"
          className="text-[9px] font-black bg-[#C3562B] text-[#0D3D31] px-4 py-1.5 rounded-xl transition-transform active:scale-95 shadow-sm uppercase tracking-wider"
        >
          Home
        </a>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Torneo Info Title Card */}
        <div className="relative bg-white rounded-3xl p-5 border border-gray-100 shadow-sm overflow-hidden text-center">
          {isConcluso ? (
            <span className="inline-block px-3 py-1 rounded-full text-[8px] font-black bg-gray-100 text-gray-600 uppercase tracking-widest mb-2">
              Concluso 🏁
            </span>
          ) : (
            <span className="inline-block px-3 py-1 rounded-full text-[8px] font-black bg-green-100 text-green-700 uppercase tracking-widest mb-2 animate-pulse">
              Torneo Attivo 🟢
            </span>
          )}
          <h2 className="text-xl font-black text-[#0D3D31] uppercase tracking-tighter leading-tight">
            {selectedTorneo || "Nessun Torneo"}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1.5">
            {selectedTorneoObj?.categoria} · {selectedTorneoObj?.data}
          </p>


        </div>

        {/* Controllo Pubblicazione */}
        {isPublished || isBracketPublished ? (
          <>
            {/* 1. SEZIONE GIRONI (COMPOSIZIONE SQUADRE INIZIALI) */}
            {activeTab === "gironi" && (
              <div className="space-y-5">
                {isPublished ? (
                  <>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Composizione Gironi
                    </h3>
                    <div className="space-y-4">
                      {getInitialGroupsList().map((group) => {
                        const teams = getGroupTeams(group.id, group.type);
                        return (
                          <div
                            key={group.id}
                            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"
                          >
                            <h4 className="text-sm font-black text-[#0D3D31] uppercase tracking-tight border-b border-gray-50 pb-3 mb-3 flex items-center justify-between">
                              <span>{group.label}</span>
                              <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                {teams.length} Squadre
                              </span>
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                  <tr>
                                    <th className="pl-4 py-3 w-10 text-center">Pos</th>
                                    <th className="px-2 py-3">Squadra</th>
                                    <th className="px-2 py-3 text-center w-8">V</th>
                                    <th className="px-2 py-3 text-center w-10">PF</th>
                                    <th className="px-2 py-3 text-center w-10">PS</th>
                                    <th className="pr-4 py-3 text-right w-12">Quoz.</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-xs font-bold">
                                  {calculateRanking(group.id).map((team, idx) => {
                                    const isQualified = idx < 2;
                                    const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                                    return (
                                      <tr
                                        key={team.nome}
                                        className={`hover:bg-blue-50/10 transition-colors ${
                                          isQualified ? "bg-yellow-50/10" : ""
                                        }`}
                                      >
                                        <td className="pl-4 py-3.5 text-center">
                                          <span
                                            className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black mx-auto ${
                                              isQualified
                                                ? "bg-yellow-400 text-white shadow-sm"
                                                : "bg-gray-100 text-gray-400"
                                            }`}
                                          >
                                            {idx + 1}
                                          </span>
                                        </td>
                                        <td className="px-2 py-3.5 text-[#0D3D31] font-black tracking-tight leading-tight text-[13px] sm:text-[14px]">
                                          {splitNames(team.nome).map(formatPlayerName).map((player, pIdx) => (
                                            <span key={pIdx} className="block truncate max-w-[140px]">
                                              {player}
                                            </span>
                                          ))}
                                        </td>
                                        <td className="px-2 py-3.5 text-center text-green-600 font-bold">
                                          {team.vinte}
                                        </td>
                                        <td className="px-2 py-3.5 text-center text-gray-600">
                                          {team.puntiFatti}
                                        </td>
                                        <td className="px-2 py-3.5 text-center text-gray-400">
                                          {team.puntiSubiti}
                                        </td>
                                        <td className="pr-4 py-3.5 text-right font-black text-xs text-[#0D3D31]">
                                          {quotient}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {calculateRanking(group.id).length === 0 && (
                                    <tr>
                                      <td colSpan="6" className="py-8 text-center text-gray-400 italic">
                                        Nessuna squadra in questo girone.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                      {getInitialGroupsList().length === 0 && (
                        <div className="bg-white rounded-3xl p-6 text-center border border-gray-100">
                          <p className="text-gray-400 italic text-xs">Nessun girone configurato.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
                    <span className="text-5xl mb-4 block">⏳</span>
                    <h3 className="text-lg font-black text-[#0D3D31] uppercase tracking-tight mb-2">
                      Gironi non ancora pubblicati
                    </h3>
                    <p className="text-gray-400 font-medium text-xs max-w-xs mx-auto">
                      La composizione e i risultati dei gironi saranno visibili non appena lo staff li pubblicherà.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. SEZIONE PARTITE */}
            {activeTab === "partite" && (
              <div className="space-y-6">
                {isPublished ? (
                  <>
                    <div className="flex bg-gray-200/60 p-1 rounded-2xl max-w-xs mx-auto border border-gray-100/50 shadow-inner mb-6">
                      <button
                        onClick={() => setViewMode("campoMare")}
                        className={`flex-1 py-2 text-center rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                          viewMode === "campoMare"
                            ? "bg-[#0D3D31] text-white shadow-md"
                            : "text-gray-400 hover:text-[#0D3D31]"
                        }`}
                      >
                        Campo Mare (1) 🌊
                      </button>
                      <button
                        onClick={() => setViewMode("campoMonte")}
                        className={`flex-1 py-2 text-center rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                          viewMode === "campoMonte"
                            ? "bg-[#0D3D31] text-white shadow-md"
                            : "text-gray-400 hover:text-[#0D3D31]"
                        }`}
                      >
                        Campo Monte (2) ⛰️
                      </button>
                    </div>

                    {viewMode === "campoMare" ? (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 border-l-4 border-[#C3562B] pl-2 mb-2">
                          Incontri - Campo Mare (1)
                        </h3>
                        <div className="space-y-3">
                          {sortMatchesChronologically(getAllInitialMatches())
                            .filter(m => {
                              const c = m.meta?.court ? m.meta.court.toString().trim() : "";
                              return c === "1" || c.toLowerCase().includes("mare") || c === "";
                            })
                            .map((m, idx) =>
                              renderMatchRow(
                                m.left,
                                m.right,
                                m.meta,
                                idx,
                                `match-${m.gironeId}`,
                                m.gironeId
                              )
                            )}
                          {getAllInitialMatches().filter(m => {
                            const c = m.meta?.court ? m.meta.court.toString().trim() : "";
                            return c === "1" || c.toLowerCase().includes("mare") || c === "";
                          }).length === 0 && (
                            <div className="bg-white rounded-3xl p-6 text-center border border-gray-100">
                              <p className="text-gray-400 italic text-xs">Nessun match in programma su questo campo.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 border-l-4 border-[#C3562B] pl-2 mb-2">
                          Incontri - Campo Monte (2)
                        </h3>
                        <div className="space-y-3">
                          {sortMatchesChronologically(getAllInitialMatches())
                            .filter(m => {
                              const c = m.meta?.court ? m.meta.court.toString().trim() : "";
                              return c === "2" || c.toLowerCase().includes("monte");
                            })
                            .map((m, idx) =>
                              renderMatchRow(
                                m.left,
                                m.right,
                                m.meta,
                                idx,
                                `match-${m.gironeId}`,
                                m.gironeId
                              )
                            )}
                          {getAllInitialMatches().filter(m => {
                            const c = m.meta?.court ? m.meta.court.toString().trim() : "";
                            return c === "2" || c.toLowerCase().includes("monte");
                          }).length === 0 && (
                            <div className="bg-white rounded-3xl p-6 text-center border border-gray-100">
                              <p className="text-gray-400 italic text-xs">Nessun match in programma su questo campo.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
                    <span className="text-5xl mb-4 block">⏳</span>
                    <h3 className="text-lg font-black text-[#0D3D31] uppercase tracking-tight mb-2">
                      Partite non ancora pubblicate
                    </h3>
                    <p className="text-gray-400 font-medium text-xs max-w-xs mx-auto">
                      Il calendario delle partite sarà visibile non appena lo staff lo pubblicherà.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 4. SEZIONE FASI FINALI */}
            {activeTab === "finali" && isBracketPublished && (
              <div className="space-y-4 select-none animate-fade-in">
                <div className="flex justify-between items-center pl-1 border-l-4 border-[#C3562B] pl-2">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Tabellone ad Albero
                  </h3>
                  <span className="text-[9px] font-black text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded">
                    Scorri per esplorare ↔
                  </span>
                </div>
                
                {/* Horizontal scroll container for tree bracket */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto pb-4 pt-6 px-4 no-scrollbar">
                  <div style={{ minWidth: `${currentW}px` }}>
                    {/* Headers Row */}
                    <div className="flex gap-8 mb-6 border-b border-gray-100 pb-3 sticky top-0 bg-white z-20">
                      {bracketConfig.bracketSize >= 32 && (
                        <div className="flex-1 text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 bg-white">Sedicesimi</div>
                      )}
                      {bracketConfig.bracketSize >= 16 && (
                        <div className="flex-1 text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 bg-white">Ottavi</div>
                      )}
                      {bracketConfig.bracketSize >= 8 && (
                        <div className="flex-1 text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 bg-white">Quarti</div>
                      )}
                      {bracketConfig.bracketSize >= 4 && (
                        <div className="flex-1 text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 bg-white">Semifinali</div>
                      )}
                      <div className="flex-1 text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 bg-white">Finali</div>
                    </div>

                    {/* Columns Row */}
                    <div className="flex gap-8 relative" style={{ height: `${currentH}px` }}>
                      
                      {/* 1. Round of 32 */}
                      {bracketConfig.bracketSize >= 32 && (
                        <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                          {Array.from({ length: 16 }, (_, idx) => {
                            const matchNum = idx + 1;
                            const itemHeight = currentH / 16;
                            const center = (matchNum - 0.5) * itemHeight;
                            return (
                              <div key={idx}>
                                <div className="absolute left-0 right-4 z-10" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                                  {renderBracketCardPublic("r32", matchNum, `Gara ${matchNum}`)}
                                </div>
                                {renderConnectorLinePublic("r32", matchNum, 16, currentH)}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Round of 16 */}
                      {bracketConfig.bracketSize >= 16 && (
                        <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                          {Array.from({ length: 8 }, (_, idx) => {
                            const matchNum = idx + 1;
                            const itemHeight = currentH / 8;
                            const center = (matchNum - 0.5) * itemHeight;
                            return (
                              <div key={idx}>
                                <div className="absolute left-0 right-4 z-10" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                                  {renderBracketCardPublic("r16", matchNum, `Ottavi ${matchNum}`)}
                                </div>
                                {renderConnectorLinePublic("r16", matchNum, 8, currentH)}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. Quarterfinals */}
                      {bracketConfig.bracketSize >= 8 && (
                        <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                          {Array.from({ length: 4 }, (_, idx) => {
                            const matchNum = idx + 1;
                            const itemHeight = currentH / 4;
                            const center = (matchNum - 0.5) * itemHeight;
                            return (
                              <div key={idx}>
                                <div className="absolute left-0 right-4 z-10" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                                  {renderBracketCardPublic("qf", matchNum, `Quarti ${matchNum}`)}
                                </div>
                                {renderConnectorLinePublic("qf", matchNum, 4, currentH)}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 4. Semifinals */}
                      {bracketConfig.bracketSize >= 4 && (
                        <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                          {Array.from({ length: 2 }, (_, idx) => {
                            const matchNum = idx + 1;
                            const itemHeight = currentH / 2;
                            const center = (matchNum - 0.5) * itemHeight;
                            return (
                              <div key={idx}>
                                <div className="absolute left-0 right-4 z-10" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                                  {renderBracketCardPublic("sf", matchNum, `Semifinale ${matchNum}`)}
                                </div>
                                {/* SF to Final lines */}
                                {(() => {
                                  const isSFToF1Highlighted = highlightedMatches.has(`sf-${matchNum}`) && highlightedMatches.has("f-1");
                                  const isSFToF2Highlighted = highlightedMatches.has(`sf-${matchNum}`) && highlightedMatches.has("f-2");

                                  const f1ColorClass = isSFToF1Highlighted ? "bg-[#C3562B]" : "bg-gray-200";
                                  const f2ColorClass = isSFToF2Highlighted ? "bg-[#C3562B]" : "bg-gray-200";

                                  const containerZIndex = (isSFToF1Highlighted || isSFToF2Highlighted) ? "z-10" : "z-0";

                                  return (
                                    <div className={`absolute inset-0 pointer-events-none ${containerZIndex}`}>
                                      {/* SF to Final 1 lines */}
                                      <div className={`absolute ${f1ColorClass}`} style={{ top: `${center}px`, right: "-16px", width: "32px", height: "2px", transform: "translateY(-50%)" }} />
                                      <div className={`absolute ${f1ColorClass}`} style={{ top: `${idx === 0 ? center : center - sfHalfGap}px`, right: "-16px", width: "2px", height: `${sfHalfGap}px` }} />
                                      <div className={`absolute ${f1ColorClass}`} style={{ top: `${sfHalfGap}px`, right: "-32px", width: "16px", height: "2px", transform: "translateY(-50%)" }} />

                                      {/* SF to Final 3/4 lines */}
                                      <div className={`absolute ${f2ColorClass}`} style={{ top: `${center}px`, right: "-24px", width: "40px", height: "2px", transform: "translateY(-50%)" }} />
                                      <div className={`absolute ${f2ColorClass}`} style={{ top: `${idx === 0 ? center : center - sfHalfGap}px`, right: "-24px", width: "2px", height: `${sfHalfGap}px` }} />
                                      <div className={`absolute ${f2ColorClass}`} style={{ top: `${sfHalfGap * 3}px`, right: "-32px", width: "8px", height: "2px", transform: "translateY(-50%)" }} />
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. Finals */}
                      <div className="flex-1 h-full relative">
                        
                        {/* 1st Place */}
                        <div className="absolute left-0 right-0 z-10" style={{ top: `${currentH / 4}px`, transform: "translateY(-50%)" }}>
                          <div className="text-[9px] font-black text-yellow-600 uppercase tracking-widest text-center mb-1 pb-1">Finalissima 🥇</div>
                          {renderBracketCardPublic("f", 1, "1°/2° Posto")}
                        </div>

                        {/* 3rd Place */}
                        <div className="absolute left-0 right-0 z-10" style={{ top: `${(currentH / 4) * 3}px`, transform: "translateY(-50%)" }}>
                          <div className="text-[9px] font-black text-amber-700 uppercase tracking-widest text-center mb-1 pb-1">Finale 3° Posto 🥉</div>
                          {renderBracketCardPublic("f", 2, "3°/4° Posto")}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Messaggio Gironi non Pubblicati */
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
            <span className="text-5xl mb-4 block">⏳</span>
            <h3 className="text-lg font-black text-[#0D3D31] uppercase tracking-tight mb-2">
              Calendario in Elaborazione
            </h3>
            <p className="text-gray-400 font-medium text-xs max-w-xs mx-auto">
              Lo staff sta configurando i gironi e le partite per il torneo. I dati saranno visibili in
              tempo reale su questa pagina non appena verranno pubblicati!
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM NAV BAR FISSA - 4 Pulsanti */}
      {(isPublished || isBracketPublished) && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="absolute inset-0 bg-[#0D3D31]/95 backdrop-blur-xl border-t border-blue-950/80 shadow-[0_-4px_30px_rgba(0,0,0,0.25)]" />
          <div className="relative flex justify-around px-1 pb-safe">
            {/* Pulsante Gironi (Composizione) */}
            <button
              onClick={() => setActiveTab("gironi")}
              className={`relative flex flex-col items-center gap-1.5 py-5.5 px-3 flex-1 active:scale-95 transition-transform ${
                activeTab === "gironi" ? "text-[#C3562B]" : "text-slate-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={activeTab === "gironi" ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={activeTab === "gironi" ? 0 : 2}
                className="w-7 h-7 transition-colors"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest transition-colors">
                Gironi
              </span>
              {activeTab === "gironi" && (
                <span className="absolute top-3 w-1.5 h-1.5 rounded-full bg-[#C3562B]" />
              )}
            </button>

            {/* Pulsante Partite */}
            <button
              onClick={() => setActiveTab("partite")}
              className={`relative flex flex-col items-center gap-1.5 py-5.5 px-3 flex-1 active:scale-95 transition-transform ${
                activeTab === "partite" ? "text-[#C3562B]" : "text-slate-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={activeTab === "partite" ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={activeTab === "partite" ? 0 : 2}
                className="w-7 h-7 transition-colors"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest transition-colors">
                Partite
              </span>
              {activeTab === "partite" && (
                <span className="absolute top-3 w-1.5 h-1.5 rounded-full bg-[#C3562B]" />
              )}
            </button>



            {/* Pulsante Fasi Finali - visibile solo se tabellone pubblicato */}
            {isBracketPublished && (
            <button
              onClick={() => setActiveTab("finali")}
              className={`relative flex flex-col items-center gap-1.5 py-5.5 px-3 flex-1 active:scale-95 transition-transform ${
                activeTab === "finali" ? "text-[#C3562B]" : "text-slate-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={activeTab === "finali" ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={activeTab === "finali" ? 0 : 2}
                className="w-7 h-7 transition-colors"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
                />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest transition-colors">
                Fasi Finali
              </span>
              {activeTab === "finali" && (
                <span className="absolute top-3 w-1.5 h-1.5 rounded-full bg-[#C3562B]" />
              )}
            </button>
            )}
          </div>
          {/* iOS spacer */}
          <div className="h-safe-area-inset-bottom bg-[#0D3D31]" />
        </nav>
      )}
    </main>
  );
}
