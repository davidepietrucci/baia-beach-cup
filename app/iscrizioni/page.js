"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTornei, getModuli } from "@/app/utils/db";

export default function Iscrizioni() {
  const router = useRouter();
  const [torneiAperti, setTorneiAperti] = useState([]);
  const [moduli, setModuli] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Modulo custom attivo (se presente)
  const [activeModulo, setActiveModulo] = useState(null);
  
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

  // Risposte per i campi custom
  const [customAnswers, setCustomAnswers] = useState({});

  const updateActiveModulo = (torneo, allModuli) => {
    if (torneo && torneo.moduloIscrizioneId) {
      const mod = allModuli.find(m => String(m.id) === String(torneo.moduloIscrizioneId));
      setActiveModulo(mod || null);
      if (mod) {
        const initialAnswers = {};
        mod.campi.forEach(c => {
          initialAnswers[c.id] = c.tipo === "checkbox" ? [] : "";
        });
        setCustomAnswers(initialAnswers);
      } else {
        setCustomAnswers({});
      }
    } else {
      setActiveModulo(null);
      setCustomAnswers({});
    }
  };

  const activeTorneo = torneiAperti.find(t => t.nome === formData.torneo);

  useEffect(() => {
    Promise.all([getTornei(), getModuli()]).then(([allTornei, allModuli]) => {
      // Mostriamo solo i tornei aperti se possibile
      const aperti = allTornei.filter(t => t.stato === "Iscrizioni Aperte" || !t.stato);
      const daMostrare = aperti.length > 0 ? aperti : allTornei;
      
      setTorneiAperti(daMostrare);
      setModuli(allModuli);
      
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
        
        // Verifica modulo custom
        updateActiveModulo(selected, allModuli);
      }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === "torneo") {
      const selectedTorneo = torneiAperti.find(t => t.nome === value);
      updateActiveModulo(selectedTorneo, moduli);
      // Aggiorna l'URL nel browser senza ricaricare la pagina
      const newUrl = value
        ? `/iscrizioni?tour=${encodeURIComponent(value)}`
        : `/iscrizioni`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleCustomAnswerChange = (fieldId, val, isCheckbox = false, isChecked = false) => {
    setCustomAnswers(prev => {
      if (isCheckbox) {
        const currentList = prev[fieldId] || [];
        let newList;
        if (isChecked) {
          newList = [...currentList, val];
        } else {
          newList = currentList.filter(item => item !== val);
        }
        return { ...prev, [fieldId]: newList };
      }
      return { ...prev, [fieldId]: val };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    let giocatoriVal = "";
    let telVal = "";
    let emailVal = "";
    let noteVal = "";
    let risposteSalvate = null;

    if (activeModulo) {
      // Validazione risposte campi obbligatori del modulo custom
      const missingFields = [];
      activeModulo.campi.forEach(c => {
        if (c.obbligatorio) {
          const ans = customAnswers[c.id];
          if (c.tipo === "checkbox") {
            if (!ans || ans.length === 0) {
              missingFields.push(c.label);
            }
          } else {
            const ansVal = (ans !== undefined && ans !== null) ? ans.toString().trim() : "";
            if (ansVal === "") {
              missingFields.push(c.label);
            }
          }
        }
      });

      if (missingFields.length > 0) {
        alert("Si prega di completare i seguenti campi obbligatori:\n" + missingFields.map(f => `- ${f}`).join("\n"));
        setSubmitting(false);
        return;
      }

      // Mappatura campi
      activeModulo.campi.forEach(c => {
        const val = customAnswers[c.id];
        const formattedVal = Array.isArray(val) ? val.join(", ") : val;
        
        if (c.mappaStato === "giocatori") {
          giocatoriVal = formattedVal;
        } else if (c.mappaStato === "tel") {
          telVal = formattedVal;
        } else if (c.mappaStato === "email") {
          emailVal = formattedVal;
        }
      });

      // Fallback robusti se manca la mappatura
      if (!giocatoriVal) {
        const textCampo = activeModulo.campi.find(c => c.tipo === "text");
        giocatoriVal = textCampo ? customAnswers[textCampo.id] : "Sconosciuto";
      }
      if (!telVal) {
        const telCampo = activeModulo.campi.find(c => c.tipo === "tel");
        telVal = telCampo ? customAnswers[telCampo.id] : "Non inserito";
      }
      if (!emailVal) {
        const emailCampo = activeModulo.campi.find(c => c.tipo === "email");
        emailVal = emailCampo ? customAnswers[emailCampo.id] : "Non inserita";
      }

      noteVal = "Compilato tramite modulo personalizzato.";
      
      risposteSalvate = activeModulo.campi.map(c => {
        const val = customAnswers[c.id];
        return {
          label: c.label,
          valore: Array.isArray(val) ? val.join(", ") : (val || "")
        };
      });
    } else {
      // Modulo standard
      giocatoriVal = `${formData.giocatore1} & ${formData.giocatore2}`;
      telVal = formData.tel1 || formData.tel2 || "Non inserito";
      emailVal = formData.email1 || formData.email2 || "Non inserita";
      noteVal = formData.note;
    }

    try {
      const res = await fetch("/api/iscrizioni/registra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          torneo: formData.torneo,
          giocatori: giocatoriVal,
          tel: telVal,
          email: emailVal,
          note: noteVal,
          moduloIscrizioneId: activeModulo ? activeModulo.id : null,
          risposte: risposteSalvate
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
              // MODULO INTERNO (STANDARD O CUSTOM)
              <>
                {activeModulo ? (
                  // MODULO PERSONALIZZATO (Google Forms Style)
                  <div className="space-y-6">
                    {/* Dynamic Style Tag for Custom Theme Color */}
                    <style dangerouslySetInnerHTML={{__html: `
                      .custom-focus-input:focus {
                        border-color: ${activeModulo.coloreTema || "#673ab7"} !important;
                      }
                      .custom-radio-input:checked {
                        background-color: ${activeModulo.coloreTema || "#673ab7"} !important;
                        border-color: ${activeModulo.coloreTema || "#673ab7"} !important;
                      }
                      .custom-checkbox-input:checked {
                        background-color: ${activeModulo.coloreTema || "#673ab7"} !important;
                        border-color: ${activeModulo.coloreTema || "#673ab7"} !important;
                      }
                    `}} />
                    {/* Intestazione Modulo Custom */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-3" style={{ backgroundColor: activeModulo.coloreTema || "#673ab7" }}></div>
                      <h3 className="text-3xl font-black text-[#0D3D31] mb-2">{activeModulo.titolo}</h3>
                      <p className="text-sm font-medium text-gray-500">{activeModulo.descrizione}</p>
                      <p className="text-[10px] text-red-500 font-bold mt-4">* Indica un campo obbligatorio</p>
                    </div>

                    {/* Domande del Modulo Custom */}
                    {activeModulo.campi.map((campo) => (
                      <div key={campo.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 relative overflow-hidden space-y-3">
                        <label className="block text-sm font-bold text-gray-800">
                          {campo.label} {campo.obbligatorio && <span className="text-red-500 font-bold">*</span>}
                        </label>

                        {/* Rendering Input specifici in base al tipo */}
                        {campo.tipo === "text" && (
                          <input 
                            type="text" 
                            required={campo.obbligatorio}
                            value={customAnswers[campo.id] || ""}
                            onChange={(e) => handleCustomAnswerChange(campo.id, e.target.value)}
                            placeholder="La tua risposta"
                            className="w-full border-b border-gray-200 focus:outline-none py-2 text-sm font-semibold text-gray-800 bg-transparent transition-colors custom-focus-input"
                          />
                        )}

                        {campo.tipo === "email" && (
                          <input 
                            type="email" 
                            required={campo.obbligatorio}
                            value={customAnswers[campo.id] || ""}
                            onChange={(e) => handleCustomAnswerChange(campo.id, e.target.value)}
                            placeholder="Nome@esempio.com"
                            className="w-full border-b border-gray-200 focus:outline-none py-2 text-sm font-semibold text-gray-800 bg-transparent transition-colors custom-focus-input"
                          />
                        )}

                        {campo.tipo === "tel" && (
                          <input 
                            type="tel" 
                            required={campo.obbligatorio}
                            value={customAnswers[campo.id] || ""}
                            onChange={(e) => handleCustomAnswerChange(campo.id, e.target.value)}
                            placeholder="Numero di telefono"
                            className="w-full border-b border-gray-200 focus:outline-none py-2 text-sm font-semibold text-gray-800 bg-transparent transition-colors custom-focus-input"
                          />
                        )}

                        {campo.tipo === "number" && (
                          <input 
                            type="number" 
                            required={campo.obbligatorio}
                            value={customAnswers[campo.id] || ""}
                            onChange={(e) => handleCustomAnswerChange(campo.id, e.target.value)}
                            placeholder="Risposta numerica"
                            className="w-full border-b border-gray-200 focus:outline-none py-2 text-sm font-semibold text-gray-800 bg-transparent transition-colors custom-focus-input"
                          />
                        )}

                        {campo.tipo === "textarea" && (
                          <textarea 
                            required={campo.obbligatorio}
                            value={customAnswers[campo.id] || ""}
                            onChange={(e) => handleCustomAnswerChange(campo.id, e.target.value)}
                            placeholder="Risposta dettagliata"
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none text-sm font-semibold text-gray-800 bg-transparent transition-colors resize-none custom-focus-input"
                          />
                        )}

                        {campo.tipo === "select" && (
                          <select 
                            required={campo.obbligatorio}
                            value={customAnswers[campo.id] || ""}
                            onChange={(e) => handleCustomAnswerChange(campo.id, e.target.value)}
                            className="w-full max-w-xs border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-sm font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer shadow-sm"
                          >
                            <option value="">Scegli opzione</option>
                            {(campo.opzioni || []).map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {campo.tipo === "radio" && (
                          <div className="space-y-2 pt-1">
                            {(campo.opzioni || []).map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-3 cursor-pointer group py-1">
                                <input 
                                  type="radio" 
                                  name={campo.id} 
                                  required={campo.obbligatorio && !customAnswers[campo.id]}
                                  value={opt}
                                  checked={customAnswers[campo.id] === opt}
                                  onChange={() => handleCustomAnswerChange(campo.id, opt)}
                                  className="w-4 h-4 border-gray-300 cursor-pointer custom-radio-input"
                                />
                                <span className="text-sm font-semibold text-gray-600 group-hover:text-[#0D3D31] transition-colors">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {campo.tipo === "checkbox" && (
                          <div className="space-y-2 pt-1">
                            {(campo.opzioni || []).map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-3 cursor-pointer group py-1">
                                <input 
                                  type="checkbox" 
                                  value={opt}
                                  checked={(customAnswers[campo.id] || []).includes(opt)}
                                  onChange={(e) => handleCustomAnswerChange(campo.id, opt, true, e.target.checked)}
                                  className="w-4 h-4 rounded border-gray-300 cursor-pointer custom-checkbox-input"
                                />
                                <span className="text-sm font-semibold text-gray-600 group-hover:text-[#0D3D31] transition-colors">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // MODULO STANDARD
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
                )}

                {/* Invia */}
                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full py-4 rounded-full font-bold text-white text-lg transition-all shadow-md hover:opacity-90 hover:shadow-lg disabled:opacity-55 flex items-center justify-center gap-2" 
                    style={{ backgroundColor: activeModulo ? (activeModulo.coloreTema || "#673ab7") : "#0D3D31" }}
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
              style={{ backgroundColor: activeModulo ? (activeModulo.coloreTema || "#673ab7") : "#0D3D31" }}
            >
              Torna alla Home
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
