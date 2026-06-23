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

const defaultTestSponsors = [
  { id: "s1", nome: "Mikasa", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Mikasa_Sports_logo.svg", linkUrl: "https://mikasasports.co.jp/en/" },
  { id: "s2", nome: "Decathlon", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/12/Decathlon_Logo.svg", linkUrl: "https://www.decathlon.it" },
  { id: "s3", nome: "Red Bull", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Red_Bull_Logo.svg", linkUrl: "https://www.redbull.com" },
  { id: "s4", nome: "Wilson", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/07/Wilson_Sporting_Goods_logo.svg", linkUrl: "https://www.wilson.com" }
];

export default function PortaleLiveMobile() {
  const [tornei, setTornei] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("gironi"); // "gironi", "partite", "finali"
  const [viewMode, setViewMode] = useState("campoMare"); // "campoMare" or "campoMonte"
  const [loading, setLoading] = useState(true);
  const [selectedRoundTab, setSelectedRoundTab] = useState("");
  const [sponsors, setSponsors] = useState([]);

  const displaySponsors = sponsors && sponsors.length > 0 ? sponsors : defaultTestSponsors;
  let baseSponsors = [...displaySponsors];
  while (baseSponsors.length < 10) {
    baseSponsors = [...baseSponsors, ...displaySponsors];
  }
  const doubleSponsors = [...baseSponsors, ...baseSponsors];

  const isMatchCompleted = (roundKey, matchNum) => {
    if (!bracketConfig) return false;
    const assignments = bracketConfig.bracketAssignments || {};
    const metadata = bracketConfig.bracketMetadata || {};
    const matchId = `${roundKey}-${matchNum}`;

    const teamL = assignments[`${matchId}-L`];
    const teamR = assignments[`${matchId}-R`];

    if (teamL === "—" || teamR === "—") return true;
    if (!teamL || !teamR) return false;

    const meta = metadata[matchId] || {};
    const scoreL = meta.scoreL || "";
    const scoreR = meta.scoreR || "";
    return scoreL !== "" && scoreR !== "";
  };

  const isRoundCompleted = (roundKey, matchCount) => {
    for (let m = 1; m <= matchCount; m++) {
      if (!isMatchCompleted(roundKey, m)) {
        return false;
      }
    }
    return true;
  };

  const getAvailableRounds = (size) => {
    const rounds = [];
    if (size >= 32) rounds.push({ key: "r32", label: "Sedicesimi", matches: 16 });
    if (size >= 16) rounds.push({ key: "r16", label: "Ottavi", matches: 8 });
    if (size >= 8)  rounds.push({ key: "qf", label: "Quarti", matches: 4 });
    if (size >= 4)  rounds.push({ key: "sf", label: "Semifinali", matches: 2 });
    rounds.push({ key: "f", label: "Finali", matches: 2 });

    const unlockedRounds = [];
    for (let i = 0; i < rounds.length; i++) {
      if (i === 0) {
        unlockedRounds.push(rounds[i]);
      } else {
        const prevRound = rounds[i - 1];
        if (isRoundCompleted(prevRound.key, prevRound.matches)) {
          unlockedRounds.push(rounds[i]);
        } else {
          break;
        }
      }
    }
    return unlockedRounds;
  };

  // 1. Carica l'elenco dei tornei e determina quello da visualizzare
  useEffect(() => {
    getTornei().then((parsed) => {
      setTornei(parsed);

      const params = new URLSearchParams(window.location.search);
      const urlTour = params.get("tour");

      if (urlTour && parsed.some((t) => t.nome === urlTour)) {
        setSelectedTorneo(urlTour);
      } else {
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

    // Leggi gli sponsor dal database
    fetch("/api/db?type=sponsors")
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setSponsors(json.data);
        }
      })
      .catch(err => console.error("Error fetching sponsors:", err));
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

  // Initialize and validate the active round tab for final phases
  useEffect(() => {
    if (bracketConfig && bracketConfig.bracketSize) {
      const avRounds = getAvailableRounds(bracketConfig.bracketSize);
      if (avRounds.length > 0 && !avRounds.some(r => r.key === selectedRoundTab)) {
        setSelectedRoundTab(avRounds[avRounds.length - 1].key);
      }
    }
  }, [bracketConfig]);

  const selectedTorneoObj = tornei.find((t) => t.nome === selectedTorneo);
  const isConcluso = selectedTorneoObj?.stato === "Concluso";
  const isPublished = config && config.pubblicato;
  const isBracketPublished = bracketConfig && bracketConfig.tabellonePubblicato;
  const rankingType = config?.rankingType || "gironi";

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
    if (!timeStr) return Infinity;
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

  const getScheduleFixed = (numTeams, gironeId, assignments = {}) => {
    return getScheduleShared(numTeams, gironeId, assignments, config?.gironeTypes, config?.gironeSets, config?.matchMetadata);
  };

  const getGroupTeams = (groupId, type) => {
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

  // SofaScore style renderer for initial groups matches
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

    const s2L = parseInt(meta?.s2L || 0);
    const s2R = parseInt(meta?.s2R || 0);
    const s3L = parseInt(meta?.s3L || 0);
    const s3R = parseInt(meta?.s3R || 0);
    const isThreeSets = gironeId ? config?.gironeSets?.[gironeId] === "3 set" : false;

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
          <span>{matchLabel || (gironeId ? `Girone ${gironeId}` : `Gara ${idx + 1}`)}</span>
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
              <div className="text-[#295dab] font-black text-base sm:text-lg flex items-center gap-1.5">
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

  // Render a bracket match card in a clean vertical list for mobile
  const renderBracketMatchRow = (roundKey, matchNum, label, idx) => {
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

    const showResultsColors = hasScore && (parseInt(scoreL) > 0 || parseInt(scoreR) > 0);

    const sets = [];
    if (meta.s1L || meta.s1R) sets.push(`${meta.s1L || 0}-${meta.s1R || 0}`);
    if (meta.s2L || meta.s2R) sets.push(`${meta.s2L || 0}-${meta.s2R || 0}`);
    if (meta.s3L || meta.s3R) sets.push(`${meta.s3L || 0}-${meta.s3R || 0}`);

    return (
      <div
        key={`${roundKey}-${matchNum}`}
        className="bg-white rounded-[1.6rem] p-5 border border-gray-100 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md animate-fade-in"
      >
        <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
          <span>{label}</span>
          <div className="flex gap-1.5">
            {time && (
              <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-lg text-[10px] font-bold">{time}</span>
            )}
            {court && (
              <span className="bg-orange-50 text-[#C3562B] px-3 py-1 rounded-lg font-black text-[10px]">
                Campo {court}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-1.5">
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

          <div className="shrink-0 flex flex-col items-center justify-center min-w-[70px]">
            {hasScore && (
              <span className="text-[10px] font-black text-black uppercase tracking-wider mb-1.5">
                Finita
              </span>
            )}
            {hasScore ? (
              <div className="text-[#295dab] font-black text-base sm:text-lg flex items-center gap-1.5">
                <span>{scoreL}</span>
                <span className="opacity-40">-</span>
                <span>{scoreR}</span>
              </div>
            ) : (
              <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-3.5 py-2 rounded-xl uppercase tracking-wider border border-gray-100">
                VS
              </span>
            )}
            {sets.length > 0 && hasScore && (
              <span className="text-[10px] font-bold text-gray-400 mt-1">
                ({sets.join(", ")})
              </span>
            )}
          </div>

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

  return (
    <main className="min-h-screen bg-[#f4f7f6] pb-24">
      {/* Header Mobile Premium */}
      <header
        style={{ backgroundColor: "#295dab" }}
        className="text-white py-4 px-5 flex justify-between items-center shadow-md border-b-4 border-[#C3562B] sticky top-0 z-50"
      >
        <div className="flex items-center gap-2.5">
          <Image src="/logo_v2.png" alt="Baia Beach Cup Logo" width={32} height={32} />
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-none">Baia Beach Cup Live</h1>
          </div>
        </div>
        <a
          href="/"
          className="text-[9px] font-black bg-[#C3562B] text-[#295dab] px-4 py-1.5 rounded-xl transition-transform active:scale-95 shadow-sm uppercase tracking-wider"
        >
          Home
        </a>
      </header>

      {/* Sezione Sponsor Marquee Compatta sotto Header */}
      {doubleSponsors.length > 0 && (
        <div className="w-full bg-white/10 backdrop-blur-xs border-b border-white/10 py-3 overflow-hidden select-none relative z-40">
          <div
            className="relative overflow-hidden w-full select-none animate-marquee-paused"
            style={{
              maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
            }}
          >
            <div className="animate-marquee flex items-center gap-4">
              {doubleSponsors.map((sp, idx) => (
                <div
                  key={idx}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.04)] border border-white/60 flex items-center justify-center transition-all hover:scale-105 shrink-0 p-2.5"
                >
                  {sp.linkUrl ? (
                    <a href={sp.linkUrl} target="_blank" rel="noopener noreferrer" title={sp.nome} className="w-full h-full flex items-center justify-center cursor-pointer">
                      <img
                        src={sp.logoUrl}
                        alt={sp.nome}
                        className="max-w-full max-h-full object-contain opacity-95 transition-opacity duration-300"
                      />
                    </a>
                  ) : (
                    <img
                      src={sp.logoUrl}
                      alt={sp.nome}
                      title={sp.nome}
                      className="max-w-full max-h-full object-contain opacity-95"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
          <h2 className="text-xl font-black text-[#295dab] uppercase tracking-tighter leading-tight">
            {selectedTorneo || "Nessun Torneo"}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1.5">
            {selectedTorneoObj?.categoria} · {selectedTorneoObj?.data}
          </p>
        </div>

        {/* Controllo Pubblicazione */}
        {isPublished || isBracketPublished ? (
          <>
            {/* 1. SEZIONE GIRONI */}
            {activeTab === "gironi" && (
              <div className="space-y-5">
                {isPublished ? (
                  <>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Composizione Gironi
                    </h3>
                    <div className="space-y-4">
                      {rankingType === "avulsa" ? (
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                          <h4 className="text-sm font-black text-[#295dab] uppercase tracking-tight border-b border-gray-50 pb-3 mb-3 flex items-center justify-between">
                            <span>Classifica Generale (Avulsa)</span>
                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                              {calculateUnifiedRanking(config).length} Squadre
                            </span>
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-gray-50/50 border-b border-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                <tr>
                                  <th className="pl-4 py-3 w-10 text-center">Pos</th>
                                  <th className="px-2 py-3">Squadra</th>
                                  <th className="px-2 py-3 text-center w-10">Gir.</th>
                                  <th className="px-2 py-3 text-center w-8">V</th>
                                  <th className="px-2 py-3 text-center w-10">PF</th>
                                  <th className="px-2 py-3 text-center w-10">PS</th>
                                  <th className="pr-4 py-3 text-right w-12">Quoz.</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 text-xs font-bold">
                                {calculateUnifiedRanking(config).map((team, idx) => {
                                  const isDirectOttavi = idx < 8;
                                  const isSedicesimi = idx >= 8 && idx < 24;
                                  const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                                  return (
                                    <tr
                                      key={team.nome}
                                      className={`hover:bg-blue-50/10 transition-colors ${
                                        isDirectOttavi ? "bg-yellow-50/10" : isSedicesimi ? "bg-blue-50/5" : ""
                                      }`}
                                    >
                                      <td className="pl-4 py-3.5 text-center">
                                        <span
                                          className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black mx-auto ${
                                            isDirectOttavi
                                              ? "bg-yellow-400 text-white shadow-sm"
                                              : isSedicesimi
                                              ? "bg-[#295dab] text-white shadow-sm"
                                              : "bg-gray-100 text-gray-400"
                                          }`}
                                          title={isDirectOttavi ? "Ottavi Diretti" : isSedicesimi ? "Sedicesimi di Finale" : "Eliminato"}
                                        >
                                          {idx + 1}
                                        </span>
                                      </td>
                                      <td className="px-2 py-3.5 text-[#295dab] font-black tracking-tight leading-tight text-[13px] sm:text-[14px]">
                                        {splitNames(team.nome).map(formatPlayerName).map((player, pIdx) => (
                                          <span key={pIdx} className="block truncate max-w-[140px]">
                                            {player}
                                          </span>
                                        ))}
                                      </td>
                                      <td className="px-2 py-3.5 text-center text-gray-500 font-bold">
                                        {team.girone}
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
                                      <td className="pr-4 py-3.5 text-right font-black text-xs text-[#295dab]">
                                        {quotient}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {calculateUnifiedRanking(config).length === 0 && (
                                  <tr>
                                    <td colSpan="7" className="py-8 text-center text-gray-400 italic">
                                      Nessuna squadra presente.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        getInitialGroupsList().map((group) => {
                          const teams = getGroupTeams(group.id, group.type);
                          return (
                            <div
                              key={group.id}
                              className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"
                            >
                              <h4 className="text-sm font-black text-[#295dab] uppercase tracking-tight border-b border-gray-50 pb-3 mb-3 flex items-center justify-between">
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
                                          <td className="px-2 py-3.5 text-[#295dab] font-black tracking-tight leading-tight text-[13px] sm:text-[14px]">
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
                                          <td className="pr-4 py-3.5 text-right font-black text-xs text-[#295dab]">
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
                        })
                      )}
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
                    <h3 className="text-lg font-black text-[#295dab] uppercase tracking-tight mb-2">
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
                            ? "bg-[#295dab] text-white shadow-md"
                            : "text-gray-400 hover:text-[#295dab]"
                        }`}
                      >
                        Campo Mare (1) 🌊
                      </button>
                      <button
                        onClick={() => setViewMode("campoMonte")}
                        className={`flex-1 py-2 text-center rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                          viewMode === "campoMonte"
                            ? "bg-[#295dab] text-white shadow-md"
                            : "text-gray-400 hover:text-[#295dab]"
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
                    <h3 className="text-lg font-black text-[#295dab] uppercase tracking-tight mb-2">
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
              <div className="space-y-5 animate-fade-in">
                <div className="flex justify-between items-center pl-1 border-l-4 border-[#C3562B] pl-2 mb-2">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Fasi Finali
                  </h3>
                </div>

                {/* Round selection tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none justify-center">
                  {getAvailableRounds(bracketConfig.bracketSize).map((round) => (
                    <button
                      key={round.key}
                      onClick={() => setSelectedRoundTab(round.key)}
                      className={`px-4.5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        selectedRoundTab === round.key
                          ? "bg-[#295dab] text-white shadow-md scale-[1.03]"
                          : "bg-white text-gray-400 border border-gray-100 hover:text-[#295dab] hover:bg-gray-50"
                      }`}
                    >
                      {round.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {(() => {
                    const avRounds = getAvailableRounds(bracketConfig.bracketSize);
                    const activeRound = avRounds.find(r => r.key === selectedRoundTab);
                    if (!activeRound) return null;

                    const matchElements = [];
                    for (let m = 1; m <= activeRound.matches; m++) {
                      let label = "";
                      if (activeRound.key === "r32") label = `Sedicesimo ${m}`;
                      else if (activeRound.key === "r16") label = `Ottavo ${m}`;
                      else if (activeRound.key === "qf") label = `Quarto ${m}`;
                      else if (activeRound.key === "sf") label = `Semifinale ${m}`;
                      else if (activeRound.key === "f") {
                        label = m === 1 ? "Finalissima 1°/2° Posto" : "Finale 3°/4° Posto";
                      }
                      matchElements.push(
                        renderBracketMatchRow(activeRound.key, m, label, m)
                      );
                    }
                    return matchElements;
                  })()}
                </div>
              </div>
            )}

            {/* Messaggio tabellone non pubblicato */}
            {activeTab === "finali" && !isBracketPublished && (
              <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
                <span className="text-5xl mb-4 block">⚔️</span>
                <h3 className="text-lg font-black text-[#295dab] uppercase tracking-tight mb-2">
                  Fasi Finali in Preparazione
                </h3>
                <p className="text-gray-400 font-medium text-xs max-w-xs mx-auto">
                  Il tabellone ad eliminazione diretta non è ancora stato pubblicato dallo staff per questo torneo.
                </p>
              </div>
            )}
          </>
        ) : (
          /* Messaggio Gironi non Pubblicati */
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
            <span className="text-5xl mb-4 block">⏳</span>
            <h3 className="text-lg font-black text-[#295dab] uppercase tracking-tight mb-2">
              Calendario in Elaborazione
            </h3>
            <p className="text-gray-400 font-medium text-xs max-w-xs mx-auto">
              Lo staff sta configurando i gironi e le partite per il torneo. I dati saranno visibili in
              tempo reale su questa pagina non appena verranno pubblicati!
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM NAV BAR */}
      {(isPublished || isBracketPublished) && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="absolute inset-0 bg-[#295dab]/95 backdrop-blur-xl border-t border-blue-950/80 shadow-[0_-4px_30px_rgba(0,0,0,0.25)]" />
          <div className="relative flex justify-around px-1 pb-safe">
            
            {/* Pulsante Gironi */}
            <button
              onClick={() => setActiveTab("gironi")}
              className={`relative flex flex-col items-center gap-1.5 py-5.5 px-3 flex-1 active:scale-95 transition-transform cursor-pointer ${
                activeTab === "gironi" ? "text-[#C3562B]" : "text-slate-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={activeTab === "gironi" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={activeTab === "gironi" ? 0 : 2} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest">Gironi</span>
              {activeTab === "gironi" && <span className="absolute top-3 w-1.5 h-1.5 rounded-full bg-[#C3562B]" />}
            </button>

            {/* Pulsante Partite */}
            <button
              onClick={() => setActiveTab("partite")}
              className={`relative flex flex-col items-center gap-1.5 py-5.5 px-3 flex-1 active:scale-95 transition-transform cursor-pointer ${
                activeTab === "partite" ? "text-[#C3562B]" : "text-slate-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={activeTab === "partite" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={activeTab === "partite" ? 0 : 2} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest">Partite</span>
              {activeTab === "partite" && <span className="absolute top-3 w-1.5 h-1.5 rounded-full bg-[#C3562B]" />}
            </button>


            {/* Pulsante Fasi Finali */}
            {isBracketPublished && (
              <button
                onClick={() => setActiveTab("finali")}
                className={`relative flex flex-col items-center gap-1.5 py-5.5 px-3 flex-1 active:scale-95 transition-transform cursor-pointer ${
                  activeTab === "finali" ? "text-[#C3562B]" : "text-slate-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={activeTab === "finali" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={activeTab === "finali" ? 0 : 2} className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                </svg>
                <span className="text-xs font-black uppercase tracking-widest">Fasi Finali</span>
                {activeTab === "finali" && <span className="absolute top-3 w-1.5 h-1.5 rounded-full bg-[#C3562B]" />}
              </button>
            )}
            
          </div>
          {/* iOS spacer */}
          <div className="h-safe-area-inset-bottom bg-[#295dab]" />
        </nav>
      )}
    </main>
  );
}
