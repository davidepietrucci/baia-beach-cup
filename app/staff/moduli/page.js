"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StaffHeader from "@/app/components/StaffHeader";
import { getModuli, saveModuli, getTornei } from "@/app/utils/db";

export default function ModuliPage() {
  const router = useRouter();
  const [moduli, setModuli] = useState([]);
  const [tornei, setTornei] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modulo in modifica o creazione
  const [editingForm, setEditingForm] = useState(null); // null = lista, object = editor

  useEffect(() => {
    Promise.all([getModuli(), getTornei()])
      .then(([savedModuli, savedTornei]) => {
        setModuli(savedModuli);
        setTornei(savedTornei);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore nel caricamento dei dati:", err);
        setLoading(false);
      });
  }, []);

  const handleCreateNew = () => {
    // Modulo di default con domande standard preconfigurate
    const defaultForm = {
      id: Date.now().toString(),
      titolo: "Nuovo Modulo di Iscrizione",
      descrizione: "Compila questo modulo per partecipare al torneo.",
      coloreTema: "#673ab7",
      campi: [
        {
          id: "field_giocatori",
          label: "Nomi Giocatori (es. Mario Rossi - Luigi Bianchi)",
          tipo: "text",
          obbligatorio: true,
          opzioni: [],
          mappaStato: "giocatori"
        },
        {
          id: "field_tel",
          label: "Telefono Referente (WhatsApp)",
          tipo: "tel",
          obbligatorio: true,
          opzioni: [],
          mappaStato: "tel"
        },
        {
          id: "field_email",
          label: "Email Referente",
          tipo: "email",
          obbligatorio: true,
          opzioni: [],
          mappaStato: "email"
        }
      ]
    };
    setEditingForm(defaultForm);
  };

  const handleEdit = (modulo) => {
    // Clonazione profonda per evitare side effects
    setEditingForm(JSON.parse(JSON.stringify(modulo)));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo modulo? Tutti i tornei collegati torneranno al modulo standard.")) {
      return;
    }
    const updated = moduli.filter(m => m.id !== id);
    setModuli(updated);
    await saveModuli(updated);
  };

  const addField = () => {
    const newField = {
      id: "field_" + Date.now() + Math.floor(Math.random() * 100),
      label: "Nuova Domanda",
      tipo: "text",
      obbligatorio: false,
      opzioni: [""],
      mappaStato: "none"
    };
    setEditingForm(prev => {
      if (!prev) return null;
      return {
        ...prev,
        campi: [...(prev.campi || []), newField]
      };
    });
  };

  const deleteField = (idx) => {
    setEditingForm(prev => {
      if (!prev) return null;
      return {
        ...prev,
        campi: (prev.campi || []).filter((_, i) => i !== idx)
      };
    });
  };

  const moveField = (idx, direction) => {
    setEditingForm(prev => {
      if (!prev || !prev.campi) return prev;
      const newCampi = [...prev.campi];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newCampi.length) return prev;
      
      const temp = newCampi[idx];
      newCampi[idx] = newCampi[targetIdx];
      newCampi[targetIdx] = temp;
      
      return {
        ...prev,
        campi: newCampi
      };
    });
  };

  const updateFieldProp = (idx, prop, value) => {
    setEditingForm(prev => {
      if (!prev || !prev.campi) return prev;
      const newCampi = [...prev.campi];
      newCampi[idx] = { ...newCampi[idx], [prop]: value };
      
      // Se si imposta la mappatura, facciamo in modo che sia esclusiva
      if (prop === "mappaStato" && value !== "none") {
        newCampi.forEach((c, cIdx) => {
          if (cIdx !== idx && c.mappaStato === value) {
            c.mappaStato = "none";
          }
        });
      }
      
      return { ...prev, campi: newCampi };
    });
  };

  const addOption = (fieldIdx) => {
    setEditingForm(prev => {
      if (!prev || !prev.campi) return prev;
      const newCampi = [...prev.campi];
      newCampi[fieldIdx].opzioni = [...(newCampi[fieldIdx].opzioni || []), ""];
      return { ...prev, campi: newCampi };
    });
  };

  const updateOption = (fieldIdx, optIdx, value) => {
    setEditingForm(prev => {
      if (!prev || !prev.campi) return prev;
      const newCampi = [...prev.campi];
      const newOpts = [...(newCampi[fieldIdx].opzioni || [])];
      newOpts[optIdx] = value;
      newCampi[fieldIdx].opzioni = newOpts;
      return { ...prev, campi: newCampi };
    });
  };

  const deleteOption = (fieldIdx, optIdx) => {
    setEditingForm(prev => {
      if (!prev || !prev.campi) return prev;
      const newCampi = [...prev.campi];
      newCampi[fieldIdx].opzioni = newCampi[fieldIdx].opzioni.filter((_, i) => i !== optIdx);
      return { ...prev, campi: newCampi };
    });
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    
    if (!editingForm?.titolo?.trim()) {
      alert("Il modulo deve avere un titolo.");
      return;
    }

    // Validazione mappature
    const giocatoriField = editingForm?.campi?.find(c => c.mappaStato === "giocatori");
    if (!giocatoriField) {
      alert("Errore: Devi collegare almeno una domanda al campo standard 'Nome Squadra / Nomi Giocatori' (Mappa come: Nomi Giocatori). Questo è indispensabile per la gestione delle classifiche e dei gironi.");
      return;
    }

    const emailField = editingForm?.campi?.find(c => c.mappaStato === "email");
    if (!emailField) {
      alert("Errore: Devi collegare almeno una domanda al campo standard 'Email' (Mappa come: Email Referente). Questo è indispensabile per poter inviare l'email di conferma all'atleta.");
      return;
    }

    // Forza a obbligatorio i campi mappati (giocatori ed email)
    const forcedCampi = (editingForm.campi || []).map(c => {
      if (c.mappaStato === "giocatori" || c.mappaStato === "email") {
        return { ...c, obbligatorio: true };
      }
      return c;
    });

    const formToSave = {
      ...editingForm,
      campi: forcedCampi
    };

    const updatedModuli = moduli.some(m => m.id === formToSave.id)
      ? moduli.map(m => m.id === formToSave.id ? formToSave : m)
      : [...moduli, formToSave];

    setModuli(updatedModuli);
    await saveModuli(updatedModuli);
    setEditingForm(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#0D3D31] border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 bg-[#f4f7fe]">
      <StaffHeader />

      {!editingForm ? (
        // LISTA DEI MODULI
        <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-[#0D3D31] uppercase tracking-tighter">Moduli Iscrizione 📝</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Personalizza i campi dei moduli d'iscrizione in stile Google Forms</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="text-xs bg-[#0D3D31] hover:bg-blue-900 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
            >
              ＋ Nuovo Modulo 📄
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card Modulo Standard */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[200px]">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#C3562B]"></div>
              <div>
                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-3">Predefinito di Sistema</span>
                <h3 className="text-xl font-bold text-[#0D3D31] mb-2">Modulo Standard Baia Beach Cup</h3>
                <p className="text-xs text-gray-400 font-medium">Contiene i campi base: Nome Squadra, Giocatore 1 & 2 (Nome, Tel, Email) e Note.</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-[10px] font-bold text-gray-400 uppercase">
                <span>Utilizzato da tutti i tornei non personalizzati</span>
              </div>
            </div>

            {/* Lista Moduli Custom */}
            {moduli.map(m => {
              const collegati = tornei.filter(t => t.moduloIscrizioneId === m.id);
              return (
                <div key={m.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[200px] hover:shadow-lg transition-all">
                  <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-500"></div>
                  <div>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-3">Modulo Personalizzato</span>
                    <h3 className="text-xl font-bold text-[#0D3D31] mb-2">{m.titolo}</h3>
                    <p className="text-xs text-gray-400 font-medium line-clamp-2">{m.descrizione || "Nessuna descrizione."}</p>
                    <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wide">
                      📋 Campi configurati: {m.campi?.length || 0}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-gray-400">
                      {collegati.length === 0 ? "Non collegato" : `Collegato a ${collegati.length} tornei`}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="px-3.5 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="px-3.5 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {moduli.length === 0 && (
              <div className="md:col-span-2 lg:col-span-3 bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 text-gray-400 font-bold italic">
                Nessun modulo personalizzato creato. Clicca su "Nuovo Modulo" in alto per iniziare.
              </div>
            )}
          </div>
        </div>
      ) : (
        // EDITOR IN STILE GOOGLE FORMS
        <div className="max-w-3xl mx-auto mt-6 md:mt-10 px-4 pb-24">
          {/* Header Editor */}
          <div className="flex items-center gap-6 mb-8">
            <button 
              onClick={() => setEditingForm(null)}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-xl border border-gray-100 text-[#0D3D31] hover:scale-110 active:scale-90 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <h2 className="text-3xl font-black text-[#0D3D31] uppercase tracking-tighter leading-none">Costruttore Moduli</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Interfaccia stile Google Forms</p>
            </div>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-6">
            {/* Card Intestazione Modulo */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-4" style={{ backgroundColor: editingForm?.coloreTema || "#673ab7" }}></div>
              <div className="p-8 space-y-4 pt-10">
                <input 
                  type="text" 
                  value={editingForm?.titolo || ""} 
                  onChange={(e) => setEditingForm(prev => prev ? { ...prev, titolo: e.target.value } : null)}
                  placeholder="Titolo del modulo" 
                  className="w-full text-3xl font-black text-[#0D3D31] border-b border-transparent hover:border-gray-200 focus:border-indigo-600 outline-none pb-2 transition-colors placeholder-gray-300"
                  required
                />
                <textarea 
                  value={editingForm?.descrizione || ""} 
                  onChange={(e) => setEditingForm(prev => prev ? { ...prev, descrizione: e.target.value } : null)}
                  placeholder="Descrizione del modulo (istruzioni per gli atleti)" 
                  rows={2}
                  className="w-full text-sm text-gray-500 font-medium border-b border-transparent hover:border-gray-200 focus:border-indigo-600 outline-none pb-2 transition-colors resize-none placeholder-gray-300"
                />

                {/* Tema Colore */}
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Colore del Tema</span>
                    <div className="flex flex-wrap gap-2.5 mt-1">
                      {[
                        { name: "Viola (Google)", hex: "#673ab7" },
                        { name: "Blu", hex: "#2196f3" },
                        { name: "Teal", hex: "#009688" },
                        { name: "Rosso", hex: "#f44336" },
                        { name: "Arancione", hex: "#ff9800" },
                        { name: "Verde", hex: "#4caf50" },
                        { name: "Navy Baia Beach Cup", hex: "#0D3D31" }
                      ].map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setEditingForm(prev => prev ? { ...prev, coloreTema: c.hex } : null)}
                          className="w-7 h-7 rounded-full border-2 transition-all relative flex items-center justify-center cursor-pointer"
                          style={{ 
                            backgroundColor: c.hex,
                            borderColor: editingForm?.coloreTema === c.hex ? "#fff" : "transparent",
                            boxShadow: editingForm?.coloreTema === c.hex ? `0 0 0 2px ${c.hex}` : "none"
                          }}
                          title={c.name}
                        >
                          {editingForm?.coloreTema === c.hex && (
                            <span className="text-[10px] text-white font-bold">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Campi del Modulo */}
            <div className="space-y-6">
              {(editingForm?.campi || []).map((campo, idx) => {
                const mapIcon = campo.mappaStato === "giocatori" ? "👥 Nomi Giocatori" : campo.mappaStato === "tel" ? "📞 Telefono" : campo.mappaStato === "email" ? "✉️ Email" : null;
                return (
                  <div key={campo.id} className="bg-white rounded-3xl p-6 md:p-8 shadow-lg border border-gray-100/90 relative overflow-hidden space-y-6">
                    {/* Bordo sinistro per mostrare che è un blocco di domanda */}
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-100"></div>

                    {/* Riga 1: Domanda e Tipo */}
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="flex-1 w-full space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Testo della Domanda</label>
                        <input 
                          type="text" 
                          value={campo.label}
                          onChange={(e) => updateFieldProp(idx, "label", e.target.value)}
                          placeholder="es. Taglia Canotta o Email Socio"
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm text-[#0D3D31] focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                          required
                        />
                      </div>
                      
                      <div className="w-full md:w-60 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo di Risposta</label>
                        <select
                          value={campo.tipo}
                          onChange={(e) => updateFieldProp(idx, "tipo", e.target.value)}
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm text-[#0D3D31] focus:ring-2 focus:ring-indigo-600 transition-all outline-none cursor-pointer"
                        >
                          <option value="text">Testo Breve</option>
                          <option value="textarea">Paragrafo (Testo Lungo)</option>
                          <option value="select">Menu a discesa (Select)</option>
                          <option value="radio">Scelta Multipla (Radio)</option>
                          <option value="checkbox">Caselle di Controllo (Checkbox)</option>
                          <option value="email">Email</option>
                          <option value="tel">Telefono</option>
                          <option value="number">Numero</option>
                        </select>
                      </div>
                    </div>

                    {/* Riga Opzioni (Se select/radio/checkbox) */}
                    {(campo.tipo === "select" || campo.tipo === "radio" || campo.tipo === "checkbox") && (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Opzioni disponibili</label>
                        <div className="space-y-2">
                          {(campo.opzioni || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-gray-400 text-xs font-bold w-5">
                                {campo.tipo === "radio" ? "⚪" : campo.tipo === "checkbox" ? "⬜" : "•"}
                              </span>
                              <input 
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                placeholder={`Opzione ${optIdx + 1}`}
                                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#0D3D31] outline-none focus:ring-1 focus:ring-indigo-600"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => deleteOption(idx, optIdx)}
                                className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addOption(idx)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-wider flex items-center gap-1 mt-2 pl-6"
                        >
                          ＋ Aggiungi Opzione
                        </button>
                      </div>
                    )}

                    {/* Riga 3: Impostazioni Campi (Mappatura, Obbligatorio, Azioni) */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-50">
                      
                      {/* Mappatura Campo Standard */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mappa a Campo Standard:</label>
                        <select
                          value={campo.mappaStato || "none"}
                          onChange={(e) => updateFieldProp(idx, "mappaStato", e.target.value)}
                          className={`border rounded-lg px-2.5 py-1 text-[11px] font-bold outline-none cursor-pointer ${
                            campo.mappaStato && campo.mappaStato !== "none" 
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50' 
                              : 'border-gray-200 text-gray-500 bg-gray-50'
                          }`}
                        >
                          <option value="none">Nessuno (Dato Personalizzato)</option>
                          <option value="giocatori">Nomi Giocatori / Squadra (Richiesto)</option>
                          <option value="tel">Telefono Referente</option>
                          <option value="email">Email Referente</option>
                        </select>
                        {mapIcon && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                            Mapped
                          </span>
                        )}
                      </div>

                      {/* Obbligatorio e Ordinamento */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer select-none" htmlFor={`req_${campo.id}`}>Obbligatorio</label>
                          <input 
                            id={`req_${campo.id}`}
                            type="checkbox"
                            checked={campo.obbligatorio}
                            onChange={(e) => updateFieldProp(idx, "obbligatorio", e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                          />
                        </div>

                        {/* Ordinamento */}
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => moveField(idx, "up")}
                            disabled={idx === 0}
                            className="px-2.5 py-1.5 bg-white text-gray-400 hover:text-gray-800 disabled:opacity-30 hover:bg-gray-50 border-r border-gray-100"
                            title="Sposta Su"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(idx, "down")}
                            disabled={idx === (editingForm?.campi?.length || 0) - 1}
                            className="px-2.5 py-1.5 bg-white text-gray-400 hover:text-gray-800 disabled:opacity-30 hover:bg-gray-50"
                            title="Sposta Giù"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Elimina Domanda */}
                        <button
                          type="button"
                          onClick={() => deleteField(idx)}
                          className="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Elimina Domanda"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pulsanti di Azione Principali dell'Editor */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={addField}
                className="flex-1 py-4 bg-white border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm transition-all"
              >
                ＋ Aggiungi Domanda 📝
              </button>
              
              <div className="flex gap-3 sm:w-80">
                <button
                  type="button"
                  onClick={() => setEditingForm(null)}
                  className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all"
                >
                  Salva Modulo 💾
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
