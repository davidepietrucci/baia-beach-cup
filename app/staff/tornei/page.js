"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getIscrizioni } from "@/app/utils/db";

export default function StaffTornei() {
  const router = useRouter();
  const [tornei, setTornei] = useState([]);

  useEffect(() => {
    Promise.all([getTornei(), getIscrizioni()]).then(([savedTornei, savedIscrizioni]) => {
      const updatedWithActualCounts = savedTornei.map(torneo => {
        const count = savedIscrizioni.filter(isc => isc.torneo === torneo.nome).length;
        return { ...torneo, iscritti: count > 0 ? count : torneo.iscritti };
      });

      setTornei(updatedWithActualCounts);
    });
  }, []);

  return (
    <main className="min-h-screen pb-20 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
                <h2 className="text-3xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Gestione Tornei 🏆</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Programmazione e Status Gare</p>
            </div>
            <button 
                onClick={() => router.push('/staff/tornei/nuovo')}
                className="w-full md:w-auto px-8 py-4 bg-[#0a1628] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
                + Crea Nuovo Torneo
            </button>
        </div>

        {/* Lista Tornei - Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {tornei.map((torneo) => (
            <div key={torneo.id} className="bg-white rounded-[2rem] shadow-xl border-b-8 overflow-hidden flex flex-col hover:shadow-2xl transition-all group" style={{borderColor: torneo.stato === "Concluso" ? "#cbd5e1" : "#FFD700"}}>
              <div className="p-6 sm:p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    torneo.stato === 'Iscrizioni Aperte' ? 'bg-green-100 text-green-700' :
                    torneo.stato === 'In Programmazione' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {torneo.stato}
                  </span>
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-black">#{torneo.id}</div>
                </div>
                
                <h3 className="text-2xl font-black text-[#0a1628] leading-tight mb-6 group-hover:text-blue-600 transition-colors">{torneo.nome}</h3>
                
                <div className="space-y-4 text-sm font-bold text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">📅</span> {torneo.data}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">📍</span> {torneo.location}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">🏐</span> {torneo.categoria}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Riempimento</span>
                        <span className="text-xl font-black text-[#0a1628]">{torneo.iscritti} <span className="text-gray-300 font-medium">/ {torneo.maxSquadre}</span></span>
                    </div>
                    <span className="text-[10px] font-black text-green-600">
                        {Math.round((torneo.iscritti / torneo.maxSquadre) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{
                        width: `${(torneo.iscritti / torneo.maxSquadre) * 100}%`,
                        backgroundColor: torneo.iscritti >= torneo.maxSquadre ? "#ef4444" : "#10b981"
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50/50 p-4 sm:p-6 flex gap-3">
                <button 
                  onClick={() => router.push(`/staff/tornei/modifica/${torneo.id}`)}
                  className="flex-1 bg-white border-2 border-gray-100 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-[#0a1628] hover:text-white hover:border-[#0a1628] transition-all shadow-sm cursor-pointer"
                >
                  Modifica
                </button>
                <button 
                  onClick={() => router.push(`/staff/gironi?tour=${encodeURIComponent(torneo.nome)}`)}
                  className="flex-1 bg-white border-2 border-blue-100 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm cursor-pointer"
                >
                  Gironi
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
