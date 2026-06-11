"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import { getIscrizioni } from "@/app/utils/db";

export default function MieIscrizioni() {
  const { data: session, status } = useSession();
  const [iscrizioni, setIscrizioni] = useState([]);
  const [filter, setFilter] = useState("Tutte");
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
      return;
    }

    if (status === "authenticated") {
      getIscrizioni().then(allIscrizioni => {
        const nomeUtente = session?.user?.name || "Davide Pietrucci";
        const mie = allIscrizioni.filter(isc => isc.giocatori.toLowerCase().includes(nomeUtente.toLowerCase()));
        setIscrizioni(mie);
      }).catch(() => {
        setIscrizioni([
          { id: "101", data: "15/08/2024", torneo: "Torneo di Ferragosto - Misto 2x2", giocatori: "Davide P. & Elena M.", stato: "In Attesa" }
        ]);
      });
    }
  }, [router, status, session]);

  const filteredIscrizioni = filter === "Tutte" 
    ? iscrizioni 
    : iscrizioni.filter(i => i.stato === filter);

  if (status === "loading") return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#0a1628] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f8faff] pb-20">
      <AthleteHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-8">
          <div>
            <h2 className="text-4xl md:text-6xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Le Mie Iscrizioni</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-[0.3em] mt-4">Gestione Storico e Stato Tornei 📋</p>
          </div>
          
          <div className="flex bg-white p-2 rounded-[2rem] shadow-xl border border-gray-100 overflow-x-auto no-scrollbar self-start md:self-auto">
            {["Tutte", "In Attesa", "Approvata"].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === f 
                  ? "bg-[#0a1628] text-white shadow-xl scale-105" 
                  : "text-gray-400 hover:text-[#0a1628] hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredIscrizioni.length > 0 ? (
          <div className="grid grid-cols-1 gap-8">
            {filteredIscrizioni.map((isc) => (
              <div key={isc.id} className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-500 group">
                <div className="flex flex-col lg:flex-row">
                  
                  <div className="p-6 sm:p-8 md:p-10 lg:w-1/3 bg-[#0a1628] text-white flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#FFD700] text-[10px] font-black uppercase tracking-widest mb-6 w-fit relative z-10">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-pulse"></span>
                      Attivo
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black leading-none uppercase tracking-tighter mb-4 sm:mb-6 relative z-10">{isc.torneo}</h3>
                    <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-widest relative z-10">
                      <span className="text-xl">📅</span>
                      <span>{isc.data}</span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 md:p-10 flex-grow flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
                    <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center text-center md:text-left">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-blue-100 group-hover:scale-110 transition-transform shrink-0">🏐</div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">Team & Partner</p>
                        <p className="text-xl sm:text-2xl font-black text-[#0a1628] uppercase tracking-tighter truncate">{isc.giocatori}</p>
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">ID #{isc.id}</span>
                            {isc.tel && <span className="text-[10px] font-bold text-gray-400">📞 {isc.tel}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-3 sm:gap-4 w-full md:w-auto">
                      <div className={`px-8 py-4 sm:px-10 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border-4 ${
                        isc.stato === "Approvata" ? "bg-green-50 text-green-700 border-green-100" : 
                        isc.stato === "In Attesa" ? "bg-yellow-50 text-yellow-700 border-yellow-100" : 
                        "bg-red-50 text-red-700 border-red-100"
                      }`}>
                        {isc.stato}
                      </div>
                      {isc.quotaPagata > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-2xl">
                             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                             <span className="text-[10px] text-green-700 font-black uppercase tracking-widest">Saldo Confermato</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 md:p-10 lg:w-64 flex flex-row lg:flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-gray-50 bg-gray-50/50 gap-4 w-full lg:w-auto">
                    <button className="flex-1 lg:flex-none w-full py-4 rounded-[1.2rem] bg-[#0a1628] text-[#FFD700] font-black text-[10px] uppercase tracking-widest hover:shadow-2xl hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer">
                      Dettagli 📁
                    </button>
                    <button className="flex-1 lg:flex-none w-full py-4 rounded-[1.2rem] bg-white border-2 border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:border-[#0a1628] hover:text-[#0a1628] transition-all active:scale-95 cursor-pointer">
                      Supporto 💬
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 md:p-24 rounded-[3.5rem] shadow-2xl border border-gray-100 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full -mr-40 -mt-40 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-50 rounded-full -ml-32 -mb-32 opacity-50"></div>
            
            <div className="relative z-10">
              <div className="text-9xl mb-10 animate-bounce inline-block">🏐</div>
              <h3 className="text-3xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter mb-6">Nessuna Iscrizione?</h3>
              <p className="text-gray-400 mb-12 max-w-lg mx-auto text-sm md:text-lg font-bold uppercase tracking-widest leading-relaxed">
                Il campo ti sta aspettando! Scendi nella sabbia e iscriviti al tuo prossimo torneo.
              </p>
              <a 
                href="/atleta/iscriviti" 
                className="inline-flex items-center gap-4 px-12 py-6 bg-[#0a1628] text-[#FFD700] rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-110 active:scale-95 transition-all group"
              >
                VAI AI TORNEI 🏆
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-2 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
