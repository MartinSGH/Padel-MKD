// Ranking-points rules (per win, cumulative). Points are credited to BOTH
// players of a pair. The stage is derived from the number of matches in the
// round (so it works for any bracket size):
//   Final (1 match)        winner 100, runner-up 70
//   3rd-place match        winner 50
//   Semifinal (2 matches)  0 (points come from the final / 3rd-place match)
//   Quarterfinal (4)       winner 30
//   Round of 16 (8)        winner 15
//   First stage (16, 32…)  winner 5

// Sentinel round for the (extra) 3rd-place match — it isn't part of the tree.
export const THIRD_PLACE_ROUND = -1;

const isEmpty = (label) => label == null || label === "" || label === "/";

// Points for the winner / loser of a match, by round match-count.
export const stagePoints = (round, matchCount) => {
  if (round === THIRD_PLACE_ROUND) return { win: 50, lose: 0 };
  if (matchCount === 1) return { win: 100, lose: 70 }; // final
  if (matchCount === 2) return { win: 0, lose: 0 }; // semifinal
  if (matchCount === 4) return { win: 30, lose: 0 }; // quarterfinal
  if (matchCount === 8) return { win: 15, lose: 0 }; // round of 16
  return { win: 5, lose: 0 }; // first stage (round of 16+)
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

// Compute total points per player from the finished matches.
// finishedMatches: [{ round, match_index, winner, team_a, team_b }]
// getMatchCount(round): number of matches in that round (for stage detection).
// Returns [{ player_id, player_name, points }].
export const computePoints = (finishedMatches, labelToPlayers, getMatchCount) => {
  const totals = new Map(); // player_id → { player_name, points }

  const credit = (label, pts) => {
    if (!pts || isEmpty(label)) return;
    const players = labelToPlayers.get(label);
    if (!players) return;
    players.forEach(({ id, name }) => {
      if (!id) return;
      const cur = totals.get(id) || { player_name: name, points: 0 };
      cur.points += pts;
      if (name) cur.player_name = name;
      totals.set(id, cur);
    });
  };

  finishedMatches.forEach((m) => {
    if (m.winner !== "a" && m.winner !== "b") return;
    const { win, lose } = stagePoints(m.round, getMatchCount(m.round));
    const winLabel = m.winner === "a" ? m.team_a : m.team_b;
    const loseLabel = m.winner === "a" ? m.team_b : m.team_a;
    credit(winLabel, win);
    credit(loseLabel, lose);
  });

  return [...totals.entries()].map(([player_id, v]) => ({
    player_id,
    player_name: v.player_name,
    points: v.points,
  }));
};
