"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import AthleteBottomNav from "@/app/components/AthleteBottomNav";
import { getNotifiche } from "@/app/utils/db";

const TIPO_CONFIG = {
  urgente: { emoji: "🚨", color: "bg-red-50 border-red-100", badge: "bg-red-100 text-red-700", label: "Urgente" },
  avviso:  { emoji: "⚠️", color: "bg-amber-50 border-amber-100", badge: "bg-amber-100 text-amber-700", label: "Avviso" },
  info:    { emoji: "ℹ️", color: "bg-blue-50 border-blue-100", badge: "bg-blue-100 text-blue-600", label: "Info" },
};

export default function AtletaNotifiche() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notifiche, setNotifiche] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
      return;
    }
    if (status === "authenticated") {
      getNotifiche().then((data) => {
        // Ordina per data decrescente se presente
        const sorted = [...data].sort((a, b) => {
          if (a.data && b.data) return new Date(b.data) - new Date(a.data);
          return 0;
        });
        setNotifiche(sorted);
      }).finally(() => setLoading(false));
    }
  }, [router, status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0a1628] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f0f4ff] pb-28 xl:pb-10">
      <AthleteHeader />

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Titolo */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-[#0a1628] uppercase tracking-tighter">Notifiche</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Avvisi dallo staff BVI</p>
          </div>
          {notifiche.length > 0 && (
            <span className="w-8 h-8 rounded-full bg-[#0a1628] text-[#FFD700] text-xs font-black flex items-center justify-center">
              {notifiche.length}
            </span>
          )}
        </div>

        {/* Lista notifiche */}
        {notifiche.length > 0 ? (
          <div className="space-y-3">
            {notifiche.map((n, idx) => {
              const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.info;
              return (
                <div
                  key={idx}
                  className={`rounded-[1.8rem] p-5 border shadow-sm ${cfg.color}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0 mt-0.5">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-black text-[#0a1628] text-sm uppercase tracking-tight truncate">
                          {n.titolo || "Comunicazione Staff"}
                        </p>
                        <span className={`shrink-0 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        {n.messaggio || "Nessun contenuto."}
                      </p>
                      {n.data && (
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                          📅 {new Date(n.data).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-white shadow-sm border border-gray-100 flex items-center justify-center text-4xl">
              🔔
            </div>
            <div>
              <p className="font-black text-[#0a1628] text-base uppercase tracking-tighter">Nessuna notifica</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                Lo staff non ha ancora inviato avvisi
              </p>
            </div>
            <button
              onClick={() => router.push("/atleta/dashboard")}
              className="px-8 py-3.5 bg-[#0a1628] text-[#FFD700] rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
            >
              ← Torna alla Dashboard
            </button>
          </div>
        )}

        {/* Info */}
        {notifiche.length > 0 && (
          <div className="mt-6 p-4 bg-white/60 rounded-2xl border border-gray-100 text-center">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
              Le notifiche vengono inviate dallo staff BVI per aggiornamenti importanti sui tornei
            </p>
          </div>
        )}
      </div>

      <AthleteBottomNav />
    </main>
  );
}
