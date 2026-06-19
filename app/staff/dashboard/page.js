"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import StaffHeader from "@/app/components/StaffHeader";
import { getTornei, getIscrizioni, saveTornei, saveIscrizioni, saveUsers, saveGironi } from "@/app/utils/db";

export default function StaffDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [stats, setStats] = useState({
    torneiAttivi: 0,
    iscrizioniInAttesa: 0,
    squadreConfermate: 0
  });
  const [role, setRole] = useState("admin");

  useEffect(() => {
    Promise.all([getTornei(), getIscrizioni()]).then(([tornei, iscrizioni]) => {
      const countTorneiAttivi = tornei.filter(t => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione").length;
      const countInAttesa = iscrizioni.filter(i => i.stato === "In Attesa").length;
      const countConfermate = iscrizioni.filter(i => i.stato === "Approvata").length;

      setStats({
        torneiAttivi: countTorneiAttivi,
        iscrizioniInAttesa: countInAttesa,
        squadreConfermate: countConfermate
      });
    });
  }, []);

  useEffect(() => {
    if (user) {
      const isDavide = user.username === "davide" || user.firstName?.toLowerCase() === "davide" || user.emailAddresses[0]?.emailAddress?.toLowerCase().includes("davide");
      const userRole = isDavide ? "admin" : (user.publicMetadata?.role || "staff");
      setRole(userRole);
    }
  }, [user]);

  const handleResetData = async () => {
    if (typeof window !== "undefined" && window.confirm("Sei sicuro di voler cancellare TUTTI i dati (tornei, iscritti, atleti, gironi) dal database? Questa azione non è reversibile.")) {
      await saveTornei([]);
      await saveIscrizioni([]);
      await saveUsers([]);
      // Clear localStorage items
      localStorage.removeItem("bvi_tornei");
      localStorage.removeItem("bvi_iscrizioni");
      localStorage.removeItem("bvi_users");
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("bvi_gironi_") || key.startsWith("bvi_bracket_") || key.startsWith("bvi_iscrizioni") || key.startsWith("bvi_tornei") || key.startsWith("bvi_users"))) {
          localStorage.removeItem(key);
        }
      }
      alert("Database ripulito con successo!");
      window.location.reload();
    }
  };

  const handleLoadDemoData = async () => {
    if (typeof window !== "undefined" && window.confirm("Vuoi caricare i dati di esempio per testare il sito con dati pre-compilati?")) {
      const mockTornei = [
        { id: 1, nome: "Torneo di Ferragosto", data: "15 Agosto 2026", location: "Ostia Lido (RM)", categoria: "Misto 2x2", stato: "Iscrizioni Aperte", iscritti: 16, maxSquadre: 16 },
        { id: 2, nome: "Baia Beach Cup Summer Cup", data: "2 Settembre 2026", location: "Fregene", categoria: "Maschile 2x2 / Femminile 2x2", stato: "In Programmazione", iscritti: 2, maxSquadre: 24 },
        { id: 3, nome: "Spring Classic Baia Beach Cup", data: "10 Maggio 2026", location: "Roma - Baia Beach Cup Center", categoria: "Misto 4x4", stato: "Concluso", iscritti: 16, maxSquadre: 16 }
      ];
      const mockIscrizioni = [
        { id: "101", data: "15 Maggio, 10:45", torneo: "Torneo di Ferragosto", giocatori: "Davide P. & Elena M.", tel: "333 1234567", stato: "Approvata", quotaPagata: 40 },
        { id: "102", data: "15 Maggio, 11:12", torneo: "Torneo di Ferragosto", giocatori: "Marco R. & Luca B.", tel: "333 7654321", stato: "Approvata", quotaPagata: 40 },
        { id: "103", data: "15 Maggio, 12:30", torneo: "Torneo di Ferragosto", giocatori: "Giulia M. & Sara L.", tel: "328 1122334", stato: "Approvata", quotaPagata: 40 },
        { id: "104", data: "15 Maggio, 14:15", torneo: "Torneo di Ferragosto", giocatori: "Alessandro V. & Chiara B.", tel: "333 1111111", stato: "Approvata", quotaPagata: 40 },
        { id: "105", data: "15 Maggio, 14:30", torneo: "Torneo di Ferragosto", giocatori: "Francesco T. & Noemi S.", tel: "333 2222222", stato: "Approvata", quotaPagata: 0 },
        { id: "106", data: "15 Maggio, 15:00", torneo: "Torneo di Ferragosto", giocatori: "Stefano R. & Roberta G.", tel: "333 3333333", stato: "Approvata", quotaPagata: 40 },
        { id: "107", data: "15 Maggio, 15:45", torneo: "Torneo di Ferragosto", giocatori: "Filippo M. & Valentina P.", tel: "333 4444444", stato: "Approvata", quotaPagata: 0 },
        { id: "108", data: "16 Maggio, 09:00", torneo: "Torneo di Ferragosto", giocatori: "Gabriele N. & Beatrice V.", tel: "333 5555555", stato: "Approvata", quotaPagata: 40 },
        { id: "109", data: "16 Maggio, 09:30", torneo: "Torneo di Ferragosto", giocatori: "Matteo D. & Francesca F.", tel: "333 6666666", stato: "Approvata", quotaPagata: 40 },
        { id: "110", data: "16 Maggio, 10:00", torneo: "Torneo di Ferragosto", giocatori: "Lorenzo C. & Sofia R.", tel: "333 7777777", stato: "Approvata", quotaPagata: 40 },
        { id: "111", data: "16 Maggio, 10:30", torneo: "Torneo di Ferragosto", giocatori: "Andrea B. & Martina G.", tel: "333 8888888", stato: "Approvata", quotaPagata: 40 },
        { id: "112", data: "16 Maggio, 11:00", torneo: "Torneo di Ferragosto", giocatori: "Simone L. & Alice M.", tel: "333 9999999", stato: "Approvata", quotaPagata: 40 },
        { id: "113", data: "16 Maggio, 11:30", torneo: "Torneo di Ferragosto", giocatori: "Christian Z. & Elisa P.", tel: "333 0000000", stato: "Approvata", quotaPagata: 40 },
        { id: "114", data: "16 Maggio, 12:00", torneo: "Torneo di Ferragosto", giocatori: "Federico P. & Giorgia D.", tel: "333 1212121", stato: "Approvata", quotaPagata: 0 },
        { id: "115", data: "16 Maggio, 12:30", torneo: "Torneo di Ferragosto", giocatori: "Mattia F. & Camilla T.", tel: "333 2323232", stato: "Approvata", quotaPagata: 40 },
        { id: "116", data: "16 Maggio, 13:00", torneo: "Torneo di Ferragosto", giocatori: "Edoardo M. & Lucrezia B.", tel: "333 3434343", stato: "Approvata", quotaPagata: 40 },
        { id: "201", data: "Oggi, 09:12", torneo: "Baia Beach Cup Summer Cup", giocatori: "Marco R. & Luca B.", tel: "333 7654321", stato: "Approvata", quotaPagata: 0 },
        { id: "202", data: "Ieri, 18:30", torneo: "Baia Beach Cup Summer Cup", giocatori: "Giulia M. & Sara L.", tel: "328 1122334", stato: "In Attesa", quotaPagata: 0 }
      ];
      const mockUsers = [
        { id: "1", nome: "Davide", cognome: "Pietrucci", email: "davide@example.com", dataRegistrazione: "01/01/2024" },
        { id: "2", nome: "Marco", cognome: "Rossi", email: "marco@example.com", dataRegistrazione: "15/02/2024" }
      ];

      const mockGironiConfig = {
        numGironi: 4,
        teamCounts: { A: 4, B: 4, C: 4, D: 4, E: 4, F: 4, G: 4, H: 4 },
        gironeTypes: { A: "Pool", B: "Pool", C: "Pool", D: "Pool", E: "Pool", F: "Pool", G: "Pool", H: "Pool" },
        gironeSets: { A: "1 set", B: "1 set", C: "1 set", D: "1 set", E: "1 set", F: "1 set", G: "1 set", H: "1 set" },
        gironeAssignments: {
          A: {
            0: "Davide P. & Elena M.",
            1: "Marco R. & Luca B.",
            2: "Giulia M. & Sara L.",
            3: "Alessandro V. & Chiara B."
          },
          B: {
            0: "Francesco T. & Noemi S.",
            1: "Stefano R. & Roberta G.",
            2: "Filippo M. & Valentina P.",
            3: "Gabriele N. & Beatrice V."
          },
          C: {
            0: "Matteo D. & Francesca F.",
            1: "Lorenzo C. & Sofia R.",
            2: "Andrea B. & Martina G.",
            3: "Simone L. & Alice M."
          },
          D: {
            0: "Christian Z. & Elisa P.",
            1: "Federico P. & Giorgia D.",
            2: "Mattia F. & Camilla T.",
            3: "Edoardo M. & Lucrezia B."
          }
        },
        matchMetadata: {
          "A-0": { time: "09:00", court: "1", s1L: "21", s1R: "18" },
          "A-1": { time: "09:30", court: "1", s1L: "15", s1R: "21" },
          "A-2": { time: "10:30", court: "1", s1L: "21", s1R: "19" },
          "A-3": { time: "11:00", court: "1", s1L: "17", s1R: "21" },
          "B-0": { time: "09:00", court: "2", s1L: "19", s1R: "21" },
          "B-1": { time: "09:30", court: "2", s1L: "21", s1R: "14" },
          "B-2": { time: "10:30", court: "2", s1L: "16", s1R: "21" },
          "B-3": { time: "11:00", court: "2", s1L: "21", s1R: "19" },
          "C-0": { time: "09:00", court: "3", s1L: "21", s1R: "12" },
          "C-1": { time: "09:30", court: "3", s1L: "18", s1R: "21" },
          "C-2": { time: "10:30", court: "3", s1L: "21", s1R: "17" },
          "C-3": { time: "11:00", court: "3", s1L: "21", s1R: "19" },
          "D-0": { time: "09:00", court: "4", s1L: "21", s1R: "15" },
          "D-1": { time: "09:30", court: "4", s1L: "14", s1R: "21" },
          "D-2": { time: "10:30", court: "4", s1L: "21", s1R: "18" },
          "D-3": { time: "11:00", court: "4", s1L: "21", s1R: "16" }
        }
      };

      // Salva nel database (Cloud o LocalStorage Fallback)
      await saveTornei(mockTornei);
      await saveIscrizioni(mockIscrizioni);
      await saveUsers(mockUsers);
      await saveGironi("torneo_di_ferragosto", mockGironiConfig);

      // Sincronizza anche localmente per sicurezza/backward compatibility
      localStorage.setItem("bvi_tornei", JSON.stringify(mockTornei));
      localStorage.setItem("bvi_iscrizioni", JSON.stringify(mockIscrizioni));
      localStorage.setItem("bvi_users", JSON.stringify(mockUsers));
      localStorage.setItem("bvi_gironi_v2_torneo_di_ferragosto", JSON.stringify(mockGironiConfig));
      
      alert("Dati di esempio e risultati dei gironi caricati con successo!");
      window.location.reload();
    }
  };

  const handleLoad24TeamsDemo = async () => {
    if (typeof window !== "undefined" && window.confirm("Vuoi caricare il torneo di test da 24 squadre con iscrizioni già approvate?")) {
      const currentTornei = await getTornei();
      const currentIscrizioni = await getIscrizioni();
      
      const newTorneo = {
        id: 4,
        nome: "Torneo Test 24",
        data: "20 Luglio 2026",
        location: "Baia Beach Cup Arena (Roma)",
        categoria: "Maschile 2x2",
        stato: "Iscrizioni Aperte",
        iscritti: 24,
        maxSquadre: 24,
        quota: 40,
        tipoIscrizione: "interno"
      };
      
      // Rimuoviamo eventuale torneo esistente con lo stesso ID o nome
      const filteredTornei = currentTornei.filter(t => t.id !== 4 && t.nome !== "Torneo Test 24");
      const updatedTornei = [...filteredTornei, newTorneo];
      
      // Rimuoviamo iscrizioni esistenti per questo torneo
      const filteredIscrizioni = currentIscrizioni.filter(i => i.torneo !== "Torneo Test 24");
      
      const mockPlayers = [
        "Mario Rossi & Luigi Bianchi",
        "Giuseppe Verdi & Antonio Vivaldi",
        "Alessandro Volta & Galileo Galilei",
        "Dante Alighieri & Francesco Petrarca",
        "Giovanni Boccaccio & Niccolo Machiavelli",
        "Leonardo Vinci & Michelangelo Buonarroti",
        "Raffaello Sanzio & Donato Bramante",
        "Caravaggio Merisi & Sandro Botticelli",
        "Filippo Brunelleschi & Donatello Bardi",
        "Giacomo Leopardi & Alessandro Manzoni",
        "Ugo Foscolo & Giovanni Pascoli",
        "Gabriele Dannunzio & Giosue Carducci",
        "Italo Calvino & Cesare Pavese",
        "Luigi Pirandello & Primo Levi",
        "Umberto Eco & Pier Pasolini",
        "Alberto Moravia & Eugenio Montale",
        "Salvatore Quasimodo & Dino Campana",
        "Giuseppe Ungaretti & Umberto Saba",
        "Vittorio Alfieri & Carlo Goldoni",
        "Ludovico Ariosto & Torquato Tasso",
        "Marco Polo & Cristoforo Colombo",
        "Amerigo Vespucci & Giovanni Caboto",
        "Enrico Fermi & Guglielmo Marconi",
        "Giulio Natta & Rita Levi"
      ];
      
      const newIscrizioni = mockPlayers.map((giocatori, index) => ({
        id: `400_${index + 1}`,
        data: "Oggi, 10:00",
        torneo: "Torneo Test 24",
        giocatori: giocatori,
        tel: "333 1234567",
        stato: "Approvata",
        quotaPagata: 40
      }));
      
      const updatedIscrizioni = [...filteredIscrizioni, ...newIscrizioni];
      
      await saveTornei(updatedTornei);
      await saveIscrizioni(updatedIscrizioni);
      
      // Salva in localStorage per sicurezza
      localStorage.setItem("bvi_tornei", JSON.stringify(updatedTornei));
      localStorage.setItem("bvi_iscrizioni", JSON.stringify(updatedIscrizioni));
      
      alert("Torneo 'Torneo Test 24' con 24 iscrizioni approvate caricato con successo!");
      window.location.reload();
    }
  };

  return (
    <main className="min-h-screen pb-12 bg-[#f8faff]">
      <StaffHeader />

      <div className="max-w-6xl mx-auto mt-6 md:mt-10 px-4">
        <div className="mb-8">
            <h2 className="text-3xl md:text-5xl font-black text-[#0D3D31] uppercase tracking-tighter leading-none">Dashboard 🏢</h2>
            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">Controllo Centrale Torneo</p>
        </div>
        
        {/* Widget Statistici - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-[2rem] shadow-xl p-6 md:p-8 border-b-8 transition-transform active:scale-95" style={{borderColor: "#C3562B"}}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Tornei Attivi</span>
              <span className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-xl">🏆</span>
            </div>
            <p className="text-5xl md:text-6xl font-black text-[#0D3D31]">{stats.torneiAttivi}</p>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl p-6 md:p-8 border-b-8 transition-transform active:scale-95" style={{borderColor: "#0D3D31"}}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">In Attesa</span>
              <span className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">⏳</span>
            </div>
            <p className="text-5xl md:text-6xl font-black text-yellow-600">{stats.iscrizioniInAttesa}</p>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl p-6 md:p-8 border-b-8 border-green-500 transition-transform active:scale-95 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Confermate</span>
              <span className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl">✅</span>
            </div>
            <p className="text-5xl md:text-6xl font-black text-green-600">{stats.squadreConfermate}</p>
          </div>
        </div>

        {/* Quick Actions - Full width buttons on mobile */}
        <div className="mt-10 bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16"></div>
          <h3 className="text-xl md:text-2xl font-black mb-6 uppercase tracking-tight text-[#0D3D31] relative z-10">Azioni Rapide ⚡</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
            <button onClick={() => router.push('/staff/tornei/nuovo')} className="flex items-center justify-between p-5 bg-gray-50 hover:bg-[#0D3D31] hover:text-white text-[#0D3D31] rounded-2xl font-black text-sm uppercase tracking-widest transition-all group shadow-sm">
              Crea Torneo <span className="text-xl group-hover:translate-x-2 transition-transform">➕</span>
            </button>
            <button onClick={() => router.push('/staff/iscrizioni')} className="flex items-center justify-between p-5 bg-gray-50 hover:bg-[#0D3D31] hover:text-white text-[#0D3D31] rounded-2xl font-black text-sm uppercase tracking-widest transition-all group shadow-sm">
              Valuta Iscrizioni <span className="text-xl group-hover:translate-x-2 transition-transform">📝</span>
            </button>
            <button onClick={() => router.push('/staff/pagamenti')} className="flex items-center justify-between p-5 bg-gray-50 hover:bg-[#0D3D31] hover:text-white text-[#0D3D31] rounded-2xl font-black text-sm uppercase tracking-widest transition-all group shadow-sm">
              Pagamenti <span className="text-xl group-hover:translate-x-2 transition-transform">💰</span>
            </button>
          </div>
        </div>

        {/* Gestione Dati */}
        {role === "admin" && (
          <div className="mt-8 bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16"></div>
            <h3 className="text-xl md:text-2xl font-black mb-6 uppercase tracking-tight text-[#0D3D31] relative z-10">Gestione Database ⚙️</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              <button 
                onClick={handleResetData}
                className="flex items-center justify-between p-5 bg-red-50 hover:bg-red-600 hover:text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all group shadow-sm border border-red-100 text-red-700"
              >
                Resetta Database (Vuoto) <span className="text-xl group-hover:scale-110 transition-transform">🗑️</span>
              </button>
              <button 
                onClick={handleLoadDemoData}
                className="flex items-center justify-between p-5 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all group shadow-sm border border-blue-100 text-blue-700"
              >
                Carica Dati Demo <span className="text-xl group-hover:scale-110 transition-transform">💾</span>
              </button>
              <button 
                onClick={handleLoad24TeamsDemo}
                className="flex items-center justify-between p-5 bg-green-50 hover:bg-green-600 hover:text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all group shadow-sm border border-green-100 text-green-700"
              >
                Carica Torneo 24 Squadre <span className="text-xl group-hover:scale-110 transition-transform">🏆</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
