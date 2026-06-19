"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTornei } from "@/app/utils/db";

export default function Iscrizioni() {
  const router = useRouter();
  const [torneiAperti, setTorneiAperti] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Risposte per i campi standard
  const [formData, setFormData] = useState({
    torneo: "",
    giocatore1: "",
    email1: "",
    tel1: "",
    giocatore2: "",
    email2: "",
    tel2: "",
    note: ""
  });

  const activeTorneo = torneiAperti.find(t => t.nome === formData.torneo);

  useEffect(() => {
    getTornei().then(allTornei => {
      // Mostriamo solo i tornei aperti se possibile
      const aperti = allTornei.filter(t => t.stato === "Iscrizioni Aperte" || !t.stato);
      const daMostrare = aperti.length > 0 ? aperti : allTornei;
      
      setTorneiAperti(daMostrare);
      
      if (daMostrare.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const urlTour = params.get('tour');
        
        let selected = daMostrare[0];
        if (urlTour) {
          const match = daMostrare.find(t => t.nome.toLowerCase().trim() === urlTour.toLowerCase().trim());
          if (match) {
            selected = match;
          }
        }
        
        setFormData(prev => ({ ...prev, torneo: selected.nome }));
      }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === "torneo") {
      const newUrl = value
        ? `/iscrizioni?tour=${encodeURIComponent(value)}`
        : `/iscrizioni`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const giocatoriVal = `${formData.giocatore1} & ${formData.giocatore2}`;
    const telVal = formData.tel1 || formData.tel2 || "Non inserito";
    const emailVal = formData.email1 || formData.email2 || "Non inserita";
    const noteVal = formData.note;

    try {
      const res = await fetch("/api/iscrizioni/registra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          torneo: formData.torneo,
          giocatori: giocatoriVal,
          tel: telVal,
          email: emailVal,
          note: noteVal
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Errore durante il salvataggio.");
      }

      setShowModal(true);
    } catch (err) {
      alert("Errore durante l'invio della richiesta: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pb-20 relative" style={{ backgroundColor: "#f4f7f6" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#0D3D31" }} className="text-white py-4 px-8 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Baia Beach Cup Logo" width={50} height={50} className="object-contain" />
          <h1 className="text-2xl font-bold" style={{ color: "#C3562B" }}>Baia Beach Cup</h1>
        </div>
        <nav className="flex gap-4 items-center">
          <a href="/" className="hover:underline font-medium text-white">Home</a>
          <a
            href={formData.torneo ? `/gironi?tour=${encodeURIComponent(formData.torneo)}` : "/gironi"}
            className="hover:underline font-medium text-white"
          >
            Gironi
          </a>
        </nav>
      </header>

      {/* Form Section */}
      <div className="max-w-3xl mx-auto mt-12 px-4">
        {torneiAperti.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 border-t-4 text-center" style={{ borderColor: "#C3562B" }}>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Nessun torneo aperto</h3>
            <p className="text-gray-500">Al momento non ci sono tornei con iscrizioni aperte. Torna a controllare più tardi!</p>
          </div>
        ) : (
          <form className="space-y-6 animate-fade-in" onSubmit={handleSubmit}>
            {/* Card Selezione Torneo */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-t-8" style={{ borderColor: "#0D3D31" }}>
              <h2 className="text-3xl font-extrabold mb-2" style={{ color: "#0D3D31" }}>Modulo d'Iscrizione al Torneo 📝</h2>
              <p className="text-gray-500 mb-6 font-medium text-sm">Seleziona il torneo a cui intendi iscriverti per caricare i dettagli.</p>
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <label className="block text-xs font-black text-[#0D3D31] uppercase tracking-wider mb-2">Torneo Attivo</label>
                <select 
                  name="torneo"
                  required
                  value={formData.torneo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white font-semibold text-gray-800 shadow-sm cursor-pointer"
                >
                  {torneiAperti.map((t, idx) => (
                    <option key={idx} value={t.nome}>{t.nome} - {t.data} {t.categoria ? `(${t.categoria})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Se è un modulo esterno (Google Form) */}
            {activeTorneo?.tipoIscrizione === "esterno" ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 border-t-8 border-indigo-600 space-y-6 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl">📋</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[#0D3D31]">Iscrizione tramite Google Moduli</h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto font-medium">
                    Per questo torneo, Baia Beach Cup utilizza un modulo esterno per la raccolta dei dati. Clicca sul pulsante qui sotto per completare la tua iscrizione su Google Moduli.
                  </p>
                </div>
                
                <div className="pt-4">
                  <a 
                    href={activeTorneo.googleFormUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full py-4 rounded-full font-bold text-white text-lg transition-all shadow-md hover:opacity-90 hover:shadow-lg bg-indigo-600 text-center"
                  >
                    Apri Modulo Google 🌐
                  </a>
                </div>
                
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  ⚠️ Una volta completato il modulo su Google, la tua iscrizione verrà registrata automaticamente nel nostro sistema.
                </p>
              </div>
            ) : (
              // MODULO INTERNO STANDARD
              <>
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 border-t-4 space-y-6" style={{ borderColor: "#C3562B" }}>
                  {/* Giocatori */}
                  <div>
                    <h3 className="text-xl font-bold border-b pb-2 mb-4" style={{ color: "#0D3D31" }}>Anagrafica Giocatori</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Giocatore 1 */}
                      <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-semibold text-gray-800">Giocatore 1 (Referente)</h4>
                        <input type="text" name="giocatore1" value={formData.giocatore1} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" placeholder="Nome e Cognome" />
                        <input type="email" name="email1" value={formData.email1} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" placeholder="Email" />
                        <input type="tel" name="tel1" value={formData.tel1} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" placeholder="Telefono (WhatsApp)" />
                      </div>
                      {/* Giocatore 2 */}
                      <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-semibold text-gray-800">Giocatore 2</h4>
                        <input type="text" name="giocatore2" value={formData.giocatore2} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" placeholder="Nome e Cognome" />
                        <input type="email" name="email2" value={formData.email2} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" placeholder="Email (Opzionale)" />
                        <input type="tel" name="tel2" value={formData.tel2} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" placeholder="Telefono (Opzionale)" />
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  <div className="pt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Note / Richieste per lo Staff</label>
                    <textarea name="note" value={formData.note} onChange={handleChange} rows="3" className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Es. Arriveremo con 30 minuti di ritardo..."></textarea>
                  </div>
                </div>

                {/* Invia */}
                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full py-4 rounded-full font-bold text-white text-lg transition-all shadow-md hover:opacity-90 hover:shadow-lg disabled:opacity-55 flex items-center justify-center gap-2" 
                    style={{ backgroundColor: "#0D3D31" }}
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      "Invia Richiesta di Iscrizione"
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>

      {/* POPUP MODAL DI SUCCESSO */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-green-500 transform animate-[bounce_0.5s_ease-out]">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">Iscrizione Inviata!</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La tua richiesta è stata trasmessa allo staff in attesa di conferma.
            </p>
            <button 
              onClick={() => {
                setShowModal(false);
                router.push("/");
              }}
              className="w-full py-4 rounded-xl font-bold text-white shadow-md hover:opacity-90 transition-all text-lg"
              style={{ backgroundColor: "#0D3D31" }}
            >
              Torna alla Home
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
