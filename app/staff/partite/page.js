"use client";

import { useState, useEffect } from "react";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getGironi, saveGironi } from "@/app/utils/db";
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

export default function StaffPartite() {
  const [torneiAttivi, setTorneiAttivi] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // States mirroring gironi config structure
  const [numGironi, setNumGironi] = useState(4);
  const [teamCounts, setTeamCounts] = useState({});
  const [gironeAssignments, setGironeAssignments] = useState({});
  const [gironeTypes, setGironeTypes] = useState({});
  const [gironeSets, setGironeSets] = useState({});
  const [matchMetadata, setMatchMetadata] = useState({});
  const [pubblicato, setPubblicato] = useState(false);
  const [rankingType, setRankingType] = useState("gironi");

  const [activeCourtTab, setActiveCourtTab] = useState("tutte"); // "tutte", "mare", "monte"

  const allGironi = [
    { id: 'A', colorClass: 'blue' },
    { id: 'B', colorClass: 'red' },
    { id: 'C', colorClass: 'yellow' },
    { id: 'D', colorClass: 'purple' },
    { id: 'E', colorClass: 'green' },
    { id: 'F', colorClass: 'orange' },
    { id: 'G', colorClass: 'pink' },
    { id: 'H', colorClass: 'cyan' },
    { id: 'I', colorClass: 'blue' },
    { id: 'J', colorClass: 'red' },
    { id: 'K', colorClass: 'yellow' },
    { id: 'L', colorClass: 'purple' },
  ];

  useEffect(() => {
    getTornei().then(parsedTornei => {
      const attivi = parsedTornei.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione");
      setTorneiAttivi(attivi);
      
      const params = new URLSearchParams(window.location.search);
      const urlTour = params.get('tour');
      
      if (urlTour && attivi.some(t => t.nome === urlTour)) {
        setSelectedTorneo(urlTour);
      } else if (attivi.length > 0) {
        setSelectedTorneo(attivi[0].nome);
      }
    });
  }, []);

  const getConfigKey = (nomeTorneo) => {
    if (!nomeTorneo) return "";
    return `bvi_gironi_v2_${nomeTorneo.toLowerCase().trim().replace(/\s+/g, '_')}`;
  };

  useEffect(() => {
    if (!selectedTorneo) return;
    setIsLoaded(false);
    
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    getGironi(slug).then(config => {
      if (config) {
        setNumGironi(config.numGironi || 4);
        setTeamCounts(config.teamCounts || {});
        setGironeTypes(config.gironeTypes || {});
        setGironeSets(config.gironeSets || {});
        setGironeAssignments(config.gironeAssignments || {});
        setMatchMetadata(config.matchMetadata || {});
        setPubblicato(config.pubblicato || false);
        setRankingType(config.rankingType || "gironi");
      } else {
        setNumGironi(4);
        setTeamCounts({});
        setGironeTypes({});
        setGironeSets({});
        setGironeAssignments({});
        setMatchMetadata({});
        setPubblicato(false);
        setRankingType("gironi");
      }
      setIsLoaded(true);
    });
  }, [selectedTorneo]);

  // Debounced auto-save
  useEffect(() => {
    if (!selectedTorneo || !isLoaded) return;
    const config = {
      numGironi,
      teamCounts,
      gironeTypes,
      gironeSets,
      gironeAssignments,
      matchMetadata,
      pubblicato,
      rankingType
    };
    
    localStorage.setItem(getConfigKey(selectedTorneo), JSON.stringify(config));

    const handler = setTimeout(() => {
      const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
      saveGironi(slug, config);
    }, 1000);

    return () => clearTimeout(handler);
  }, [matchMetadata, selectedTorneo, isLoaded]);

  const handleMetadataChange = (gironeId, matchIdx, field, value) => {
    setMatchMetadata(prev => ({
      ...prev,
      [`${gironeId}-${matchIdx}`]: {
        ...(prev[`${gironeId}-${matchIdx}`] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedTorneo) return;
    const config = {
      numGironi,
      teamCounts,
      gironeTypes,
      gironeSets,
      gironeAssignments,
      matchMetadata,
      pubblicato,
      rankingType
    };
    localStorage.setItem(getConfigKey(selectedTorneo), JSON.stringify(config));
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    await saveGironi(slug, config);
    alert(`Partite e punteggi salvati con successo! 💾`);
  };

  const handleClearScores = async () => {
    if (!selectedTorneo) return;
    if (!window.confirm("Sei sicuro di voler eliminare tutti i punteggi inseriti? I dati di campo e orario verranno mantenuti.")) return;

    const newMetadata = {};
    Object.entries(matchMetadata).forEach(([key, val]) => {
      // Keep court and time, clear all score fields
      newMetadata[key] = {
        court: val.court || "",
        time: val.time || ""
      };
    });

    setMatchMetadata(newMetadata);

    const config = {
      numGironi,
      teamCounts,
      gironeTypes,
      gironeSets,
      gironeAssignments,
      matchMetadata: newMetadata,
      pubblicato,
      rankingType
    };
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    await saveGironi(slug, config);
    alert("Punteggi eliminati con successo! I dati di campo e orario sono stati mantenuti. 🗑️");
  };

  const getColors = (color) => {
    switch (color) {
      case 'blue': return { main: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' };
      case 'red': return { main: 'bg-red-500', text: 'text-red-500', light: 'bg-red-50' };
      case 'yellow': return { main: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50' };
      case 'purple': return { main: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' };
      case 'green': return { main: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50' };
      case 'orange': return { main: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' };
      case 'pink': return { main: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-50' };
      case 'cyan': return { main: 'bg-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50' };
      default: return { main: 'bg-gray-600', text: 'text-gray-600', light: 'bg-gray-50' };
    }
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

  // Compile all matches of the current group setup
  const getCompiledMatches = () => {
    const list = [];
    const activeGironi = allGironi.slice(0, numGironi);
    activeGironi.forEach(g => {
      const currentAssignments = {};
      const count = teamCounts[g.id] || 0;
      for (let i = 0; i < count; i++) {
        currentAssignments[i] = gironeAssignments[g.id]?.[i] || "—";
      }
      const schedule = getScheduleShared(count, g.id, currentAssignments, gironeTypes, gironeSets, matchMetadata);
      schedule.forEach((row, idx) => {
        const meta = matchMetadata[`${g.id}-${idx}`] || {};
        list.push({
          gironeId: g.id,
          colorClass: g.colorClass,
          idx: idx,
          left: row.left,
          right: row.right,
          meta: meta
        });
      });
    });

    // Filter by court
    let filtered = list;
    if (activeCourtTab === "mare") {
      filtered = list.filter(m => m.meta.court === "1" || !m.meta.court || m.meta.court.trim() === "");
    } else if (activeCourtTab === "monte") {
      filtered = list.filter(m => m.meta.court === "2");
    }

    // Sort chronologically
    return [...filtered].sort((a, b) => {
      const timeA = parseTimeToMinutes(a.meta?.time);
      const timeB = parseTimeToMinutes(b.meta?.time);
      if (timeA !== timeB) return timeA - timeB;
      const courtA = parseInt(a.meta?.court) || 0;
      const courtB = parseInt(b.meta?.court) || 0;
      return courtA - courtB;
    });
  };

  const matches = getCompiledMatches();

  return (
    <main className="min-h-screen bg-transparent pb-20">
      <StaffHeader />

      <div className="max-w-[1200px] mx-auto px-4 mt-6 md:mt-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-[#295dab] uppercase tracking-tighter leading-none">Partite & Risultati 🏆</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">
              Inserimento punteggi e programmazione campi
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select 
              className="flex-1 md:w-64 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-[#295dab] text-sm shadow-xl cursor-pointer"
              value={selectedTorneo}
              onChange={(e) => setSelectedTorneo(e.target.value)}
            >
              {torneiAttivi.length > 0 ? torneiAttivi.map(t => (
                <option key={t.id} value={t.nome}>{t.nome}</option>
              )) : (
                <option>Nessun torneo attivo</option>
              )}
            </select>
            <button 
              onClick={handleClearScores}
              disabled={!selectedTorneo || !isLoaded}
              className="flex-1 md:flex-none bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              🗑️ Elimina Punteggi
            </button>
            <button 
              onClick={handleSave}
              disabled={!selectedTorneo || !isLoaded}
              className="flex-1 md:flex-none bg-[#295dab] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              Salva Punteggi
            </button>
          </div>
        </div>

        {!isLoaded ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#295dab]"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Court Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
              <button
                onClick={() => setActiveCourtTab("tutte")}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  activeCourtTab === "tutte"
                    ? "bg-[#295dab] text-white shadow-md scale-[1.03]"
                    : "bg-white text-gray-400 border border-gray-100 hover:text-[#295dab] hover:bg-gray-50"
                }`}
              >
                Tutte le Partite ({matches.length})
              </button>
              <button
                onClick={() => setActiveCourtTab("mare")}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  activeCourtTab === "mare"
                    ? "bg-[#295dab] text-white shadow-md scale-[1.03]"
                    : "bg-white text-gray-400 border border-gray-100 hover:text-[#295dab] hover:bg-gray-50"
                }`}
              >
                Campo Mare (1)
              </button>
              <button
                onClick={() => setActiveCourtTab("monte")}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  activeCourtTab === "monte"
                    ? "bg-[#295dab] text-white shadow-md scale-[1.03]"
                    : "bg-white text-gray-400 border border-gray-100 hover:text-[#295dab] hover:bg-gray-50"
                }`}
              >
                Campo Monte (2)
              </button>
            </div>

            {/* Matches list */}
            {matches.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-gray-100 text-center space-y-3">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nessuna partita trovata</p>
                <p className="text-xs text-gray-300">
                  Assicurati di aver inserito e configurato le squadre nella sezione "Gironi".
                </p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {matches.map((match, i) => {
                    const c = getColors(match.colorClass);
                    const isThreeSets = gironeSets[match.gironeId] === "3 set";
                    
                    const leftLabel = match.left && match.left !== "—" && match.left !== "Slot Libero" 
                      ? splitNames(match.left).map(formatPlayerName).join(" - ") 
                      : (match.left || "Slot Libero");
                    const rightLabel = match.right && match.right !== "—" && match.right !== "Slot Libero" 
                      ? splitNames(match.right).map(formatPlayerName).join(" - ") 
                      : (match.right || "Slot Libero");

                    return (
                      <div 
                        key={`${match.gironeId}-${match.idx}`}
                        className="bg-gray-50/50 hover:bg-gray-50/80 transition-all rounded-3xl p-4 md:p-5 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Info details */}
                        <div className="flex items-center gap-3 min-w-[150px]">
                          <span className={`w-3 h-3 rounded-full ${c.main}`}></span>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${c.text}`}>
                              Girone {match.gironeId} • Gara {match.idx + 1}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                              {isThreeSets ? "3 Set" : "1 Set"}
                            </span>
                          </div>
                        </div>

                        {/* Court & Time settings */}
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">Orario</label>
                            <input 
                              type="text" 
                              placeholder="hh:mm" 
                              value={match.meta.time || ""} 
                              onChange={(e) => handleMetadataChange(match.gironeId, match.idx, 'time', e.target.value)} 
                              className="w-16 bg-white border-2 border-gray-100 rounded-xl text-xs py-2 text-center font-bold text-gray-900 focus:outline-none focus:border-[#295dab]" 
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">Campo</label>
                            <select 
                              value={match.meta.court || ""} 
                              onChange={(e) => handleMetadataChange(match.gironeId, match.idx, 'court', e.target.value)} 
                              className="w-20 bg-white border-2 border-gray-100 rounded-xl text-xs py-2 text-center font-bold text-gray-900 focus:outline-none focus:border-[#295dab] cursor-pointer"
                            >
                              <option value="">Da Asseg.</option>
                              <option value="1">Mare (1)</option>
                              <option value="2">Monte (2)</option>
                            </select>
                          </div>
                        </div>

                        {/* Matchup & Scores */}
                        <div className="flex-1 flex items-center justify-between gap-2 md:gap-4 bg-white/70 p-3 rounded-2xl border border-gray-50">
                          {/* Left Team */}
                          <span className="flex-1 text-xs font-black text-[#295dab] text-right truncate max-w-[200px]" title={leftLabel}>
                            {leftLabel}
                          </span>

                          {/* Inputs for scores */}
                          <div className="flex items-center gap-1">
                            {/* Set 1 */}
                            <div className="flex gap-0.5">
                              <input 
                                type="text" 
                                placeholder="s1"
                                value={match.meta.s1L || ""} 
                                onChange={(e) => handleMetadataChange(match.gironeId, match.idx, 's1L', e.target.value)} 
                                className="w-8 h-8 bg-[#295dab] text-white rounded-lg text-xs text-center font-black placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#C3562B]" 
                              />
                              <input 
                                type="text" 
                                placeholder="s1"
                                value={match.meta.s1R || ""} 
                                onChange={(e) => handleMetadataChange(match.gironeId, match.idx, 's1R', e.target.value)} 
                                className="w-8 h-8 bg-[#295dab] text-white rounded-lg text-xs text-center font-black placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#C3562B]" 
                              />
                            </div>

                            {/* Set 2 (if 3 sets) */}
                            {isThreeSets && (
                              <>
                                <span className="text-[10px] text-gray-300 font-bold px-0.5">|</span>
                                <div className="flex gap-0.5">
                                  <input 
                                    type="text" 
                                    placeholder="s2"
                                    value={match.meta.s2L || ""} 
                                    onChange={(e) => handleMetadataChange(match.gironeId, match.idx, 's2L', e.target.value)} 
                                    className="w-8 h-8 bg-[#C3562B] text-white rounded-lg text-xs text-center font-black placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#295dab]" 
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="s2"
                                    value={match.meta.s2R || ""} 
                                    onChange={(e) => handleMetadataChange(match.gironeId, match.idx, 's2R', e.target.value)} 
                                    className="w-8 h-8 bg-[#C3562B] text-white rounded-lg text-xs text-center font-black placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#295dab]" 
                                  />
                                </div>
                              </>
                            )}

                            {/* Set 3 (if 3 sets) */}
                            {isThreeSets && (
                              <>
                                <span className="text-[10px] text-gray-300 font-bold px-0.5">|</span>
                                <div className="flex gap-0.5">
                                  <input 
                                    type="text" 
                                    placeholder="s3"
                                    value={match.meta.s3L || ""} 
                                    onChange={(e) => handleMetadataChange(match.gironeId, match.idx, 's3L', e.target.value)} 
                                    className="w-8 h-8 bg-amber-500 text-white rounded-lg text-xs text-center font-black placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#295dab]" 
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="s3"
                                    value={match.meta.s3R || ""} 
                                    onChange={(e) => handleMetadataChange(match.gironeId, match.idx, 's3R', e.target.value)} 
                                    className="w-8 h-8 bg-amber-500 text-white rounded-lg text-xs text-center font-black placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#295dab]" 
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          {/* Right Team */}
                          <span className="flex-1 text-xs font-black text-[#295dab] text-left truncate max-w-[200px]" title={rightLabel}>
                            {rightLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
