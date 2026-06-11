"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import { getTornei, saveTornei, getIscrizioni, saveIscrizioni } from "@/app/utils/db";

export default function AtletaIscriviti() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [torneiAperti, setTorneiAperti] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    torneo: "",
    giocatore1: "Davide Pietrucci", 
    giocatore2: "",
    telefono: "",
    email: "davide@example.com"
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
      return;
    }

    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        giocatore1: session.user.name || prev.giocatore1,
        email: session.user.email || prev.email
      }));
    }

    getTornei().then(allTornei => {
      const aperti = allTornei.filter(t => t.stato === "Iscrizioni Aperte");
      setTorneiAperti(aperti);
      if (aperti.length > 0) {
        setFormData(prev => ({ ...prev, torneo: aperti[0].nome }));
      }
    });
  }, [router, status, session]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const iscrizioni = await getIscrizioni();
    const numericIds = iscrizioni.map(i => parseInt(i.id)).filter(id => !isNaN(id));
    const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 100;
    const oggi = new Date();
    const dataFormatted = `${oggi.getDate().toString().padStart(2, '0')}/${(oggi.getMonth() + 1).toString().padStart(2, '0')}/${oggi.getFullYear()}`;

    const nuovaIscrizione = {
      id: newId.toString(),
      data: dataFormatted,
      torneo: formData.torneo,
      giocatori: `${formData.giocatore1} & ${formData.giocatore2}`,
      tel: formData.telefono,
      email: formData.email,
      stato: "In Attesa",
      quotaPagata: 0
    };

    const updatedIscrizioni = [...iscrizioni, nuovaIscrizione];
    await saveIscrizioni(updatedIscrizioni);

    const tornei = await getTornei();
    const updatedTornei = tornei.map(t => {
      if (t.nome === formData.torneo) {
        return { ...t, iscritti: (t.iscritti || 0) + 1 };
      }
      return t;
    });
    await saveTornei(updatedTornei);

    setShowModal(true);
  };

  return (
    <main className="min-h-screen bg-[#f8faff] pb-20 relative">
      <AthleteHeader />

      <div className="max-w-3xl mx-auto mt-6 md:mt-10 px-4">
        
        <div className="flex items-center gap-6 mb-10">
            <button 
                onClick={() => router.push("/atleta/dashboard")}
                className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-xl border border-gray-100 text-[#0a1628] hover:scale-110 active:scale-90 transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </button>
            <div>
                <h2 className="text-3xl md:text-4xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Invia Iscrizione</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Prenota il tuo posto sulla sabbia 🏐</p>
            </div>
        </div>

        {torneiAperti.length === 0 ? (
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-gray-100 text-center">
            <span className="text-6xl block mb-6">🏜️</span>
            <h3 className="text-2xl font-black text-[#0a1628] uppercase tracking-tighter mb-4">Nessun torneo aperto</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Al momento non ci sono tornei attivi. Torna a controllare più tardi!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-8 md:p-12 space-y-6 sm:space-y-8">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seleziona Torneo</label>
                <select 
                  name="torneo" 
                  required
                  value={formData.torneo} 
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 sm:px-6 sm:py-5 font-black text-[#0a1628] uppercase text-xs tracking-wider focus:ring-2 focus:ring-[#0a1628] transition-all cursor-pointer"
                >
                  {torneiAperti.map(t => (
                    <option key={t.id} value={t.nome}>{t.nome} - {t.data} ({t.categoria})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Giocatore 1 (Tu)</label>
                  <input 
                    type="text" 
                    name="giocatore1" 
                    required
                    value={formData.giocatore1} 
                    onChange={handleChange}
                    className="w-full bg-gray-100 border-none rounded-2xl px-5 py-4 sm:px-6 sm:py-5 font-bold text-gray-400 transition-all cursor-not-allowed" 
                    readOnly 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Giocatore 2 (Compagno)</label>
                  <input 
                    type="text" 
                    name="giocatore2" 
                    required
                    value={formData.giocatore2} 
                    onChange={handleChange}
                    placeholder="es. Elena M." 
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 sm:px-6 sm:py-5 font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cellulare</label>
                  <input 
                    type="tel" 
                    name="telefono" 
                    required
                    value={formData.telefono} 
                    onChange={handleChange}
                    placeholder="es. 333 1234567" 
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 sm:px-6 sm:py-5 font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email di Conferma</label>
                  <input 
                    type="email" 
                    name="email" 
                    required
                    value={formData.email} 
                    onChange={handleChange}
                    placeholder="tua@email.com" 
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 sm:px-6 sm:py-5 font-bold text-[#0a1628] focus:ring-2 focus:ring-[#0a1628] transition-all" 
                  />
                </div>
              </div>

            </div>
            
            <div className="bg-gray-50 p-6 sm:p-8 md:p-12 flex justify-end">
              <button 
                type="submit" 
                className="w-full sm:w-auto px-10 py-5 sm:px-12 sm:py-6 rounded-2xl sm:rounded-3xl bg-[#0a1628] text-[#FFD700] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 cursor-pointer"
              >
                Invia Richiesta 🚀
              </button>
            </div>
          </form>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl p-10 md:p-14 max-w-lg w-full text-center relative overflow-hidden animate-in zoom-in duration-300">
            <div className="absolute top-0 left-0 w-full h-3 bg-green-500"></div>
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="text-5xl">✅</span>
            </div>
            <h3 className="text-3xl font-black text-[#0a1628] uppercase tracking-tighter mb-4">Iscrizione Inviata!</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-loose mb-10">
              La tua richiesta è stata trasmessa allo staff. Riceverai una mail di conferma all'indirizzo <span className="text-[#0a1628]">{formData.email}</span>.
            </p>
            <button 
              onClick={() => {
                setShowModal(false);
                router.push("/atleta/dashboard");
              }}
              className="w-full py-6 rounded-3xl bg-[#0a1628] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Torna alla Dashboard
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
