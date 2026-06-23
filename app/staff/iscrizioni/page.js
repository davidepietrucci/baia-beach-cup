"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getIscrizioni, saveIscrizioni, saveTornei } from "@/app/utils/db";

export default function StaffIscrizioni() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState("admin");
  const [iscrizioni, setIscrizioni] = useState([]);
  const [tornei, setTornei] = useState([]);
  
  // Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedTorneoImport, setSelectedTorneoImport] = useState("");
  const [initialStatusImport, setInitialStatusImport] = useState("Approvata");
  const [inputMethod, setInputMethod] = useState("paste"); // 'paste' or 'file'
  const [pastedText, setPastedText] = useState("");
  const [importedTeams, setImportedTeams] = useState([]);
  
  // Filter by Tournament state
  const [selectedTorneoFilter, setSelectedTorneoFilter] = useState("Tutti");

  // Detail modal for custom fields
  const [selectedIscrizioneDetail, setSelectedIscrizioneDetail] = useState(null);

  // Edit Modal States
  const [editingIscrizione, setEditingIscrizione] = useState(null);
  const [editFormData, setEditFormData] = useState({
    giocatori: "",
    tel: "",
    email: ""
  });

  const startEdit = (req) => {
    setEditingIscrizione(req);
    setEditFormData({
      giocatori: req.giocatori || "",
      tel: req.tel || "",
      email: req.email || ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.giocatori.trim()) {
      alert("Il campo Giocatori non può essere vuoto.");
      return;
    }
    const updated = iscrizioni.map((isc) => 
      isc.id === editingIscrizione.id 
        ? { 
            ...isc, 
            giocatori: editFormData.giocatori.trim(),
            tel: editFormData.tel.trim(),
            email: editFormData.email.trim()
          } 
        : isc
    );
    setIscrizioni(updated);
    await saveIscrizioni(updated);
    setEditingIscrizione(null);
  };

  useEffect(() => {
    if (isLoaded && !user) {
      window.location.href = "/staff";
      return;
    }
    if (user) {
      const isDavide = user.username === "davide" || user.firstName?.toLowerCase() === "davide" || user.emailAddresses[0]?.emailAddress?.toLowerCase().includes("davide");
      const userRole = isDavide ? "admin" : (user.publicMetadata?.role || "staff");
      setRole(userRole);
    }
  }, [user, isLoaded]);

  useEffect(() => {
    getIscrizioni().then(data => {
      setIscrizioni(data);
    });

    getTornei().then(parsed => {
      setTornei(parsed);
      if (parsed.length > 0) {
        setSelectedTorneoImport(parsed[0].nome);
      }
    });
  }, []);

  const handleApprove = async (id) => {
    const updated = iscrizioni.map((isc) => 
      isc.id === id ? { ...isc, stato: "Approvata" } : isc
    );
    setIscrizioni(updated);
    await saveIscrizioni(updated);
  };

  const handleDelete = async (id) => {
    if (typeof window !== "undefined" && window.confirm("Sei sicuro di voler eliminare definitivamente questa iscrizione?")) {
      const deletedIsc = iscrizioni.find((isc) => isc.id === id);
      const updated = iscrizioni.filter((isc) => isc.id !== id);
      setIscrizioni(updated);
      await saveIscrizioni(updated);

      if (deletedIsc) {
        const allTornei = await getTornei();
        const updatedTornei = allTornei.map(t => {
          if (t.nome.toLowerCase().trim() === (deletedIsc.torneo || "").toLowerCase().trim()) {
            return { ...t, iscritti: Math.max(0, (t.iscritti || 0) - 1) };
          }
          return t;
        });
        await saveTornei(updatedTornei);
      }
    }
  };

  const parsePlayersList = (text) => {
    if (!text || !text.trim()) return [];
    
    // Split into lines
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];
    
    const teams = [];
    lines.forEach((line, idx) => {
      let cleanLine = line.replace(/^"|"$/g, '').trim();
      
      let separator = null;
      if (cleanLine.includes("\t")) separator = "\t";
      else if (cleanLine.includes(";")) separator = ";";
      else if (cleanLine.includes(",")) separator = ",";
      
      if (separator) {
        const parts = cleanLine.split(separator).map(p => p.replace(/^"|"$/g, '').trim());
        cleanLine = parts[0] || "";
      }
      
      if (idx === 0 && (cleanLine.toLowerCase().includes("nome") || cleanLine.toLowerCase().includes("giocator") || cleanLine.toLowerCase().includes("squadra"))) {
        return;
      }
      
      if (cleanLine) {
        teams.push(cleanLine);
      }
    });
    
    return teams;
  };

  const handleTextChange = (text) => {
    setPastedText(text);
    const teams = parsePlayersList(text);
    setImportedTeams(teams);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setPastedText(text);
      const teams = parsePlayersList(text);
      setImportedTeams(teams);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!selectedTorneoImport) {
      alert("Seleziona un torneo per le iscrizioni.");
      return;
    }
    
    if (importedTeams.length === 0) {
      alert("Nessun dato valido da importare.");
      return;
    }
    
    // Genera gli ID progressivi corretti
    const numericIds = iscrizioni.map(i => parseInt(i.id)).filter(id => !isNaN(id));
    let nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 100;

    const today = new Date();
    const dataFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    const newRegistrations = importedTeams.map((playersVal, idx) => {
      const currentId = (nextId + idx).toString();
      return {
        id: currentId,
        data: dataFormatted,
        torneo: selectedTorneoImport,
        giocatori: playersVal,
        tel: "Non inserito",
        email: "Non inserita",
        stato: initialStatusImport,
        quotaPagata: 0,
        note: "Importato tramite file/testo"
      };
    });
    
    const updated = [...newRegistrations, ...iscrizioni];
    setIscrizioni(updated);
    await saveIscrizioni(updated);

    const allTornei = await getTornei();
    const updatedTornei = allTornei.map(t => {
      if (t.nome.toLowerCase().trim() === selectedTorneoImport.toLowerCase().trim()) {
        return { ...t, iscritti: (t.iscritti || 0) + newRegistrations.length };
      }
      return t;
    });
    setTornei(updatedTornei);
    await saveTornei(updatedTornei);
    
    setIsImportModalOpen(false);
    setPastedText("");
    setImportedTeams([]);
    
    alert(`Importazione completata con successo! Inserite ${newRegistrations.length} iscrizioni.`);
  };

  const downloadTemplate = () => {
    const csvHeaders = ["Nomi Giocatori"];
    const csvRow = ["Mario Rossi & Luigi Bianchi"];
    const csvContent = "data:text/csv;charset=utf-8," + [csvHeaders.join(","), csvRow.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_iscrizioni.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const targetIscrizioni = selectedTorneoFilter === "Tutti" 
      ? iscrizioni 
      : iscrizioni.filter(isc => (isc.torneo || "").toLowerCase().trim() === selectedTorneoFilter.toLowerCase().trim());

    const escapeCSV = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    // Raccoglie tutte le domande/etichette personalizzate uniche presenti nelle iscrizioni filtrate
    const customLabels = [];
    targetIscrizioni.forEach(isc => {
      if (isc.risposte && Array.isArray(isc.risposte)) {
        isc.risposte.forEach(r => {
          if (r.label && !customLabels.includes(r.label)) {
            customLabels.push(r.label);
          }
        });
      }
    });

    const headers = [
      "ID",
      "Data Iscrizione",
      "Torneo",
      "Giocatori / Squadra",
      "Email",
      "Telefono",
      "Quota Pagata",
      "Stato",
      "Note",
      ...customLabels
    ];

    const csvRows = [
      headers.map(escapeCSV).join(","),
      ...targetIscrizioni.map(isc => {
        const row = [
          isc.id,
          isc.data,
          isc.torneo,
          isc.giocatori,
          isc.email || "",
          isc.tel || "",
          isc.quotaPagata !== undefined ? isc.quotaPagata : 0,
          isc.stato,
          isc.note || ""
        ];

        // Aggiunge le risposte ai campi custom corrispondenti
        customLabels.forEach(label => {
          const answer = isc.risposte && Array.isArray(isc.risposte)
            ? isc.risposte.find(r => r.label === label)
            : null;
          row.push(answer ? answer.valore : "");
        });

        return row.map(escapeCSV).join(",");
      })
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `iscrizioni_bvi_${selectedTorneoFilter.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredIscrizioni = selectedTorneoFilter === "Tutti" 
    ? iscrizioni 
    : iscrizioni.filter(isc => (isc.torneo || "").toLowerCase().trim() === selectedTorneoFilter.toLowerCase().trim());

  return (
    <main className="min-h-screen pb-20 bg-transparent">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 w-full">
            <div>
                <h2 className="text-3xl md:text-5xl font-black text-[#295dab] uppercase tracking-tighter">Iscrizioni 📝</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Approvazione e gestione richieste</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="text-xs bg-[#295dab] hover:bg-blue-800 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
                >
                  🟢 Importa
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

        {/* Mobile Cards / Desktop Table Wrapper */}
        <div className="space-y-4 md:space-y-0">
            {/* Desktop Table Header (Visible only on MD+) */}
            <div className="hidden md:grid grid-cols-6 bg-gray-50 p-4 rounded-t-[2rem] border-x border-t border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <div className="px-4">Ricevuta</div>
                <div className="px-4 col-span-2">Squadra / Torneo</div>
                <div className="px-4">Contatto</div>
                <div className="px-4">Stato</div>
                <div className="px-4 text-right">Azioni</div>
            </div>

            {/* Content rows/cards */}
            <div className="space-y-4 md:space-y-0 md:bg-white md:rounded-b-[2rem] md:shadow-xl md:border md:border-gray-100 md:divide-y">
                {filteredIscrizioni.map((req) => (
                    <div key={req.id} className="bg-white p-6 rounded-[2rem] shadow-xl md:shadow-none md:rounded-none md:grid md:grid-cols-6 md:items-center hover:bg-blue-50/20 transition-all">
                        {/* Mobile Header: Badge ID e Data */}
                        <div className="flex justify-between items-center mb-4 md:mb-0 md:px-4">
                            <span className="text-[10px] font-black text-gray-300 md:hidden">#{req.id}</span>
                            <span className="text-sm font-bold text-gray-500">{req.data}</span>
                        </div>

                        {/* Squadra e Torneo */}
                        <div className="mb-4 md:mb-0 md:col-span-2 md:px-4">
                            <h4 className="text-lg font-black text-[#295dab] leading-tight mb-1">{req.giocatori}</h4>
                            <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase border border-blue-100">
                                    {req.torneo}
                                </span>
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

                        {/* Contatto */}
                        <div className="mb-4 md:mb-0 md:px-4">
                            <p className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                <span className="md:hidden">📞</span> {req.tel}
                            </p>
                        </div>

                        {/* Stato */}
                        <div className="mb-6 md:mb-0 md:px-4">
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
                                onClick={() => startEdit(req)}
                                className="flex-1 md:flex-none h-12 md:w-10 md:h-10 bg-blue-500 text-white rounded-xl font-black text-sm flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-110 active:scale-95 transition-all"
                                title="Modifica Iscrizione"
                            >
                                ✏️
                            </button>
                            {req.stato === "In Attesa" && (
                                <button 
                                    onClick={() => handleApprove(req.id)}
                                    className="flex-1 md:flex-none h-12 md:w-10 md:h-10 bg-green-500 text-white rounded-xl font-black text-lg flex items-center justify-center shadow-lg shadow-green-200 hover:scale-110 active:scale-95 transition-all"
                                >
                                    ✓
                                </button>
                            )}
                            <button 
                                onClick={() => handleDelete(req.id)}
                                className="flex-1 md:flex-none h-12 md:w-10 md:h-10 bg-red-500 text-white rounded-xl font-black text-lg flex items-center justify-center shadow-lg shadow-red-200 hover:scale-110 active:scale-95 transition-all"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}

                {filteredIscrizioni.length === 0 && (
                    <div className="py-20 text-center text-gray-400 font-bold italic">
                        Nessuna iscrizione trovata.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-[#295dab]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative">
            <button 
              onClick={() => { setIsImportModalOpen(false); }}
              className="absolute top-6 right-6 text-gray-400 hover:text-[#295dab] font-black text-xl w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-[#295dab] uppercase tracking-tight mb-2">Importazione Iscrizioni 🟢</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              Carica un file Excel/CSV o incolla i dati per il torneo selezionato
            </p>

            <div className="space-y-6 text-left">
              {/* Select Torneo */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Seleziona Torneo di Destinazione</label>
                <select
                  value={selectedTorneoImport}
                  onChange={(e) => setSelectedTorneoImport(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-[#295dab] outline-none focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none"
                >
                  {tornei.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                  {tornei.length === 0 && <option value="">Nessun torneo attivo</option>}
                </select>
              </div>

              {/* Select Stato Iniziale */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Stato Iniziale delle Iscrizioni</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInitialStatusImport("Approvata")}
                    className={`p-3.5 sm:p-4 rounded-2xl font-black text-xs uppercase tracking-wider border-2 transition-all ${initialStatusImport === "Approvata" ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                  >
                    Approvata (Subito in Classifica)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialStatusImport("In Attesa")}
                    className={`p-3.5 sm:p-4 rounded-2xl font-black text-xs uppercase tracking-wider border-2 transition-all ${initialStatusImport === "In Attesa" ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                  >
                    In Attesa (Da approvare a mano)
                  </button>
                </div>
              </div>

              {/* Input Method Selector */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Metodo di Inserimento</label>
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setInputMethod("paste")}
                    className={`flex-1 py-2 text-center rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${inputMethod === "paste" ? 'bg-white text-[#295dab] shadow-sm' : 'text-gray-400 hover:text-[#295dab]'}`}
                  >
                    Copia-Incolla da Fogli
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMethod("file")}
                    className={`flex-1 py-2 text-center rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${inputMethod === "file" ? 'bg-white text-[#295dab] shadow-sm' : 'text-gray-400 hover:text-[#295dab]'}`}
                  >
                    Carica CSV (.csv)
                  </button>
                </div>

                {inputMethod === "paste" ? (
                  <div>
                    <textarea
                      placeholder="Nomi Giocatori&#13;Marco Neri & Fabio Rossi&#13;Alice Gialli & Giulia Verdi"
                      value={pastedText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      rows={6}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 font-mono text-xs text-[#295dab] outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                    ></textarea>
                    <div className="mt-2 flex flex-col gap-2">
                      <p className="text-[10px] text-gray-400 font-semibold">
                        💡 Copia la colonna con i nomi dei giocatori (Ctrl+C) dal tuo file Excel/Sheets e incollala qui sopra.
                      </p>
                      <button 
                        type="button" 
                        onClick={downloadTemplate}
                        className="text-left text-[10px] text-blue-600 hover:text-blue-800 font-bold self-start"
                      >
                        ⬇️ Scarica Template Excel/CSV (da usare come riferimento)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button 
                      type="button" 
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ⬇️ Scarica Template Excel/CSV (da usare come riferimento)
                    </button>
                    <div className="border-4 border-dashed border-gray-100 rounded-3xl p-10 text-center bg-gray-50 hover:bg-gray-100/50 transition-all relative">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="text-4xl block mb-2">📁</span>
                      <p className="text-xs font-bold text-[#295dab] uppercase tracking-wider mb-1">Trascina o clicca per caricare</p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">File CSV (.csv)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview of Imported Teams */}
              {importedTeams.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Anteprima Squadre da Importare ({importedTeams.length})</label>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[250px] overflow-y-auto bg-gray-50">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">N.</th>
                          <th className="px-4 py-2.5">Squadra / Giocatori</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-semibold text-gray-700">
                        {importedTeams.slice(0, 20).map((team, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2.5 text-gray-400 w-12">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-[#295dab] font-bold">{team}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importedTeams.length > 20 && (
                      <div className="p-3 text-center text-[10px] text-gray-400 font-bold border-t bg-gray-50">
                        ...e altri {importedTeams.length - 20} record
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-50 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setIsImportModalOpen(false); }}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-[#295dab] font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importedTeams.length === 0}
                  className={`flex-grow sm:flex-1 py-4 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all ${
                    importedTeams.length > 0
                      ? "bg-[#295dab] hover:bg-blue-800 cursor-pointer"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  Importa Ora ✅
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              Risposte fornite nel modulo personalizzato
            </p>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Squadra / Atleti</p>
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

      {/* Edit Modal */}
      {editingIscrizione && (
        <div className="fixed inset-0 bg-[#295dab]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md w-full p-6 sm:p-10 relative">
            <button 
              onClick={() => setEditingIscrizione(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-[#295dab] font-black text-xl w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-[#295dab] uppercase tracking-tight mb-1">Modifica Iscrizione ✏️</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              Modifica i dettagli del contatto e dei giocatori
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nomi Giocatori / Squadra</label>
                <input 
                  type="text"
                  value={editFormData.giocatori}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, giocatori: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-[#295dab] outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recapito Telefonico</label>
                <input 
                  type="text"
                  value={editFormData.tel}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, tel: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-[#295dab] outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Indirizzo Email</label>
                <input 
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-[#295dab] outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setEditingIscrizione(null)}
                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-[#295dab] font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all"
              >
                Salva Modifiche ✅
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
