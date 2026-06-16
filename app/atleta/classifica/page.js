"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AthleteHeader from "@/app/components/AthleteHeader";
import AthleteBottomNav from "@/app/components/AthleteBottomNav";
import { getTornei, getIscrizioni, getGironi, getBracket } from "@/app/utils/db";
import { calculateUnifiedRanking } from "@/app/utils/ranking";

const capitalizeWord = (word) => {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const capitalizeName = (nameStr) => {
  if (!nameStr) return "";
  return nameStr.split(/\s+/).map(capitalizeWord).join(" ");
};

const splitNames = (name) => {
  if (!name) return [""];
  let parts = [];
  if (name.includes(" & ")) {
    parts = name.split(" & ");
  } else if (name.includes(" / ")) {
    parts = name.split(" / ");
  } else if (name.includes(" - ")) {
    parts = name.split(" - ");
  } else if (name.includes("/")) {
    parts = name.split("/");
  } else {
    parts = [name];
  }
  return parts.map((p) => p.trim());
};

const formatPlayerName = (fullName) => {
  if (!fullName) return "";
  const cleanName = fullName.trim();
  if (!cleanName) return "";
  if (
    cleanName.toLowerCase().startsWith("slot") ||
    cleanName === "—" ||
    cleanName.toLowerCase().startsWith("vincente") ||
    cleanName.toLowerCase().startsWith("perdente") ||
    cleanName === "TBD"
  ) {
    return cleanName;
  }

  // Se contiene già un punto o l'ultima parte è una singola lettera, è già formattato
  const parts = cleanName.split(/\s+/);
  const lastPart = parts[parts.length - 1];
  if (cleanName.includes(".") || lastPart.length === 1 || (lastPart.length === 2 && lastPart.endsWith("."))) {
    if (lastPart.length === 1) {
      return cleanName + ".";
    }
    return cleanName;
  }

  if (parts.length < 2) return capitalizeName(cleanName);
  const firstName = parts[0];
  const surname = parts.slice(1).join(" ");
  const firstNameCap = capitalizeName(firstName);
  const surnameCap = capitalizeName(surname);
  const initial = firstNameCap.charAt(0).toUpperCase();
  return `${surnameCap} ${initial}.`;
};

export default function AtletaClassifica() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [torneiAttivi, setTorneiAttivi] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);
  const [activeGirone, setActiveGirone] = useState("A");
  const [loading, setLoading] = useState(true);

  const nomeUtente = session?.user?.name || "";

  // 1. Controlla autenticazione e carica tornei dell'atleta
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/atleta");
      return;
    }

    if (status === "authenticated") {
      Promise.all([getTornei(), getIscrizioni()]).then(([allTornei, allIscrizioni]) => {
        // Filtra le iscrizioni dell'utente loggato
        const mieIscrizioni = allIscrizioni.filter(
          (isc) =>
            isc.giocatori?.toLowerCase().includes(nomeUtente.toLowerCase()) &&
            (isc.stato === "Approvata" || isc.stato === "Confermata" || isc.stato === "In Attesa")
        );

        // Filtra i tornei attivi (non conclusi) a cui l'utente partecipa
        const attivi = allTornei.filter(
          (t) =>
            t.stato !== "Concluso" &&
            mieIscrizioni.some(
              (isc) => isc.torneo?.toLowerCase().trim() === t.nome?.toLowerCase().trim()
            )
        );

        setTorneiAttivi(attivi);
        if (attivi.length > 0) {
          setSelectedTorneo(attivi[0].nome);
        }
        setLoading(false);
      });
    }
  }, [status, nomeUtente, router]);

  // 2. Carica configurazione gironi per il torneo selezionato
  useEffect(() => {
    if (!selectedTorneo) {
      setConfig(null);
      setBracketConfig(null);
      return;
    }
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, "_");

    const fetchLive = () => {
      getGironi(slug).then((parsed) => {
        if (parsed) {
          setConfig(parsed);
          const gDisponibili = parsed.numGironi
            ? Array.from({ length: parsed.numGironi }, (_, i) => String.fromCharCode(65 + i))
            : [];
          setActiveGirone((prev) => {
            if (gDisponibili.length > 0 && !gDisponibili.includes(prev)) {
              return gDisponibili[0];
            }
            return prev;
          });
        } else {
          setConfig(null);
        }
      });

      getBracket(slug).then((bSaved) => {
        if (bSaved) setBracketConfig(bSaved);
        else setBracketConfig(null);
      });
    };

    fetchLive();
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
  }, [selectedTorneo]);

  // Helper per determinare se il giocatore loggato fa parte di una squadra
  const isMe = (teamName) => {
    if (!teamName || !nomeUtente) return false;
    return teamName.toLowerCase().includes(nomeUtente.toLowerCase());
  };

  // Logica per calcolare la classifica
  const getSchedule = (numTeams, gironeId, assignments = {}) => {
    const getName = (idx) =>
      assignments[idx] && assignments[idx] !== "—" && assignments[idx] !== "Slot Libero"
        ? assignments[idx]
        : `Slot ${idx + 1}`;
    const type = config?.gironeTypes?.[gironeId] || "Pool";
    if (!numTeams || numTeams < 2) return [];

    if (type === "Girone all'italiana") {
      const rrMatches = [];
      for (let i = 0; i < numTeams; i++) {
        for (let j = i + 1; j < numTeams; j++) {
          rrMatches.push({ left: getName(i), right: getName(j) });
        }
      }
      return rrMatches;
    }

    if (numTeams === 2) return [{ left: getName(0), right: getName(1) }];
    if (numTeams === 3)
      return [
        { left: getName(0), right: getName(2) },
        { left: getName(1), right: getName(2) },
        { left: getName(0), right: getName(1) },
      ];
    if (numTeams === 4) {
      const getResult = (idx) => {
        const meta = config?.matchMetadata?.[`${gironeId}-${idx}`] || {};
        const s1L = parseInt(meta.s1L || 0);
        const s1R = parseInt(meta.s1R || 0);
        if (s1L === 0 && s1R === 0)
          return { winner: `Vincente G${idx + 1}`, loser: `Perdente G${idx + 1}` };

        if (config?.gironeSets?.[gironeId] === "3 set") {
          let winL = 0, winR = 0;
          if (s1L > s1R) winL++;
          else if (s1R > s1L) winR++;
          if (parseInt(meta.s2L || 0) > parseInt(meta.s2R || 0)) winL++;
          else if (parseInt(meta.s2R || 0) > parseInt(meta.s2L || 0)) winR++;
          if (parseInt(meta.s3L || 0) > parseInt(meta.s3R || 0)) winL++;
          else if (parseInt(meta.s3R || 0) > parseInt(meta.s3L || 0)) winR++;

          if (winL > winR)
            return {
              winner: idx === 0 ? getName(0) : getName(1),
              loser: idx === 0 ? getName(3) : getName(2),
            };
          return {
            winner: idx === 0 ? getName(3) : getName(2),
            loser: idx === 0 ? getName(0) : getName(1),
          };
        }

        if (s1L > s1R)
          return {
            winner: idx === 0 ? getName(0) : getName(1),
            loser: idx === 0 ? getName(3) : getName(2),
          };
        return {
          winner: idx === 0 ? getName(3) : getName(2),
          loser: idx === 0 ? getName(0) : getName(1),
        };
      };

      const g1 = getResult(0);
      const g2 = getResult(1);

      return [
        { left: getName(0), right: getName(3) },
        { left: getName(1), right: getName(2) },
        { left: g1.winner, right: g2.winner },
        { left: g1.loser, right: g2.loser },
      ];
    }
    if (numTeams === 5)
      return [
        { left: getName(0), right: getName(4) },
        { left: getName(1), right: getName(3) },
        { left: getName(2), right: getName(4) },
        { left: getName(0), right: getName(1) },
        { left: getName(2), right: getName(3) },
      ];
    return [];
  };

  const calculateRanking = () => {
    if (!config || !config.gironeAssignments || !config.gironeAssignments[activeGirone]) return [];

    const assignments = config.gironeAssignments[activeGirone];
    const teamCount = config.teamCounts[activeGirone] || 0;
    const metadata = config.matchMetadata || {};
    const isThreeSets = config.gironeSets?.[activeGirone] === "3 set";

    const stats = {};
    for (let i = 0; i < teamCount; i++) {
      const name = assignments[i];
      if (name && name !== "—" && name !== "Slot Libero") {
        stats[name] = {
          nome: name,
          giocate: 0,
          vinte: 0,
          perse: 0,
          puntiFatti: 0,
          puntiSubiti: 0,
          score: 0,
        };
      }
    }

    const schedule = getSchedule(teamCount, activeGirone, assignments);
    schedule.forEach((match, i) => {
      const meta = metadata[`${activeGirone}-${i}`];
      if (!meta) return;

      const teamL = match.left;
      const teamR = match.right;

      if (!stats[teamL] || !stats[teamR]) return;

      const s1L = parseInt(meta.s1L || 0),
        s1R = parseInt(meta.s1R || 0);
      const s2L = parseInt(meta.s2L || 0),
        s2R = parseInt(meta.s2R || 0);
      const s3L = parseInt(meta.s3L || 0),
        s3R = parseInt(meta.s3R || 0);
      if (s1L === 0 && s1R === 0) return;

      stats[teamL].giocate++;
      stats[teamR].giocate++;
      stats[teamL].puntiFatti += s1L + s2L + s3L;
      stats[teamL].puntiSubiti += s1R + s2R + s3R;
      stats[teamR].puntiFatti += s1R + s2R + s3R;
      stats[teamR].puntiSubiti += s1L + s2L + s3L;

      let matchWinL = 0;
      if (isThreeSets) {
        let setsL = 0,
          setsR = 0;
        if (s1L > s1R) setsL++;
        else if (s1R > s1L) setsR++;
        if (s2L > s2R) setsL++;
        else if (s2R > s2L) setsR++;
        if (s3L > s3R) setsL++;
        else if (s3R > s3L) setsR++;
        matchWinL = setsL > setsR ? 1 : 0;
      } else {
        matchWinL = s1L > s1R ? 1 : 0;
      }
      if (matchWinL) {
        stats[teamL].vinte++;
        stats[teamL].score++;
        stats[teamR].perse++;
      } else {
        stats[teamR].vinte++;
        stats[teamR].score++;
        stats[teamL].perse++;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const qzTeamA = a.puntiSubiti === 0 ? a.puntiFatti : a.puntiFatti / a.puntiSubiti;
      const qzTeamB = b.puntiSubiti === 0 ? b.puntiFatti : b.puntiFatti / b.puntiSubiti;
      return qzTeamB - qzTeamA;
    });
  };

  const rankings = calculateRanking();
  const gironiDisponibili =
    config && config.pubblicato
      ? Array.from({ length: config.numGironi || 0 }, (_, i) => String.fromCharCode(65 + i))
      : [];
  const rankingType = config?.rankingType || "avulsa";

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0a1628] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f0f4ff] pb-28 xl:pb-10">
      <AthleteHeader />

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Title Section */}
        <div className="relative bg-[#0a1628] rounded-[2rem] p-6 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD700]/5 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/3 rounded-full -ml-16 -mb-16" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.3em] mb-1">
              Statistiche Live 🏆
            </p>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
              Classifica Torneo
            </h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
              Risultati {rankingType === "avulsa" ? "della classifica avulsa" : "del tuo girone"} in tempo reale
            </p>
          </div>
        </div>

        {/* Torneo Selector */}
        {torneiAttivi.length > 0 ? (
          <>
            <div className="bg-white p-5 rounded-[1.8rem] shadow-sm border border-gray-100 space-y-4">
              <div className="relative">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Seleziona Torneo Attivo
                </span>
                <div className="relative">
                  <select
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-black text-[#0a1628] text-sm focus:ring-2 focus:ring-[#0a1628] appearance-none cursor-pointer"
                    value={selectedTorneo}
                    onChange={(e) => setSelectedTorneo(e.target.value)}
                  >
                    {torneiAttivi.map((t) => (
                      <option key={t.id} value={t.nome}>
                        {t.nome} ({t.categoria})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#0a1628]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={4}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>

            </div>

            {/* Config & Pubblicazione Checks */}
            {config && config.pubblicato ? (
              <div className="space-y-3">
                {rankingType === "avulsa" ? (
                  <>
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Classifica Generale Complessiva Torneo (Avulsa)
                      </h2>
                      <span className="text-[9px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 uppercase tracking-widest">
                        Live
                      </span>
                    </div>

                    <div className="space-y-3">
                      {calculateUnifiedRanking(config).map((team, idx) => {
                        const quotient =
                          team.puntiSubiti === 0
                            ? team.puntiFatti
                            : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                        const isGold = idx < 12;
                        const isGoldDirect = idx < 4;
                        const highlight = isMe(team.nome);

                        return (
                          <div
                            key={team.nome}
                            className={`bg-white rounded-3xl p-5 shadow-sm border ${
                              highlight
                                ? "border-[#FFD700] ring-4 ring-[#FFD700]/5 scale-[1.01]"
                                : "border-gray-100"
                            } flex items-center justify-between transition-all hover:scale-[1.01] ${
                              isGold
                                ? highlight
                                  ? "border-l-4 border-l-[#FFD700]"
                                  : "border-l-4 border-l-yellow-400"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  isGoldDirect
                                    ? "bg-yellow-400 text-white shadow-sm"
                                    : isGold
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-black text-[#0a1628] text-[15px] sm:text-[16px] tracking-tight truncate flex items-center gap-1.5 flex-wrap">
                                  <span className="leading-tight block">
                                    {splitNames(team.nome).map(formatPlayerName).map((player, pIdx) => (
                                      <span key={pIdx} className="block truncate max-w-[140px]">
                                        {player}
                                      </span>
                                    ))}
                                  </span>
                                  <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    Girone {team.girone}
                                  </span>
                                  {highlight && (
                                    <span className="bg-[#FFD700]/20 text-[#0a1628] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                      Tu
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-400 font-semibold mt-1 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                                  <span>
                                    V: <strong className="text-green-600 font-bold">{team.vinte}</strong>
                                  </span>
                                  <span className="text-gray-200">|</span>
                                  <span>
                                    PF: <strong className="text-gray-700">{team.puntiFatti}</strong>
                                  </span>
                                  <span className="text-gray-200">|</span>
                                  <span>
                                    PS: <strong className="text-gray-500">{team.puntiSubiti}</strong>
                                  </span>
                                  <span className="text-gray-200">|</span>
                                  <span>
                                    Quoz: <strong className="text-blue-600 font-mono">{quotient}</strong>
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {(!config || calculateUnifiedRanking(config).length === 0) && (
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center">
                          <p className="text-gray-400 font-medium italic text-xs">
                            Nessuna squadra ancora assegnata o nessun risultato inserito.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Classifiche dei Gironi
                      </h2>
                      <span className="text-[9px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 uppercase tracking-widest">
                        Live
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 py-2">
                      {gironiDisponibili.map((g) => (
                        <button
                          key={g}
                          onClick={() => setActiveGirone(g)}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeGirone === g
                              ? "bg-[#0a1628] text-white shadow-md"
                              : "bg-white text-gray-400 hover:text-[#0a1628]"
                          }`}
                        >
                          Girone {g}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {calculateRanking().map((team, idx) => {
                        const quotient =
                          team.puntiSubiti === 0
                            ? team.puntiFatti
                            : (team.puntiFatti / team.puntiSubiti).toFixed(3);
                        const isQualified = idx < 2;
                        const highlight = isMe(team.nome);

                        return (
                          <div
                            key={team.nome}
                            className={`bg-white rounded-3xl p-5 shadow-sm border ${
                              highlight
                                ? "border-[#FFD700] ring-4 ring-[#FFD700]/5 scale-[1.01]"
                                : "border-gray-100"
                            } flex items-center justify-between transition-all hover:scale-[1.01] ${
                              isQualified
                                ? highlight
                                  ? "border-l-4 border-l-[#FFD700]"
                                  : "border-l-4 border-l-yellow-400"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  isQualified
                                    ? "bg-yellow-400 text-white shadow-sm"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-black text-[#0a1628] text-[15px] sm:text-[16px] tracking-tight truncate flex items-center gap-1.5 flex-wrap">
                                  <span className="leading-tight block">
                                    {splitNames(team.nome).map(formatPlayerName).map((player, pIdx) => (
                                      <span key={pIdx} className="block truncate max-w-[140px]">
                                        {player}
                                      </span>
                                    ))}
                                  </span>
                                  {highlight && (
                                    <span className="bg-[#FFD700]/20 text-[#0a1628] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                      Tu
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-400 font-semibold mt-1 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                                  <span>
                                    V: <strong className="text-green-600 font-bold">{team.vinte}</strong>
                                  </span>
                                  <span className="text-gray-200">|</span>
                                  <span>
                                    PF: <strong className="text-gray-700">{team.puntiFatti}</strong>
                                  </span>
                                  <span className="text-gray-200">|</span>
                                  <span>
                                    PS: <strong className="text-gray-500">{team.puntiSubiti}</strong>
                                  </span>
                                  <span className="text-gray-200">|</span>
                                  <span>
                                    Quoz: <strong className="text-blue-600 font-mono">{quotient}</strong>
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {calculateRanking().length === 0 && (
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center">
                          <p className="text-gray-400 font-medium italic text-xs">
                            Nessuna squadra ancora assegnata o nessun risultato inserito in questo girone.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
                <span className="text-5xl mb-4 block">⏳</span>
                <h3 className="text-lg font-black text-[#0a1628] uppercase tracking-tight mb-2">
                  Classifica in Elaborazione
                </h3>
                <p className="text-gray-400 font-medium text-xs max-w-sm mx-auto">
                  {config
                    ? "Lo staff sta completando i gironi di questo torneo. La classifica sarà visibile non appena i gironi verranno pubblicati!"
                    : "La classifica per questo torneo non è ancora disponibile."}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Empty state - not registered to any active tournament */
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 text-center flex flex-col items-center gap-4">
            <span className="text-5xl">🏆</span>
            <h3 className="text-lg font-black text-[#0a1628] uppercase tracking-tight">
              Nessun Torneo Attivo
            </h3>
            <p className="text-gray-400 font-semibold text-xs max-w-sm">
              Non sei iscritto a nessun torneo attivo al momento. Iscriviti ad un torneo aperto per vedere qui le classifiche live!
            </p>
            <button
              onClick={() => router.push("/atleta/iscriviti")}
              className="mt-2 bg-[#0a1628] text-white text-[10px] font-black px-6 py-3.5 rounded-2xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
            >
              Scopri Tornei Aperti
            </button>
          </div>
        )}
      </div>

      <AthleteBottomNav />
    </main>
  );
}
