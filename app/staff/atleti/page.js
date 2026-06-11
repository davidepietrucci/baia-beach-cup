"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import StaffHeader from "@/app/components/StaffHeader";
import { getUsers } from "@/app/utils/db";

export default function StaffAtleti() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [atleti, setAtleti] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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

      getUsers().then(users => {
        setAtleti(users);
      });
    }
  }, [router, session, status]);

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
                <h2 className="text-3xl md:text-5xl font-black text-[#0a1628] uppercase tracking-tighter leading-none">Anagrafica Atleti 👤</h2>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Gestione Utenti Registrati</p>
            </div>
            <div className="relative w-full md:w-80">
                <input 
                    type="text" 
                    placeholder="Cerca per nome o email..." 
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-[1.5rem] focus:border-[#0a1628] outline-none transition-all shadow-xl text-sm font-bold text-gray-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">🔍</span>
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
                            <div className="w-12 h-12 rounded-2xl bg-[#0a1628] text-white flex items-center justify-center font-black text-sm shadow-lg shadow-blue-900/20">
                                {(atleta.nome || "A").charAt(0)}{(atleta.cognome || "T").charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-black text-lg text-[#0a1628] leading-none">{atleta.nome} {atleta.cognome}</h4>
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
                            <button className="w-full md:w-auto px-6 py-3 bg-gray-50 hover:bg-[#0a1628] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100">
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
    </main>
  );
}
