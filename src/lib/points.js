// Ranking points by FINAL PLACEMENT (a flat value for how far a pair got — not
// cumulative per win). Both players of a pair get the same value. The values
// depend on the tournament (see placementPointsFor):
//   Default:        Champion 100 · Runner-up 70 · 3rd 50 · 4th 40 · QF 30 ·
//                   everyone else who took part 5
//   Senator league: Champion 50 · Runner-up 32 · 3rd 25 · 4th (semifinal) 20 ·
//                   QF 15 · Round of 16 10 · group stage 5
// Placement is read from the finished draw, so it works for the group system
// (groups → QF → SF → final + 3rd place) and for a plain elimination bracket.

// Positional round keys used across both systems (a tournament is one system,
// so these can't collide with the elimination round indices 0..n).
export const THIRD_PLACE_ROUND = -1; // 3rd-place match (both systems)
export const QUARTER_ROUND = 102; // group system quarterfinals (top 2 per group)
export const SEMI_ROUND = 100; // group system semifinals
export const FINAL_ROUND = 101; // group system final

const isEmpty = (label) => label == null || label === "" || label === "/";

// Points awarded for each final placement (default scheme).
export const PLACEMENT_POINTS = {
  champion: 100,
  runnerUp: 70,
  third: 50,
  fourth: 40,
  quarterfinal: 30,
  roundOf16: 5, // no separate Round of 16 value — same as taking part
  participant: 5,
};

// СЕНАТОР – Национална падел лига на Македонија 2026.
export const LEAGUE_PLACEMENT_POINTS = {
  champion: 50,
  runnerUp: 32,
  third: 25,
  fourth: 20, // lost in the semifinal (and the 3rd-place match)
  quarterfinal: 15,
  roundOf16: 10,
  participant: 5, // group stage
};

// Tournaments that don't use the default scheme, by tournament id.
const SCHEME_BY_TOURNAMENT = {
  "d0308c58-04fc-43a5-9390-bf7a837a676a": LEAGUE_PLACEMENT_POINTS, // 1 коло – Сенатор
  "8a6d7d75-1a29-44d8-b8a3-5a7bf5bd173b": LEAGUE_PLACEMENT_POINTS, // 2 коло – Сенатор
};

export const placementPointsFor = (tournamentId) =>
  SCHEME_BY_TOURNAMENT[tournamentId] || PLACEMENT_POINTS;

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
// so a finalist keeps their final value over what they earned in earlier rounds.
const placementByLabel = (draw, resultMap, scheme) => {
  const pts = new Map();
  const bump = (label, p) => {
    if (isEmpty(label) || p == null) return;
    if ((pts.get(label) ?? 0) < p) pts.set(label, p);
  };

  if (draw?.system === "group") {
    // Everyone in a group took part; both teams of each quarterfinal reached it.
    (draw.groups || []).forEach((g) =>
      (g.teams || []).forEach((t) => bump(t, scheme.participant))
    );
    (draw.quarterfinals || []).forEach((m) => {
      bump(m?.a, scheme.quarterfinal);
      bump(m?.b, scheme.quarterfinal);
    });
    const third = koResult(draw.third, resultMap[`${THIRD_PLACE_ROUND}:0`]);
    bump(third.winner, scheme.third);
    bump(third.loser, scheme.fourth);
    const final = koResult(draw.final, resultMap[`${FINAL_ROUND}:0`]);
    bump(final.winner, scheme.champion);
    bump(final.loser, scheme.runnerUp);
    return pts;
  }

  // Elimination bracket: rounds[0] holds every entrant; the round with 8 matches
  // is the Round of 16, the one with 4 the quarterfinal; the last round (1
  // match) is the final.
  const rounds = Array.isArray(draw?.rounds) ? draw.rounds : [];
  (rounds[0] || []).forEach((m) => {
    bump(m?.a, scheme.participant);
    bump(m?.b, scheme.participant);
  });
  rounds.forEach((r) => {
    const p =
      r.length === 8
        ? scheme.roundOf16
        : r.length === 4
        ? scheme.quarterfinal
        : null;
    r.forEach((m) => {
      bump(m?.a, p);
      bump(m?.b, p);
    });
  });
  const third = koResult(draw?.thirdPlace, resultMap[`${THIRD_PLACE_ROUND}:0`]);
  bump(third.winner, scheme.third);
  bump(third.loser, scheme.fourth);
  const li = rounds.length - 1;
  if (li >= 0 && rounds[li]?.length === 1) {
    const final = koResult(rounds[li][0], resultMap[`${li}:0`]);
    bump(final.winner, scheme.champion);
    bump(final.loser, scheme.runnerUp);
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
// placement (see placementPointsFor). Both players of a pair get the pair's value.
//   draw            the recomputed draw (its final / 3rd-place / QF slots filled)
//   resultMap       "round:index" → { winner: "a" | "b", state } for finished
//                   matches (from resultMapFromRows)
//   labelToPlayers  pair label → [{ id, name }] (from buildLabelToPlayers)
//   scheme          placement values (default PLACEMENT_POINTS)
// Returns [{ player_id, player_name, points }].
export const computePlacementPoints = (
  draw,
  resultMap,
  labelToPlayers,
  scheme = PLACEMENT_POINTS
) => {
  const labelPts = placementByLabel(draw, resultMap, scheme);
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
