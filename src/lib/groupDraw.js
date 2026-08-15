// Group-system draw: teams split into 4 groups, round-robin inside each group,
// then a knockout stage.
//
// The knockout has two supported shapes, distinguished by whether the draw
// carries a `quarterfinals` array:
//
//   NEW (top 2 advance): the top TWO of every group (8 teams) go to the
//   quarterfinals. The quarterfinal pairings are drawn MANUALLY by the admin, so
//   recompute never overwrites them — it only derives the later rounds:
//     QF (4 matches, admin-drawn) → SF (2) → Final (+ 3rd place)
//     Semifinal 0: winner QF0 vs winner QF1
//     Semifinal 1: winner QF2 vs winner QF3
//
//   OLD (winner advances): only the group WINNER advances, straight to the
//   semifinals. Kept so already-published draws (no `quarterfinals` field) keep
//   working unchanged until they're re-published in the new format:
//     Semifinal 0: winner Group 1 vs winner Group 4
//     Semifinal 1: winner Group 2 vs winner Group 3
//
// Final: the two semifinal winners · 3rd place: the two semifinal losers.
//
// Positional live_scores keys (a tournament is one system, no collisions):
//   group g match m → round g,            match_index m
//   quarterfinals   → round QUARTER_ROUND, match_index 0..3
//   semifinals      → round SEMI_ROUND,    match_index 0 / 1
//   final           → round FINAL_ROUND,   match_index 0
//   3rd place       → round THIRD_PLACE_ROUND, match_index 0

import { SEMI_ROUND, QUARTER_ROUND } from "./points.js";

export const QUARTER_COUNT = 4; // 4 QF matches = 8 qualifiers (top 2 × 4 groups)

export const GROUP_COUNT = 4;
export const GROUP_NAMES = ["Group 1", "Group 2", "Group 3", "Group 4"];

const isEmpty = (label) => label == null || label === "" || label === "/";

// Round-robin index pairs for n teams: [0,1],[0,2],…,[n-2,n-1].
const roundRobinPairs = (n) => {
  const pairs = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) pairs.push([i, j]);
  }
  return pairs;
};

// Distribute labels across `count` groups as evenly as possible (random deal).
export const autoAssignGroups = (labels, count = GROUP_COUNT) => {
  const shuffled = [...labels];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const groups = Array.from({ length: count }, () => []);
  shuffled.forEach((l, i) => groups[i % count].push(l));
  return groups;
};

// Build the group-draw object from an assignment of pair labels into groups.
export const buildGroupDraw = (groupsOfLabels) => {
  const groups = groupsOfLabels.map((teams, gi) => ({
    name: GROUP_NAMES[gi] || `Group ${gi + 1}`,
    teams: [...teams],
    matches: roundRobinPairs(teams.length).map(([i, j]) => ({
      a: teams[i],
      b: teams[j],
    })),
  }));
  return {
    system: "group",
    groups,
    // Top-2-advance format: 4 quarterfinal slots the admin fills manually. Its
    // presence is what marks a draw as the new format.
    quarterfinals: Array.from({ length: QUARTER_COUNT }, () => ({
      a: null,
      b: null,
    })),
    semifinals: [
      { a: null, b: null },
      { a: null, b: null },
    ],
    final: { a: null, b: null },
    third: { a: null, b: null },
  };
};

// The 8 qualifiers for the quarterfinals: the top TWO teams of each completed
// group, in standings order. Returns one entry per group:
//   { group, name, complete, teams: [firstPlaceLabel, secondPlaceLabel] }
// `teams` slots are null until that group is fully played.
export const groupQualifiers = (draw, resultMap) => {
  if (draw?.system !== "group" || !Array.isArray(draw.groups)) return [];
  return draw.groups.map((g, gi) => {
    const complete = groupComplete(g, gi, resultMap);
    const ranked = complete ? groupStandings(g, gi, resultMap) : [];
    return {
      group: gi,
      name: g.name || GROUP_NAMES[gi] || `Group ${gi + 1}`,
      complete,
      teams: [ranked[0]?.team ?? null, ranked[1]?.team ?? null],
    };
  });
};

// Are all groups fully played (so the quarterfinal draw can be made)?
export const allGroupsComplete = (draw, resultMap) =>
  draw?.system === "group" &&
  Array.isArray(draw.groups) &&
  draw.groups.every((g, gi) => groupComplete(g, gi, resultMap));

