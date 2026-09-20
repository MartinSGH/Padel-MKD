// Ranking points by FINAL PLACEMENT (a flat value for how far a pair got — not
// cumulative per win). Both players of a pair get the same value:
//   Champion 100 · Runner-up 70 · 3rd 50 · 4th 40 · Quarterfinalist 30
//   Everyone else who took part 5
// Placement is read from the finished draw, so it works for the group system
// (groups → QF → SF → final + 3rd place) and for a plain elimination bracket.

// Positional round keys used across both systems (a tournament is one system,
// so these can't collide with the elimination round indices 0..n).
export const THIRD_PLACE_ROUND = -1; // 3rd-place match (both systems)
export const QUARTER_ROUND = 102; // group system quarterfinals (top 2 per group)
export const SEMI_ROUND = 100; // group system semifinals
export const FINAL_ROUND = 101; // group system final

const isEmpty = (label) => label == null || label === "" || label === "/";

// Points awarded for each final placement.
export const PLACEMENT_POINTS = {
  champion: 100,
  runnerUp: 70,
  third: 50,
  fourth: 40,
  quarterfinal: 30,
  participant: 5,
};

// Winner / loser labels of a knockout match, from its draw slot + result row
// ({ winner: "a" | "b" }). Empty slots (byes) resolve to null.
const koResult = (slot, res) => {
  const m = slot || {};
  if (!res || (res.winner !== "a" && res.winner !== "b")) {
    return { winner: null, loser: null };
  }
  const winner = res.winner === "a" ? m.a : m.b;
  const loser = res.winner === "a" ? m.b : m.a;
  return {
    winner: isEmpty(winner) ? null : winner,
    loser: isEmpty(loser) ? null : loser,
  };
};

// Map every team label → its placement points. `bump` only ever raises a label,
// so a finalist keeps 100/70 over the 30 they also earned as a quarterfinalist.
const placementByLabel = (draw, resultMap) => {
  const pts = new Map();
  const bump = (label, p) => {
    if (isEmpty(label) || p == null) return;
    if ((pts.get(label) ?? 0) < p) pts.set(label, p);
  };

  if (draw?.system === "group") {
    // Everyone in a group took part (5); both teams of each quarterfinal got 30.
    (draw.groups || []).forEach((g) =>
      (g.teams || []).forEach((t) => bump(t, PLACEMENT_POINTS.participant))
    );
    (draw.quarterfinals || []).forEach((m) => {
      bump(m?.a, PLACEMENT_POINTS.quarterfinal);
      bump(m?.b, PLACEMENT_POINTS.quarterfinal);
    });
    const third = koResult(draw.third, resultMap[`${THIRD_PLACE_ROUND}:0`]);
    bump(third.winner, PLACEMENT_POINTS.third);
    bump(third.loser, PLACEMENT_POINTS.fourth);
    const final = koResult(draw.final, resultMap[`${FINAL_ROUND}:0`]);
    bump(final.winner, PLACEMENT_POINTS.champion);
    bump(final.loser, PLACEMENT_POINTS.runnerUp);
    return pts;
  }

  // Elimination bracket: rounds[0] holds every entrant; the round with 4 matches
  // is the quarterfinal; the last round (1 match) is the final.
  const rounds = Array.isArray(draw?.rounds) ? draw.rounds : [];
  (rounds[0] || []).forEach((m) => {
    bump(m?.a, PLACEMENT_POINTS.participant);
    bump(m?.b, PLACEMENT_POINTS.participant);
  });
  rounds.forEach((r) => {
    if (r.length === 4)
      r.forEach((m) => {
        bump(m?.a, PLACEMENT_POINTS.quarterfinal);
        bump(m?.b, PLACEMENT_POINTS.quarterfinal);
      });
  });
  const third = koResult(draw?.thirdPlace, resultMap[`${THIRD_PLACE_ROUND}:0`]);
  bump(third.winner, PLACEMENT_POINTS.third);
  bump(third.loser, PLACEMENT_POINTS.fourth);
  const li = rounds.length - 1;
  if (li >= 0 && rounds[li]?.length === 1) {
    const final = koResult(rounds[li][0], resultMap[`${li}:0`]);
    bump(final.winner, PLACEMENT_POINTS.champion);
    bump(final.loser, PLACEMENT_POINTS.runnerUp);
  }
  return pts;
};

// Map a pair label → the account players in it, from the registrations.
// Guests (no account) are skipped since they have no profile.
export const buildLabelToPlayers = (registrations = []) => {
  const map = new Map();
  registrations.forEach((reg) => {
    const label = `${reg.player_name || "Player"} & ${
      reg.partner_name || "Player"
    }`;
    const players = [];
    if (reg.player_id) players.push({ id: reg.player_id, name: reg.player_name });
    if (reg.partner_id)
      players.push({ id: reg.partner_id, name: reg.partner_name });
    if (players.length) map.set(label, players);
  });
  return map;
};

// Compute each player's ranking points from the finished draw, by final
// placement (see PLACEMENT_POINTS). Both players of a pair get the pair's value.
//   draw            the recomputed draw (its final / 3rd-place / QF slots filled)
//   resultMap       "round:index" → { winner: "a" | "b", state } for finished
//                   matches (from resultMapFromRows)
//   labelToPlayers  pair label → [{ id, name }] (from buildLabelToPlayers)
// Returns [{ player_id, player_name, points }].
export const computePlacementPoints = (draw, resultMap, labelToPlayers) => {
  const labelPts = placementByLabel(draw, resultMap);
  const totals = new Map(); // player_id → { player_name, points }

  labelPts.forEach((points, label) => {
    const players = labelToPlayers.get(label);
    if (!players) return; // guest-only pair (no accounts) — nothing to credit
    players.forEach(({ id, name }) => {
      if (!id) return;
      const cur = totals.get(id) || { player_name: name, points: 0 };
      // A player belongs to one pair, so this is a plain assign; max() just
      // guards against a duplicate label.
      cur.points = Math.max(cur.points, points);
      if (name) cur.player_name = name;
      totals.set(id, cur);
    });
  });

  return [...totals.entries()].map(([player_id, v]) => ({
    player_id,
    player_name: v.player_name,
    points: v.points,
  }));
};
