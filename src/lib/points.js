// Ranking points by FINAL PLACEMENT (a flat value for how far a pair got — not
// cumulative per win). Both players of a pair get the same value. Each
// tournament stores its own scoring system in tournaments.points_scheme —
// picked in the admin panel from SCORING_PRESETS or entered as custom values
// (see resolvePointsScheme).
// Placement is read from the finished draw, so it works for the group system
// (groups → QF → SF → final + 3rd place), a single round-robin group with no
// knockout, and a plain elimination bracket.

import { groupComplete, groupStandings } from "./groupDraw.js";

// Positional round keys used across both systems (a tournament is one system,
// so these can't collide with the elimination round indices 0..n).
export const THIRD_PLACE_ROUND = -1; // 3rd-place match (both systems)
export const QUARTER_ROUND = 102; // group system quarterfinals (top 2 per group)
export const SEMI_ROUND = 100; // group system semifinals
export const FINAL_ROUND = 101; // group system final

const isEmpty = (label) => label == null || label === "" || label === "/";

// A group draw that is a single round-robin group with nobody placed in any
// knockout match (quarterfinals / semifinals / final / 3rd place).
const isGroupOnly = (draw) => {
  if (!Array.isArray(draw?.groups) || draw.groups.length !== 1) return false;
  const ko = [
    ...(draw.quarterfinals || []),
    ...(draw.semifinals || []),
    draw.final,
    draw.third,
  ];
  return ko.every((m) => isEmpty(m?.a) && isEmpty(m?.b));
};

// Fallback for a tournament with no scoring system saved (the scheme every
// tournament used before scoring became configurable).
export const PLACEMENT_POINTS = {
  champion: 100,
  runnerUp: 70,
  third: 50,
  fourth: 40,
  quarterfinal: 30,
  roundOf16: 5, // no separate Round of 16 value — same as taking part
  participant: 5,
};

// The placements a scoring system gives points for, in display order.
export const SCORING_FIELDS = [
  { key: "champion", label: "1st place" },
  { key: "runnerUp", label: "2nd place" },
  { key: "third", label: "3rd place" },
  { key: "fourth", label: "4th place (semifinal)" },
  { key: "quarterfinal", label: "Quarterfinals" },
  { key: "roundOf16", label: "Round of 16" },
  { key: "participant", label: "Group stage" },
];

// Federation scoring systems by tournament category (winner / finalist /
// semifinalist — both semifinalists get the semifinalist value).
export const SCORING_PRESETS = [
  {
    key: "national",
    label: "Национално првенство",
    points: { champion: 100, runnerUp: 70, third: 50, fourth: 50,
      quarterfinal: 0, roundOf16: 0, participant: 0 },
  },
  {
    key: "cup",
    label: "Куп натпревари",
    points: { champion: 70, runnerUp: 50, third: 35, fourth: 35,
      quarterfinal: 0, roundOf16: 0, participant: 0 },
  },
  {
    key: "league",
    label: "Лиги",
    points: { champion: 50, runnerUp: 35, third: 20, fourth: 20,
      quarterfinal: 0, roundOf16: 0, participant: 0 },
  },
  {
    key: "regional",
    label: "Регионални турнири",
    points: { champion: 30, runnerUp: 20, third: 10, fourth: 10,
      quarterfinal: 0, roundOf16: 0, participant: 0 },
  },
];

export const CUSTOM_SCHEME = "custom";

// The stored scoring system ({ preset, champion, runnerUp, … }) → the values to
// award. The values are saved with the tournament (also for presets), so later
// changes to a preset never rescore a past tournament.
export const resolvePointsScheme = (stored) => {
  if (!stored || typeof stored !== "object") return PLACEMENT_POINTS;
  const scheme = {};
  SCORING_FIELDS.forEach(({ key }) => {
    const n = Number(stored[key]);
    scheme[key] = Number.isFinite(n) && n > 0 ? n : 0;
  });
  return scheme;
};

// Short "100 / 70 / 50 / …" summary of a scoring system, for the admin panel.
export const describePointsScheme = (stored) => {
  if (!stored) return "Not set (default 100 / 70 / 50 / 40 / 30 / 5)";
  const preset = SCORING_PRESETS.find((p) => p.key === stored.preset);
  const s = resolvePointsScheme(stored);
  return `${preset ? preset.label : "Custom"} · ${SCORING_FIELDS.map(
    ({ key }) => s[key]
  ).join(" / ")}`;
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
// so a finalist keeps their final value over what they earned in earlier rounds.
const placementByLabel = (draw, resultMap, scheme) => {
  const pts = new Map();
  const bump = (label, p) => {
    if (isEmpty(label) || p == null) return;
    if ((pts.get(label) ?? 0) < p) pts.set(label, p);
  };

  if (draw?.system === "group" && isGroupOnly(draw)) {
    // Only one group, no knockout (e.g. a small Women's category that just
    // plays a round-robin): the group winner (most wins) is the champion and
    // everyone else gets 0 — nothing until the group is fully played.
    const g = draw.groups[0];
    const done = groupComplete(g, 0, resultMap);
    const winner = done ? groupStandings(g, 0, resultMap)[0]?.team : null;
    (g.teams || []).forEach((t) => {
      if (!isEmpty(t)) pts.set(t, t === winner ? scheme.champion : 0);
    });
    return pts;
  }

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
// Guests (no account) are skipped since they have no profile. Each player also
// carries the registration's category (Men's / Women's / Mixed pairs).
export const buildLabelToPlayers = (registrations = []) => {
  const map = new Map();
  registrations.forEach((reg) => {
    const label = `${reg.player_name || "Player"} & ${
      reg.partner_name || "Player"
    }`;
    const category = reg.category || null;
    const players = [];
    if (reg.player_id)
      players.push({ id: reg.player_id, name: reg.player_name, category });
    if (reg.partner_id)
      players.push({ id: reg.partner_id, name: reg.partner_name, category });
    if (players.length) map.set(label, players);
  });
  return map;
};

// Compute each player's ranking points from the finished draw, by final
// placement (see resolvePointsScheme). Both players of a pair get the pair's value.
//   draw            the recomputed draw (its final / 3rd-place / QF slots filled)
//   resultMap       "round:index" → { winner: "a" | "b", state } for finished
//                   matches (from resultMapFromRows)
//   labelToPlayers  pair label → [{ id, name, category }] (from
//                   buildLabelToPlayers)
//   scheme          placement values (from resolvePointsScheme)
// Returns [{ player_id, player_name, category, points }].
export const computePlacementPoints = (
  draw,
  resultMap,
  labelToPlayers,
  scheme = PLACEMENT_POINTS
) => {
  const labelPts = placementByLabel(draw, resultMap, scheme);
  const totals = new Map(); // player_id → { player_name, category, points }

  labelPts.forEach((points, label) => {
    const players = labelToPlayers.get(label);
    if (!players) return; // guest-only pair (no accounts) — nothing to credit
    players.forEach(({ id, name, category }) => {
      if (!id) return;
      const cur = totals.get(id) || {
        player_name: name,
        category: category || null,
        points: 0,
      };
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
    category: v.category,
    points: v.points,
  }));
};
