// Seeding ("carriers" / носители) for the draw and the ordering of the
// registered-pairs list, both driven by ranking points.
//
// A pair's points = the two players' Rank List points added together. Men's and
// Women's pairs count the points earned in that same category (the two Rank
// Lists); any other category (Mixed / none) counts the players' total points.
// Guests without an account have no ranking points (0).
//
// The CARRIER_COUNT highest-ranked pairs (with more than 0 points) are the
// carriers: in the group system carrier 1 heads Group 1, carrier 2 Group 2, …;
// in the elimination system they take fixed bracket positions (see
// lib/draw.js). Ties keep registration order (earlier registration first).

export const CARRIER_COUNT = 4;

export const RANKED_CATEGORIES = ["Men's pairs", "Women's pairs"];

// One player's seeding points for a category, from a getPointsByPlayer() map.
export const playerSeedPoints = (pointsByPlayer, playerId, category) => {
  const p = playerId ? pointsByPlayer?.get(playerId) : null;
  if (!p) return 0;
  return RANKED_CATEGORIES.includes(category)
    ? p.byCategory[category] || 0
    : p.total;
};

// A registration's combined pair points.
export const pairPoints = (reg, pointsByPlayer) =>
  playerSeedPoints(pointsByPlayer, reg.player_id, reg.category) +
  playerSeedPoints(pointsByPlayer, reg.partner_id, reg.category);

// Sort by points, highest first. Array.prototype.sort is stable, so ties keep
// the incoming (registration) order.
export const sortByPoints = (list, pointsOf = (x) => x.points || 0) =>
  [...list].sort((a, b) => pointsOf(b) - pointsOf(a));

// Ordered pairs ({ points, … }) → same pairs, sorted by points, with
// `seed` 1..CARRIER_COUNT set on the carriers (only pairs with points > 0).
export const withCarriers = (pairs) =>
  sortByPoints(pairs).map((p, i) => ({
    ...p,
    seed: i < CARRIER_COUNT && (p.points || 0) > 0 ? i + 1 : null,
  }));

// The carriers of a pair list, carrier 1 first.
export const carriersOf = (pairs, max = CARRIER_COUNT) =>
  pairs
    .filter((p) => p.seed)
    .sort((a, b) => a.seed - b.seed)
    .slice(0, max);
