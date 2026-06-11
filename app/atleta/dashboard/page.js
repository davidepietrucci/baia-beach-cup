"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import { getIscrizioni } from "@/app/utils/db";

export default function AtletaDashboard() {
  const { data: session, status } = useSession();
  const [leMieIscrizioni, setLeMieIscrizioni] = useState([]);
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
        setLeMieIscrizioni(mie);
      }).catch(() => {
        setLeMieIscrizioni([
          { id: "101", data: "Oggi, 10:45", torneo: "Torneo di Ferragosto - Misto 2x2", giocatori: "Davide P. & Elena M.", tel: "333 1234567", stato: "In Attesa" }
        ]);
      });
    }
  }, [router, status, session]);

  if (status === "loading") return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#0a1628] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f8faff] pb-20">
      <AthleteHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        
        {/* Banner Alert */}
        <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-xl border border-yellow-100 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400"></div>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl">⚠️</div>
            <div>
              <h4 className="text-lg sm:text-xl font-black text-[#0a1628] uppercase tracking-tighter">Certificato Medico</h4>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Scade tra 15 giorni</p>
            </div>
          </div>
          <button className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 bg-[#0a1628] text-[#FFD700] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95 cursor-pointer">
            Aggiorna Ora
          </button>
        </div>

        <div className="mb-8 sm:mb-10 text-center sm:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Bentornato, {session?.user?.name ? session.user.name.split(' ')[0] : "Davide"} ⚡</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">La tua panoramica atleta aggiornata</p>
        </div>
        
        {/* Widget Statistici */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border-b-8 border-[#FFD700] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <span className="text-[10px] font-black text-gray-400 tracking-widest block mb-4 relative z-10 uppercase">Tornei Giocati</span>
            <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-4xl sm:text-5xl font-black text-[#0a1628]">12</span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-300 uppercase tracking-widest">Stagione 2024</span>
            </div>
          </div>
          
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border-b-8 border-[#0a1628] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <span className="text-[10px] font-black text-gray-400 tracking-widest block mb-4 relative z-10 uppercase">Punti Ranking</span>
            <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-4xl sm:text-5xl font-black text-[#0a1628]">850</span>
                <span className="text-[10px] sm:text-xs font-bold text-green-500 uppercase tracking-widest">↑ +45 Live</span>
            </div>
          </div>
          
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border-b-8 border-green-500 sm:col-span-2 md:col-span-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <span className="text-[10px] font-black text-gray-400 tracking-widest block mb-4 relative z-10 uppercase">Stato Attuale</span>
            <div className="relative z-10">
                <p className="text-xl sm:text-2xl font-black text-green-600 uppercase tracking-tighter leading-none">{leMieIscrizioni.filter(i => i.stato === "Approvata").length} Confermati</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{leMieIscrizioni.filter(i => i.stato === "In Attesa").length} In attesa di approvazione</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
          
          {/* Prossimi Impegni */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-lg sm:text-xl font-black text-[#0a1628] uppercase tracking-widest">Prossimi Tornei</h3>
                <a href="/atleta/iscrizioni" className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] hover:underline">Vedi Tutti</a>
            </div>
            
            <div className="space-y-4">
              {leMieIscrizioni.length > 0 ? leMieIscrizioni.map((isc, index) => (
                <div key={index} className="bg-white p-5 sm:p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-center transition-all hover:shadow-2xl group text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shrink-0 group-hover:scale-110 transition-transform">🏐</div>
                    <div className="min-w-0">
                      <h4 className="text-base sm:text-lg font-black text-[#0a1628] uppercase tracking-tighter leading-tight truncate">{isc.torneo}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Partner: {isc.giocatori.replace(session?.user?.name || "Davide P.", "").replace("&", "").trim()}</p>
                    </div>
                  </div>
                  {isc.stato === "In Attesa" ? (
                    <span className="px-4 py-2 rounded-full text-[10px] font-black bg-yellow-100 text-yellow-700 uppercase tracking-widest shrink-0">
                      In Attesa
                    </span>
                  ) : (
                    <span className="px-4 py-2 rounded-full text-[10px] font-black bg-green-100 text-green-700 uppercase tracking-widest shrink-0">
                      Confermato
                    </span>
                  )}
                </div>
              )) : (
                <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-gray-100 text-center">
                    <span className="text-4xl sm:text-5xl block mb-4">📝</span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nessuna iscrizione attiva</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8 sm:space-y-10">
            {/* Azioni Rapide */}
            <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-xl border border-gray-100">
              <h3 className="text-lg sm:text-xl font-black text-[#0a1628] uppercase tracking-widest mb-6 sm:mb-8">Azioni Rapide</h3>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <a href="/atleta/iscriviti" className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-gray-50 border-2 border-transparent hover:border-[#0a1628] hover:bg-white transition-all group cursor-pointer">
                  <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform">🏆</span>
                  <span className="text-[10px] font-black text-[#0a1628] uppercase tracking-widest">Iscriviti</span>
                </a>
                <a href="/atleta/profilo" className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-gray-50 border-2 border-transparent hover:border-[#0a1628] hover:bg-white transition-all group cursor-pointer">
                  <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform">📂</span>
                  <span className="text-[10px] font-black text-[#0a1628] uppercase tracking-widest">Documenti</span>
                </a>
              </div>
            </div>

            {/* Squadra Principale */}
            <div className="bg-[#0a1628] p-6 sm:p-10 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-widest mb-6 text-[#FFD700]">Squadra Principale</h3>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                    <div className="flex -space-x-6 shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FFD700] flex items-center justify-center text-[#0a1628] font-black text-lg sm:text-xl border-4 border-[#0a1628] z-10 shadow-lg">DP</div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center text-[#0a1628] font-black text-lg sm:text-xl border-4 border-[#0a1628] z-0 shadow-lg">LB</div>
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xl sm:text-2xl font-black tracking-tighter truncate">I Beach Boys</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">con <span className="text-[#FFD700]">Luca Bianchi</span></p>
                    </div>
                </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
