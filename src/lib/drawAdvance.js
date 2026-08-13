// Recompute a bracket's later rounds from the set of finished matches, so the
// winner of each match auto-advances. Deriving the whole bracket from results
// (rather than mutating one slot) means editing an early result can't leave a
// stale later round behind.
//
// Positional rule (same as buildBracket): the winner of round r, match i goes to
// round r+1, match ⌊i/2⌋, into slot A when i is even, slot B when i is odd.
//
// `draw`        the stored/serialized draw: { rounds: [ [ {a,b}, … ], … ] } with
//               string labels (or null / "/" for empty slots).
// `finishedMap` { "round:index": "winner label" } for every FINISHED match.

const isEmptySlot = (label) => label == null || label === "" || label === "/";

export const recomputeDraw = (draw, finishedMap = {}) => {
  if (!draw || !Array.isArray(draw.rounds)) return draw;

  // Clone rounds; keep round 0 (the seeded pairings) untouched, clear the rest.
  const rounds = draw.rounds.map((round, ri) =>
    round.map((m) => ({
      a: ri === 0 ? (m ? m.a : null) : null,
      b: ri === 0 ? (m ? m.b : null) : null,
    }))
  );

  const winnerLabel = (ri, i, match) => {
    // Round-0 bye: a real team paired with an empty slot advances automatically.
    if (ri === 0) {
      const aEmpty = isEmptySlot(match.a);
      const bEmpty = isEmptySlot(match.b);
      if (aEmpty && !bEmpty) return match.b;
      if (bEmpty && !aEmpty) return match.a;
    }
    // Otherwise only a finished match produces a winner.
    const key = `${ri}:${i}`;
    if (finishedMap[key] === "a") return match.a;
    if (finishedMap[key] === "b") return match.b;
    return null;
  };

  for (let ri = 0; ri < rounds.length - 1; ri += 1) {
    rounds[ri].forEach((match, i) => {
      const label = winnerLabel(ri, i, match);
      if (label == null) return;
      const parent = rounds[ri + 1][Math.floor(i / 2)];
      if (!parent) return;
      if (i % 2 === 0) parent.a = label;
      else parent.b = label;
    });
  }

  return { ...draw, rounds };
};

// Convenience: build the finishedMap the recompute expects from live_scores rows.
export const finishedMapFromRows = (rows = []) => {
  const map = {};
  rows.forEach((row) => {
    if (row.status === "finished" && (row.winner === "a" || row.winner === "b")) {
      map[`${row.round}:${row.match_index}`] = row.winner;
    }
  });
  return map;
};
