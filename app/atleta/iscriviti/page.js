"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import AthleteBottomNav from "@/app/components/AthleteBottomNav";
import { getTornei } from "@/app/utils/db";

export default function AtletaIscriviti() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [torneiAperti, setTorneiAperti] = useState([]);
  const [step, setStep] = useState(1); // 1: torneo, 2: dati, 3: conferma
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errore, setErrore] = useState("");

  const [formData, setFormData] = useState({
    torneo: "",
    giocatore1: "",
    giocatore2: "",
    telefono: "",
    email: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
      return;
    }
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        giocatore1: session.user.name || prev.giocatore1,
        email: session.user.email || prev.email,
      }));
    }
    getTornei().then((all) => {
      const aperti = all.filter((t) => t.stato === "Iscrizioni Aperte");
      setTorneiAperti(aperti);
      if (aperti.length > 0) {
        setFormData((prev) => ({ ...prev, torneo: aperti[0].nome }));
      }
    });
  }, [router, status, session]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (submitting) return; // protezione doppio click
    setSubmitting(true);
    setErrore("");
    try {
      const res = await fetch("/api/iscrizioni/registra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          torneo: formData.torneo,
          giocatori: `${formData.giocatore1} & ${formData.giocatore2}`,
          tel: formData.telefono,
          email: formData.email,
          note: "Iscrizione effettuata dal portale atleti.",
          checkDuplicateName: formData.giocatore1
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Errore durante il salvataggio.");
      }

      setShowModal(true);
    } catch (e) {
      setErrore(e.message || "Errore durante l'invio. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0D3D31] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedTorneo = torneiAperti.find((t) => t.nome === formData.torneo);

  return (
    <main className="min-h-screen bg-[#f4f7f6] pb-28 xl:pb-10">
      <AthleteHeader />

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Titolo */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#0D3D31] uppercase tracking-tighter">Iscriviti</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Prenota il tuo posto sulla sabbia 🏐</p>
        </div>

        {torneiAperti.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-gray-100 flex flex-col items-center gap-4 text-center">
            <span className="text-5xl">🏜️</span>
            <p className="font-black text-[#0D3D31] text-lg uppercase tracking-tighter">Nessun torneo aperto</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Al momento non ci sono tornei con iscrizioni aperte. Torna presto!
            </p>
            <button
              onClick={() => router.push("/atleta/dashboard")}
              className="mt-2 px-8 py-3.5 bg-[#0D3D31] text-[#C3562B] rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
            >
              ← Torna alla Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-7">
              {[1, 2, 3].map((s, idx) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-xs transition-all ${
                    step === s
                      ? "bg-[#0D3D31] text-white shadow-lg scale-110"
                      : step > s
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}>
                    {step > s ? "✓" : s}
                  </div>
                  {idx < 2 && (
                    <div className={`flex-1 h-1 mx-1 rounded-full transition-colors ${step > s ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest -mt-5 mb-6 px-0.5">
              <span className={step >= 1 ? "text-[#0D3D31]" : ""}>Torneo</span>
              <span className={step >= 2 ? "text-[#0D3D31]" : ""}>Dati</span>
              <span className={step >= 3 ? "text-[#0D3D31]" : ""}>Conferma</span>
            </div>

            {/* Step 1: Selezione Torneo */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Seleziona il torneo</p>
                {torneiAperti.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, torneo: t.nome }));
                    }}
                    className={`w-full text-left p-5 rounded-[1.8rem] border-2 transition-all active:scale-[0.99] ${
                      formData.torneo === t.nome
                        ? "bg-[#0D3D31] border-[#0D3D31] shadow-xl"
                        : "bg-white border-gray-100 shadow-sm hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                        formData.torneo === t.nome ? "bg-[#C3562B]" : "bg-gray-50"
                      }`}>
                        🏆
                      </div>
                      <div>
                        <p className={`font-black text-sm uppercase tracking-tight ${formData.torneo === t.nome ? "text-white" : "text-[#0D3D31]"}`}>
                          {t.nome}
                        </p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${formData.torneo === t.nome ? "text-white/60" : "text-gray-400"}`}>
                          {t.data} · {t.categoria}
                        </p>
                      </div>
                      {formData.torneo === t.nome && (
                        <div className="ml-auto w-6 h-6 rounded-full bg-[#C3562B] flex items-center justify-center text-[#0D3D31] font-black text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                <button
                  disabled={!formData.torneo}
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-[#0D3D31] text-[#C3562B] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-40 active:scale-95 transition-all mt-2"
                >
                  Continua →
                </button>
              </div>
            )}

            {/* Step 2: Inserimento dati */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">I tuoi dati</p>

                <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1.5">
                      Giocatore 1 (Tu)
                    </label>
                    <input
                      type="text"
                      name="giocatore1"
                      value={formData.giocatore1}
                      readOnly
                      className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 font-bold text-gray-400 text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1.5">
                      Giocatore 2 (Compagno/a) *
                    </label>
                    <input
                      type="text"
                      name="giocatore2"
                      value={formData.giocatore2}
                      onChange={handleChange}
                      placeholder="es. Elena M."
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 font-bold text-[#0D3D31] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D3D31] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1.5">
                      Cellulare *
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="es. 333 1234567"
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 font-bold text-[#0D3D31] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D3D31] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1.5">
                      Email di Conferma
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="tua@email.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 font-bold text-[#0D3D31] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D3D31] transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="py-4 px-6 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    ← Indietro
                  </button>
                  <button
                    disabled={!formData.giocatore2 || !formData.telefono}
                    onClick={() => setStep(3)}
                    className="flex-1 py-4 bg-[#0D3D31] text-[#C3562B] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-40 active:scale-95 transition-all"
                  >
                    Continua →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Riepilogo */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Riepilogo iscrizione</p>

                <div className="bg-white rounded-[1.8rem] p-5 shadow-sm border border-gray-100 space-y-4">
                  <RiepilogoRow label="Torneo" value={formData.torneo} />
                  <RiepilogoRow label="Data torneo" value={selectedTorneo?.data || "—"} />
                  <RiepilogoRow label="Categoria" value={selectedTorneo?.categoria || "—"} />
                  <div className="border-t border-gray-50 pt-4">
                    <RiepilogoRow label="Giocatore 1" value={formData.giocatore1} />
                    <RiepilogoRow label="Giocatore 2" value={formData.giocatore2} />
                    <RiepilogoRow label="Cellulare" value={formData.telefono} />
                    <RiepilogoRow label="Email" value={formData.email} />
                  </div>
                </div>

                <div className="bg-[#C3562B]/10 rounded-2xl p-4 border border-[#C3562B]/30">
                  <p className="text-[10px] font-black text-[#0D3D31] uppercase tracking-widest">
                    ⚠️ La tua iscrizione sarà in attesa di approvazione dello staff Baia Beach Cup.
                  </p>
                </div>

                {/* Messaggio errore duplicato */}
                {errore && (
                  <div className="bg-red-50 rounded-2xl p-4 border border-red-200 flex items-center gap-2">
                    <span className="text-base shrink-0">🚫</span>
                    <p className="text-xs font-black text-red-600">{errore}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="py-4 px-6 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    ← Indietro
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-4 bg-[#0D3D31] text-[#C3562B] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#C3562B] border-t-transparent rounded-full animate-spin" />
                        Invio...
                      </>
                    ) : (
                      "Invia Iscrizione 🚀"
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal successo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">✅</div>
            <h2 className="text-2xl font-black text-[#0D3D31] uppercase tracking-tighter mb-2">Iscrizione Inviata!</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose mb-6">
              La richiesta è stata trasmessa allo staff. Riceverai conferma a{" "}
              <span className="text-[#0D3D31]">{formData.email}</span>.
            </p>
            <button
              onClick={() => {
                setShowModal(false);
                router.push("/atleta/dashboard");
              }}
              className="w-full py-4 bg-[#0D3D31] text-[#C3562B] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
            >
              Torna alla Dashboard
            </button>
          </div>
        </div>
      )}

      <AthleteBottomNav />
    </main>
  );
}

function RiepilogoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-xs font-black text-[#0D3D31] max-w-[60%] text-right truncate">{value || "—"}</span>
    </div>
  );
}
