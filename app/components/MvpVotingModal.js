"use client";

import { useState, useEffect } from "react";

export default function MvpVotingModal({ isOpen, onClose, mvpData, onVoteSuccess }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCandidateId, setVotedCandidateId] = useState("");
  const [votingId, setVotingId] = useState(""); // ID del candidato che si sta votando
  const [localMvpData, setLocalMvpData] = useState(mvpData);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const voted = localStorage.getItem("baia_beach_cup_mvp_voted") === "true";
      const candidateId = localStorage.getItem("baia_beach_cup_mvp_voted_id") || "";
      setHasVoted(voted);
      setVotedCandidateId(candidateId);
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalMvpData(mvpData);
  }, [mvpData]);

  if (!isOpen) return null;

  const handleVote = async (candidateId) => {
    if (votingId) return; // Evita clic multipli durante il caricamento
    setVotingId(candidateId);

    try {
      const res = await fetch("/api/mvp/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        localStorage.setItem("baia_beach_cup_mvp_voted", "true");
        localStorage.setItem("baia_beach_cup_mvp_voted_id", candidateId);
        setHasVoted(true);
        setVotedCandidateId(candidateId);
        setLocalMvpData(json.data); // Aggiorna i dati con i voti live
        if (onVoteSuccess) onVoteSuccess(json.data);
      } else {
        alert(json.error || "Si è verificato un errore durante la registrazione del voto.");
      }
    } catch (err) {
      console.error("Errore voto MVP:", err);
      alert("Errore di connessione. Riprova più tardi.");
    } finally {
      setVotingId("");
    }
  };

  // Filtriamo i candidati che hanno effettivamente un nome configurato
  const activeCandidates = (localMvpData?.candidati || []).filter(c => c.nome);
  const totalVotes = activeCandidates.reduce((acc, curr) => acc + (curr.voti || 0), 0);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col relative transform transition-all duration-300 scale-100 animate-[bounce_0.4s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Pulsante di Chiusura */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-lg flex items-center justify-center transition-all z-20 cursor-pointer"
        >
          ✕
        </button>

        {/* Header Modal */}
        <div className="p-8 pb-4 text-center border-b border-gray-100">
          <h2 className="text-3xl font-black text-[#295dab] uppercase tracking-tight leading-tight">
            {localMvpData?.titolo || "Vota l'MVP del Torneo"}
          </h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">
            {hasVoted 
              ? "Grazie! Il tuo voto è stato registrato." 
              : "Esprimi la tua preferenza. Puoi votare una sola volta!"}
          </p>
        </div>

        {/* Contenuto principale */}
        <div className="p-8 flex-1">
          {hasVoted ? (
            /* SE L'UTENTE HA GIÀ VOTATO: Mostra Messaggio di Conferma */
            <div className="space-y-6 max-w-lg mx-auto py-4 text-center">
              <div className="bg-green-50 border border-green-200/70 p-8 rounded-[2rem] shadow-sm space-y-4">
                <span className="text-5xl animate-bounce inline-block">🎉</span>
                <h3 className="text-xl font-black text-green-700 uppercase tracking-tight">Voto Registrato con Successo!</h3>
                
                {votedCandidateId && (
                  <div className="text-sm font-bold text-gray-600">
                    Hai espresso la tua preferenza per:<br />
                    <span className="text-lg font-black text-[#295dab] uppercase tracking-wide mt-2 inline-block bg-white px-5 py-2.5 rounded-2xl border border-green-100 shadow-sm">
                      {activeCandidates.find(c => String(c.id) === String(votedCandidateId))?.nome || "Candidato"}
                    </span>
                  </div>
                )}

                <div className="w-16 h-0.5 bg-green-200 mx-auto my-4" />

                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                  I voti sono segreti. I risultati ufficiali saranno annunciati dallo staff al termine del torneo!
                </p>
              </div>
            </div>
          ) : (
            /* SE L'UTENTE NON HA ANCORA VOTATO: Mostra la griglia dei Candidati */
            activeCandidates.length === 0 ? (
              <p className="text-center text-gray-400 font-bold uppercase tracking-widest py-12">Nessun candidato configurato dallo staff.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {activeCandidates.map((c) => (
                  <div 
                    key={c.id} 
                    className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:border-[#295dab]/30 hover:-translate-y-1.5 transition-all duration-300"
                  >
                    {/* Immagine o Placeholder */}
                    <div className="h-44 w-full bg-gray-50 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
                      {c.fotoUrl ? (
                        <img 
                          src={c.fotoUrl} 
                          alt={c.nome} 
                          onError={(e) => { e.target.src = "" }} // In caso di errore mostra il placeholder
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300">
                          <span className="text-5xl">🏐</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 mt-2">Baia Beach Cup</span>
                        </div>
                      )}
                    </div>

                    {/* Nome e Azione */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                      <h4 className="text-sm font-black text-gray-800 text-center leading-snug tracking-tight uppercase line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
                        {c.nome}
                      </h4>
                      
                      <button 
                        onClick={() => handleVote(c.id)}
                        disabled={!!votingId}
                        className="w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer bg-[#295dab] hover:bg-blue-800 disabled:opacity-50"
                      >
                        {votingId === c.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Invio...
                          </>
                        ) : (
                          "Vota 🗳️"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-6 border-t border-gray-100 text-center bg-gray-50/50 rounded-b-[2.5rem]">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
          >
            Chiudi Finestra
          </button>
        </div>
      </div>
    </div>
  );
}
