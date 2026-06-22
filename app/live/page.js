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

export default function PortaleLiveMobile() {
  const [tornei, setTornei] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("gironi"); // "gironi", "partite", "classifica", "finali"
  const [viewMode, setViewMode] = useState("cronologico"); // "cronologico" or "girone"
  const [loading, setLoading] = useState(true);

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

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 min-w-[210px] relative select-none">
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
  const renderConnectorLinePublic = (matchIndex, totalMatches, H) => {
    const itemHeight = H / totalMatches;
    const center = (matchIndex - 0.5) * itemHeight;

    const isEven = matchIndex % 2 === 0;
    const halfGap = itemHeight / 2;

    const verticalLineTop = isEven ? center - halfGap : center;
    const verticalLineHeight = halfGap;

    return (
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Horizontal segment leaving match card */}
        <div 
          className="absolute bg-gray-200"
          style={{
            top: `${center}px`,
            right: "-16px",
            width: "16px",
            height: "2px",
            transform: "translateY(-50%)"
          }}
        />

        {/* Vertical segment connecting the pair */}
        <div 
          className="absolute bg-gray-200"
          style={{
            top: `${verticalLineTop}px`,
            right: "-16px",
            width: "2px",
            height: `${verticalLineHeight}px`
          }}
        />

        {/* Horizontal segment extending to next round */}
        <div 
          className="absolute bg-gray-200"
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
        {isPublished ? (
          <>
            {/* 1. SEZIONE GIRONI */}
            {activeTab === "gironi" && (
              <div className="space-y-5">
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
              </div>
            )}

            {/* 2. SEZIONE PARTITE */}
            {activeTab === "partite" && (
              <div className="space-y-6">
                <div className="flex bg-gray-200/60 p-1 rounded-2xl max-w-xs mx-auto border border-gray-100/50 shadow-inner mb-6">
                  <button
                    onClick={() => setViewMode("cronologico")}
                    className={`flex-1 py-2 text-center rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                      viewMode === "cronologico"
                        ? "bg-[#0D3D31] text-white shadow-md"
                        : "text-gray-400 hover:text-[#0D3D31]"
                    }`}
                  >
                    Cronologico 📅
                  </button>
                  <button
                    onClick={() => setViewMode("girone")}
                    className={`flex-1 py-2 text-center rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                      viewMode === "girone"
                        ? "bg-[#0D3D31] text-white shadow-md"
                        : "text-gray-400 hover:text-[#0D3D31]"
                    }`}
                  >
                    Per Girone 📋
                  </button>
                </div>

                {viewMode === "cronologico" ? (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 border-l-4 border-[#C3562B] pl-2 mb-2">
                      Calendario Incontri (Ordine Cronologico)
                    </h3>
                    <div className="space-y-3">
                      {sortMatchesChronologically(getAllInitialMatches()).map((m, sortedIdx) =>
                        renderMatchRow(
                          m.left,
                          m.right,
                          m.meta,
                          sortedIdx,
                          `match-${m.gironeId}`,
                          m.gironeId
                        )
                      )}
                      {getAllInitialMatches().length === 0 && (
                        <div className="bg-white rounded-3xl p-6 text-center border border-gray-100">
                          <p className="text-gray-400 italic text-xs">Nessun match programmato.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {getInitialGroupsList().map((group) => {
                      const groupMatches = getScheduleFixed(
                        config?.teamCounts?.[group.id] || 0,
                        group.id,
                        config?.gironeAssignments?.[group.id] || {}
                      ).map((m, idx) => ({
                        left: m.left,
                        right: m.right,
                        meta: config?.matchMetadata?.[`${group.id}-${idx}`] || {},
                      }));

                      return (
                        <div key={group.id} className="space-y-3">
                          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 border-l-4 border-[#C3562B] pl-2">
                            Partite {group.label}
                          </h3>
                          <div className="space-y-3">
                            {groupMatches.map((m, idx) =>
                              renderMatchRow(
                                m.left,
                                m.right,
                                m.meta,
                                idx,
                                `match-${group.id}`,
                                group.id
                              )
                            )}
                            {groupMatches.length === 0 && (
                              <div className="bg-white rounded-3xl p-6 text-center border border-gray-100">
                                <p className="text-gray-400 italic text-xs">Nessun match programmato.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. SEZIONE CLASSIFICHE */}
            {activeTab === "classifica" && (
              <div className="space-y-6">
                {rankingType === "avulsa" ? (
                  <>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 border-l-4 border-yellow-400 pl-2">
                      Classifica Generale Complessiva Torneo
                    </h3>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[320px]">
                          <thead className="bg-gray-50/50 border-b border-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                              <th className="pl-4 py-3 w-10 text-center">Pos</th>
                              <th className="px-2 py-3">Squadra</th>
                              <th className="px-2 py-3 text-center w-12">Girone</th>
                              <th className="px-2 py-3 text-center w-8">V</th>
                              <th className="px-2 py-3 text-center w-10">PF</th>
                              <th className="px-2 py-3 text-center w-10">PS</th>
                              <th className="pr-4 py-3 text-right w-16">Quoz.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs font-bold">
                            {calculateUnifiedRanking(config).map((team, idx) => {
                              const quotient = team.puntiSubiti === 0 ? team.puntiFatti : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                              const isGold = idx < 12;
                              const isGoldDirect = idx < 4;
                              return (
                                <tr
                                  key={team.nome}
                                  className={`hover:bg-blue-50/10 transition-colors ${
                                    isGold ? "bg-yellow-50/10" : "bg-slate-50/20"
                                  }`}
                                >
                                  <td className="pl-4 py-3.5 text-center">
                                    <span
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black mx-auto ${
                                        isGoldDirect
                                          ? "bg-yellow-400 text-white shadow-sm"
                                          : isGold
                                          ? "bg-yellow-100 text-yellow-700"
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
                                  <td className="px-2 py-3.5 text-center">
                                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-blue-50 text-blue-600 border border-blue-100/50">
                                      {team.girone}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3.5 text-center text-green-600 font-bold">
                                    {team.vinte}
                                  </td>
                                  <td className="px-2 py-3.5 text-center text-gray-500">
                                    {team.puntiFatti}
                                  </td>
                                  <td className="px-2 py-3.5 text-center text-gray-400">
                                    {team.puntiSubiti}
                                  </td>
                                  <td className="pr-4 py-3.5 text-right text-[#0D3D31] font-mono text-[10px]">
                                    {quotient}
                                  </td>
                                </tr>
                              );
                            })}
                            {(!config || calculateUnifiedRanking(config).length === 0) && (
                              <tr>
                                <td colSpan="7" className="py-20 text-center text-gray-400 italic">
                                  Nessuna squadra configurata o nessun risultato disponibile.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 border-l-4 border-blue-600 pl-2">
                      Classifiche dei Gironi
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
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 4. SEZIONE FASI FINALI */}
            {activeTab === "finali" && isBracketPublished && (
              <div className="space-y-4 select-none">
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
                  <div className="flex gap-8 relative" style={{ minWidth: `${currentW}px`, height: `${currentH}px` }}>
                    
                    {/* 1. Round of 32 */}
                    {bracketConfig.bracketSize >= 32 && (
                      <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                        <div className="text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 sticky top-0 bg-white z-20 mb-3 border-b">Sedicesimi</div>
                        {Array.from({ length: 16 }, (_, idx) => {
                          const matchNum = idx + 1;
                          const itemHeight = currentH / 16;
                          const center = (matchNum - 0.5) * itemHeight;
                          return (
                            <div key={idx} className="absolute left-0 right-4" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                              {renderBracketCardPublic("r32", matchNum, `Gara ${matchNum}`)}
                              {renderConnectorLinePublic(matchNum, 16, currentH)}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Round of 16 */}
                    {bracketConfig.bracketSize >= 16 && (
                      <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                        <div className="text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 sticky top-0 bg-white z-20 mb-3 border-b">Ottavi</div>
                        {Array.from({ length: 8 }, (_, idx) => {
                          const matchNum = idx + 1;
                          const itemHeight = currentH / 8;
                          const center = (matchNum - 0.5) * itemHeight;
                          return (
                            <div key={idx} className="absolute left-0 right-4" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                              {renderBracketCardPublic("r16", matchNum, `Ottavi ${matchNum}`)}
                              {renderConnectorLinePublic(matchNum, 8, currentH)}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Quarterfinals */}
                    {bracketConfig.bracketSize >= 8 && (
                      <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                        <div className="text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 sticky top-0 bg-white z-20 mb-3 border-b">Quarti</div>
                        {Array.from({ length: 4 }, (_, idx) => {
                          const matchNum = idx + 1;
                          const itemHeight = currentH / 4;
                          const center = (matchNum - 0.5) * itemHeight;
                          return (
                            <div key={idx} className="absolute left-0 right-4" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                              {renderBracketCardPublic("qf", matchNum, `Quarti ${matchNum}`)}
                              {renderConnectorLinePublic(matchNum, 4, currentH)}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 4. Semifinals */}
                    {bracketConfig.bracketSize >= 4 && (
                      <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                        <div className="text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 sticky top-0 bg-white z-20 mb-3 border-b">Semifinali</div>
                        {Array.from({ length: 2 }, (_, idx) => {
                          const matchNum = idx + 1;
                          const itemHeight = currentH / 2;
                          const center = (matchNum - 0.5) * itemHeight;
                          return (
                            <div key={idx} className="absolute left-0 right-4" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                              {renderBracketCardPublic("sf", matchNum, `Semifinale ${matchNum}`)}
                              <div className="absolute inset-0 pointer-events-none z-0">
                                {/* SF to Final 1 lines */}
                                <div className="absolute bg-gray-200" style={{ top: `${center}px`, right: "-16px", width: "16px", height: "2px", transform: "translateY(-50%)" }} />
                                <div className="absolute bg-gray-200" style={{ top: `${idx === 0 ? center : center - sfHalfGap}px`, right: "-16px", width: "2px", height: `${sfHalfGap}px` }} />
                                <div className="absolute bg-gray-200" style={{ top: `${sfHalfGap}px`, right: "-32px", width: "16px", height: "2px", transform: "translateY(-50%)" }} />

                                {/* SF to Final 3/4 lines */}
                                <div className="absolute bg-gray-200" style={{ top: `${center}px`, right: "-24px", width: "8px", height: "2px", transform: "translateY(-50%)" }} />
                                <div className="absolute bg-gray-200" style={{ top: `${idx === 0 ? center : center - sfHalfGap}px`, right: "-24px", width: "2px", height: `${sfHalfGap}px` }} />
                                <div className="absolute bg-gray-200" style={{ top: `${sfHalfGap * 3}px`, right: "-32px", width: "8px", height: "2px", transform: "translateY(-50%)" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 5. Finals */}
                    <div className="flex-1 h-full relative">
                      <div className="text-[9px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-1 sticky top-0 bg-white z-20 mb-3 border-b">Finali</div>
                      
                      {/* 1st Place */}
                      <div className="absolute left-0 right-0" style={{ top: `${currentH / 4}px`, transform: "translateY(-50%)" }}>
                        <div className="text-[9px] font-black text-yellow-600 uppercase tracking-widest text-center mb-1 pb-1">Finalissima 🥇</div>
                        {renderBracketCardPublic("f", 1, "1°/2° Posto")}
                      </div>

                      {/* 3rd Place */}
                      <div className="absolute left-0 right-0" style={{ top: `${(currentH / 4) * 3}px`, transform: "translateY(-50%)" }}>
                        <div className="text-[9px] font-black text-amber-700 uppercase tracking-widest text-center mb-1 pb-1">Finale 3° Posto 🥉</div>
                        {renderBracketCardPublic("f", 2, "3°/4° Posto")}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Messaggio tabellone non pubblicato */}
            {activeTab === "finali" && !isBracketPublished && (
              <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
                <span className="text-5xl mb-4 block">⚔️</span>
                <h3 className="text-lg font-black text-[#0D3D31] uppercase tracking-tight mb-2">
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

      {/* BOTTOM NAV BAR */}
      {isPublished && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="absolute inset-0 bg-[#0D3D31]/95 backdrop-blur-xl border-t border-blue-950/80 shadow-[0_-4px_30px_rgba(0,0,0,0.25)]" />
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

            {/* Pulsante Classifiche */}
            <button
              onClick={() => setActiveTab("classifica")}
              className={`relative flex flex-col items-center gap-1.5 py-5.5 px-3 flex-1 active:scale-95 transition-transform cursor-pointer ${
                activeTab === "classifica" ? "text-[#C3562B]" : "text-slate-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={activeTab === "classifica" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={activeTab === "classifica" ? 0 : 2} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-6.75a1.125 1.125 0 0 0-1.125 1.125v3.375m9 0h-9M9 10.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest">{rankingType === "avulsa" ? "Generale" : "Classifiche"}</span>
              {activeTab === "classifica" && <span className="absolute top-3 w-1.5 h-1.5 rounded-full bg-[#C3562B]" />}
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
          <div className="h-safe-area-inset-bottom bg-[#0D3D31]" />
        </nav>
      )}
    </main>
  );
}
