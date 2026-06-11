"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";

export default function AtletaProfilo() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [userData, setUserData] = useState({
    name: "Davide Pietrucci",
    email: "davide@example.com",
    ranking: 850,
    tornei: 12,
    socioDal: "Marzo 2023",
    certificatoScadenza: "15/05/2026",
    certificatoStato: "In Scadenza"
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
      return;
    }
    
    if (session?.user) {
      setUserData(prev => ({
        ...prev,
        name: session.user.name || prev.name,
        email: session.user.email || prev.email
      }));
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonna Sinistra */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 transition-all hover:shadow-3xl">
              <div className="h-40 bg-gradient-to-br from-[#0a1628] to-[#1a2e4a] relative">
                  <div className="absolute inset-0 opacity-20 bg-[url('/mesh-gradient.png')] bg-cover"></div>
              </div>
              <div className="px-6 pb-8 sm:px-8 sm:pb-10 -mt-20 flex flex-col items-center relative z-10">
                <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-[2rem] bg-white p-2 shadow-2xl mb-6">
                  <div className="w-full h-full rounded-[1.8rem] bg-blue-50 flex items-center justify-center text-5xl sm:text-6xl font-black text-[#0a1628] border-4 border-white shadow-inner">
                    {userData.name.charAt(0)}
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0a1628] text-center uppercase tracking-tighter leading-none">{userData.name}</h2>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-4 mb-6 sm:mb-8 bg-blue-50 px-4 py-1.5 rounded-full text-center">Atleta Gold 🏆</p>
                
                <div className="w-full space-y-4 mb-6 sm:mb-8">
                  <div className="flex items-center gap-4 p-4 sm:p-5 bg-gray-50 rounded-2xl sm:rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-lg">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📧</span>
                    <div className="overflow-hidden">
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Email Privata</p>
                      <p className="text-xs sm:text-sm font-black text-[#0a1628] truncate">{userData.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 sm:p-5 bg-gray-50 rounded-2xl sm:rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:shadow-lg">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📆</span>
                    <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Membro Attivo Da</p>
                      <p className="text-xs sm:text-sm font-black text-[#0a1628]">{userData.socioDal}</p>
                    </div>
                  </div>
                </div>
                
                <button className="w-full py-4 sm:py-5 rounded-2xl sm:rounded-3xl border-4 border-[#0a1628] text-[#0a1628] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#0a1628] hover:text-white transition-all shadow-xl active:scale-95 cursor-pointer">
                  Modifica Profilo ⚙️
                </button>
              </div>
            </div>

            {/* Ranking Widget */}
            <div className="bg-[#0a1628] rounded-[2rem] p-8 sm:p-10 shadow-2xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFD700] rounded-full -mr-24 -mt-24 opacity-10 group-hover:scale-150 transition-transform duration-700"></div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-8 sm:mb-10 text-[#FFD700]">
                Ranking Mondiale BVI
              </h3>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-5xl sm:text-7xl font-black tracking-tighter leading-none">{userData.ranking}</p>
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-4">Punti Carriera</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl sm:text-4xl font-black text-green-400 leading-none">#42</p>
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-4">Posizione</p>
                </div>
              </div>
              <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Prossimo Tier: 1000pt</p>
                    <span className="text-[10px] font-black text-[#FFD700]">85%</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div className="h-full bg-[#FFD700] rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]" style={{width: '85%'}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonna Destra */}
          <div className="lg:col-span-2 space-y-8 sm:space-y-10">
            
            {/* Documenti Sportivi */}
            <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-3xl">
              <div className="p-6 sm:p-8 md:p-12 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 text-center sm:text-left">
                <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Hub Documenti</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Archivio Digitale Sicuro 🛡️</p>
                </div>
                <span className="px-4 py-2 rounded-2xl bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100 shrink-0">Certificato & Moduli</span>
              </div>
              <div className="p-6 sm:p-8 md:p-12 space-y-6 sm:space-y-8">
                
                {/* Certificato Medico */}
                <div className="p-6 sm:p-8 rounded-[1.8rem] bg-gray-50 border-2 border-transparent hover:border-yellow-200 hover:bg-white transition-all group relative overflow-hidden">
                  {userData.certificatoStato === "In Scadenza" && (
                      <div className="absolute top-0 right-0 w-2 h-full bg-yellow-400"></div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-3xl sm:text-4xl shrink-0 group-hover:scale-110 transition-transform">🏥</div>
                      <div>
                        <h4 className="text-lg sm:text-xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Certificato Agonistico</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3">Scadenza: <span className="text-[#0a1628]">{userData.certificatoScadenza}</span></p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center sm:items-end gap-3 sm:gap-4 w-full sm:w-auto shrink-0">
                      <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg ${
                        userData.certificatoStato === "In Scadenza" ? "bg-yellow-400 text-white" : "bg-green-500 text-white"
                      }`}>
                        {userData.certificatoStato}
                      </span>
                      <button className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#0a1628] text-[#FFD700] text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all cursor-pointer">
                        Carica Nuovo 📁
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modulo Iscrizione */}
                <div className="p-6 sm:p-8 rounded-[1.8rem] bg-gray-50 border-2 border-transparent hover:border-green-200 hover:bg-white transition-all group">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-3xl sm:text-4xl shrink-0 group-hover:scale-110 transition-transform">📋</div>
                      <div>
                        <h4 className="text-lg sm:text-xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Modulo BVI 2024</h4>
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-3">Stato: Validato dallo Staff</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto shrink-0">
                      <button className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:border-[#0a1628] hover:text-[#0a1628] transition-all active:scale-95 cursor-pointer">
                        Download PDF
                      </button>
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white text-xl shadow-lg shadow-green-200 group-hover:rotate-12 transition-all">✓</div>
                    </div>
                  </div>
                </div>

              </div>
              <div className="bg-gray-50 p-6 sm:p-8 text-center border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sicurezza Dati Garantita • GDPR COMPLIANT 🔒</p>
              </div>
            </div>

            {/* Impostazioni Account */}
            <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 sm:p-8 md:p-12 transition-all hover:shadow-3xl">
              <h3 className="text-xl sm:text-2xl font-black text-[#0a1628] uppercase tracking-tighter mb-8 sm:mb-10">Privacy & Preferenze</h3>
              <div className="space-y-6 sm:space-y-8">
                <div className="flex items-center justify-between p-4 sm:p-6 bg-gray-50 rounded-[1.5rem] sm:rounded-[2rem] hover:bg-white border-2 border-transparent hover:border-gray-100 transition-all cursor-pointer group">
                  <div>
                    <p className="font-black text-[#0a1628] uppercase text-xs tracking-widest group-hover:text-blue-500 transition-colors">Notifiche Smart</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Avvisi tornei e scadenze</p>
                  </div>
                  <div className="w-14 h-7 bg-green-500 rounded-full p-1 shadow-inner relative">
                    <div className="absolute right-1 top-0.5 w-6 h-6 bg-white rounded-full shadow-lg"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 sm:p-6 bg-gray-50 rounded-[1.5rem] sm:rounded-[2rem] hover:bg-white border-2 border-transparent hover:border-gray-100 transition-all cursor-pointer group">
                  <div>
                    <p className="font-black text-[#0a1628] uppercase text-xs tracking-widest group-hover:text-blue-500 transition-colors">Visibilità Ranking</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Mostra punteggio agli altri</p>
                  </div>
                  <div className="w-14 h-7 bg-gray-200 rounded-full p-1 shadow-inner relative">
                    <div className="absolute left-1 top-0.5 w-6 h-6 bg-white rounded-full shadow-lg"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}
