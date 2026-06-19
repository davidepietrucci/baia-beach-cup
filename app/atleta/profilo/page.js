"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import AthleteBottomNav from "@/app/components/AthleteBottomNav";

const TABS = ["Info", "Documenti", "Impostazioni"];

export default function AtletaProfilo() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState("Info");
  const [notifiche, setNotifiche] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
    }
    // Carica preferenze da localStorage
    const savedNotif = localStorage.getItem("bvi_notif_atleta");
    if (savedNotif !== null) setNotifiche(savedNotif === "true");
  }, [router, status]);

  const nome = session?.user?.name || "—";
  const email = session?.user?.email || "—";
  const initials = nome !== "—"
    ? nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  const toggleNotifiche = () => {
    const newVal = !notifiche;
    setNotifiche(newVal);
    localStorage.setItem("bvi_notif_atleta", String(newVal));
  };

  if (status === "loading") {
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

        {/* Avatar hero */}
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-[1.6rem] bg-[#0D3D31] flex items-center justify-center text-[#C3562B] font-black text-3xl shadow-xl border-4 border-white shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0D3D31] uppercase tracking-tighter">{nome}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{email}</p>
            <span className="mt-2 inline-block text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
              Atleta Baia Beach Cup
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm mb-5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? "bg-[#0D3D31] text-white shadow-md"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {tab === "Info" && (
          <div className="space-y-3">
            <InfoRow emoji="👤" label="Nome Completo" value={nome} />
            <InfoRow emoji="📧" label="Email" value={email} />
            <InfoRow emoji="🆔" label="Provider Login" value={session?.user?.image ? "Google" : "Credenziali"} />

            <div className="pt-2">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full py-4 bg-red-50 border border-red-100 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Disconnetti account
              </button>
            </div>
          </div>
        )}

        {/* Tab: Documenti */}
        {tab === "Documenti" && (
          <div className="space-y-3">
            <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">🏥</div>
                  <div>
                    <p className="font-black text-[#0D3D31] text-xs uppercase tracking-tight">Certificato Agonistico</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Necessario per partecipare ai tornei</p>
                  </div>
                </div>
                <span className="shrink-0 text-[9px] font-black bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Da caricare
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50">
                <label className="block w-full">
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[#0D3D31] transition-colors group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Tocca per caricare il PDF
                    </p>
                    <p className="text-[9px] text-gray-300 font-semibold">PDF, JPG, PNG · max 5MB</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={() => {}} />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-2xl">📋</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[#0D3D31] text-xs uppercase tracking-tight">Modulo Baia Beach Cup</p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Modulo iscrizione associazione</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm shadow-md shrink-0">✓</div>
              </div>
              <button className="mt-4 w-full py-3 border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-[#0D3D31] hover:text-[#0D3D31] transition-all active:scale-95">
                Download PDF
              </button>
            </div>

            <div className="bg-gray-50 rounded-[1.8rem] p-4 border border-gray-100">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest text-center">
                🔒 Sicurezza Dati Garantita · GDPR Compliant
              </p>
            </div>
          </div>
        )}

        {/* Tab: Impostazioni */}
        {tab === "Impostazioni" && (
          <div className="space-y-3">
            <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Privacy & Notifiche</h2>
              <div className="space-y-3">
                <ToggleRow
                  label="Notifiche Staff"
                  desc="Avvisi su tornei e scadenze"
                  value={notifiche}
                  onChange={toggleNotifiche}
                />
                <ToggleRow
                  label="Visibilità Ranking"
                  desc="Mostra punteggio agli altri atleti"
                  value={false}
                  onChange={() => {}}
                />
              </div>
            </div>

            <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Account</h2>
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/")}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl text-xs font-black text-gray-600 hover:bg-gray-100 transition-colors active:scale-[0.98]"
                >
                  <span>Torna alla home pubblica</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl text-xs font-black text-red-500 hover:bg-red-100 transition-colors active:scale-[0.98]"
                >
                  <span>Disconnetti</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AthleteBottomNav />
    </main>
  );
}

function InfoRow({ emoji, label, value }) {
  return (
    <div className="bg-white rounded-[1.8rem] p-4 shadow-sm border border-gray-100 flex items-center gap-4">
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-black text-[#0D3D31] mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-2xl">
      <div>
        <p className="text-xs font-black text-[#0D3D31] uppercase tracking-tight">{label}</p>
        <p className="text-[9px] font-bold text-gray-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${value ? "bg-green-500" : "bg-gray-200"}`}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
