"use client";

import { useState, useEffect } from "react";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getIscrizioni, getGironi, saveGironi } from "@/app/utils/db";
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


export default function StaffGironi() {
  const [numGironi, setNumGironi] = useState(4);
  const [teamCounts, setTeamCounts] = useState({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4, I: 4, J: 4, K: 4, L: 4 });
  
  const [torneiAttivi, setTorneiAttivi] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [tutteLeIscrizioni, setTutteLeIscrizioni] = useState([]);
  const [gironeAssignments, setGironeAssignments] = useState({});
  const [gironeTypes, setGironeTypes] = useState({ A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool", I: "Pool", J: "Pool", K: "Pool", L: "Pool" });
  const [gironeSets, setGironeSets] = useState({ A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set", I: "1 set", J: "1 set", K: "1 set", L: "1 set" });
  const [matchMetadata, setMatchMetadata] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [pubblicato, setPubblicato] = useState(false);
  const [rankingType, setRankingType] = useState("gironi"); // "avulsa" o "gironi"
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const handleSlotClick = (gironeId, idx, playerInSlot) => {
    const hasPlayer = playerInSlot !== "—";
    
    if (selectedAthlete) {
      // Assign selected athlete from sidebar to this slot
      handleAssignmentChange(gironeId, idx, selectedAthlete);
      setSelectedAthlete(null);
    } else if (selectedSlot) {
      if (selectedSlot.gironeId === gironeId && selectedSlot.slotIdx === idx) {
        // Deselect if clicking the same slot
        setSelectedSlot(null);
      } else {
        // Swap or move
        const athlete1 = selectedSlot.name;
        const athlete2 = playerInSlot;
        handleAssignmentChange(selectedSlot.gironeId, selectedSlot.slotIdx, athlete2);
        handleAssignmentChange(gironeId, idx, athlete1);
        setSelectedSlot(null);
      }
    } else {
      // Select slot for moving/swapping
      if (hasPlayer) {
        setSelectedSlot({ gironeId, slotIdx: idx, name: playerInSlot });
        setSelectedAthlete(null);
      }
    }
  };

  const handleSidebarClick = () => {
    if (selectedSlot) {
      // If a slot was selected for moving, tapping the sidebar clears it
      handleAssignmentChange(selectedSlot.gironeId, selectedSlot.slotIdx, "—");
      setSelectedSlot(null);
    }
  };

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

    getIscrizioni().then(data => {
      setTutteLeIscrizioni(data);
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
        setTeamCounts(config.teamCounts || { A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4, I: 4, J: 4, K: 4, L: 4 });
        setGironeTypes(config.gironeTypes || { A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool", I: "Pool", J: "Pool", K: "Pool", L: "Pool" });
        setGironeSets(config.gironeSets || { A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set", I: "1 set", J: "1 set", K: "1 set", L: "1 set" });
        setGironeAssignments(config.gironeAssignments || {});
        setMatchMetadata(config.matchMetadata || {});
        setPubblicato(config.pubblicato || false);
        setRankingType(config.rankingType || "gironi");
      } else {
        setNumGironi(4);
        setTeamCounts({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4, I: 4, J: 4, K: 4, L: 4 });
        setGironeTypes({ A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool", I: "Pool", J: "Pool", K: "Pool", L: "Pool" });
        setGironeSets({ A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set", I: "1 set", J: "1 set", K: "1 set", L: "1 set" });
        setGironeAssignments({});
        setMatchMetadata({});
        setPubblicato(false);
        setRankingType("gironi");
      }
      setIsLoaded(true);
    });
  }, [selectedTorneo]);

  // Auto-save whenever configurations change (after they have been fully loaded)
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
    
    // Immediate save to localStorage
    localStorage.setItem(getConfigKey(selectedTorneo), JSON.stringify(config));

    // Debounced save to cloud db
    const handler = setTimeout(() => {
      const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
      saveGironi(slug, config);
    }, 1000);

    return () => clearTimeout(handler);
  }, [numGironi, teamCounts, gironeTypes, gironeSets, gironeAssignments, matchMetadata, pubblicato, rankingType, selectedTorneo, isLoaded]);

  const giocatoriFiltrati = tutteLeIscrizioni.filter(isc => {
    const tName = (isc.torneo || "").toLowerCase().trim();
    const sName = (selectedTorneo || "").toLowerCase().trim();
    return tName === sName && isc.stato === "Approvata";
  });

  const handleAssignmentChange = (gironeId, slotIdx, playerName) => {
    setGironeAssignments(prev => ({
      ...prev,
      [gironeId]: {
        ...(prev[gironeId] || {}),
        [slotIdx]: playerName
      }
    }));
  };

  const handleDragStart = (e, playerName, sourceGirone = null, sourceSlot = null) => {
    e.dataTransfer.setData("text/plain", playerName);
    if (sourceGirone !== null && sourceSlot !== null) {
      e.dataTransfer.setData("sourceGirone", sourceGirone);
      e.dataTransfer.setData("sourceSlot", sourceSlot.toString());
    }
    setIsDragging(true);
  };

  const handleDrop = (e, targetGironeId, targetSlotIdx) => {
    e.preventDefault();
    const playerName = e.dataTransfer.getData("text/plain");
    const sourceGirone = e.dataTransfer.getData("sourceGirone");
    const sourceSlot = e.dataTransfer.getData("sourceSlot");

    if (playerName) {
      if (sourceGirone && sourceSlot) {
        const srcIdx = parseInt(sourceSlot, 10);
        handleAssignmentChange(sourceGirone, srcIdx, "—");
      }
      handleAssignmentChange(targetGironeId, targetSlotIdx, playerName);
    }
    setDragOverSlot(null);
    setIsDragging(false);
  };

  const handleSidebarDrop = (e) => {
    e.preventDefault();
    const sourceGirone = e.dataTransfer.getData("sourceGirone");
    const sourceSlot = e.dataTransfer.getData("sourceSlot");
    if (sourceGirone && sourceSlot) {
      const srcIdx = parseInt(sourceSlot, 10);
      handleAssignmentChange(sourceGirone, srcIdx, "—");
    }
    setIsDragging(false);
  };

  const handleTypeChange = (gironeId, type) => {
    setGironeTypes(prev => ({ ...prev, [gironeId]: type }));
  };

  const handleSetsChange = (gironeId, sets) => {
    setGironeSets(prev => ({ ...prev, [gironeId]: sets }));
  };

  const handleSave = async () => {
    if (!selectedTorneo) return;
    
    const configKey = getConfigKey(selectedTorneo);
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
    
    localStorage.setItem(configKey, JSON.stringify(config));
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    await saveGironi(slug, config);
    alert(`Configurazione salvata per "${selectedTorneo}"! 🏐`);
  };


  const handleDeleteGironi = async () => {
    if (!selectedTorneo) return;
    if (!window.confirm("Sei sicuro di voler eliminare completamente i gironi di questo torneo? Tutti i dati e i risultati inseriti andranno persi.")) return;
    
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    
    setNumGironi(4);
    setTeamCounts({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4, I: 4, J: 4, K: 4, L: 4 });
    setGironeTypes({ A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool", I: "Pool", J: "Pool", K: "Pool", L: "Pool" });
    setGironeSets({ A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set", I: "1 set", J: "1 set", K: "1 set", L: "1 set" });
    setGironeAssignments({});
    setMatchMetadata({});
    setPubblicato(false);
    setRankingType("avulsa");
    
    localStorage.removeItem(getConfigKey(selectedTorneo));
    await saveGironi(slug, null);
    
    alert("Gironi eliminati con successo! 🗑️");
  };



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
  
  const gironi = allGironi.slice(0, numGironi);

  const handleTeamCountChange = (gironeId, value) => {
    const val = parseInt(value, 10);
    if (value === "") {
      setTeamCounts(prev => ({ ...prev, [gironeId]: "" }));
    } else if (!isNaN(val) && val > 0 && val <= 10) {
      setTeamCounts(prev => ({ ...prev, [gironeId]: val }));
    }
  };

  const getSchedule = (numTeams, gironeId, assignments = {}) => {
    return getScheduleShared(numTeams, gironeId, assignments, gironeTypes, gironeSets, matchMetadata);
  };

  const getColors = (color) => {
    switch (color) {
      case 'blue': return { main: 'bg-blue-600', border: 'border-blue-600', light: 'bg-blue-50', inputBg: 'bg-blue-800/50' };
      case 'red': return { main: 'bg-red-500', border: 'border-red-500', light: 'bg-red-50', inputBg: 'bg-red-700/50' };
      case 'yellow': return { main: 'bg-yellow-500', border: 'border-yellow-500', light: 'bg-yellow-50', inputBg: 'bg-yellow-600/50' };
      case 'purple': return { main: 'bg-purple-600', border: 'border-purple-600', light: 'bg-purple-50', inputBg: 'bg-purple-800/50' };
      case 'green': return { main: 'bg-green-600', border: 'border-green-600', light: 'bg-green-50', inputBg: 'bg-green-800/50' };
      case 'orange': return { main: 'bg-orange-500', border: 'border-orange-500', light: 'bg-orange-50', inputBg: 'bg-orange-700/50' };
      case 'pink': return { main: 'bg-pink-500', border: 'border-pink-500', light: 'bg-pink-50', inputBg: 'bg-pink-700/50' };
      case 'cyan': return { main: 'bg-cyan-600', border: 'border-cyan-600', light: 'bg-cyan-50', inputBg: 'bg-cyan-800/50' };
      default: return { main: 'bg-gray-600', border: 'border-gray-600', light: 'bg-gray-50', inputBg: 'bg-gray-800/50' };
    }
  };

  return (
    <main className="min-h-screen bg-[#f8faff] pb-20">
      <StaffHeader />

      <div className="max-w-[1400px] mx-auto px-4 mt-6 md:mt-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
                <h2 className="text-3xl md:text-5xl font-black text-[#0D3D31] uppercase tracking-tighter leading-none">Gestione Gironi 🏐</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Composizione e Risultati</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <select 
                    className="flex-1 md:w-64 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-[#0D3D31] text-sm shadow-xl"
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
                    onClick={handleSave}
                    disabled={!selectedTorneo}
                    className="flex-1 md:flex-none bg-[#0D3D31] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                    Salva Tutto
                </button>
                <button 
                    onClick={handleDeleteGironi}
                    disabled={!selectedTorneo}
                    className="flex-1 md:flex-none bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                    🗑️ Elimina
                </button>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
            {/* Configurazione Gironi */}
            <div className="flex-1 space-y-8">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-50 pb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Parametri Globali</h3>
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">Stato Gironi:</span>
                                <button
                                    onClick={() => setPubblicato(!pubblicato)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                        pubblicato 
                                            ? 'bg-green-100 text-green-700 border border-green-200' 
                                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                                    }`}
                                >
                                    {pubblicato ? "🟢 Pubblicati (Visibili)" : "🟡 Bozza (Nascosti)"}
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500">Tipo Classifica:</span>
                                <select
                                    value={rankingType}
                                    onChange={(e) => setRankingType(e.target.value)}
                                    className="bg-gray-50 border-none rounded-xl px-3 py-2 font-bold text-[#0D3D31] text-xs shadow-inner focus:ring-1 focus:ring-[#0D3D31] cursor-pointer"
                                >
                                    <option value="avulsa">Classifica Avulsa (Unica)</option>
                                    <option value="gironi">Classifiche Separate (Gironi)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500">Numero Gironi:</span>
                                <input 
                                    type="number" 
                                    value={numGironi} 
                                    onChange={(e) => setNumGironi(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                                    className="w-16 bg-gray-50 border-none rounded-xl px-3 py-2 text-center font-black text-[#0D3D31] shadow-inner" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {gironi.map((g) => {
                            const c = getColors(g.colorClass);
                            const teamCount = teamCounts[g.id] || 0;
                            return (
                                <div key={g.id} className="bg-white rounded-[2rem] border-2 border-gray-50 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                                    <div className={`${c.main} p-5 text-white flex justify-between items-center`}>
                                        <h4 className="font-black text-xl uppercase tracking-tighter">GIRONE {g.id}</h4>
                                        <div className="flex gap-2">
                                            <select 
                                                value={gironeTypes[g.id]} 
                                                onChange={(e) => handleTypeChange(g.id, e.target.value)}
                                                className={`${c.inputBg} text-[10px] rounded-lg py-1 px-2 font-black border-none focus:ring-1 focus:ring-white text-white`}
                                            >
                                                <option value="Pool">Pool</option>
                                                <option value="Girone all'italiana">Italiana</option>
                                            </select>
                                            <input 
                                                type="number" 
                                                value={teamCounts[g.id]} 
                                                onChange={(e) => handleTeamCountChange(g.id, e.target.value)}
                                                className={`w-10 text-center ${c.inputBg} rounded-lg py-1 font-black border-none text-[10px] focus:ring-1 focus:ring-white text-white`} 
                                            />
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        {Array.from({ length: teamCount }).map((_, idx) => {
                                            const playerInSlot = gironeAssignments[g.id]?.[idx] || "—";
                                            const hasPlayer = playerInSlot !== "—";
                                            const slotKey = `${g.id}-${idx}`;
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={`flex items-center gap-3 p-1.5 rounded-2xl transition-all border-2 cursor-pointer ${
                                                        selectedSlot && selectedSlot.gironeId === g.id && selectedSlot.slotIdx === idx
                                                            ? 'border-[#C3562B] bg-yellow-50/50 scale-[1.02] shadow-md'
                                                            : dragOverSlot === slotKey 
                                                                ? `border-dashed ${c.border} ${c.light} scale-[1.02] shadow-sm` 
                                                                : 'border-transparent hover:border-gray-200 hover:bg-gray-50/30'
                                                    }`}
                                                    draggable={hasPlayer}
                                                    onDragStart={(e) => handleDragStart(e, playerInSlot, g.id, idx)}
                                                    onDragEnd={() => {
                                                        setIsDragging(false);
                                                        setDragOverSlot(null);
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setDragOverSlot(slotKey);
                                                    }}
                                                    onDragLeave={() => setDragOverSlot(null)}
                                                    onDrop={(e) => handleDrop(e, g.id, idx)}
                                                    onClick={() => handleSlotClick(g.id, idx, playerInSlot)}
                                                >
                                                    <span className="text-[10px] font-black text-gray-300 w-4 cursor-default select-none">{idx + 1}</span>
                                                    <select 
                                                        className="flex-1 bg-gray-50/80 border-none rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#0D3D31] cursor-pointer"
                                                        value={playerInSlot}
                                                        onChange={(e) => handleAssignmentChange(g.id, idx, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="—">—</option>
                                                        {giocatoriFiltrati.map(gf => (
                                                            <option key={gf.id} value={gf.giocatori}>{gf.giocatori}</option>
                                                        ))}
                                                    </select>
                                                    {hasPlayer && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAssignmentChange(g.id, idx, "—");
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 text-xs font-bold px-2 py-1 transition-colors"
                                                            title="Rimuovi dal girone"
                                                            type="button"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>



            </div>

            <div 
                className={`w-full lg:w-80 bg-white rounded-[2.5rem] shadow-xl border p-6 h-fit sticky top-10 transition-all duration-300 ${
                    isDragging || selectedSlot
                        ? 'border-dashed border-red-300 bg-red-50/20 cursor-pointer shadow-lg' 
                        : 'border-gray-100'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleSidebarDrop}
                onClick={handleSidebarClick}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest transition-colors text-gray-400">
                        {isDragging || selectedSlot ? "Rilascia/Clicca qui per rimuovere 🗑️" : "Iscritti Approvati"}
                    </h3>
                    <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full">{giocatoriFiltrati.length}</span>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar">
                    {giocatoriFiltrati.map((g, i) => {
                        const isAssigned = Object.values(gironeAssignments).some(slots => 
                            Object.values(slots).includes(g.giocatori)
                        );
                        return (
                            <div 
                                key={i} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, g.giocatori)}
                                onDragEnd={() => setIsDragging(false)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAssigned) return;
                                    if (selectedAthlete === g.giocatori) {
                                        setSelectedAthlete(null);
                                    } else {
                                        setSelectedAthlete(g.giocatori);
                                        setSelectedSlot(null);
                                    }
                                }}
                                className={`p-4 rounded-2xl border transition-all flex justify-between items-center group ${
                                    isAssigned 
                                        ? 'opacity-40 border-gray-100 hover:border-gray-100 bg-gray-50' 
                                        : selectedAthlete === g.giocatori
                                            ? 'border-blue-500 bg-blue-50/80 shadow-md scale-[1.02] cursor-pointer'
                                            : 'border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-white hover:shadow-md cursor-pointer'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-300 group-hover:text-blue-500 transition-colors select-none">⋮⋮</span>
                                    <span className={`font-bold text-xs ${isAssigned ? 'text-gray-400 line-through' : 'text-[#0D3D31]'}`}>{g.giocatori}</span>
                                </div>
                                <span className={`text-[10px] font-black ${isAssigned ? 'text-gray-300' : 'text-blue-600'}`}>#{g.id}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