// Standings for one group, from a result map ("round:index" → {winner, state}).
// Ranked by wins, then set difference, then game difference.
export const groupStandings = (group, groupRound, resultMap) => {
  const stats = new Map(
    group.teams.map((t) => [
      t,
      {
        team: t,
        played: 0,
        wins: 0,
        losses: 0,
        setsW: 0,
        setsL: 0,
        gamesW: 0,
        gamesL: 0,
      },
    ])
  );

  group.matches.forEach((m, mi) => {
    const res = resultMap[`${groupRound}:${mi}`];
    if (!res || (res.winner !== "a" && res.winner !== "b")) return;
    const a = stats.get(m.a);
    const b = stats.get(m.b);
    if (!a || !b) return;
    a.played += 1;
    b.played += 1;

    let aSets = 0;
    let bSets = 0;
    let aGames = 0;
    let bGames = 0;
    (res.state?.setsGames || []).forEach(([ga, gb]) => {
      aGames += ga;
      bGames += gb;
      if (ga > gb) aSets += 1;
      else if (gb > ga) bSets += 1;
    });
    a.setsW += aSets;
    a.setsL += bSets;
    a.gamesW += aGames;
    a.gamesL += bGames;
    b.setsW += bSets;
    b.setsL += aSets;
    b.gamesW += bGames;
    b.gamesL += aGames;

    if (res.winner === "a") {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  });

  return [...stats.values()].sort(
    (x, y) =>
      y.wins - x.wins ||
      y.setsW - y.setsL - (x.setsW - x.setsL) ||
      y.gamesW - y.gamesL - (x.gamesW - x.gamesL)
  );
};

// Is every match in a group finished?
export const groupComplete = (group, groupRound, resultMap) =>
  group.matches.every((_, mi) => {
    const r = resultMap[`${groupRound}:${mi}`];
    return r && (r.winner === "a" || r.winner === "b");
  });

// The winner (or, on a bye, the lone team) of a manually-drawn knockout match.
const koWinner = (match, resultMap, round, i, which) => {
  const m = match || {};
  const aEmpty = isEmpty(m.a);
  const bEmpty = isEmpty(m.b);
  // Bye: a lone team advances automatically (as the winner side).
  if (which === "winner") {
    if (aEmpty && !bEmpty) return m.b;
    if (bEmpty && !aEmpty) return m.a;
  }
  const r = resultMap[`${round}:${i}`];
  if (!r || (r.winner !== "a" && r.winner !== "b")) return null;
  const takeA = which === "winner" ? r.winner === "a" : r.winner === "b";
  const label = takeA ? m.a : m.b;
  return isEmpty(label) ? null : label;
};

// Recompute the knockout stage from the quarterfinal draw + knockout results.
// The quarterfinal pairings are drawn MANUALLY by the admin and are never
// touched here — only the rounds below the QF (semifinals, final, 3rd place)
// derive from results. Draws published before the QF stage existed get 4 empty
// QF slots so they upgrade to the new format on the next recompute.
export const recomputeGroupDraw = (draw, resultMap) => {
  if (draw?.system !== "group" || !Array.isArray(draw.groups)) return draw;

  const quarterfinals = Array.isArray(draw.quarterfinals)
    ? draw.quarterfinals
    : Array.from({ length: QUARTER_COUNT }, () => ({ a: null, b: null }));

  // SF0 = winner QF0 vs winner QF1 ; SF1 = winner QF2 vs winner QF3
  const qf = (i, which) =>
    koWinner(quarterfinals[i], resultMap, QUARTER_ROUND, i, which);
  const semifinals = [
    { a: qf(0, "winner"), b: qf(1, "winner") },
    { a: qf(2, "winner"), b: qf(3, "winner") },
  ];
  const sf = (i, which) =>
    koWinner(semifinals[i], resultMap, SEMI_ROUND, i, which);
  const final = { a: sf(0, "winner"), b: sf(1, "winner") };
  const third = { a: sf(0, "loser"), b: sf(1, "loser") };

  return { ...draw, quarterfinals, semifinals, final, third };
};

// Build a result map ("round:index" → {winner, state}) from live_scores rows.
export const resultMapFromRows = (rows = []) => {
  const map = {};
  rows.forEach((r) => {
    if (r.status === "finished" && (r.winner === "a" || r.winner === "b")) {
      map[`${r.round}:${r.match_index}`] = { winner: r.winner, state: r.state };
    }
  });
  return map;
};
