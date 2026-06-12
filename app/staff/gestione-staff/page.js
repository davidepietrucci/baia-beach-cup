"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import StaffHeader from "@/app/components/StaffHeader";
import { getStaff, saveStaff } from "@/app/utils/db";

// Fallback accounts hardcoded in system
const systemStaff = [
  { id: "admin", name: "Administrator", username: "admin", role: "admin", type: "system" },
  { id: "staff", name: "Staff Member", username: "staff", role: "staff", type: "system" },
  { id: "vale", name: "Valentina", username: "vale", role: "staff", type: "system" },
  { id: "davide", name: "Davide", username: "davide", role: "staff", type: "system" },
  { id: "fra.b", name: "Francesco B.", username: "fra.b", role: "staff", type: "system" }
];

export default function GestioneStaff() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dynamicStaff, setDynamicStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Create Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: "",
    username: "",
    password: "",
    role: "staff"
  });
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Edit Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState(null);
  const [editModalError, setEditModalError] = useState("");
  const [editModalSubmitting, setEditModalSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/staff");
      return;
    }

    if (session?.user) {
      if (session.user.role !== "admin") {
        router.push("/staff/dashboard");
        return;
      }

      getStaff().then(list => {
        setDynamicStaff(list);
      });
    }
  }, [router, session, status]);

  // Create Handlers
  const handleModalChange = (e) => {
    setNewStaffData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (modalSubmitting) return;
    setModalSubmitting(true);
    setModalError("");

    const usernameNormalized = newStaffData.username.trim().toLowerCase();

    // Check username duplicates across both system and custom lists
    const isSystemDuplicate = systemStaff.some(s => s.username.toLowerCase() === usernameNormalized);
    const isDynamicDuplicate = dynamicStaff.some(s => s.username.toLowerCase() === usernameNormalized);

    if (isSystemDuplicate || isDynamicDuplicate) {
      setModalError("Questo username è già in uso da un altro utente staff.");
      setModalSubmitting(false);
      return;
    }

    try {
      const newMember = {
        id: "staff-" + Date.now().toString(),
        name: newStaffData.name.trim(),
        username: usernameNormalized,
        password: newStaffData.password, // Saved directly (plain text to match credentials authorize schema)
        role: newStaffData.role
      };

      const updated = [...dynamicStaff, newMember];
      await saveStaff(updated);

      setDynamicStaff(updated);
      setNewStaffData({
        name: "",
        username: "",
        password: "",
        role: "staff"
      });
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      setModalError("Errore durante il salvataggio. Riprova.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Edit Handlers
  const handleOpenEditModal = (member) => {
    setEditingStaffMember({
      id: member.id,
      name: member.name,
      username: member.username,
      password: member.password || "",
      role: member.role
    });
    setEditModalError("");
    setShowEditModal(true);
  };

  const handleEditModalChange = (e) => {
    setEditingStaffMember(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (editModalSubmitting) return;
    setEditModalSubmitting(true);
    setEditModalError("");

    const usernameNormalized = editingStaffMember.username.trim().toLowerCase();

    // Check duplicate usernames (excluding the current member being edited)
    const isSystemDuplicate = systemStaff.some(s => s.username.toLowerCase() === usernameNormalized);
    const isDynamicDuplicate = dynamicStaff.some(s => s.id !== editingStaffMember.id && s.username.toLowerCase() === usernameNormalized);

    if (isSystemDuplicate || isDynamicDuplicate) {
      setEditModalError("Questo username è già in uso da un altro utente staff.");
      setEditModalSubmitting(false);
      return;
    }

    try {
      const updated = dynamicStaff.map(s => {
        if (s.id === editingStaffMember.id) {
          return {
            ...s,
            name: editingStaffMember.name.trim(),
            username: usernameNormalized,
            password: editingStaffMember.password,
            role: editingStaffMember.role
          };
        }
        return s;
      });

      await saveStaff(updated);
      setDynamicStaff(updated);
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      setEditModalError("Errore durante il salvataggio. Riprova.");
    } finally {
      setEditModalSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (confirm("Sei sicuro di voler eliminare definitivamente questo account staff? Non potrà più accedere al portale.")) {
      try {
        const updated = dynamicStaff.filter(s => s.id !== id);
        await saveStaff(updated);
        setDynamicStaff(updated);
      } catch (err) {
        console.error(err);
        alert("Errore durante l'eliminazione.");
      }
    }
  };

  // Merge lists
  const allStaff = [
    ...systemStaff,
    ...dynamicStaff.map(s => ({ ...s, type: "custom" }))
  ];

  const filteredStaff = allStaff.filter(s => {
    const fullName = (s.name || "").toLowerCase();
    const user = (s.username || "").toLowerCase();
    const roleName = (s.role || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || user.includes(search) || roleName.includes(search);
  });

  return (
    <main className="min-h-screen pb-20 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
                <h2 className="text-3xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Gestione Staff 👥</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Profili di Accesso al Portale</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto px-6 py-4 bg-[#0a1628] text-white rounded-[1.2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                    + Nuovo Profilo Staff
                </button>
                <div className="relative w-full sm:w-80">
                    <input 
                        type="text" 
                        placeholder="Cerca staff..." 
                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-[1.5rem] focus:border-[#0a1628] outline-none transition-all shadow-xl text-sm font-bold text-gray-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                </div>
            </div>
        </div>

        <div className="space-y-4 md:space-y-0">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-5 bg-gray-50 p-5 rounded-t-[2rem] border-x border-t border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <div className="px-4 col-span-2">Utente</div>
                <div className="px-4 text-center">Username</div>
                <div className="px-4 text-center">Ruolo</div>
                <div className="px-4 text-right">Azioni</div>
            </div>

            {/* List */}
            <div className="space-y-4 md:space-y-0 md:bg-white md:rounded-b-[2rem] md:shadow-xl md:border md:border-gray-100 md:divide-y">
                {filteredStaff.map((member) => (
                    <div key={member.id} className="bg-white p-6 rounded-[2rem] shadow-xl md:shadow-none md:rounded-none md:grid md:grid-cols-5 md:items-center hover:bg-blue-50/20 transition-all">
                        <div className="flex items-center gap-4 md:px-4 mb-4 md:mb-0 md:col-span-2">
                            <div className="w-12 h-12 rounded-2xl bg-[#0a1628] text-white flex items-center justify-center font-black text-sm shadow-lg shadow-blue-900/20">
                                {(member.name || "S").charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-black text-lg text-[#0a1628] leading-none flex items-center gap-2">
                                  {member.name}
                                  {member.type === "system" && (
                                    <span className="text-[8px] bg-gray-100 text-gray-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                                      Sistema
                                    </span>
                                  )}
                                </h4>
                            </div>
                        </div>

                        <div className="md:px-4 mb-2 md:mb-0 md:text-center">
                            <p className="text-sm font-bold text-gray-500">{member.username}</p>
                        </div>

                        <div className="md:px-4 mb-6 md:mb-0 md:text-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase md:hidden block mb-1">Ruolo</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              member.role === 'admin' 
                                ? 'bg-red-50 text-red-600 border border-red-100' 
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {member.role}
                            </span>
                        </div>

                        <div className="md:px-4 text-right">
                          {member.type === "system" ? (
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic pr-4">Non Modificabile</span>
                          ) : (
                            <div className="flex gap-2 justify-end w-full md:w-auto">
                              <button 
                                onClick={() => handleOpenEditModal(member)}
                                className="w-full md:w-auto px-5 py-3 bg-gray-50 hover:bg-[#0a1628] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 transition-all border border-gray-100 cursor-pointer"
                              >
                                Modifica
                              </button>
                              <button 
                                onClick={() => handleDeleteStaff(member.id)}
                                className="w-full md:w-auto px-5 py-3 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 transition-all border border-red-100 cursor-pointer"
                              >
                                Elimina
                              </button>
                            </div>
                          )}
                        </div>
                    </div>
                ))}

                {filteredStaff.length === 0 && (
                    <div className="py-20 text-center text-gray-400 font-bold italic">
                        Nessun utente staff trovato.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Modal Nuovo Staff */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Nuovo Staff 👥</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Crea un account operatore</p>
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

            <form onSubmit={handleCreateStaff} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Nome Completo</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={newStaffData.name}
                  onChange={handleModalChange}
                  placeholder="es. Francesca Neri"
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Username (Login)</label>
                  <input 
                    type="text" 
                    name="username"
                    required
                    value={newStaffData.username}
                    onChange={handleModalChange}
                    placeholder="es. francesca"
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] transition-all outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Password</label>
                  <input 
                    type="text" 
                    name="password"
                    required
                    minLength={4}
                    value={newStaffData.password}
                    onChange={handleModalChange}
                    placeholder="Password di accesso"
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Ruolo Privilegi</label>
                <select 
                  name="role"
                  value={newStaffData.role}
                  onChange={handleModalChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] transition-all outline-none cursor-pointer"
                >
                  <option value="staff">Staff (Accesso Limitato)</option>
                  <option value="admin">Admin (Accesso Completo)</option>
                </select>
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
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-[#0a1628] shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {modalSubmitting ? "Salvataggio..." : "Crea Profilo 💾"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifica Staff */}
      {showEditModal && editingStaffMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Modifica Staff 👥</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">ID: {editingStaffMember.id}</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingStaffMember(null);
                  setEditModalError("");
                }} 
                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-bold hover:bg-gray-100 hover:text-gray-800 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editModalError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs font-bold border border-red-100">
                ⚠️ {editModalError}
              </div>
            )}

            <form onSubmit={handleUpdateStaff} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Nome Completo</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={editingStaffMember.name}
                  onChange={handleEditModalChange}
                  placeholder="es. Francesca Neri"
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Username (Login)</label>
                  <input 
                    type="text" 
                    name="username"
                    required
                    value={editingStaffMember.username}
                    onChange={handleEditModalChange}
                    placeholder="es. francesca"
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] transition-all outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Password</label>
                  <input 
                    type="text" 
                    name="password"
                    required
                    minLength={4}
                    value={editingStaffMember.password}
                    onChange={handleEditModalChange}
                    placeholder="Password di accesso"
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Ruolo Privilegi</label>
                <select 
                  name="role"
                  value={editingStaffMember.role}
                  onChange={handleEditModalChange}
                  className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3.5 font-bold text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] transition-all outline-none cursor-pointer"
                >
                  <option value="staff">Staff (Accesso Limitato)</option>
                  <option value="admin">Admin (Accesso Completo)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingStaffMember(null);
                    setEditModalError("");
                  }}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={editModalSubmitting}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-[#0a1628] shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {editModalSubmitting ? "Salvataggio..." : "Salva Modifiche 💾"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
