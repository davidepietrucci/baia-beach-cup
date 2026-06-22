function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export const getSchedule = (numTeams, gironeId, assignments = {}, gironeTypes = {}, gironeSets = {}, matchMetadata = {}) => {
  const getName = (idx) =>
    assignments[idx] && assignments[idx] !== "—" && assignments[idx] !== "Slot Libero"
      ? assignments[idx]
      : `Slot ${idx + 1}`;
  const type = gironeTypes?.[gironeId] || "Pool";
  if (!numTeams || numTeams < 2) return [];

  if (type === "Girone all'italiana") {
    const rrMatches = [];
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        rrMatches.push({ left: getName(i), right: getName(j) });
      }
    }

    if (numTeams <= 3) {
      return rrMatches;
    }

    // Hash parameters to get a deterministic seed
    let baseSeed = 12345;
    const seedStr = `${numTeams}-${gironeId}-${Object.values(assignments).join(",")}`;
    for (let i = 0; i < seedStr.length; i++) {
      baseSeed = (baseSeed * 31 + seedStr.charCodeAt(i)) | 0;
    }

    let bestSchedule = null;
    let bestBackToBacks = Infinity;

    // Run the deterministic search with different seeds (based on baseSeed)
    for (let attempt = 0; attempt < 50; attempt++) {
      const remaining = [...rrMatches];
      const scheduled = [];
      let currentBackToBacks = 0;
      let failed = false;
      const nextRand = mulberry32(baseSeed + attempt);

      while (remaining.length > 0) {
        // Calculate costs for all remaining matches
        const candidates = remaining.map((m, idx) => {
          let cost = 0;
          const A = m.left;
          const B = m.right;

          // Check last match
          if (scheduled.length >= 1) {
            const last = scheduled[scheduled.length - 1];
            const lastTeams = [last.left, last.right];
            if (lastTeams.includes(A)) cost += 1000;
            if (lastTeams.includes(B)) cost += 1000;
          }

          // Check second to last match
          if (scheduled.length >= 2) {
            const last = scheduled[scheduled.length - 1];
            const prev = scheduled[scheduled.length - 2];
            const lastTeams = [last.left, last.right];
            const prevTeams = [prev.left, prev.right];

            // 3-in-a-row checks: if team played in both the last and 2nd last match,
            // playing them again makes it 3 in a row.
            if (lastTeams.includes(A) && prevTeams.includes(A)) {
              cost += 1000000;
            }
            if (lastTeams.includes(B) && prevTeams.includes(B)) {
              cost += 1000000;
            }

            if (prevTeams.includes(A)) cost += 100;
            if (prevTeams.includes(B)) cost += 100;
          }

          // Small random noise to break ties differently per attempt
          cost += nextRand() * 50;

          return { match: m, cost, index: idx };
        });

        candidates.sort((a, b) => a.cost - b.cost);

        const bestCandidate = candidates[0];
        if (bestCandidate.cost >= 1000000) {
          failed = true;
          break;
        }

        if (scheduled.length >= 1) {
          const last = scheduled[scheduled.length - 1];
          const lastTeams = [last.left, last.right];
          if (lastTeams.includes(bestCandidate.match.left) || lastTeams.includes(bestCandidate.match.right)) {
            currentBackToBacks++;
          }
        }

        scheduled.push(bestCandidate.match);
        remaining.splice(bestCandidate.index, 1);
      }

      if (!failed) {
        if (currentBackToBacks < bestBackToBacks) {
          bestBackToBacks = currentBackToBacks;
          bestSchedule = scheduled;
        }
        if (currentBackToBacks === 0) break;
      }
    }

    return bestSchedule || rrMatches;
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
      const meta = matchMetadata?.[`${gironeId}-${idx}`] || {};
      const s1L = parseInt(meta.s1L || 0);
      const s1R = parseInt(meta.s1R || 0);
      if (s1L === 0 && s1R === 0)
        return { winner: `Vincente G${idx + 1}`, loser: `Perdente G${idx + 1}` };

      if (gironeSets?.[gironeId] === "3 set") {
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

export const calculateSingleGroupStats = (groupId, config) => {
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
        girone: groupId,
        giocate: 0,
        vinte: 0,
        perse: 0,
        puntiFatti: 0,
        puntiSubiti: 0,
        score: 0, // wins
      };
    }
  }

  const schedule = getSchedule(teamCount, groupId, assignments, config.gironeTypes, config.gironeSets, config.matchMetadata);
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

  return Object.values(stats);
};

export const calculateUnifiedRanking = (config) => {
  if (!config || !config.numGironi) return [];
  
  let allTeams = [];
  for (let i = 0; i < config.numGironi; i++) {
    const gid = String.fromCharCode(65 + i);
    const groupStats = calculateSingleGroupStats(gid, config);
    allTeams = [...allTeams, ...groupStats];
  }

  // Ordina per:
  // 1. Vittorie (score) desc
  // 2. Quoziente punti (punti fatti / punti subiti) desc
  // 3. Punti fatti desc
  return allTeams.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const quotientA = a.puntiSubiti === 0 ? a.puntiFatti : a.puntiFatti / a.puntiSubiti;
    const quotientB = b.puntiSubiti === 0 ? b.puntiFatti : b.puntiFatti / b.puntiSubiti;
    if (quotientB !== quotientA) return quotientB - quotientA;
    return b.puntiFatti - a.puntiFatti;
  });
};

export const calculateProgressionRanking = (config) => {
  if (!config || !config.numGironi) return [];
  const isUnified = config.rankingType === "avulsa";
  
  const sortFunc = (a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const quotientA = a.puntiSubiti === 0 ? a.puntiFatti : a.puntiFatti / a.puntiSubiti;
    const quotientB = b.puntiSubiti === 0 ? b.puntiFatti : b.puntiFatti / b.puntiSubiti;
    if (quotientB !== quotientA) return quotientB - quotientA;
    return b.puntiFatti - a.puntiFatti;
  };

  if (isUnified) {
    return calculateUnifiedRanking(config);
  } else {
    const positions = {}; // maps position (0-indexed) to array of teams
    for (let i = 0; i < config.numGironi; i++) {
      const gid = String.fromCharCode(65 + i);
      const stats = calculateSingleGroupStats(gid, config);
      const sortedStats = stats.sort(sortFunc);
      sortedStats.forEach((team, idx) => {
        if (!positions[idx]) positions[idx] = [];
        positions[idx].push(team);
      });
    }
    
    let finalRanking = [];
    const maxPositions = Object.keys(positions).length;
    for (let idx = 0; idx < maxPositions; idx++) {
      if (positions[idx]) {
        const sortedPos = positions[idx].sort(sortFunc);
        finalRanking = [...finalRanking, ...sortedPos];
      }
    }
    return finalRanking;
  }
};

