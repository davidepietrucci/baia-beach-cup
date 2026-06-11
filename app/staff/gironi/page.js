"use client";

import { useState, useEffect } from "react";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getIscrizioni, getGironi, saveGironi } from "@/app/utils/db";

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function StaffGironi() {
  const [numGironi, setNumGironi] = useState(4);
  const [teamCounts, setTeamCounts] = useState({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4 });
  
  const [torneiAttivi, setTorneiAttivi] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [tutteLeIscrizioni, setTutteLeIscrizioni] = useState([]);
  const [gironeAssignments, setGironeAssignments] = useState({});
  const [gironeTypes, setGironeTypes] = useState({ A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool" });
  const [gironeSets, setGironeSets] = useState({ A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set" });
  const [matchMetadata, setMatchMetadata] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  
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
        setTeamCounts(config.teamCounts || { A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4 });
        setGironeTypes(config.gironeTypes || { A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool" });
        setGironeSets(config.gironeSets || { A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set" });
        setGironeAssignments(config.gironeAssignments || {});
        setMatchMetadata(config.matchMetadata || {});
      } else {
        setNumGironi(4);
        setTeamCounts({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4 });
        setGironeTypes({ A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool" });
        setGironeSets({ A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set" });
        setGironeAssignments({});
        setMatchMetadata({});
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
      matchMetadata
    };
    
    // Immediate save to localStorage
    localStorage.setItem(getConfigKey(selectedTorneo), JSON.stringify(config));

    // Debounced save to cloud db
    const handler = setTimeout(() => {
      const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
      saveGironi(slug, config);
    }, 1000);

    return () => clearTimeout(handler);
  }, [numGironi, teamCounts, gironeTypes, gironeSets, gironeAssignments, matchMetadata, selectedTorneo, isLoaded]);

  const giocatoriFiltrati = tutteLeIscrizioni.filter(isc => {
    const tName = (isc.torneo || "").toLowerCase();
    const sName = (selectedTorneo || "").toLowerCase().trim();
    return tName.includes(sName) && isc.stato === "Approvata";
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
    
    const configKey = getConfigKey(selectedTorneo);
    const config = {
      numGironi,
      teamCounts,
      gironeTypes,
      gironeSets,
      gironeAssignments,
      matchMetadata
    };
    
    localStorage.setItem(configKey, JSON.stringify(config));
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    await saveGironi(slug, config);
    alert(`Configurazione salvata per "${selectedTorneo}"! 🏐`);
  };

  const handleRandomizeGironi = () => {
    if (giocatoriFiltrati.length === 0) {
      alert("Nessun iscritto approvato per questo torneo!");
      return;
    }
    if (!window.confirm("Sei sicuro di voler mescolare e riassegnare casualmente tutti gli iscritti nei gironi? La configurazione attuale verrà sovrascritta.")) return;
    
    // 1. Get and shuffle teams
    const shuffledTeams = shuffle(giocatoriFiltrati.map(gf => gf.giocatori));
    
    // 2. Build new assignments
    const newAssignments = { ...gironeAssignments };
    let teamIdx = 0;
    
    // Loop through all active gironi
    const activeGironiIds = allGironi.slice(0, numGironi).map(g => g.id);
    activeGironiIds.forEach(gid => {
      const count = teamCounts[gid] || 0;
      newAssignments[gid] = {};
      for (let idx = 0; idx < count; idx++) {
        if (teamIdx < shuffledTeams.length) {
          newAssignments[gid][idx] = shuffledTeams[teamIdx];
          teamIdx++;
        } else {
          newAssignments[gid][idx] = "—";
        }
      }
    });
    
    setGironeAssignments(newAssignments);
    alert("Sorteggio completato con successo! Ricordati di cliccare su SALVA TUTTO per rendere permanente il sorteggio. 🎲");
  };

  const handleDeleteGironi = async () => {
    if (!selectedTorneo) return;
    if (!window.confirm("Sei sicuro di voler eliminare completamente i gironi di questo torneo? Tutti i dati e i risultati inseriti andranno persi.")) return;
    
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, '_');
    
    setNumGironi(4);
    setTeamCounts({ A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4 });
    setGironeTypes({ A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool" });
    setGironeSets({ A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set" });
    setGironeAssignments({});
    setMatchMetadata({});
    
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
    const getName = (idx) => assignments[idx] && assignments[idx] !== "—" ? assignments[idx] : `Slot ${idx + 1}`;
    const type = gironeTypes[gironeId] || "Pool";

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
        const meta = matchMetadata[`${gironeId}-${idx}`] || {};
        const s1L = parseInt(meta.s1L || 0);
        const s1R = parseInt(meta.s1R || 0);
        if (s1L === 0 && s1R === 0) return { winner: `Vincente G${idx + 1}`, loser: `Perdente G${idx + 1}` };
        
        if (gironeSets[gironeId] === "3 set") {
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
    return Array.from({length: numTeams}).map((_, i) => ({ left: `Gara ${i+1} A`, right: `Gara ${i+1} B` }));
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
                <h2 className="text-3xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Gestione Gironi 🏐</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Composizione e Risultati</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <select 
                    className="flex-1 md:w-64 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-[#0a1628] text-sm shadow-xl"
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
                    onClick={handleRandomizeGironi}
                    disabled={!selectedTorneo}
                    className="flex-1 md:flex-none bg-[#FFD700] text-[#0a1628] px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                    🎲 Sorteggia Coppie
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!selectedTorneo}
                    className="flex-1 md:flex-none bg-[#0a1628] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
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
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Parametri Globali</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-500">Numero Gironi:</span>
                            <input 
                                type="number" 
                                value={numGironi} 
                                onChange={(e) => setNumGironi(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                                className="w-16 bg-gray-50 border-none rounded-xl px-3 py-2 text-center font-black text-[#0a1628] shadow-inner" 
                            />
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
                                                            ? 'border-[#FFD700] bg-yellow-50/50 scale-[1.02] shadow-md'
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
                                                        className="flex-1 bg-gray-50/80 border-none rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#0a1628] cursor-pointer"
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


                {/* Partite */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8">Programma Partite e Risultati</h3>
                    <div className="space-y-10">
                        {gironi.map((g) => {
                            const c = getColors(g.colorClass);
                            const currentAssignments = {};
                            for(let i = 0; i < (teamCounts[g.id] || 0); i++) {
                                currentAssignments[i] = gironeAssignments[g.id]?.[i] || "—";
                            }
                            const schedule = getSchedule(teamCounts[g.id] || 0, g.id, currentAssignments);
                            return (
                                <div key={`partite-${g.id}`} className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-3 h-3 rounded-full ${c.main}`}></div>
                                        <h4 className="text-sm font-black text-[#0a1628] uppercase tracking-widest">Girone {g.id}</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {schedule.map((row, idx) => {
                                            const meta = matchMetadata[`${g.id}-${idx}`] || {};
                                            return (
                                                <div key={idx} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-3">
                                                    <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-1">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gara {idx + 1}</span>
                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="hh:mm" value={meta.time || ""} onChange={(e) => handleMetadataChange(g.id, idx, 'time', e.target.value)} className="w-12 bg-white border border-gray-200 rounded-lg text-[10px] py-1 text-center font-bold text-gray-900" />
                                                            <input type="text" placeholder="C." value={meta.court || ""} onChange={(e) => handleMetadataChange(g.id, idx, 'court', e.target.value)} className="w-8 bg-white border border-gray-200 rounded-lg text-[10px] py-1 text-center font-bold text-gray-900" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="flex-1 text-[11px] font-black text-[#0a1628] text-right truncate">{row.left}</span>
                                                        <div className="flex gap-1">
                                                            <input type="text" value={meta.s1L || ""} onChange={(e) => handleMetadataChange(g.id, idx, 's1L', e.target.value)} className="w-8 h-8 bg-[#0a1628] text-white rounded-lg text-xs text-center font-black" />
                                                            <input type="text" value={meta.s1R || ""} onChange={(e) => handleMetadataChange(g.id, idx, 's1R', e.target.value)} className="w-8 h-8 bg-[#0a1628] text-white rounded-lg text-xs text-center font-black" />
                                                        </div>
                                                        <span className="flex-1 text-[11px] font-black text-[#0a1628] text-left truncate">{row.right}</span>
                                                    </div>
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
                                    <span className={`font-bold text-xs ${isAssigned ? 'text-gray-400 line-through' : 'text-[#0a1628]'}`}>{g.giocatori}</span>
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
