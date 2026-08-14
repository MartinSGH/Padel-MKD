// Pure padel scoring engine. No side effects — the whole match state is derived
// by replaying the list of point winners, so `undo` is just "replay one fewer".
//
// Rules:
//   • Points 0 → 15 → 30 → 40 → game. At 40–40 either GOLDEN POINT (next point
//     wins) or ADVANTAGE (win by two), per config.
//   • A set is first to 6 games, win by 2; at 6–6 a 7-point tie-break (win by 2).
//   • Best of 3 sets. The deciding (3rd) set is a SUPER TIE-BREAK to 10 (win by
//     2) when config.thirdSetSuperTB is on, otherwise a normal set.

export const DEFAULT_CONFIG = {
  goldenPoint: true,
  thirdSetSuperTB: true,
  superTBto: 10,
  gamesPerSet: 6,
  bestOf: 3,
};

const normalizeConfig = (c = {}) => ({
  goldenPoint: c.goldenPoint !== undefined ? !!c.goldenPoint : true,
  thirdSetSuperTB: c.thirdSetSuperTB !== undefined ? !!c.thirdSetSuperTB : true,
  superTBto: c.superTBto || 10,
  gamesPerSet: c.gamesPerSet || 6,
  bestOf: 3,
});

// Who won the current (non-tiebreak) game, or null.
const gameWon = (pA, pB, golden) => {
  if (golden) {
    // Golden point: 40–40 (3–3) → the very next point wins.
    if (pA >= 4 && pA > pB) return "a";
    if (pB >= 4 && pB > pA) return "b";
    return null;
  }
  if (pA >= 4 && pA - pB >= 2) return "a";
  if (pB >= 4 && pB - pA >= 2) return "b";
  return null;
};

// Rebuild the full match state from the list of point winners.
const replay = (config, history) => {
  const cfg = normalizeConfig(config);
  const setsToWin = Math.ceil(cfg.bestOf / 2); // 2 for best of 3

  let setsWonA = 0;
  let setsWonB = 0;
  const completedSets = []; // [gamesA, gamesB] per finished set
  let gA = 0;
  let gB = 0; // games in the current set
  let pA = 0;
  let pB = 0; // points in the current game / tie-break
  let winner = null;

  const isDecidingSuperTB = () =>
    cfg.thirdSetSuperTB &&
    setsWonA === setsToWin - 1 &&
    setsWonB === setsToWin - 1;

  let superTB = isDecidingSuperTB();
  let inTB = superTB; // a super tie-break is a tie-break from its first point

  const startNewSet = () => {
    gA = 0;
    gB = 0;
    pA = 0;
    pB = 0;
    superTB = isDecidingSuperTB();
    inTB = superTB;
  };

  const finishSet = (setA, setB) => {
    completedSets.push([setA, setB]);
    if (setA > setB) setsWonA += 1;
    else setsWonB += 1;
    if (setsWonA === setsToWin) winner = "a";
    else if (setsWonB === setsToWin) winner = "b";
    else startNewSet();
  };

  for (const team of history) {
    if (winner) break;
    if (team === "a") pA += 1;
    else pB += 1;

    if (inTB) {
      const target = superTB ? cfg.superTBto : 7;
      if ((pA >= target || pB >= target) && Math.abs(pA - pB) >= 2) {
        if (superTB) {
          // Deciding super tie-break: the tie-break score IS the set score.
          finishSet(pA, pB);
        } else {
          // Normal 6–6 tie-break → the set is recorded 7–6.
          if (pA > pB) gA = 7;
          else gB = 7;
          finishSet(gA, gB);
        }
      }
      continue;
    }

    const won = gameWon(pA, pB, cfg.goldenPoint);
    if (won) {
      if (won === "a") gA += 1;
      else gB += 1;
      pA = 0;
      pB = 0;
      const target = cfg.gamesPerSet;
      if ((gA >= target || gB >= target) && Math.abs(gA - gB) >= 2) {
        finishSet(gA, gB);
      } else if (gA === target && gB === target) {
        inTB = true; // enter the tie-break at target-all
      }
    }
  }

  const setsGames = [...completedSets];
  if (!winner) setsGames.push([gA, gB]); // current (in-progress) set

  return {
    config: cfg,
    setsGames,
    setsWon: { a: setsWonA, b: setsWonB },
    gamePoints: { a: pA, b: pB },
    inTiebreak: inTB,
    winner,
    history: [...history],
  };
};

const other = (t) => (t === "a" ? "b" : "a");

// Carry the non-score metadata (discipline cards, disqualification) across the
// pure point replay, which only knows about the score.
const carry = (ns, state) => {
  ns.cards = state.cards || [];
  ns.disqualified = state.disqualified || null;
  return ns;
};

export const initState = (config = {}) => {
  const s = replay(config, []);
  s.cards = [];
  s.disqualified = null;
  return s;
};

export const applyPoint = (state, team) =>
  carry(replay(state.config, [...(state.history || []), team]), state);

export const undo = (state) =>
  carry(replay(state.config, (state.history || []).slice(0, -1)), state);

// Discipline cards (Член 10):
//   yellow — warning only (no score change)
//   orange — penalty point: a point for the OPPONENT
//   red    — disqualification: the opponent wins the match immediately
export const applyCard = (state, team, type) => {
  const cards = [...(state.cards || []), { team, type }];
  if (type === "orange") {
    return { ...applyPoint(state, other(team)), cards };
  }
  if (type === "red") {
    return { ...state, cards, winner: other(team), disqualified: team };
  }
  return { ...state, cards };
};

export const cardCounts = (state) => {
  const c = {
    a: { yellow: 0, orange: 0, red: 0 },
    b: { yellow: 0, orange: 0, red: 0 },
  };
  (state?.cards || []).forEach(({ team, type }) => {
    if (c[team] && c[team][type] !== undefined) c[team][type] += 1;
  });
  return c;
};

const PT = ["0", "15", "30", "40"];

// Current game score labels, e.g. { a: "40", b: "Ad" } or tie-break numbers.
export const gameLabel = (state) => {
  if (state.winner) return { a: "", b: "" };
  const { a, b } = state.gamePoints;
  if (state.inTiebreak) return { a: String(a), b: String(b) };
  if (!state.config.goldenPoint && a >= 3 && b >= 3) {
    if (a === b) return { a: "40", b: "40" };
    return a > b ? { a: "Ad", b: "40" } : { a: "40", b: "Ad" };
  }
  return { a: PT[Math.min(a, 3)], b: PT[Math.min(b, 3)] };
};

// True when a golden point is being played (40–40 in golden-point mode).
export const isGoldenPoint = (state) =>
  !!state.config.goldenPoint &&
  !state.inTiebreak &&
  !state.winner &&
  state.gamePoints.a === 3 &&
  state.gamePoints.b === 3;

// Completed-set summary for the draw, e.g. "6-3 6-4 10-8".
export const scoreString = (state) => {
  const sets = state.winner
    ? state.setsGames
    : state.setsGames.slice(0, -1); // drop the in-progress set
  return sets.map(([a, b]) => `${a}-${b}`).join(" ");
};

export const matchWinner = (state) => state.winner || null;
