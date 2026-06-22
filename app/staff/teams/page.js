"use client";

import { useState, useEffect } from "react";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getIscrizioni, saveIscrizioni, saveTornei } from "@/app/utils/db";

export default function StaffTeams() {
  const [iscrizioni, setIscrizioni] = useState([]);
  const [tornei, setTornei] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTorneoFilter, setSelectedTorneoFilter] = useState("Tutti");
  const [selectedIscrizioneDetail, setSelectedIscrizioneDetail] = useState(null);

  // Add Team States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTorneoAdd, setSelectedTorneoAdd] = useState("");
  const [initialStatusAdd, setInitialStatusAdd] = useState("Approvata");

  // Edit Tournament States
  const [editingTeam, setEditingTeam] = useState(null);
  const [editTorneoValue, setEditTorneoValue] = useState("");

  useEffect(() => {
    getIscrizioni().then(data => {
      setIscrizioni(data);
    });

    getTornei().then(parsed => {
      setTornei(parsed);
      if (parsed.length > 0) {
        setSelectedTorneoAdd(parsed[0].nome);
      }
    });
  }, []);

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      alert("Inserisci il nome del team / dei giocatori.");
      return;
    }
    if (!selectedTorneoAdd) {
      alert("Seleziona un torneo.");
      return;
    }

    const numericIds = iscrizioni.map(i => parseInt(i.id)).filter(id => !isNaN(id));
    let nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 100;

    const today = new Date();
    const dataFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    const newRegistration = {
      id: nextId.toString(),
      data: dataFormatted,
      torneo: selectedTorneoAdd,
      giocatori: newTeamName.trim(),
      tel: "Non inserito",
      email: "Non inserita",
      stato: initialStatusAdd,
      quotaPagata: 0,
      note: "Inserito manualmente da area staff"
    };

    const updated = [newRegistration, ...iscrizioni];
    setIscrizioni(updated);
    await saveIscrizioni(updated);

    const updatedTornei = tornei.map(t => {
      if (t.nome.toLowerCase().trim() === selectedTorneoAdd.toLowerCase().trim()) {
        return { ...t, iscritti: (t.iscritti || 0) + 1 };
      }
      return t;
    });
    setTornei(updatedTornei);
    await saveTornei(updatedTornei);

    setIsAddModalOpen(false);
    setNewTeamName("");
    
    alert(`Team "${newTeamName.trim()}" aggiunto con successo al torneo "${selectedTorneoAdd}"!`);
  };

  const handleDeleteTeam = async (id) => {
    if (typeof window !== "undefined" && !window.confirm("Sei sicuro di voler eliminare definitivamente questo team dall'iscrizione?")) return;
    const deleted = iscrizioni.find(isc => isc.id === id);
    const updated = iscrizioni.filter(isc => isc.id !== id);
    setIscrizioni(updated);
    await saveIscrizioni(updated);
    if (deleted) {
      const allTornei = await getTornei();
      const updatedTornei = allTornei.map(t => {
        if (t.nome.toLowerCase().trim() === (deleted.torneo || "").toLowerCase().trim()) {
          return { ...t, iscritti: Math.max(0, (t.iscritti || 0) - 1) };
        }
        return t;
      });
      setTornei(updatedTornei);
      await saveTornei(updatedTornei);
    }
  };

  const startEditTorneo = (isc) => {
    setEditingTeam(isc);
    setEditTorneoValue(isc.torneo || "");
  };

  const handleSaveEditTorneo = async () => {
    if (!editTorneoValue) {
      alert("Seleziona un torneo valido.");
      return;
    }
    const oldTorneo = editingTeam.torneo || "";
    const newTorneo = editTorneoValue;
    const updated = iscrizioni.map(isc =>
      isc.id === editingTeam.id ? { ...isc, torneo: newTorneo } : isc
    );
    setIscrizioni(updated);
    await saveIscrizioni(updated);

    // Aggiorna i contatori dei tornei coinvolti
    if (oldTorneo.toLowerCase().trim() !== newTorneo.toLowerCase().trim()) {
      const allTornei = await getTornei();
      const updatedTornei = allTornei.map(t => {
        const tName = t.nome.toLowerCase().trim();
        if (tName === oldTorneo.toLowerCase().trim()) {
          return { ...t, iscritti: Math.max(0, (t.iscritti || 0) - 1) };
        }
        if (tName === newTorneo.toLowerCase().trim()) {
          return { ...t, iscritti: (t.iscritti || 0) + 1 };
        }
        return t;
      });
      setTornei(updatedTornei);
      await saveTornei(updatedTornei);
    }
    setEditingTeam(null);
  };

  const filteredIscrizioni = iscrizioni.filter(isc => {
    const matchTorneo = selectedTorneoFilter === "Tutti" || (isc.torneo || "").toLowerCase().trim() === selectedTorneoFilter.toLowerCase().trim();
    const matchSearch = (isc.giocatori || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (isc.tel || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (isc.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchTorneo && matchSearch;
  });

  return (
    <main className="min-h-screen pb-20 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 w-full">
            <div>
                <h2 className="text-3xl md:text-5xl font-black text-[#295dab] uppercase tracking-tighter">Teams 👥</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Elenco teams e atleti iscritti ai tornei</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="🔍 Cerca team o contatto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 font-bold text-xs text-[#295dab] outline-none shadow-sm focus:ring-4 focus:ring-emerald-500/5 transition-all"
                />
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs bg-[#295dab] hover:bg-blue-800 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform whitespace-nowrap w-full sm:w-auto"
              >
                ➕ Aggiungi Team
              </button>
            </div>
        </div>

        {/* Tournament Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-3 rounded-2xl shadow-sm border border-gray-100/80">
            <button
              onClick={() => setSelectedTorneoFilter("Tutti")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                selectedTorneoFilter === "Tutti"
                  ? "bg-[#295dab] text-white shadow-md shadow-[#295dab]/10"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              Tutti i Tornei ({iscrizioni.length})
            </button>
            {tornei.map(t => {
              const count = iscrizioni.filter(isc => (isc.torneo || "").toLowerCase().trim() === t.nome.toLowerCase().trim()).length;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTorneoFilter(t.nome)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    selectedTorneoFilter === t.nome
                      ? "bg-[#295dab] text-white shadow-md shadow-[#295dab]/10"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {t.nome} ({count})
                </button>
              );
            })}
        </div>

        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-6 bg-gray-50 p-4 rounded-t-[2rem] border-x border-t border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <div className="px-4 col-span-2">Squadra / Giocatori</div>
            <div className="px-4">Torneo</div>
            <div className="px-4">Data Iscr.</div>
            <div className="px-4">Stato</div>
            <div className="px-4 text-right">Azioni</div>
        </div>

        {/* Content rows/cards */}
        <div className="space-y-4 md:space-y-0 md:bg-white md:rounded-b-[2rem] md:shadow-xl md:border md:border-gray-100 md:divide-y">
            {filteredIscrizioni.map((req) => (
                <div key={req.id} className="bg-white p-6 rounded-[2rem] shadow-xl md:shadow-none md:rounded-none md:grid md:grid-cols-6 md:items-center hover:bg-blue-50/10 transition-all">
                    {/* Squadra e Giocatori */}
                    <div className="mb-4 md:mb-0 md:col-span-2 md:px-4">
                        <h4 className="text-lg font-black text-[#295dab] leading-tight mb-1">{req.giocatori}</h4>
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] text-gray-400 font-bold">ID #{req.id}</span>
                            {req.risposte && req.risposte.length > 0 && (
                                <button 
                                    onClick={() => setSelectedIscrizioneDetail(req)}
                                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-[9px] font-black uppercase border border-indigo-100 transition-colors"
                                >
                                    📋 Info Modulo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Torneo */}
                    <div className="mb-4 md:mb-0 md:px-4">
                        <span className="inline-block px-2.5 py-1 bg-blue-50 text-[#295dab] rounded-lg text-[10px] font-black uppercase border border-blue-100/60">
                            {req.torneo}
                        </span>
                    </div>

                    {/* Data Iscrizione */}
                    <div className="mb-4 md:mb-0 md:px-4 text-xs font-bold text-gray-500">
                        {req.data}
                    </div>

                    {/* Stato Badge */}
                    <div className="mb-4 md:mb-0 md:px-4">
                        {req.stato === "In Attesa" ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span> In Attesa
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Approvata
                            </span>
                        )}
                    </div>

                    {/* Azioni */}
                    <div className="flex gap-2 md:justify-end md:px-4">
                        <button
                            onClick={() => startEditTorneo(req)}
                            title="Cambia Torneo"
                            className="flex-1 md:flex-none h-10 md:w-10 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black text-sm flex items-center justify-center shadow-md shadow-blue-200 hover:scale-110 active:scale-95 transition-all"
                        >
                            ✏️
                        </button>
                        <button
                            onClick={() => handleDeleteTeam(req.id)}
                            title="Elimina Team"
                            className="flex-1 md:flex-none h-10 md:w-10 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-sm flex items-center justify-center shadow-md shadow-red-200 hover:scale-110 active:scale-95 transition-all"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            ))}

            {filteredIscrizioni.length === 0 && (
                <div className="py-20 text-center text-gray-400 font-bold italic">
                    Nessun team trovato.
                </div>
            )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedIscrizioneDetail && (
        <div className="fixed inset-0 bg-[#295dab]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-xl w-full p-6 sm:p-10 relative">
            <button 
              onClick={() => setSelectedIscrizioneDetail(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-[#295dab] font-black text-xl w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-[#295dab] uppercase tracking-tight mb-1">Dettagli Iscrizione 📋</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              Risposte fornite nel modulo
            </p>

            <div className="bg-blue-50 border border-blue-100/60 p-4 rounded-2xl mb-6">
               <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-1">Squadra / Atleti</p>
               <h4 className="text-lg font-black text-[#295dab]">{selectedIscrizioneDetail.giocatori}</h4>
               <p className="text-xs text-gray-500 font-bold mt-1 uppercase">Torneo: {selectedIscrizioneDetail.torneo}</p>
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {selectedIscrizioneDetail.risposte && selectedIscrizioneDetail.risposte.length > 0 ? (
                selectedIscrizioneDetail.risposte.map((r, rIdx) => (
                  <div key={rIdx} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{r.label}</p>
                    <p className="text-sm font-bold text-[#295dab] whitespace-pre-wrap">{r.valore || "—"}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-gray-400 py-6 italic font-bold">
                  Nessuna risposta dettagliata disponibile.
                </div>
              )}
              
              {selectedIscrizioneDetail.note && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Note Aggiuntive</p>
                  <p className="text-sm font-bold text-[#295dab] whitespace-pre-wrap">{selectedIscrizioneDetail.note}</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-100 mt-6 flex justify-end">
              <button
                onClick={() => setSelectedIscrizioneDetail(null)}
                className="px-8 py-3 bg-[#295dab] hover:bg-blue-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#295dab]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleAddTeam} className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md w-full p-6 sm:p-10 relative">
            <button 
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-[#295dab] font-black text-xl w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-[#295dab] uppercase tracking-tight mb-1">Aggiungi Team ➕</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              Inserisci una nuova iscrizione manualmente
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Seleziona Torneo</label>
                <select
                  value={selectedTorneoAdd}
                  onChange={(e) => setSelectedTorneoAdd(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-[#295dab] outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none"
                  required
                >
                  {tornei.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                  {tornei.length === 0 && <option value="">Nessun torneo attivo</option>}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nomi Giocatori / Squadra</label>
                <input 
                  type="text"
                  placeholder="Es: Mario Rossi & Luigi Bianchi"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-[#295dab] outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Stato Iniziale</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInitialStatusAdd("Approvata")}
                    className={`p-3 rounded-xl font-black text-[10px] uppercase tracking-wider border-2 transition-all ${initialStatusAdd === "Approvata" ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                  >
                    Approvata
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialStatusAdd("In Attesa")}
                    className={`p-3 rounded-xl font-black text-[10px] uppercase tracking-wider border-2 transition-all ${initialStatusAdd === "In Attesa" ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                  >
                    In Attesa
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-[#295dab] font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-[#295dab] hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all"
              >
                Aggiungi ✅
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Tournament Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-[#295dab]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md w-full p-6 sm:p-10 relative">
            <button 
              type="button"
              onClick={() => setEditingTeam(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-[#295dab] font-black text-xl w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-[#295dab] uppercase tracking-tight mb-1">Cambia Torneo ✏️</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              Sposta il team in un altro torneo
            </p>

            {/* Team info */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Team</p>
              <h4 className="text-base font-black text-[#295dab]">{editingTeam.giocatori}</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Torneo attuale: {editingTeam.torneo}</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nuovo Torneo di Destinazione</label>
              <select
                value={editTorneoValue}
                onChange={(e) => setEditTorneoValue(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-[#295dab] outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none"
              >
                {tornei.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                {tornei.length === 0 && <option value="">Nessun torneo disponibile</option>}
              </select>
            </div>

            <div className="pt-6 border-t border-gray-100 mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-[#295dab] font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveEditTorneo}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all"
              >
                Salva Torneo ✅
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
