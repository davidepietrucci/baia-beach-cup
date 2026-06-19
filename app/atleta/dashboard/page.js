"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import AthleteBottomNav from "@/app/components/AthleteBottomNav";
import { getIscrizioni, getTornei, getNotifiche } from "@/app/utils/db";

export default function AtletaDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [iscrizioni, setIscrizioni] = useState([]);
  const [torneiAperti, setTorneiAperti] = useState([]);
  const [notifiche, setNotifiche] = useState([]);
  const [loading, setLoading] = useState(true);

  const nome = session?.user?.name?.split(" ")[0] || "Atleta";
  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";
  const ora = new Date().getHours();
  const saluto = ora < 12 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
      return;
    }
    if (status === "authenticated") {
      const nomeUtente = session?.user?.name || "";
      Promise.all([
        getIscrizioni(),
        getTornei(),
        getNotifiche(),
      ]).then(([allIscrizioni, allTornei, allNotifiche]) => {
        const mie = allIscrizioni.filter(
          (isc) => isc.giocatori?.toLowerCase().includes(nomeUtente.toLowerCase())
        );
        setIscrizioni(mie);
        setTorneiAperti(allTornei.filter((t) => t.stato === "Iscrizioni Aperte"));
        setNotifiche(allNotifiche.slice(0, 3)); // ultimi 3 avvisi
      }).finally(() => setLoading(false));
    }
  }, [router, status, session]);

  // Calcoli
  const iscrConfirmate = iscrizioni.filter((i) => i.stato === "Approvata").length;
  const iscrAttesa = iscrizioni.filter((i) => i.stato === "In Attesa").length;
  const prossimaIscr = iscrizioni.find((i) => i.stato === "Approvata") || iscrizioni[0] || null;
  const notificheNonLette = notifiche.length; // semplificato

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0D3D31] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7f6] pb-28 xl:pb-10">
      <AthleteHeader />

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* Hero Card */}
        <div className="relative bg-[#0D3D31] rounded-[2rem] p-6 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#C3562B]/5 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/3 rounded-full -ml-16 -mb-16" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-[#C3562B]/70 uppercase tracking-[0.3em] mb-1">{saluto} 👋</p>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{nome}</h1>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">Portale Atleta Baia Beach Cup</p>
            </div>
            <div className="w-16 h-16 rounded-[1.4rem] bg-[#C3562B] flex items-center justify-center text-[#0D3D31] font-black text-2xl shadow-lg shrink-0">
              {initials}
            </div>
          </div>
        </div>

        {/* Notifiche Staff */}
        {notifiche.length > 0 && (
          <div
            className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-amber-100 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
            onClick={() => router.push("/atleta/notifiche")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Avvisi Staff</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
            <div className="space-y-2">
              {notifiche.map((n, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="text-base mt-0.5 shrink-0">
                    {n.tipo === "urgente" ? "🚨" : n.tipo === "avviso" ? "⚠️" : "ℹ️"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#0D3D31] truncate">{n.titolo}</p>
                    <p className="text-[10px] text-gray-400 font-medium truncate">{n.messaggio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Confermate</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-green-600">{iscrConfirmate}</span>
              <span className="text-[9px] font-bold text-green-400 uppercase">tornei</span>
            </div>
          </div>
          <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">In Attesa</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-amber-500">{iscrAttesa}</span>
              <span className="text-[9px] font-bold text-amber-400 uppercase">richieste</span>
            </div>
          </div>
        </div>

        {/* Prossima iscrizione */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">La tua prossima sfida</h2>
            <button
              onClick={() => router.push("/atleta/iscrizioni")}
              className="text-[10px] font-black text-blue-500 uppercase tracking-widest"
            >
              Vedi tutte →
            </button>
          </div>

          {prossimaIscr ? (
            <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0D3D31] flex items-center justify-center text-2xl shrink-0">🏐</div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-[#0D3D31] text-sm uppercase tracking-tight truncate">{prossimaIscr.torneo}</p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1 truncate">{prossimaIscr.giocatori}</p>
                  <p className="text-[10px] text-gray-300 font-bold mt-0.5">{prossimaIscr.data}</p>
                </div>
                <span className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  prossimaIscr.stato === "Approvata"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {prossimaIscr.stato === "Approvata" ? "Confermato" : "In Attesa"}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="bg-white rounded-[1.8rem] p-8 shadow-sm border border-dashed border-gray-200 flex flex-col items-center gap-3 cursor-pointer hover:border-[#0D3D31] transition-colors active:scale-[0.99]"
              onClick={() => router.push("/atleta/iscriviti")}
            >
              <span className="text-4xl">🏜️</span>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Nessuna iscrizione attiva</p>
              <span className="text-[10px] font-black text-[#0D3D31] bg-[#0D3D31]/5 px-4 py-1.5 rounded-full uppercase tracking-widest">
                Iscriviti ora →
              </span>
            </div>
          )}
        </div>

        {/* Tornei aperti */}
        {torneiAperti.length > 0 && (
          <div>
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tornei con iscrizioni aperte</h2>
            <div className="space-y-3">
              {torneiAperti.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                  onClick={() => router.push("/atleta/iscriviti")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#C3562B]/20 flex items-center justify-center shrink-0">
                      <span className="text-lg">🏆</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#0D3D31] text-xs uppercase tracking-tight truncate">{t.nome}</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{t.data} · {t.categoria}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[9px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-full uppercase tracking-wider border border-green-100">
                    Aperto
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Azioni rapide */}
        <div>
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Azioni rapide</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/atleta/gironi")}
              className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-all active:scale-[0.98] group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">📊</span>
              <span className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center">Gironi Live</span>
            </button>
            <button
              onClick={() => router.push("/atleta/notifiche")}
              className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-all active:scale-[0.98] group relative"
            >
              {notificheNonLette > 0 && (
                <span className="absolute top-4 right-4 w-5 h-5 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                  {notificheNonLette}
                </span>
              )}
              <span className="text-3xl group-hover:scale-110 transition-transform">🔔</span>
              <span className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center">Notifiche</span>
            </button>
            <button
              onClick={() => router.push("/atleta/classifica")}
              className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-all active:scale-[0.98] group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">🏅</span>
              <span className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center">Classifica</span>
            </button>
            <button
              onClick={() => router.push("/atleta/profilo")}
              className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-all active:scale-[0.98] group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">👤</span>
              <span className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest text-center">Profilo</span>
            </button>
          </div>
        </div>

      </div>

      <AthleteBottomNav notificheCount={notificheNonLette} />
    </main>
  );
}
