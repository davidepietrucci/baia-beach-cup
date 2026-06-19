"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import StaffHeader from "@/app/components/StaffHeader";
import { getUsers, saveUsers } from "@/app/utils/db";

export default function StaffAtleti() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [atleti, setAtleti] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nome: "",
    cognome: "",
    email: "",
    password: ""
  });
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/staff");
      return;
    }

    if (user) {
      const isDavide = user.username === "davide" || user.firstName?.toLowerCase() === "davide" || user.emailAddresses[0]?.emailAddress?.toLowerCase().includes("davide");
      const userRole = isDavide ? "admin" : (user.publicMetadata?.role || "staff");
      if (userRole !== "admin") {
        router.push("/staff/dashboard");
        return;
      }

      getUsers().then(users => {
        setAtleti(users);
      });
    }
  }, [router, user, isLoaded]);

  const handleModalChange = (e) => {
    setNewUserData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (modalSubmitting) return;
    setModalSubmitting(true);
    setModalError("");

    try {
      const emailNormalized = newUserData.email.trim().toLowerCase();
      
      // Check if email already exists
      const existing = await getUsers();
      if (existing.some(u => u.email?.toLowerCase() === emailNormalized)) {
        setModalError("Questo indirizzo email è già registrato.");
        setModalSubmitting(false);
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        nome: newUserData.nome.trim(),
        cognome: newUserData.cognome.trim(),
        email: emailNormalized,
        password: newUserData.password,
        dataRegistrazione: new Date().toLocaleDateString('it-IT')
      };

      const updated = [...existing, newUser];
      await saveUsers(updated);

      // Refresh list
      setAtleti(updated);
      
      // Reset form & close modal
      setNewUserData({
        nome: "",
        cognome: "",
        email: "",
        password: ""
      });
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      setModalError("Errore durante il salvataggio. Riprova.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const filteredAtleti = atleti.filter(a => {
    const fullName = `${a.nome || ""} ${a.cognome || ""}`.toLowerCase();
    const email = (a.email || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  return (
    <main className="min-h-screen pb-20 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
                <h2 className="text-3xl md:text-5xl font-black text-[#0D3D31] uppercase tracking-tighter leading-none">Anagrafica Atleti 👤</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Gestione Utenti Registrati</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto px-6 py-4 bg-[#0D3D31] text-white rounded-[1.2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                    + Nuovo Atleta
                </button>
                <div className="relative w-full sm:w-80">
                    <input 
                        type="text" 
                        placeholder="Cerca per nome o email..." 
                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-[1.5rem] focus:border-[#0D3D31] outline-none transition-all shadow-xl text-sm font-bold text-gray-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                </div>
            </div>
        </div>

        <div className="space-y-4 md:space-y-0">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-4 bg-gray-50 p-5 rounded-t-[2rem] border-x border-t border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <div className="px-4">Atleta</div>
                <div className="px-4">Email</div>
                <div className="px-4 text-center">Data Reg.</div>
                <div className="px-4 text-right">Azioni</div>
            </div>

            {/* List */}
            <div className="space-y-4 md:space-y-0 md:bg-white md:rounded-b-[2rem] md:shadow-xl md:border md:border-gray-100 md:divide-y">
                {filteredAtleti.map((atleta) => (
                    <div key={atleta.id} className="bg-white p-6 rounded-[2rem] shadow-xl md:shadow-none md:rounded-none md:grid md:grid-cols-4 md:items-center hover:bg-blue-50/20 transition-all">
                        <div className="flex items-center gap-4 md:px-4 mb-4 md:mb-0">
                            <div className="w-12 h-12 rounded-2xl bg-[#0D3D31] text-white flex items-center justify-center font-black text-sm shadow-lg shadow-blue-900/20">
                                {(atleta.nome || "A").charAt(0)}{(atleta.cognome || "T").charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-black text-lg text-[#0D3D31] leading-none">{atleta.nome} {atleta.cognome}</h4>
                                <span className="text-[10px] font-black text-gray-300 md:hidden uppercase tracking-widest">ID #{atleta.id}</span>
                            </div>
                        </div>

                        <div className="md:px-4 mb-2 md:mb-0">
                            <p className="text-sm font-bold text-gray-500">{atleta.email}</p>
                        </div>

                        <div className="md:px-4 mb-6 md:mb-0 md:text-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase md:hidden block mb-1">Registrato il</span>
                            <span className="font-bold text-gray-400">{atleta.dataRegistrazione}</span>
                        </div>

                        <div className="md:px-4 text-right">
                            <button className="w-full md:w-auto px-6 py-3 bg-gray-50 hover:bg-[#0D3D31] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100">
                                Vedi Profilo
                            </button>
                        </div>
                    </div>
                ))}

                {filteredAtleti.length === 0 && (
                    <div className="py-20 text-center text-gray-400 font-bold italic">
                        Nessun atleta trovato.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Modal Nuovo Atleta */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-[#0D3D31] uppercase tracking-tighter leading-none">Nuovo Atleta 👤</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Registra un nuovo profilo</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setModalError("");
                }} 
                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-bold hover:bg-gray-100 hover:text-gray-800 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs font-bold border border-red-100">
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Nome</label>
                  <input 
                    type="text" 
                    name="nome"
                    required
                    value={newUserData.nome}
                    onChange={handleModalChange}
                    placeholder="Mario"
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0D3D31] text-sm focus:ring-2 focus:ring-[#0D3D31] transition-all outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Cognome</label>
                  <input 
                    type="text" 
                    name="cognome"
                    required
                    value={newUserData.cognome}
                    onChange={handleModalChange}
                    placeholder="Rossi"
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0D3D31] text-sm focus:ring-2 focus:ring-[#0D3D31] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Email</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={newUserData.email}
                  onChange={handleModalChange}
                  placeholder="mario.rossi@email.com"
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0D3D31] text-sm focus:ring-2 focus:ring-[#0D3D31] transition-all outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Password</label>
                <input 
                  type="password" 
                  name="password"
                  required
                  minLength={6}
                  value={newUserData.password}
                  onChange={handleModalChange}
                  placeholder="Password di accesso"
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0D3D31] text-sm focus:ring-2 focus:ring-[#0D3D31] transition-all outline-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddModal(false);
                    setModalError("");
                  }}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={modalSubmitting}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-[#0D3D31] shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {modalSubmitting ? "Registrazione..." : "Crea Profilo 💾"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
