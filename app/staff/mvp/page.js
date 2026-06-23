"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import StaffHeader from "@/app/components/StaffHeader";
import { getIscrizioni, getTornei } from "@/app/utils/db";

export default function StaffMvp() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState("admin");

  // Stato per la configurazione MVP
  const [mvpForm, setMvpForm] = useState({
    attivo: false,
    titolo: "Vota l'MVP del Torneo",
    candidati: Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1),
      nome: "",
      fotoUrl: "",
      voti: 0
    }))
  });

  const [iscrizioni, setIscrizioni] = useState([]);
  const [tornei, setTornei] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("Tutti");

  // Lista di tutti i giocatori iscritti
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/staff");
      return;
    }

    if (user) {
      const isDavide = user.username === "davide" || user.firstName?.toLowerCase() === "davide" || user.emailAddresses[0]?.emailAddress?.toLowerCase().includes("davide");
      const userRole = isDavide ? "admin" : (user.publicMetadata?.role || "staff");
      setRole(userRole);
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    // 1. Carica configurazione MVP esistente
    const loadMvpData = async () => {
      try {
        const res = await fetch("/api/db?type=mvp", { cache: "no-store" });
        const json = await res.json();
        if (json.data) {
          // Assicuriamoci che ci siano sempre 8 elementi
          const existingCandidati = json.data.candidati || [];
          const candidatiWithEightItems = Array.from({ length: 8 }, (_, i) => {
            const indexStr = String(i + 1);
            const found = existingCandidati.find(c => String(c.id) === indexStr);
            return found || { id: indexStr, nome: "", fotoUrl: "", voti: 0 };
          });

          setMvpForm({
            attivo: json.data.attivo || false,
            titolo: json.data.titolo || "Vota l'MVP del Torneo",
            candidati: candidatiWithEightItems
          });
        }
      } catch (err) {
        console.error("Errore nel caricamento dei dati MVP:", err);
      }
    };

    // 2. Carica tornei e iscrizioni
    const loadData = async () => {
      try {
        const allTornei = await getTornei();
        const attivi = allTornei.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione");
        setTornei(attivi);
        
        const allIscrizioni = await getIscrizioni();
        setIscrizioni(allIscrizioni);
      } catch (err) {
        console.error("Errore nel caricamento dei dati:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMvpData();
    loadData();
  }, []);

  // Effetto per aggiornare la lista dei candidati in base al torneo selezionato
  useEffect(() => {
    const playersSet = new Set();
    const splitNames = (name) => {
      if (!name) return [];
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

    iscrizioni.forEach(isc => {
      if (isc.giocatori && isc.stato === "Approvata") {
        const match = selectedTorneo === "Tutti" || (isc.torneo || "").toLowerCase().trim() === selectedTorneo.toLowerCase().trim();
        if (match) {
          const nomi = splitNames(isc.giocatori);
          nomi.forEach(n => {
            if (n) playersSet.add(n);
          });
        }
      }
    });

    setAvailablePlayers(Array.from(playersSet).sort());
  }, [selectedTorneo, iscrizioni]);

  const handleToggleActive = (e) => {
    setMvpForm(prev => ({ ...prev, attivo: e.target.checked }));
  };

  const handleChangeTitle = (e) => {
    setMvpForm(prev => ({ ...prev, titolo: e.target.value }));
  };

  const handleCandidateChange = (index, field, value) => {
    const updatedCandidati = [...mvpForm.candidati];
    updatedCandidati[index] = {
      ...updatedCandidati[index],
      [field]: value
    };
    setMvpForm(prev => ({ ...prev, candidati: updatedCandidati }));
  };

  const handleCandidatePhotoUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("L'immagine è troppo grande. Seleziona un file inferiore a 1MB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleCandidateChange(index, "fotoUrl", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMvp = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "mvp", data: mvpForm })
      });
      if (res.ok) {
        alert("Configurazione MVP salvata con successo!");
      } else {
        const json = await res.json();
        alert(`Errore nel salvataggio: ${json.error || "Errore sconosciuto"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Errore di connessione.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetVotes = async () => {
    if (typeof window !== "undefined" && !window.confirm("Sei sicuro di voler AZZERARE tutti i voti espressi finora? Questa azione è irreversibile.")) {
      return;
    }
    
    const resetCandidati = mvpForm.candidati.map(c => ({
      ...c,
      voti: 0
    }));

    const updatedMvp = {
      ...mvpForm,
      candidati: resetCandidati
    };

    setMvpForm(updatedMvp);

    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "mvp", data: updatedMvp })
      });
      if (res.ok) {
        alert("Tutti i voti sono stati azzerati con successo!");
      } else {
        alert("Errore nell'azzeramento dei voti.");
      }
    } catch (err) {
      console.error(err);
      alert("Errore di connessione.");
    }
  };

  // Calcolo statistiche voti
  const totalVotes = mvpForm.candidati.reduce((acc, curr) => acc + (curr.voti || 0), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent">
        <StaffHeader />
        <div className="max-w-6xl mx-auto mt-10 px-4 text-center">
          <div className="w-10 h-10 border-4 border-[#295dab] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-black text-[#295dab] uppercase tracking-widest">Caricamento in corso...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16 bg-transparent">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        {/* Intestazione */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-[#295dab] uppercase tracking-tighter leading-none">Gestione MVP 🗳️</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Configura gli 8 candidati finalisti e segui i voti</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleResetVotes}
              disabled={totalVotes === 0}
              className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-all shadow-sm border border-red-100 cursor-pointer"
            >
              Azzera Voti 🔄
            </button>
            <a 
              href="/"
              className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-[#295dab] bg-blue-50 hover:bg-blue-100 transition-all shadow-sm border border-blue-100 text-center"
            >
              Vedi Sito 🌐
            </a>
          </div>
        </div>

        {/* Layout Grid: Dashboard + Configurazione */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonna Sinistra: Stato e Classifica Voti */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Box Stato Votazione */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100">
              <h3 className="text-lg font-black mb-4 uppercase tracking-tight text-[#295dab]">Stato Votazione</h3>
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-sm font-bold text-gray-600">Abilita Votazioni</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={mvpForm.attivo}
                    onChange={handleToggleActive}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#295dab]"></div>
                </label>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${mvpForm.attivo ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                  {mvpForm.attivo ? "Attiva in Homepage" : "Disattivata"}
                </span>
              </div>
            </div>

            {/* Box Risultati in Tempo Reale */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black uppercase tracking-tight text-[#295dab]">Risultati Live</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C3562B] bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                  {totalVotes} Voti Totali
                </span>
              </div>
              
              <div className="space-y-4">
                {mvpForm.candidati.filter(c => c.nome).length === 0 ? (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center py-8">Nessun candidato impostato</p>
                ) : (
                  mvpForm.candidati
                    .filter(c => c.nome)
                    .sort((a, b) => (b.voti || 0) - (a.voti || 0))
                    .map((c, index) => {
                      const percentage = totalVotes > 0 ? Math.round(((c.voti || 0) / totalVotes) * 100) : 0;
                      return (
                        <div key={c.id} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 flex items-center gap-2">
                              <span className="font-mono text-gray-400">{index + 1}.</span> {c.nome}
                            </span>
                            <span className="font-mono font-bold text-[#295dab]">
                              {c.voti || 0} voti ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#295dab] h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>

          {/* Colonna Destra: Configurazione Candidati */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSaveMvp} className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight text-[#295dab]">Configura Candidati (Top 8) 👥</h3>
              
              {/* Campo Titolo e Selettore Torneo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Titolo Sezione Voto</label>
                  <input 
                    type="text" 
                    value={mvpForm.titolo}
                    onChange={handleChangeTitle}
                    placeholder="es. Vota l'MVP del Torneo!"
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all text-sm shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seleziona Torneo Candidati</label>
                  <select
                    value={selectedTorneo}
                    onChange={(e) => setSelectedTorneo(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all text-sm shadow-sm cursor-pointer appearance-none"
                  >
                    <option value="Tutti">Tutti i Tornei</option>
                    {tornei.map(t => (
                      <option key={t.id} value={t.nome}>{t.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lista 8 Candidati */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mvpForm.candidati.map((candidato, index) => (
                  <div key={candidato.id} className="p-4 bg-gray-50 rounded-3xl border border-gray-100 space-y-3 shadow-sm relative">
                    <span className="absolute top-3 right-4 font-mono font-black text-2xl text-gray-200/80">#0{index + 1}</span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#295dab]">Candidato {index + 1}</h4>
                    
                    {/* Nome Giocatore */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Giocatore</label>
                      {availablePlayers.length > 0 ? (
                        <div className="relative">
                          {/* Possibilità di selezionare da lista o digitare a mano */}
                          <input
                            type="text"
                            list={`players-list-${index}`}
                            value={candidato.nome}
                            onChange={(e) => handleCandidateChange(index, "nome", e.target.value)}
                            placeholder="Seleziona o digita il nome"
                            required={index < 4} // Almeno 4 candidati obbligatori per test
                            className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-xs font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab]"
                          />
                          <datalist id={`players-list-${index}`}>
                            {availablePlayers.map(name => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Nome e Cognome" 
                          value={candidato.nome}
                          onChange={(e) => handleCandidateChange(index, "nome", e.target.value)}
                          required={index < 4}
                          className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-xs font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab]"
                        />
                      )}
                    </div>

                    {/* Caricamento Foto */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Carica Foto (Max 1MB)</label>
                        {candidato.fotoUrl && (
                          <button
                            type="button"
                            onClick={() => handleCandidateChange(index, "fotoUrl", "")}
                            className="text-[8px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest"
                          >
                            Rimuovi ✕
                          </button>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleCandidatePhotoUpload(index, e)}
                        className="w-full bg-white border-none rounded-xl px-4 py-2 text-xs font-bold text-[#295dab] file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-[#295dab]/10 file:text-[#295dab] hover:file:bg-[#295dab]/20 cursor-pointer"
                      />
                    </div>

                    {/* Anteprima Foto caricata */}
                    {candidato.fotoUrl && (
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 max-w-max">
                        <img 
                          src={candidato.fotoUrl} 
                          alt="Anteprima" 
                          onError={(e) => { e.target.src = "/logo_v2.png" }}
                          className="w-8 h-8 object-cover rounded-lg bg-gray-50" 
                        />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">OK</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottone di Invio */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-8 py-4 rounded-2xl font-bold text-white text-xs uppercase tracking-widest transition-all shadow-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: "#295dab" }}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvataggio in corso...
                    </>
                  ) : (
                    "Salva Configurazione MVP 💾"
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
