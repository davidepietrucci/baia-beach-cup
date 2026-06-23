"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getIscrizioni, saveIscrizioni } from "@/app/utils/db";

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

export default function StaffPagamenti() {
  const router = useRouter();
  const [iscrizioni, setIscrizioni] = useState([]);
  const [filtroTorneo, setFiltroTorneo] = useState("Tutti");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([getIscrizioni(), getTornei()]).then(([iscrizioniList, torneiList]) => {
      const data = iscrizioniList.map(isc => {
        const torneoInfo = torneiList.find(t => (isc.torneo || "").toLowerCase().trim() === t.nome.toLowerCase().trim()) || torneiList.find(t => isc.torneo && t.nome && isc.torneo.toLowerCase().includes(t.nome.toLowerCase()));
        const quotaTorneo = torneoInfo?.quota !== undefined ? torneoInfo.quota : 40;

        return {
          ...isc,
          quotaTotale: quotaTorneo, 
          quotaPagata: isc.quotaPagata || 0,
          pagatoDa: isc.pagatoDa || []
        };
      });
      setIscrizioni(data);
    });
  }, []);

  const salvaModifiche = async (newData) => {
    setIscrizioni(newData);
    await saveIscrizioni(newData);
  };

  const segnaSaldato = (id) => {
    const newData = iscrizioni.map(isc => {
      if (isc.id === id) {
        const players = splitNames(isc.giocatori);
        return { 
          ...isc, 
          quotaPagata: isc.quotaTotale,
          pagatoDa: players
        };
      }
      return isc;
    });
    salvaModifiche(newData);
  };

  const registraAcconto = (id, importo) => {
    const newData = iscrizioni.map(isc => {
      if (isc.id === id) {
        const nuovoPagato = Math.min(isc.quotaPagata + importo, isc.quotaTotale);
        const players = splitNames(isc.giocatori);
        let newPagatoDa = isc.pagatoDa || [];
        
        if (nuovoPagato === isc.quotaTotale) {
          newPagatoDa = players;
        } else if (nuovoPagato > 0 && newPagatoDa.length === 0 && players.length > 0) {
          newPagatoDa = [players[0]];
        }
        
        return { 
          ...isc, 
          quotaPagata: nuovoPagato,
          pagatoDa: newPagatoDa
        };
      }
      return isc;
    });
    salvaModifiche(newData);
  };

  const azzeraPagamento = (id) => {
    const newData = iscrizioni.map(isc => 
      isc.id === id ? { ...isc, quotaPagata: 0, pagatoDa: [] } : isc
    );
    salvaModifiche(newData);
  };

  const togglePlayerPayment = (id, playerName) => {
    const newData = iscrizioni.map(isc => {
      if (isc.id === id) {
        const players = splitNames(isc.giocatori);
        let currentPagatoDa = isc.pagatoDa || [];
        
        if (currentPagatoDa.includes(playerName)) {
          currentPagatoDa = currentPagatoDa.filter(name => name !== playerName);
        } else {
          currentPagatoDa = [...currentPagatoDa, playerName];
        }
        
        let quota = 0;
        if (players.length > 0) {
          const quotaPerPlayer = isc.quotaTotale / players.length;
          quota = Math.round(currentPagatoDa.length * quotaPerPlayer);
        }
        
        return {
          ...isc,
          quotaPagata: quota,
          pagatoDa: currentPagatoDa
        };
      }
      return isc;
    });
    salvaModifiche(newData);
  };

  const torneiDisponibili = ["Tutti", ...new Set(iscrizioni.map(i => i.torneo))];

  const iscrizioniFiltrate = iscrizioni
    .filter(i => {
      if (filtroTorneo === "Tutti") return true;
      return (i.torneo || "").toLowerCase().trim() === filtroTorneo.toLowerCase().trim();
    })
    .filter(i => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        (i.giocatori || "").toLowerCase().includes(query) ||
        (i.id || "").toLowerCase().includes(query) ||
        (i.torneo || "").toLowerCase().includes(query)
      );
    });

  const totaleAtteso = iscrizioniFiltrate.reduce((acc, curr) => acc + curr.quotaTotale, 0);
  const totaleIncassato = iscrizioniFiltrate.reduce((acc, curr) => acc + curr.quotaPagata, 0);
  const totaleDaIncassare = totaleAtteso - totaleIncassato;

  return (
    <main className="min-h-screen bg-transparent pb-20">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-[#295dab] uppercase tracking-tighter leading-none">Pagamenti 💰</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Gestione Incassi e Saldi</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Search query field */}
            <div className="flex-1 md:w-80 bg-white px-6 py-3 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cerca Team</span>
              <input 
                type="text" 
                placeholder="Nome team o giocatore..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm font-bold focus:outline-none text-[#295dab]"
              />
            </div>

            {/* Tournament selector */}
            <div className="bg-white px-6 py-3 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-1 min-w-[200px]">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtra Torneo</span>
              <select 
                value={filtroTorneo} 
                onChange={(e) => setFiltroTorneo(e.target.value)}
                className="bg-transparent text-sm font-black focus:outline-none cursor-pointer text-[#295dab]"
              >
                {torneiDisponibili.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dashboard Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border-b-8 border-blue-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 relative z-10">Totale Atteso</span>
            <span className="text-4xl font-black text-blue-600 relative z-10">€{totaleAtteso}</span>
          </div>
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border-b-8 border-green-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 relative z-10">Totale Incassato</span>
            <span className="text-4xl font-black text-green-600 relative z-10">€{totaleIncassato}</span>
          </div>
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border-b-8 border-red-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 relative z-10">Da Incassare</span>
            <span className="text-4xl font-black text-red-600 relative z-10">€{totaleDaIncassare}</span>
          </div>
        </div>

        {/* Mobile-Friendly List */}
        <div className="space-y-6">
          {iscrizioniFiltrate.map((isc) => {
            const saldoMancante = isc.quotaTotale - isc.quotaPagata;
            const isSaldato = saldoMancante === 0;
            const isAcconto = isc.quotaPagata > 0 && isc.quotaPagata < isc.quotaTotale;
            const players = splitNames(isc.giocatori);

            return (
              <div key={isc.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-2xl">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-gray-100 text-gray-400 text-[10px] font-black px-3 py-1 rounded-lg">#{isc.id}</span>
                    {isSaldato ? (
                      <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Saldato ✓</span>
                    ) : isAcconto ? (
                      <span className="bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Acconto</span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Da Pagare</span>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-black text-[#295dab] leading-tight mb-3">{isc.giocatori}</h3>
                  
                  {/* Individual player buttons displaying their payment status */}
                  {players.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {players.map((playerName) => {
                        const hasPaid = (isc.pagatoDa || []).includes(playerName);
                        return (
                          <button
                            key={playerName}
                            onClick={() => togglePlayerPayment(isc.id, playerName)}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                              hasPaid
                                ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                                : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100 hover:text-gray-600"
                            }`}
                          >
                            👤 {playerName} {hasPaid ? " (Pagato)" : " (Da pagare)"}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isc.torneo}</p>
                </div>

                <div className="flex flex-col md:items-end gap-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Stato Contabile</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#295dab]">€{isc.quotaPagata}</span>
                    <span className="text-gray-300 font-bold text-lg">/ €{isc.quotaTotale}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isc.quotaPagata > 0 && (
                    <button 
                      onClick={() => {
                        if (window.confirm(`Sei sicuro di voler azzerare il pagamento per "${isc.giocatori}"?`)) {
                          azzeraPagamento(isc.id);
                        }
                      }}
                      className="flex-1 md:flex-none bg-red-50 text-red-600 hover:bg-red-100 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                    >
                      Azzera 🔄
                    </button>
                  )}
                  {!isSaldato && (
                    <>
                      <button 
                        onClick={() => registraAcconto(isc.id, Math.ceil(isc.quotaTotale / 2))}
                        className="flex-1 md:flex-none bg-gray-50 text-[#295dab] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
                      >
                        +€{Math.ceil(isc.quotaTotale / 2)}
                      </button>
                      <button 
                        onClick={() => segnaSaldato(isc.id)}
                        className="flex-1 md:flex-none bg-[#295dab] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        Salda Ora
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          
          {iscrizioniFiltrate.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-gray-100">
              <span className="text-6xl block mb-6">📉</span>
              <h4 className="text-2xl font-black text-gray-300 uppercase tracking-tighter">Nessun dato trovato</h4>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
