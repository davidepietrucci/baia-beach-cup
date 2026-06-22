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

const formatTeamNameClean = (teamName) => {
  if (!teamName || teamName === "—" || teamName === "Slot Libero" || teamName.startsWith("TBD")) {
    return teamName || "—";
  }
  return splitNames(teamName).map(formatPlayerName).join(" - ");
};

// Seeding configuration arrays (1-based ranks)
const seeding32 = [
  [1, 32],  // Match 1
  [16, 17], // Match 2
  [9, 24],  // Match 3
  [8, 25],  // Match 4
  [5, 28],  // Match 5
  [12, 21], // Match 6
  [13, 20], // Match 7
  [4, 29],  // Match 8
  [3, 30],  // Match 9
  [14, 19], // Match 10
  [11, 22], // Match 11
  [6, 27],  // Match 12
  [7, 26],  // Match 13
  [10, 23], // Match 14
  [15, 18], // Match 15
  [2, 31]   // Match 16
];

const seeding16 = [
  [1, 16], // Match 1
  [8, 9],  // Match 2
  [5, 12], // Match 3
  [4, 13], // Match 4
  [3, 14], // Match 5
  [6, 11], // Match 6
  [7, 10], // Match 7
  [2, 15]  // Match 8
];

const seeding8 = [
  [1, 8], // Match 1
  [4, 5], // Match 2
  [3, 6], // Match 3
  [2, 7]  // Match 4
];

const seeding4 = [
  [1, 4], // Match 1
  [2, 3]  // Match 2
];

function TabelloneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTour = searchParams.get("tour");

  const [torneiAttivi, setTorneiAttivi] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [bracketSize, setBracketSize] = useState(16); // 32, 16, 8, 4
  const [bracketAssignments, setBracketAssignments] = useState({});
  const [bracketMetadata, setBracketMetadata] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [tabellonePubblicato, setTabellonePubblicato] = useState(false);

  // Modal edit match states
  const [editingMatch, setEditingMatch] = useState(null); // { roundKey, matchNum, label }
  const [modalMeta, setModalMeta] = useState({ s1L: "", s1R: "", s2L: "", s2R: "", s3L: "", s3R: "", time: "", court: "" });
  const [modalTeams, setModalTeams] = useState({ left: "", right: "" });

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
    
    getBracket(slug).then(config => {
      if (config) {
        setBracketSize(config.bracketSize || 16);
        setBracketAssignments(config.bracketAssignments || {});
        setBracketMetadata(config.bracketMetadata || {});
        setTabellonePubblicato(config.tabellonePubblicato || false);
      } else {
        setBracketSize(16);
        setBracketAssignments({});
        setBracketMetadata({});
        setTabellonePubblicato(false);
      }
      setIsLoaded(true);
    });
  }, [selectedTorneo]);

  // Auto-save debounced
  useEffect(() => {
    if (!selectedTorneo || !isLoaded) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const config = { 
      bracketSize, 
      bracketAssignments, 
      bracketMetadata,
      tabellonePubblicato
    };
    
    localStorage.setItem(`bvi_bracket_v1_${slug}`, JSON.stringify(config));

    const handler = setTimeout(() => {
      saveBracket(slug, config);
    }, 1000);

    return () => clearTimeout(handler);
  }, [bracketSize, bracketAssignments, bracketMetadata, selectedTorneo, isLoaded, tabellonePubblicato]);

  // Automatic winners progression
  useEffect(() => {
    if (!isLoaded) return;
    const newAssignments = { ...bracketAssignments };
    let changed = false;

    const resolveWinner = (round, matchNum) => {
      const left = bracketAssignments[`${round}-${matchNum}-L`];
      const right = bracketAssignments[`${round}-${matchNum}-R`];

      // Automatic progression of byes
      if (left === "—" && right && right !== "—") return right;
      if (right === "—" && left && left !== "—") return left;
      if (left === "—" && right === "—") return "—";

      const meta = bracketMetadata[`${round}-${matchNum}`] || {};
      const scoreL = parseInt(meta.scoreL);
      const scoreR = parseInt(meta.scoreR);
      if (isNaN(scoreL) || isNaN(scoreR)) return null;
      if (scoreL === 0 && scoreR === 0) return null;

      return scoreL > scoreR ? left : (scoreR > scoreL ? right : null);
    };

    const resolveLoser = (round, matchNum) => {
      const left = bracketAssignments[`${round}-${matchNum}-L`];
      const right = bracketAssignments[`${round}-${matchNum}-R`];

      if (left === "—" || right === "—") return "—";

      const meta = bracketMetadata[`${round}-${matchNum}`] || {};
      const scoreL = parseInt(meta.scoreL);
      const scoreR = parseInt(meta.scoreR);
      if (isNaN(scoreL) || isNaN(scoreR)) return null;
      if (scoreL === 0 && scoreR === 0) return null;

      return scoreL > scoreR ? right : (scoreR > scoreL ? left : null);
    };

    const update = (targetKey, value) => {
      if (value !== undefined && newAssignments[targetKey] !== value) {
        newAssignments[targetKey] = value;
        changed = true;
      }
    };

    // Progression definitions
    const progressions = [
      { current: "r32", next: "r16", matches: 16 },
      { current: "r16", next: "qf", matches: 8 },
      { current: "qf", next: "sf", matches: 4 }
    ];

    progressions.forEach(({ current, next, matches }) => {
      if (bracketSize >= matches * 2) {
        for (let m = 1; m <= matches; m++) {
          const winner = resolveWinner(current, m);
          const nextMatchIdx = Math.floor((m - 1) / 2) + 1;
          const nextSlot = m % 2 === 1 ? "L" : "R";
          if (winner) {
            update(`${next}-${nextMatchIdx}-${nextSlot}`, winner);
          }
        }
      }
    });

    // SF to Finals
    if (bracketSize >= 4) {
      const winnerSF1 = resolveWinner("sf", 1);
      const loserSF1 = resolveLoser("sf", 1);
      if (winnerSF1) update("f-1-L", winnerSF1);
      if (loserSF1) update("f-2-L", loserSF1);

      const winnerSF2 = resolveWinner("sf", 2);
      const loserSF2 = resolveLoser("sf", 2);
      if (winnerSF2) update("f-1-R", winnerSF2);
      if (loserSF2) update("f-2-R", loserSF2);
    }

    if (changed) {
      setBracketAssignments(newAssignments);
    }
  }, [bracketMetadata, bracketAssignments, isLoaded, bracketSize]);

  // Seeding generation from group standings
  const handleAutoFill = async () => {
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const gConfig = await getGironi(slug);
    if (!gConfig) {
      alert("Nessuna configurazione gironi trovata per questo torneo!");
      return;
    }

    const unifiedRanking = calculateUnifiedRanking(gConfig).map(t => t.nome);
    if (unifiedRanking.length === 0) {
      alert("Nessuna squadra classificata nei gironi! Inserisci prima i risultati dei gironi.");
      return;
    }

    const newAssignments = {};
    const newMetadata = {};

    const getTeamNameByRank = (rank1) => {
      const name = unifiedRanking[rank1 - 1];
      if (!name) return "—"; // Bye
      return formatTeamNameClean(name);
    };

    if (bracketSize === 32) {
      for (let m = 1; m <= 16; m++) {
        const seedL = seeding32[m - 1][0];
        const seedR = seeding32[m - 1][1];
        newAssignments[`r32-${m}-L`] = getTeamNameByRank(seedL);
        newAssignments[`r32-${m}-R`] = getTeamNameByRank(seedR);
      }
    } else if (bracketSize === 16) {
      for (let m = 1; m <= 8; m++) {
        const seedL = seeding16[m - 1][0];
        const seedR = seeding16[m - 1][1];
        newAssignments[`r16-${m}-L`] = getTeamNameByRank(seedL);
        newAssignments[`r16-${m}-R`] = getTeamNameByRank(seedR);
      }
    } else if (bracketSize === 8) {
      for (let m = 1; m <= 4; m++) {
        const seedL = seeding8[m - 1][0];
        const seedR = seeding8[m - 1][1];
        newAssignments[`qf-${m}-L`] = getTeamNameByRank(seedL);
        newAssignments[`qf-${m}-R`] = getTeamNameByRank(seedR);
      }
    } else if (bracketSize === 4) {
      for (let m = 1; m <= 2; m++) {
        const seedL = seeding4[m - 1][0];
        const seedR = seeding4[m - 1][1];
        newAssignments[`sf-${m}-L`] = getTeamNameByRank(seedL);
        newAssignments[`sf-${m}-R`] = getTeamNameByRank(seedR);
      }
    }

    setBracketAssignments(newAssignments);
    setBracketMetadata(newMetadata);
    alert(`Tabellone generato con successo per ${bracketSize} squadre! 🏆`);
  };

  const handleSave = async () => {
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    const config = { 
      bracketSize, 
      bracketAssignments, 
      bracketMetadata,
      tabellonePubblicato
    };
    localStorage.setItem(`bvi_bracket_v1_${slug}`, JSON.stringify(config));
    await saveBracket(slug, config);
    alert(`Salvataggio completato con successo! 💾`);
  };

  const handleDeleteBracket = async () => {
    if (!window.confirm("Sei sicuro di voler eliminare completamente il tabellone di questo torneo? Tutti i dati inseriti andranno persi.")) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    setBracketAssignments({});
    setBracketMetadata({});
    setBracketSize(16);
    localStorage.removeItem(`bvi_bracket_v1_${slug}`);
    await saveBracket(slug, null);
    alert("Tabellone eliminato! 🗑️");
  };

  // Popup Modal Functions
  const openEditModal = (roundKey, matchNum, label) => {
    const matchId = `${roundKey}-${matchNum}`;
    const meta = bracketMetadata[matchId] || { s1L: "", s1R: "", s2L: "", s2R: "", s3L: "", s3R: "", time: "", court: "" };
    const leftTeam = bracketAssignments[`${matchId}-L`] || "";
    const rightTeam = bracketAssignments[`${matchId}-R`] || "";

    setEditingMatch({ roundKey, matchNum, label });
    setModalMeta({
      s1L: meta.s1L || "",
      s1R: meta.s1R || "",
      s2L: meta.s2L || "",
      s2R: meta.s2R || "",
      s3L: meta.s3L || "",
      s3R: meta.s3R || "",
      time: meta.time || "",
      court: meta.court || ""
    });
    setModalTeams({ left: leftTeam, right: rightTeam });
  };

  const closeEditModal = () => {
    setEditingMatch(null);
  };

  const saveModalChanges = () => {
    if (!editingMatch) return;
    const { roundKey, matchNum } = editingMatch;
    const matchId = `${roundKey}-${matchNum}`;

    // Calculate match winner and sets score
    const s1L = parseInt(modalMeta.s1L);
    const s1R = parseInt(modalMeta.s1R);
    const s2L = parseInt(modalMeta.s2L);
    const s2R = parseInt(modalMeta.s2R);
    const s3L = parseInt(modalMeta.s3L);
    const s3R = parseInt(modalMeta.s3R);

    let winL = 0;
    let winR = 0;

    if (!isNaN(s1L) && !isNaN(s1R)) {
      if (s1L > s1R) winL++; else if (s1R > s1L) winR++;
    }
    if (!isNaN(s2L) && !isNaN(s2R)) {
      if (s2L > s2R) winL++; else if (s2R > s2L) winR++;
    }
    if (!isNaN(s3L) && !isNaN(s3R)) {
      if (s3L > s3R) winL++; else if (s3R > s3L) winR++;
    }

    const updatedMeta = { ...modalMeta };
    if (winL > 0 || winR > 0) {
      updatedMeta.scoreL = winL.toString();
      updatedMeta.scoreR = winR.toString();
    } else {
      updatedMeta.scoreL = "";
      updatedMeta.scoreR = "";
    }

    // Update state
    setBracketMetadata(prev => ({ ...prev, [matchId]: updatedMeta }));
    setBracketAssignments(prev => ({
      ...prev,
      [`${matchId}-L`]: modalTeams.left,
      [`${matchId}-R`]: modalTeams.right
    }));

    closeEditModal();
  };

  const clearModalScores = () => {
    setModalMeta(prev => ({
      ...prev,
      s1L: "", s1R: "",
      s2L: "", s2R: "",
      s3L: "", s3R: ""
    }));
  };

  // Render match card inside tree
  const renderBracketMatchCard = (roundKey, matchNum, label) => {
    const matchId = `${roundKey}-${matchNum}`;
    const teamL = bracketAssignments[`${matchId}-L`] || "";
    const teamR = bracketAssignments[`${matchId}-R`] || "";
    const meta = bracketMetadata[matchId] || {};
    
    const scoreL = meta.scoreL || "";
    const scoreR = meta.scoreR || "";
    
    const hasScore = scoreL !== "" && scoreR !== "";
    const isWinnerL = hasScore && parseInt(scoreL) > parseInt(scoreR);
    const isWinnerR = hasScore && parseInt(scoreR) > parseInt(scoreL);

    const time = meta.time || "";
    const court = meta.court || "";

    const hasSetDetails = meta.s1L !== undefined && meta.s1L !== "";

    return (
      <div 
        onClick={() => openEditModal(roundKey, matchNum, label)}
        className="bg-white rounded-2xl border-2 border-gray-100 hover:border-[#C3562B] hover:shadow-lg transition-all p-3.5 cursor-pointer select-none relative group min-w-[210px] shadow-sm"
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
            <span className={`truncate font-bold max-w-[140px] ${hasScore ? (isWinnerL ? "text-green-700 font-black" : "text-gray-400") : "text-gray-700"}`}>
              {teamL || "—"}
            </span>
            <span className={`w-5.5 h-5.5 rounded flex items-center justify-center font-black text-[11px] ${hasScore ? (isWinnerL ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400") : "bg-gray-50 text-gray-400"}`}>
              {scoreL !== "" ? scoreL : "-"}
            </span>
          </div>

          {/* Team Right */}
          <div className="flex items-center justify-between text-xs">
            <span className={`truncate font-bold max-w-[140px] ${hasScore ? (isWinnerR ? "text-green-700 font-black" : "text-gray-400") : "text-gray-700"}`}>
              {teamR || "—"}
            </span>
            <span className={`w-5.5 h-5.5 rounded flex items-center justify-center font-black text-[11px] ${hasScore ? (isWinnerR ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400") : "bg-gray-50 text-gray-400"}`}>
              {scoreR !== "" ? scoreR : "-"}
            </span>
          </div>
        </div>

        {/* Set Details tooltips on hover */}
        {hasSetDetails && (
          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] rounded-lg p-1.5 shadow-md z-30 mb-1 whitespace-nowrap font-bold">
            Set: {meta.s1L}-{meta.s1R}
            {meta.s2L && `, ${meta.s2L}-${meta.s2R}`}
            {meta.s3L && `, ${meta.s3L}-${meta.s3R}`}
          </div>
        )}
      </div>
    );
  };

  // Helper for computing connecting lines in tree
  const renderConnectorLine = (roundIndex, matchIndex, totalMatches, containerHeight) => {
    const itemHeight = containerHeight / totalMatches;
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
    const size = bracketSize || 16;
    if (size === 32) return { w: 1300, h: 1920 };
    if (size === 16) return { w: 1050, h: 960 };
    if (size === 8) return { w: 800, h: 560 };
    return { w: 550, h: 360 };
  };

  const { w: currentW, h: currentH } = getDynamicTreeDimensions();
  const sfHalfGap = currentH / 4;

  return (
    <main className="min-h-screen pb-20 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-7xl mx-auto mt-6 md:mt-10 px-4">
        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-[#0D3D31] uppercase tracking-tighter leading-none">Tabellone ⚔️</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Eliminazione Diretta ad Albero</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Tournament Selector */}
            <select 
              className="flex-1 md:flex-none bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-[#0D3D31] text-sm shadow-xl cursor-pointer"
              value={selectedTorneo}
              onChange={(e) => setSelectedTorneo(e.target.value)}
            >
              {torneiAttivi.length > 0 ? torneiAttivi.map(t => (
                <option key={t.id} value={t.nome}>{t.nome}</option>
              )) : (
                <option value="">Nessun torneo attivo</option>
              )}
            </select>

            {/* Bracket Size Selector */}
            <select 
              className="flex-1 md:flex-none bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-[#0D3D31] text-sm shadow-xl cursor-pointer"
              value={bracketSize}
              onChange={e => setBracketSize(parseInt(e.target.value))}
            >
              <option value={32}>32 Squadre (Sedicesimi)</option>
              <option value={16}>16 Squadre (Ottavi)</option>
              <option value={8}>8 Squadre (Quarti)</option>
              <option value={4}>4 Squadre (Semifinali)</option>
            </select>

            <button onClick={handleAutoFill} disabled={!selectedTorneo} className="flex-1 md:flex-none bg-[#C3562B] text-[#0D3D31] px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer">🔄 GENERA</button>
            <button onClick={handleSave} disabled={!selectedTorneo} className="flex-1 md:flex-none bg-[#10B981] hover:bg-[#059669] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer">💾 SALVA</button>
            <button
              onClick={() => setTabellonePubblicato(v => !v)}
              disabled={!selectedTorneo}
              className={`flex-1 md:flex-none px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer ${
                tabellonePubblicato
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'bg-amber-100 text-amber-700 border-2 border-amber-300'
              }`}
            >
              {tabellonePubblicato ? '🟢 Tabellone: Visibile' : '🟡 Tabellone: Nascosto'}
            </button>
            <button onClick={handleDeleteBracket} disabled={!selectedTorneo} className="flex-1 md:flex-none bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer">🗑️ ELIMINA</button>
          </div>
        </div>

        {/* Bracket visual representation */}
        {!isLoaded ? (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#0D3D31] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : torneiAttivi.length === 0 ? (
          <div className="bg-white p-12 md:p-24 rounded-[3.5rem] shadow-2xl border border-gray-100 text-center relative overflow-hidden mt-10">
            <div className="relative z-10">
              <div className="text-9xl mb-10 inline-block">🏆</div>
              <h3 className="text-3xl md:text-5xl font-black text-[#0D3D31] uppercase tracking-tighter mb-6">Nessun Torneo Attivo</h3>
              <p className="text-gray-400 mb-12 max-w-lg mx-auto text-sm md:text-lg font-bold uppercase tracking-widest leading-relaxed">
                Crea un nuovo torneo nella sezione gestione o imposta lo stato su "Iscrizioni Aperte" o "In Programmazione" per configurare il tabellone.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden p-6 md:p-10 relative">
            <div className="overflow-x-auto min-w-full pb-6 scrollbar-thin">
              <div className="flex gap-8 relative select-none" style={{ minWidth: `${currentW}px`, height: `${currentH}px` }}>
                
                {/* 1. Round of 32 */}
                {bracketSize >= 32 && (
                  <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                    <div className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-2 sticky top-0 bg-white z-20 mb-4 border-b">Sedicesimi</div>
                    {Array.from({ length: 16 }, (_, idx) => {
                      const matchNum = idx + 1;
                      const itemHeight = currentH / 16;
                      const center = (matchNum - 0.5) * itemHeight;
                      return (
                        <div key={idx} className="absolute left-0 right-4" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                          {renderBracketMatchCard("r32", matchNum, `Gara ${matchNum}`)}
                          {renderConnectorLine("r32", matchNum, 16, currentH)}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Round of 16 */}
                {bracketSize >= 16 && (
                  <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                    <div className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-2 sticky top-0 bg-white z-20 mb-4 border-b">Ottavi</div>
                    {Array.from({ length: 8 }, (_, idx) => {
                      const matchNum = idx + 1;
                      const itemHeight = currentH / 8;
                      const center = (matchNum - 0.5) * itemHeight;
                      return (
                        <div key={idx} className="absolute left-0 right-4" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                          {renderBracketMatchCard("r16", matchNum, `Ottavi ${matchNum}`)}
                          {renderConnectorLine("r16", matchNum, 8, currentH)}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Quarterfinals */}
                {bracketSize >= 8 && (
                  <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                    <div className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-2 sticky top-0 bg-white z-20 mb-4 border-b">Quarti</div>
                    {Array.from({ length: 4 }, (_, idx) => {
                      const matchNum = idx + 1;
                      const itemHeight = currentH / 4;
                      const center = (matchNum - 0.5) * itemHeight;
                      return (
                        <div key={idx} className="absolute left-0 right-4" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                          {renderBracketMatchCard("qf", matchNum, `Quarti ${matchNum}`)}
                          {renderConnectorLine("qf", matchNum, 4, currentH)}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Semifinals */}
                {bracketSize >= 4 && (
                  <div className="flex-1 h-full relative border-r border-gray-100/50 pr-4">
                    <div className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-2 sticky top-0 bg-white z-20 mb-4 border-b">Semifinali</div>
                    {Array.from({ length: 2 }, (_, idx) => {
                      const matchNum = idx + 1;
                      const itemHeight = currentH / 2;
                      const center = (matchNum - 0.5) * itemHeight;
                      return (
                        <div key={idx} className="absolute left-0 right-4" style={{ top: `${center}px`, transform: "translateY(-50%)" }}>
                          {renderBracketMatchCard("sf", matchNum, `Semifinale ${matchNum}`)}
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

                {/* 5. Finals & Bronze */}
                <div className="flex-1 h-full relative">
                  <div className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center py-2 sticky top-0 bg-white z-20 mb-4 border-b">Finali</div>
                  
                  {/* Final 1st Place */}
                  <div className="absolute left-0 right-0" style={{ top: `${currentH / 4}px`, transform: "translateY(-50%)" }}>
                    <div className="text-[10px] font-black text-yellow-600 uppercase tracking-widest text-center mb-2 border-b border-yellow-600/10 pb-1">Finalissima 🥇</div>
                    {renderBracketMatchCard("f", 1, "1°/2° Posto")}
                  </div>

                  {/* Final 3rd Place */}
                  <div className="absolute left-0 right-0" style={{ top: `${(currentH / 4) * 3}px`, transform: "translateY(-50%)" }}>
                    <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest text-center mb-2 border-b border-amber-700/10 pb-1">Finale 3° Posto 🥉</div>
                    {renderBracketMatchCard("f", 2, "3°/4° Posto")}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Match Popup Modal */}
      {editingMatch && (
        <div className="fixed inset-0 bg-[#0D3D31]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-gray-100 flex flex-col gap-4 animate-scale-up">
            
            {/* Title bar */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-lg font-black text-[#0D3D31] uppercase tracking-tight leading-none">{editingMatch.label}</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Configurazione Incontro & Risultato</p>
              </div>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 transition-colors font-black text-lg p-1">✕</button>
            </div>

            {/* Match info form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Orario</label>
                <input 
                  type="text" 
                  placeholder="es. 10:30" 
                  value={modalMeta.time} 
                  onChange={(e) => setModalMeta(p => ({ ...p, time: e.target.value }))}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0D3D31] outline-none text-gray-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Campo</label>
                <input 
                  type="text" 
                  placeholder="es. 1" 
                  value={modalMeta.court} 
                  onChange={(e) => setModalMeta(p => ({ ...p, court: e.target.value }))}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0D3D31] outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Teams edit */}
            <div className="space-y-3.5 mt-2">
              {/* Team L */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Squadra A (Sinistra)</label>
                <input 
                  type="text" 
                  placeholder="Nome Squadra A" 
                  value={modalTeams.left} 
                  onChange={(e) => setModalTeams(p => ({ ...p, left: e.target.value }))}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val && val !== "—" && !val.includes(".") && val !== "Slot Libero" && !val.startsWith("TBD")) {
                      setModalTeams(p => ({ ...p, left: formatTeamNameClean(val) }));
                    }
                  }}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0D3D31] outline-none text-gray-900"
                />
              </div>

              {/* Team R */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Squadra B (Destra)</label>
                <input 
                  type="text" 
                  placeholder="Nome Squadra B" 
                  value={modalTeams.right} 
                  onChange={(e) => setModalTeams(p => ({ ...p, right: e.target.value }))}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val && val !== "—" && !val.includes(".") && val !== "Slot Libero" && !val.startsWith("TBD")) {
                      setModalTeams(p => ({ ...p, right: formatTeamNameClean(val) }));
                    }
                  }}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0D3D31] outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Set scores */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3 mt-1">
              <div className="grid grid-cols-4 gap-2 items-center text-center text-[9px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b">
                <div>Set</div>
                <div>Set 1</div>
                <div>Set 2</div>
                <div>Set 3</div>
              </div>
              
              {/* Squadra A */}
              <div className="grid grid-cols-4 gap-2 items-center">
                <span className="text-[10px] font-bold text-gray-600 truncate max-w-[80px] text-right">{modalTeams.left || "A"}</span>
                <input type="number" placeholder="0" value={modalMeta.s1L} onChange={(e) => setModalMeta(p => ({ ...p, s1L: e.target.value }))} className="w-full text-center text-xs border border-gray-200 rounded-lg py-1 bg-white text-gray-900 font-bold focus:outline-none" />
                <input type="number" placeholder="0" value={modalMeta.s2L} onChange={(e) => setModalMeta(p => ({ ...p, s2L: e.target.value }))} className="w-full text-center text-xs border border-gray-200 rounded-lg py-1 bg-white text-gray-900 font-bold focus:outline-none" />
                <input type="number" placeholder="0" value={modalMeta.s3L} onChange={(e) => setModalMeta(p => ({ ...p, s3L: e.target.value }))} className="w-full text-center text-xs border border-gray-200 rounded-lg py-1 bg-white text-gray-900 font-bold focus:outline-none" />
              </div>

              {/* Squadra B */}
              <div className="grid grid-cols-4 gap-2 items-center">
                <span className="text-[10px] font-bold text-gray-600 truncate max-w-[80px] text-right">{modalTeams.right || "B"}</span>
                <input type="number" placeholder="0" value={modalMeta.s1R} onChange={(e) => setModalMeta(p => ({ ...p, s1R: e.target.value }))} className="w-full text-center text-xs border border-gray-200 rounded-lg py-1 bg-white text-gray-900 font-bold focus:outline-none" />
                <input type="number" placeholder="0" value={modalMeta.s2R} onChange={(e) => setModalMeta(p => ({ ...p, s2R: e.target.value }))} className="w-full text-center text-xs border border-gray-200 rounded-lg py-1 bg-white text-gray-900 font-bold focus:outline-none" />
                <input type="number" placeholder="0" value={modalMeta.s3R} onChange={(e) => setModalMeta(p => ({ ...p, s3R: e.target.value }))} className="w-full text-center text-xs border border-gray-200 rounded-lg py-1 bg-white text-gray-900 font-bold focus:outline-none" />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-gray-100">
              <button onClick={clearModalScores} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">Svuota Punteggi</button>
              <div className="flex gap-2">
                <button onClick={closeEditModal} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">Annulla</button>
                <button onClick={saveModalChanges} className="px-5 py-2 bg-[#0D3D31] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-opacity-95 transition-all cursor-pointer">Conferma</button>
              </div>
            </div>

          </div>
        </div>
      )}
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
