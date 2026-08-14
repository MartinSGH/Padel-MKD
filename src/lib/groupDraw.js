// Group-system draw: teams split into 4 groups, round-robin inside each group,
// then a knockout (semifinals → final, plus a 3rd-place match).
//
// Advancement (only the GROUP WINNER advances):
//   Semifinal 0: winner Group 1 vs winner Group 4
//   Semifinal 1: winner Group 2 vs winner Group 3
//   Final: the two semifinal winners · 3rd place: the two semifinal losers
//
// Positional live_scores keys (a tournament is one system, no collisions):
//   group g match m → round g,        match_index m
//   semifinals      → round SEMI_ROUND, match_index 0 / 1
//   final           → round FINAL_ROUND, match_index 0
//   3rd place       → round THIRD_PLACE_ROUND, match_index 0

import { SEMI_ROUND } from "./points.js";

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
    semifinals: [
      { a: null, b: null },
      { a: null, b: null },
    ],
    final: { a: null, b: null },
    third: { a: null, b: null },
  };
};

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

// Recompute the knockout stage from group standings + knockout results.
export const recomputeGroupDraw = (draw, resultMap) => {
  if (draw?.system !== "group" || !Array.isArray(draw.groups)) return draw;

  // Group winner (only once the whole group is played).
  const winners = draw.groups.map((g, gi) =>
    groupComplete(g, gi, resultMap)
      ? groupStandings(g, gi, resultMap)[0]?.team ?? null
      : null
  );

  // SF0 = W(G1) vs W(G4) ; SF1 = W(G2) vs W(G3)
  const semifinals = [
    { a: winners[0], b: winners[3] },
    { a: winners[1], b: winners[2] },
  ];

  const sfSide = (i, which) => {
    const r = resultMap[`${SEMI_ROUND}:${i}`];
    if (!r || (r.winner !== "a" && r.winner !== "b")) return null;
    const winIsA = r.winner === "a";
    const wantWinner = which === "winner";
    const takeA = wantWinner ? winIsA : !winIsA;
    const label = takeA ? semifinals[i].a : semifinals[i].b;
    return isEmpty(label) ? null : label;
  };

  const final = { a: sfSide(0, "winner"), b: sfSide(1, "winner") };
  const third = { a: sfSide(0, "loser"), b: sfSide(1, "loser") };

  return { ...draw, semifinals, final, third };
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
