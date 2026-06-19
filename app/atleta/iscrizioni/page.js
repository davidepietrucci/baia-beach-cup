"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import AthleteBottomNav from "@/app/components/AthleteBottomNav";
import { getIscrizioni } from "@/app/utils/db";

const FILTRI = ["Tutte", "Approvata", "In Attesa"];

export default function MieIscrizioni() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [iscrizioni, setIscrizioni] = useState([]);
  const [filter, setFilter] = useState("Tutte");
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
      return;
    }
    if (status === "authenticated") {
      const nomeUtente = session?.user?.name || "";
      getIscrizioni().then((all) => {
        const mie = all.filter((isc) =>
          isc.giocatori?.toLowerCase().includes(nomeUtente.toLowerCase())
        );
        setIscrizioni(mie);
      }).finally(() => setLoading(false));
    }
  }, [router, status, session]);

  const filtered = filter === "Tutte" ? iscrizioni : iscrizioni.filter((i) => i.stato === filter);

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0D3D31] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7f6] pb-28 xl:pb-10">
      <AthleteHeader />

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Titolo */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#0D3D31] uppercase tracking-tighter">Le Mie Iscrizioni</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {iscrizioni.length} iscrizioni trovate
          </p>
        </div>

        {/* Filtri chip */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
          {FILTRI.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${
                filter === f
                  ? "bg-[#0D3D31] text-white shadow-md"
                  : "bg-white text-gray-400 border border-gray-200 hover:border-[#0D3D31] hover:text-[#0D3D31]"
              }`}
            >
              {f}
              {f !== "Tutte" && (
                <span className="ml-1.5 opacity-60">
                  ({iscrizioni.filter((i) => i.stato === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista iscrizioni */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((isc) => {
              const isOpen = expanded === isc.id;
              const isApprovata = isc.stato === "Approvata";
              return (
                <div
                  key={isc.id}
                  className={`bg-white rounded-[1.8rem] shadow-sm border overflow-hidden transition-all duration-300 ${
                    isOpen ? "border-[#0D3D31] shadow-md" : "border-gray-100"
                  }`}
                >
                  {/* Riga principale — tap per espandere */}
                  <button
                    onClick={() => toggleExpand(isc.id)}
                    className="w-full flex items-center gap-4 p-5 text-left"
                  >
                    {/* Icona */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                      isApprovata ? "bg-green-50" : "bg-amber-50"
                    }`}>
                      🏐
                    </div>

                    {/* Testo */}
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[#0D3D31] text-xs uppercase tracking-tight truncate">{isc.torneo}</p>
                      <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">{isc.giocatori}</p>
                    </div>

                    {/* Badge stato + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isApprovata
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {isApprovata ? "✓ Confermato" : "⏳ Attesa"}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={2.5} stroke="currentColor"
                        className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>

                  {/* Dettaglio espandibile */}
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-gray-50">
                      <div className="pt-4 space-y-3">
                        {/* Info row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-2xl p-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Data</p>
                            <p className="text-xs font-black text-[#0D3D31] mt-0.5">{isc.data || "—"}</p>
                          </div>
                          <div className="bg-gray-50 rounded-2xl p-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Iscrizione</p>
                            <p className="text-xs font-black text-[#0D3D31] mt-0.5">#{isc.id}</p>
                          </div>
                          {isc.tel && (
                            <div className="bg-gray-50 rounded-2xl p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Telefono</p>
                              <p className="text-xs font-black text-[#0D3D31] mt-0.5">{isc.tel}</p>
                            </div>
                          )}
                          {isc.quotaPagata !== undefined && (
                            <div className={`rounded-2xl p-3 ${isc.quotaPagata > 0 ? "bg-green-50" : "bg-gray-50"}`}>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quota</p>
                              <p className={`text-xs font-black mt-0.5 ${isc.quotaPagata > 0 ? "text-green-600" : "text-[#0D3D31]"}`}>
                                {isc.quotaPagata > 0 ? `€${isc.quotaPagata} pagata` : "Non ancora pagata"}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Azioni */}
                        <div className="flex gap-2 pt-1">
                          <a
                            href={`https://wa.me/?text=Ciao, ho bisogno di supporto per l'iscrizione #${isc.id} al torneo ${isc.torneo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1.5 hover:bg-green-600 transition-colors active:scale-95"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Supporto
                          </a>
                          <button
                            onClick={() => router.push(`/atleta/gironi`)}
                            className="flex-1 py-3 bg-[#0D3D31] text-[#C3562B] rounded-2xl text-[10px] font-black uppercase tracking-widest text-center active:scale-95 transition-transform"
                          >
                            Vedi Gironi →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <span className="text-6xl">🏐</span>
            <div>
              <p className="font-black text-[#0D3D31] text-lg uppercase tracking-tighter">
                {filter === "Tutte" ? "Nessuna iscrizione" : `Nessuna iscrizione ${filter.toLowerCase()}`}
              </p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                {filter === "Tutte" ? "Il campo ti aspetta!" : "Prova a cambiare il filtro"}
              </p>
            </div>
            {filter === "Tutte" && (
              <button
                onClick={() => router.push("/atleta/iscriviti")}
                className="px-8 py-4 bg-[#0D3D31] text-[#C3562B] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
              >
                Iscriviti a un torneo 🏆
              </button>
            )}
          </div>
        )}
      </div>

      <AthleteBottomNav />
    </main>
  );
}
