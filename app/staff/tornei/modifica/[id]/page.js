"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, saveTornei } from "@/app/utils/db";

export default function ModificaTorneo() {
  const router = useRouter();
  const params = useParams();
  const torneoId = parseInt(params.id);
  
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    getTornei().then(tornei => {
      const torneoToEdit = tornei.find(t => String(t.id) === String(torneoId));
      if (torneoToEdit) {
        setFormData({ ...torneoToEdit });
      } else {
        router.push("/staff/tornei");
      }
    }).catch(() => {
      router.push("/staff/tornei");
    });
  }, [torneoId, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tornei = await getTornei();
    const updated = tornei.map(t => String(t.id) === String(torneoId) ? { ...t, ...formData, nome: (formData.nome || "").trim() } : t);
    await saveTornei(updated);
    router.push("/staff/tornei");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: (name === "maxSquadre" || name === "quota") ? parseInt(value) || 0 : value 
    }));
  };

  const handleDelete = async () => {
    if (confirm("Sei sicuro di voler eliminare definitivamente questo torneo?")) {
      const tornei = await getTornei();
      const updated = tornei.filter(t => t.id !== torneoId);
      await saveTornei(updated);
      router.push("/staff/tornei");
    }
  };

  if (!formData) {
    return (
      <main className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#295dab] border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  const displayQuota = formData.quota !== undefined ? formData.quota : 40;

  return (
    <main className="min-h-screen pb-20 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-3xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => router.push("/staff/tornei")}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-xl border border-gray-100 text-[#295dab] hover:scale-110 active:scale-90 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-3xl font-black text-[#295dab] uppercase tracking-tighter leading-none">Modifica Torneo</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">ID: #{torneoId} • Aggiornamento Dati</p>
                </div>
            </div>
            
            <button 
                type="button" 
                onClick={handleDelete}
                className="w-full md:w-auto px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95"
            >
                Elimina Torneo
            </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-8 md:p-12 space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Torneo</label>
                <input 
                  type="text" 
                  name="nome" 
                  required
                  value={formData.nome} 
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Gara</label>
                <input 
                  type="text" 
                  name="data" 
                  required
                  value={formData.data} 
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location</label>
              <input 
                type="text" 
                name="location" 
                required
                value={formData.location} 
                onChange={handleChange}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                <select 
                  name="categoria" 
                  value={formData.categoria} 
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all"
                >
                  <option>Misto 2x2</option>
                  <option>Maschile 2x2</option>
                  <option>Femminile 2x2</option>
                  <option>Misto 4x4</option>
                  <option>Maschile 2x2 / Femminile 2x2</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Stato</label>
                <select 
                  name="stato" 
                  value={formData.stato} 
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all"
                >
                  <option>In Programmazione</option>
                  <option>Iscrizioni Aperte</option>
                  <option>Concluso</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Max Squadre</label>
                <input 
                  type="number" 
                  name="maxSquadre" 
                  min="2"
                  value={formData.maxSquadre} 
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all text-center" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quota (€)</label>
                <input 
                  type="number" 
                  name="quota" 
                  min="0"
                  value={displayQuota} 
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-[#295dab] focus:ring-2 focus:ring-[#295dab] transition-all text-center" 
                />
              </div>
            </div>



          </div>
          
          <div className="bg-gray-50 p-8 md:p-12 flex flex-col md:flex-row justify-end gap-4">
            <button 
              type="button" 
              onClick={() => router.push("/staff/tornei")}
              className="px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 bg-white border border-gray-200 hover:bg-gray-100 transition-all active:scale-95"
            >
              Annulla
            </button>
            <button 
              type="submit" 
              className="px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-[#295dab] shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Salva Modifiche 💾
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
