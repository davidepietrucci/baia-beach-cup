"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getTornei, getGironi, getBracket } from "@/app/utils/db";

export default function PortaleLiveMobile() {
  const [tornei, setTornei] = useState([]);
  const [selectedTorneo, setSelectedTorneo] = useState("");
  const [config, setConfig] = useState(null);
  const [bracketConfig, setBracketConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("gironi"); // "gironi", "partite", "classifica", "finali"
  const [loading, setLoading] = useState(true);

  // 1. Carica l'elenco dei tornei e determina quello da visualizzare
  useEffect(() => {
    getTornei().then((parsed) => {
      setTornei(parsed);

      const params = new URLSearchParams(window.location.search);
      const urlTour = params.get("tour");

      if (urlTour && parsed.some((t) => t.nome === urlTour)) {
        setSelectedTorneo(urlTour);
      } else {
        // Cerca tornei attivi per primi
        const attivi = parsed.filter(
          (t) => t.stato === "Iscrizioni Aperte" || t.stato === "In Programmazione"
        );
        if (attivi.length > 0) {
          setSelectedTorneo(attivi[0].nome);
        } else if (parsed.length > 0) {
          setSelectedTorneo(parsed[0].nome);
        }
      }
      setLoading(false);
    });
  }, []);

  // 2. Caricamento live dei gironi e dei bracket del torneo selezionato
  useEffect(() => {
    if (!selectedTorneo) return;
    const slug = selectedTorneo.toLowerCase().trim().replace(/\s+/g, "_");

    const fetchLive = () => {
      getGironi(slug).then((data) => {
        setConfig(data);
      });
      getBracket(slug).then((data) => {
        setBracketConfig(data);
      });
    };

    fetchLive();
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
  }, [selectedTorneo]);

  const selectedTorneoObj = tornei.find((t) => t.nome === selectedTorneo);
  const isConcluso = selectedTorneoObj?.stato === "Concluso";
  const isPublished = config && config.pubblicato;

  // 3. Calcola la lista combinata dei gironi (iniziali + intermedi)
  const getGroupsList = (currentConfig = config) => {
    const list = [];
    if (currentConfig && currentConfig.numGironi) {
      for (let i = 0; i < currentConfig.numGironi; i++) {
        const label = String.fromCharCode(65 + i);
        list.push({ id: label, label: `Girone ${label}`, type: "iniziale" });
      }
    }
    // Aggiunge gironi intermedi se Gold/Silver a gruppi
    if (
      bracketConfig &&
      bracketConfig.phaseType === "gold_silver" &&
      bracketConfig.subPhaseType === "groups"
    ) {
      list.push({ id: "gold-A", label: "Gold A 🏆", type: "intermedio" });
      if (currentConfig?.numGironi === 4) {
        list.push({ id: "gold-B", label: "Gold B 🏆", type: "intermedio" });
      }
      list.push({ id: "silver-A", label: "Silver A 🥈", type: "intermedio" });
      if (currentConfig?.numGironi === 4) {
        list.push({ id: "silver-B", label: "Silver B 🥈", type: "intermedio" });
      }
    }
    return list;
  };

  // Logica per il calendario incontri dei gironi
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

  const getGroupTeams = (groupId, type) => {
    if (type === "intermedio") {
      if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
      const assignments = bracketConfig.bracketAssignments;
      return [
        assignments[`${groupId}-0`],
        assignments[`${groupId}-1`],
        assignments[`${groupId}-2`],
        assignments[`${groupId}-3`],
      ].filter((t) => t && t !== "—" && t !== "Slot Libero");
    } else {
      if (!config || !config.gironeAssignments || !config.gironeAssignments[groupId]) return [];
      const assignments = config.gironeAssignments[groupId];
      const teamCount = config.teamCounts[groupId] || 0;
      const list = [];
      for (let i = 0; i < teamCount; i++) {
        const name = assignments[i];
        if (name && name !== "—" && name !== "Slot Libero") {
          list.push(name);
        }
      }
      return list;
    }
  };

  const calculateRanking = (groupId) => {
    if (!config || !config.gironeAssignments || !config.gironeAssignments[groupId]) return [];

    const assignments = config.gironeAssignments[groupId];
    const teamCount = config.teamCounts[groupId] || 0;
    const metadata = config.matchMetadata || {};
    const isThreeSets = config.gironeSets?.[groupId] === "3 set";

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

    const schedule = getSchedule(teamCount, groupId, assignments);
    schedule.forEach((match, i) => {
      const meta = metadata[`${groupId}-${i}`];
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

  // Statistiche e partite dei gironi intermedi
  const getIntermediateGroupStats = (groupKey) => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const stats = {};
    const teams = [
      assignments[`${groupKey}-0`],
      assignments[`${groupKey}-1`],
      assignments[`${groupKey}-2`],
      assignments[`${groupKey}-3`],
    ].filter((t) => t && t !== "—" && t !== "Slot Libero");

    teams.forEach((t) => {
      stats[t] = { nome: t, giocate: 0, vinte: 0, perse: 0, pf: 0, ps: 0, punti: 0 };
    });

    const pairMaps = [
      [0, 3],
      [1, 2],
      [0, 2],
      [1, 3],
      [0, 1],
      [2, 3],
    ];

    pairMaps.forEach((pair, idx) => {
      const teamL = assignments[`${groupKey}-${pair[0]}`];
      const teamR = assignments[`${groupKey}-${pair[1]}`];
      if (!teamL || !teamR || !stats[teamL] || !stats[teamR]) return;

      const mKey = `${groupKey}-m${idx}`;
      const meta = metadata[mKey] || {};
      const s1L = parseInt(meta.scoreL || 0);
      const s1R = parseInt(meta.scoreR || 0);
      if (s1L === 0 && s1R === 0) return;

      stats[teamL].giocate++;
      stats[teamR].giocate++;
      stats[teamL].pf += s1L;
      stats[teamR].pf += s1R;
      stats[teamL].ps += s1R;
      stats[teamR].ps += s1L;

      if (s1L > s1R) {
        stats[teamL].vinte++;
        stats[teamL].punti++;
        stats[teamR].perse++;
      } else {
        stats[teamR].vinte++;
        stats[teamR].punti++;
        stats[teamL].perse++;
      }
    });

    // Mappa l'output per compatibilità con la tabella unificata
    return Object.values(stats)
      .map((t) => ({
        nome: t.nome,
        giocate: t.giocate,
        vinte: t.vinte,
        perse: t.perse,
        puntiFatti: t.pf,
        puntiSubiti: t.ps,
        score: t.punti,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const qzA = a.puntiSubiti === 0 ? a.puntiFatti : a.puntiFatti / a.puntiSubiti;
        const qzB = b.puntiSubiti === 0 ? b.puntiFatti : b.puntiFatti / b.puntiSubiti;
        return qzB - qzA;
      });
  };

  const getIntermediateGroupMatches = (groupKey) => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const teams = [
      assignments[`${groupKey}-0`],
      assignments[`${groupKey}-1`],
      assignments[`${groupKey}-2`],
      assignments[`${groupKey}-3`],
    ];

    const matchPairs = [
      { l: 0, r: 3, label: "Gara 1" },
      { l: 1, r: 2, label: "Gara 2" },
      { l: 0, r: 2, label: "Gara 3" },
      { l: 1, r: 3, label: "Gara 4" },
      { l: 0, r: 1, label: "Gara 5" },
      { l: 2, r: 3, label: "Gara 6" },
    ];

    return matchPairs
      .map((pair, idx) => {
        const teamL = teams[pair.l];
        const teamR = teams[pair.r];
        const mKey = `${groupKey}-m${idx}`;
        return {
          label: pair.label,
          left: teamL,
          right: teamR,
          meta: metadata[mKey] || {},
        };
      })
      .filter(
        (m) =>
          m.left &&
          m.left !== "—" &&
          m.left !== "Slot Libero" &&
          m.right &&
          m.right !== "—" &&
          m.right !== "Slot Libero"
      );
  };

  // 4. Auto-Scroll alla prima partita senza punteggio a livello globale
  useEffect(() => {
    if (activeTab === "partite" && isPublished && selectedTorneo) {
      const groups = getGroupsList();
      let firstUnplayedMatch = null;

      for (const group of groups) {
        const isIntermediate = group.type === "intermedio";
        const matchesList = isIntermediate
          ? getIntermediateGroupMatches(group.id)
          : getSchedule(
              config.teamCounts[group.id],
              group.id,
              config.gironeAssignments[group.id] || {}
            );

        const firstUnplayedIdx = matchesList.findIndex((m, idx) => {
          const meta = isIntermediate
            ? m.meta
            : config?.matchMetadata?.[`${group.id}-${idx}`] || {};
          const scoreL = parseInt(meta.s1L || meta.scoreL || 0);
          const scoreR = parseInt(meta.s1R || meta.scoreR || 0);
          return scoreL === 0 && scoreR === 0;
        });

        if (firstUnplayedIdx !== -1) {
          firstUnplayedMatch = { groupId: group.id, index: firstUnplayedIdx };
          break; // Trovato il primo non giocato a livello globale!
        }
      }

      if (firstUnplayedMatch) {
        const timer = setTimeout(() => {
          const el = document.getElementById(
            `match-${firstUnplayedMatch.groupId}-${firstUnplayedMatch.index}`
          );
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, config, selectedTorneo, isPublished]);

  // Restituisce la lista di partite playoff lineare
  const getPlayoffMatchesList = () => {
    if (!bracketConfig || !bracketConfig.bracketAssignments) return [];
    const assignments = bracketConfig.bracketAssignments;
    const metadata = bracketConfig.bracketMetadata || {};
    const list = [];

    const getMatchData = (id, label) => {
      const left = assignments[`${id}-L`] || "TBD";
      const right = assignments[`${id}-R`] || "TBD";
      const meta = metadata[id] || {};
      return { id, label, left, right, meta };
    };

    if (bracketConfig.phaseType === "gold_silver") {
      const isGroups = bracketConfig.subPhaseType === "groups";
      if (isGroups) {
        list.push({
          title: "Semifinali Gold 🏆",
          matches: [getMatchData("gold-s1", "Semifinale 1"), getMatchData("gold-s2", "Semifinale 2")],
        });
        list.push({
          title: "Finali Gold 🏆",
          matches: [getMatchData("gold-f3", "Finale 3°/4° Posto"), getMatchData("gold-f1", "Finale 1°/2° Posto")],
        });
        list.push({
          title: "Semifinali Silver 🥈",
          matches: [getMatchData("silver-s1", "Semifinale 1"), getMatchData("silver-s2", "Semifinale 2")],
        });
        list.push({
          title: "Finali Silver 🥈",
          matches: [getMatchData("silver-f3", "Finale 3°/4° Posto"), getMatchData("silver-f1", "Finale 1°/2° Posto")],
        });
      } else {
        if (bracketConfig.bracketSize === 8) {
          list.push({
            title: "Quarti Gold 🏆",
            matches: [
              getMatchData("gold-q1", "Quarto 1"),
              getMatchData("gold-q2", "Quarto 2"),
              getMatchData("gold-q3", "Quarto 3"),
              getMatchData("gold-q4", "Quarto 4"),
            ],
          });
        }
        list.push({
          title: "Semifinali Gold 🏆",
          matches: [getMatchData("gold-s1", "Semifinale 1"), getMatchData("gold-s2", "Semifinale 2")],
        });
        list.push({
          title: "Finali Gold 🏆",
          matches: [getMatchData("gold-f3", "Finale 3°/4° Posto"), getMatchData("gold-f1", "Finale 1°/2° Posto")],
        });

        if (bracketConfig.bracketSize === 8) {
          list.push({
            title: "Quarti Silver 🥈",
            matches: [
              getMatchData("silver-q1", "Quarto 1"),
              getMatchData("silver-q2", "Quarto 2"),
              getMatchData("silver-q3", "Quarto 3"),
              getMatchData("silver-q4", "Quarto 4"),
            ],
          });
        }
        list.push({
          title: "Semifinali Silver 🥈",
          matches: [getMatchData("silver-s1", "Semifinale 1"), getMatchData("silver-s2", "Semifinale 2")],
        });
        list.push({
          title: "Finali Silver 🥈",
          matches: [getMatchData("silver-f3", "Finale 3°/4° Posto"), getMatchData("silver-f1", "Finale 1°/2° Posto")],
        });
      }
    } else {
      // Doppia Eliminazione
      if (bracketConfig.bracketSize === 8) {
        list.push({
          title: "Quarti Vincenti (Winners QF) 🏆",
          matches: [
            getMatchData("wb-q1", "Winners Quarto 1"),
            getMatchData("wb-q2", "Winners Quarto 2"),
            getMatchData("wb-q3", "Winners Quarto 3"),
            getMatchData("wb-q4", "Winners Quarto 4"),
          ],
        });
      }
      list.push({
        title: "Semifinali Vincenti (Winners SF) 🏆",
        matches: [getMatchData("wb-s1", "Winners Semifinale 1"), getMatchData("wb-s2", "Winners Semifinale 2")],
      });
      list.push({
        title: "Finale Vincenti (Winners Final) 🏆",
        matches: [getMatchData("wb-f", "Finale Vincenti")],
      });
      list.push({
        title: "Semifinali Perdenti (Losers SF) 🔄",
        matches: [getMatchData("lb-s1", "Losers Semifinale 1"), getMatchData("lb-s2", "Losers Semifinale 2")],
      });
      list.push({
        title: "Finale Perdenti (Losers Final) 🔄",
        matches: [getMatchData("lb-f", "Finale Perdenti")],
      });
      list.push({ title: "Grand Final 👑", matches: [getMatchData("grand-final", "Finalissima")] });
    }

    return list.filter((group) => group.matches.some((m) => m.left !== "TBD" || m.right !== "TBD"));
  };

  // Rendering del singolo blocco partita SofaScore
  const renderMatchRow = (teamL, teamR, meta, idx, matchKeyPrefix, gironeId = null) => {
    const scoreL = parseInt(meta?.s1L || meta?.scoreL || 0);
    const scoreR = parseInt(meta?.s1R || meta?.scoreR || 0);
    const hasScore =
      (meta?.s1L !== undefined && meta?.s1L !== "") ||
      (meta?.scoreL !== undefined && meta?.scoreL !== "");

    // Altri set per partite a 3 set
    const s2L = parseInt(meta?.s2L || 0);
    const s2R = parseInt(meta?.s2R || 0);
    const s3L = parseInt(meta?.s3L || 0);
    const s3R = parseInt(meta?.s3R || 0);
    const isThreeSets = gironeId ? config?.gironeSets?.[gironeId] === "3 set" : false;

    let isWinnerL = false;
    let isWinnerR = false;
    if (hasScore && (scoreL > 0 || scoreR > 0)) {
      if (isThreeSets) {
        let winL = 0,
          winR = 0;
        if (scoreL > scoreR) winL++;
        else if (scoreR > scoreL) winR++;
        if (s2L > s2R) winL++;
        else if (s2R > s2L) winR++;
        if (s3L > s3R) winL++;
        else if (s3R > s3L) winR++;
        isWinnerL = winL > winR;
        isWinnerR = winR > winL;
      } else {
        isWinnerL = scoreL > scoreR;
        isWinnerR = scoreR > scoreL;
      }
    }

    return (
      <div
        key={idx}
        id={`${matchKeyPrefix}-${idx}`}
        className="bg-white rounded-[1.6rem] p-4 border border-gray-100 shadow-sm flex flex-col gap-2 transition-all"
      >
        <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
          <span>Gara {idx + 1}</span>
          <div className="flex gap-1.5">
            {meta?.time && (
              <span className="bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-lg">{meta.time}</span>
            )}
            {meta?.court && (
              <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-lg font-black">
                C.{meta.court}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-1">
          {/* Team Left */}
          <div className="flex-1 text-right min-w-0 pr-1">
            <span
              className={`text-xs sm:text-sm font-bold uppercase truncate block ${
                isWinnerL ? "text-[#0a1628] font-black" : "text-gray-400 font-semibold"
              }`}
            >
              {teamL}
            </span>
          </div>

          {/* Score Badge */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            {hasScore && (scoreL > 0 || scoreR > 0) ? (
              <div className="bg-[#0a1628] text-white font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm">
                <span>{scoreL}</span>
                <span className="opacity-30">-</span>
                <span>{scoreR}</span>
              </div>
            ) : (
              <span className="text-[9px] font-black bg-gray-50 text-gray-300 px-3 py-1.5 rounded-xl uppercase tracking-wider border border-gray-100">
                VS
              </span>
            )}
            {isThreeSets && hasScore && (scoreL > 0 || scoreR > 0) && (
              <span className="text-[8px] font-bold text-gray-400 mt-1">
                ({s2L}-{s2R}, {s3L}-{s3R})
              </span>
            )}
          </div>

          {/* Team Right */}
          <div className="flex-1 text-left min-w-0 pl-1">
            <span
              className={`text-xs sm:text-sm font-bold uppercase truncate block ${
                isWinnerR ? "text-[#0a1628] font-black" : "text-gray-400 font-semibold"
              }`}
            >
              {teamR}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#f0f4ff] pb-24">
      {/* Header Mobile Premium */}
      <header
        style={{ backgroundColor: "#0a1628" }}
        className="text-white py-4 px-5 flex justify-between items-center shadow-md border-b-4 border-[#FFD700] sticky top-0 z-50"
      >
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="BVI Logo" width={32} height={32} />
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-none">BVI Live</h1>
            <p className="text-[7px] text-[#FFD700] font-black uppercase tracking-[0.2em] mt-0.5">
              Smartphone Portal
            </p>
          </div>
        </div>
        <a
          href="/"
          className="text-[9px] font-black bg-[#FFD700] text-[#0a1628] px-4 py-1.5 rounded-xl transition-transform active:scale-95 shadow-sm uppercase tracking-wider"
        >
          Home
        </a>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Torneo Info Title Card */}
        <div className="relative bg-white rounded-3xl p-5 border border-gray-100 shadow-sm overflow-hidden text-center">
          {isConcluso ? (
            <span className="inline-block px-3 py-1 rounded-full text-[8px] font-black bg-gray-100 text-gray-600 uppercase tracking-widest mb-2">
              Concluso 🏁
            </span>
          ) : (
            <span className="inline-block px-3 py-1 rounded-full text-[8px] font-black bg-green-100 text-green-700 uppercase tracking-widest mb-2 animate-pulse">
              Torneo Attivo 🟢
            </span>
          )}
          <h2 className="text-xl font-black text-[#0a1628] uppercase tracking-tighter leading-tight">
            {selectedTorneo || "Nessun Torneo"}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1.5">
            {selectedTorneoObj?.categoria} · {selectedTorneoObj?.data}
          </p>

          {/* Selector per altri tornei */}
          {tornei.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-100 relative">
              <select
                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 font-black text-[#0a1628] text-xs focus:ring-2 focus:ring-[#0a1628] appearance-none cursor-pointer"
                value={selectedTorneo}
                onChange={(e) => setSelectedTorneo(e.target.value)}
              >
                {tornei.map((t) => (
                  <option key={t.id} value={t.nome}>
                    Cambia: {t.nome}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-0.5 pointer-events-none text-[#0a1628]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={4}
                  stroke="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Controllo Pubblicazione */}
        {isPublished ? (
          <>
            {/* 1. SEZIONE GIRONI (COMPOSIZIONE SQUADRE) */}
            {activeTab === "gironi" && (
              <div className="space-y-5">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Composizione Gironi
                </h3>
                <div className="space-y-4">
                  {getGroupsList().map((group) => {
                    const teams = getGroupTeams(group.id, group.type);
                    return (
                      <div
                        key={group.id}
                        className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"
                      >
                        <h4 className="text-sm font-black text-[#0a1628] uppercase tracking-tight border-b border-gray-50 pb-3 mb-3 flex items-center justify-between">
                          <span>{group.label}</span>
                          <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                            {teams.length} Squadre
                          </span>
                        </h4>
                        <ul className="space-y-2">
                          {teams.map((team, idx) => (
                            <li key={team} className="flex items-center gap-3 py-1">
                              <span className="w-5 h-5 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center text-[10px] font-black">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                                {team}
                              </span>
                            </li>
                          ))}
                          {teams.length === 0 && (
                            <li className="text-center py-4 text-gray-400 italic text-xs">
                              Nessuna squadra in questo girone.
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                  {getGroupsList().length === 0 && (
                    <div className="bg-white rounded-3xl p-6 text-center border border-gray-100">
                      <p className="text-gray-400 italic text-xs">Nessun girone configurato.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. SEZIONE PARTITE (CALENDARIO VERTICALE) */}
            {activeTab === "partite" && (
              <div className="space-y-6">
                {getGroupsList().map((group) => {
                  const isIntermediate = group.type === "intermedio";
                  const groupMatches = isIntermediate
                    ? getIntermediateGroupMatches(group.id)
                    : getSchedule(
                        config?.teamCounts?.[group.id] || 0,
                        group.id,
                        config?.gironeAssignments?.[group.id] || {}
                      ).map((m, idx) => ({
                        left: m.left,
                        right: m.right,
                        meta: config?.matchMetadata?.[`${group.id}-${idx}`] || {},
                      }));

                  return (
                    <div key={group.id} className="space-y-3">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 border-l-4 border-[#FFD700] pl-2">
                        Partite {group.label}
                      </h3>
                      <div className="space-y-3">
                        {groupMatches.map((m, idx) =>
                          renderMatchRow(
                            m.left,
                            m.right,
                            m.meta,
                            idx,
                            `match-${group.id}`,
                            group.id
                          )
                        )}
                        {groupMatches.length === 0 && (
                          <div className="bg-white rounded-3xl p-6 text-center border border-gray-100">
                            <p className="text-gray-400 italic text-xs">Nessun match programmato.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. SEZIONE CLASSIFICHE (TABELLE VERTICALI) */}
            {activeTab === "classifica" && (
              <div className="space-y-6">
                {getGroupsList().map((group) => {
                  const groupStats =
                    group.type === "intermedio"
                      ? getIntermediateGroupStats(group.id)
                      : calculateRanking(group.id);

                  return (
                    <div key={group.id} className="space-y-3">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 border-l-4 border-yellow-400 pl-2">
                        Classifica {group.label}
                      </h3>
                      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50/50 border-b border-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                              <th className="pl-4 py-3 w-10 text-center">Pos</th>
                              <th className="px-2 py-3">Squadra</th>
                              <th className="px-2 py-3 text-center w-8">G</th>
                              <th className="px-2 py-3 text-center w-12">V/P</th>
                              <th className="pr-4 py-3 text-right w-12">Pt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs font-bold">
                            {groupStats.map((team, idx) => {
                              const isQualified = idx < 2;
                              return (
                                <tr
                                  key={team.nome}
                                  className={`hover:bg-blue-50/10 transition-colors ${
                                    isQualified ? "bg-yellow-50/10" : ""
                                  }`}
                                >
                                  <td className="pl-4 py-3.5 text-center">
                                    <span
                                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black mx-auto ${
                                        isQualified
                                          ? "bg-yellow-400 text-white shadow-sm"
                                          : "bg-gray-100 text-gray-400"
                                      }`}
                                    >
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3.5 text-[#0a1628] font-black uppercase tracking-tight truncate max-w-[140px]">
                                    {team.nome}
                                  </td>
                                  <td className="px-2 py-3.5 text-center text-gray-400 font-semibold">
                                    {team.giocate}
                                  </td>
                                  <td className="px-2 py-3.5 text-center whitespace-nowrap text-[10px]">
                                    <span className="text-green-600 font-bold">{team.vinte}</span>
                                    <span className="text-gray-200 mx-0.5">/</span>
                                    <span className="text-red-500 font-bold">{team.perse}</span>
                                  </td>
                                  <td className="pr-4 py-3.5 text-right font-black text-sm text-[#0a1628]">
                                    {team.score}
                                  </td>
                                </tr>
                              );
                            })}
                            {groupStats.length === 0 && (
                              <tr>
                                <td colSpan="5" className="py-8 text-center text-gray-400 italic">
                                  In attesa dei risultati di questo girone.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. SEZIONE FASI FINALI */}
            {activeTab === "finali" && (
              <div className="space-y-5">
                {getPlayoffMatchesList().length > 0 ? (
                  getPlayoffMatchesList().map((group, gIdx) => (
                    <div key={gIdx} className="space-y-3">
                      <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 border-b pb-2">
                        {group.title}
                      </h3>
                      <div className="space-y-3">
                        {group.matches.map((m, idx) =>
                          renderMatchRow(m.left, m.right, m.meta, idx, `playoff-${group.title}`)
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
                    <span className="text-5xl mb-4 block">⚔️</span>
                    <h3 className="text-lg font-black text-[#0a1628] uppercase tracking-tight mb-2">
                      Fasi Finali in Preparazione
                    </h3>
                    <p className="text-gray-400 font-medium text-xs max-w-xs mx-auto">
                      Il tabellone ad eliminazione diretta non è ancora stato generato dallo staff per
                      questo torneo.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Messaggio Gironi non Pubblicati */
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100 px-6">
            <span className="text-5xl mb-4 block">⏳</span>
            <h3 className="text-lg font-black text-[#0a1628] uppercase tracking-tight mb-2">
              Calendario in Elaborazione
            </h3>
            <p className="text-gray-400 font-medium text-xs max-w-xs mx-auto">
              Lo staff sta configurando i gironi e le partite per il torneo. I dati saranno visibili in
              tempo reale su questa pagina non appena verranno pubblicati!
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM NAV BAR FISSA - 4 Pulsanti */}
      {isPublished && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]" />
          <div className="relative flex justify-around px-1 pb-safe">
            {/* Pulsante Gironi (Composizione) */}
            <button
              onClick={() => setActiveTab("gironi")}
              className="relative flex flex-col items-center gap-1.5 py-3.5 px-3 flex-1 active:scale-95 transition-transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={activeTab === "gironi" ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={activeTab === "gironi" ? 0 : 2}
                className="w-5 h-5 text-[#0a1628]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${
                  activeTab === "gironi" ? "text-[#0a1628]" : "text-gray-300"
                }`}
              >
                Gironi
              </span>
              {activeTab === "gironi" && (
                <span className="absolute top-2.5 w-1 h-1 rounded-full bg-[#FFD700]" />
              )}
            </button>

            {/* Pulsante Partite */}
            <button
              onClick={() => setActiveTab("partite")}
              className="relative flex flex-col items-center gap-1.5 py-3.5 px-3 flex-1 active:scale-95 transition-transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={activeTab === "partite" ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={activeTab === "partite" ? 0 : 2}
                className="w-5 h-5 text-[#0a1628]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${
                  activeTab === "partite" ? "text-[#0a1628]" : "text-gray-300"
                }`}
              >
                Partite
              </span>
              {activeTab === "partite" && (
                <span className="absolute top-2.5 w-1 h-1 rounded-full bg-[#FFD700]" />
              )}
            </button>

            {/* Pulsante Classifiche */}
            <button
              onClick={() => setActiveTab("classifica")}
              className="relative flex flex-col items-center gap-1.5 py-3.5 px-3 flex-1 active:scale-95 transition-transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={activeTab === "classifica" ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={activeTab === "classifica" ? 0 : 2}
                className="w-5 h-5 text-[#0a1628]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-6.75a1.125 1.125 0 0 0-1.125 1.125v3.375m9 0h-9M9 10.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z"
                />
              </svg>
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${
                  activeTab === "classifica" ? "text-[#0a1628]" : "text-gray-300"
                }`}
              >
                Classifiche
              </span>
              {activeTab === "classifica" && (
                <span className="absolute top-2.5 w-1 h-1 rounded-full bg-[#FFD700]" />
              )}
            </button>

            {/* Pulsante Fasi Finali */}
            <button
              onClick={() => setActiveTab("finali")}
              className="relative flex flex-col items-center gap-1.5 py-3.5 px-3 flex-1 active:scale-95 transition-transform"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={activeTab === "finali" ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={activeTab === "finali" ? 0 : 2}
                className="w-5 h-5 text-[#0a1628]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
                />
              </svg>
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${
                  activeTab === "finali" ? "text-[#0a1628]" : "text-gray-300"
                }`}
              >
                Fasi Finali
              </span>
              {activeTab === "finali" && (
                <span className="absolute top-2.5 w-1 h-1 rounded-full bg-[#FFD700]" />
              )}
            </button>
          </div>
          {/* iOS spacer */}
          <div className="h-safe-area-inset-bottom bg-transparent" />
        </nav>
      )}
    </main>
  );
}
