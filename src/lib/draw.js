// Single-elimination draw helpers.

// Fisher–Yates shuffle (returns a new array).
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const nextPow2 = (n) => {
  let size = 1;
  while (size < n) size *= 2;
  return size;
};

// Seed number at each bracket position, top to bottom (positions are 0-based
// here; first-round match k holds positions 2k and 2k+1). Seed 1 is at the top,
// seed 2 at the bottom, seed 3 at the top of the bottom half and seed 4 at the
// bottom of the top half — e.g. for 16:
//   [1,16,9,8,5,12,13,4,3,14,11,6,7,10,15,2]
//   → seed 1: position 1, seed 2: 16, seed 3: 9, seed 4: 8.
// Every first-round match pairs seed s with seed size+1-s.
const seedOrder = (size) => {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s, i) =>
      i % 2 === 0 ? [s, n + 1 - s] : [n + 1 - s, s]
    );
  }
  return order;
};

// Build a single-elimination bracket from a list of pairs.
// `pairs` is an array of arbitrary pair objects; pairs with a `seed` (1..4, see
// lib/seeding.js) are the carriers. Returns:
//   { size, byes, count, rounds: [ [ {a, b} ... ], ... ] }
// where round 0 holds the real first-round matches (a/b may be null = a free
// slot), and later rounds are empty slots representing the bracket structure.
//
// The bracket is padded up to a full power of two (round of 32, 16, …): a count
// that isn't a power of two leaves free slots. e.g. 19 pairs → bracket of 32
// with 13 free slots.
//
// Carriers take fixed positions (carrier 1 → position 1, 2 → last, 3 → top of
// the bottom half, 4 → bottom of the top half). Free slots go opposite the
// strongest seed lines first (so the carriers get the byes), and every other
// pair is placed at random in the remaining positions.
export const buildBracket = (pairs) => {
  const count = pairs.length;
  if (count < 2) return null;

  const size = nextPow2(count);
  const byes = size - count;

  const order = seedOrder(size);
  const posOf = (seed) => order.indexOf(seed);
  const slots = new Array(size).fill(undefined);

  const carriers = pairs
    .filter((p) => p && p.seed)
    .sort((x, y) => x.seed - y.seed)
    .slice(0, 4);
  carriers.forEach((p, i) => {
    slots[posOf(i + 1)] = p;
  });

  // Free slot opposite seed s = the position of seed size+1-s.
  for (let s = 1; s <= byes; s++) slots[posOf(size + 1 - s)] = null;

  const rest = shuffle(pairs.filter((p) => !carriers.includes(p)));
  let ri = 0;
  for (let i = 0; i < size; i++) {
    if (slots[i] === undefined) slots[i] = rest[ri++] ?? null;
  }

  const rounds = [];
  const firstRound = [];
  for (let i = 0; i < size / 2; i++) {
    firstRound.push({ a: slots[2 * i], b: slots[2 * i + 1] });
  }
  rounds.push(firstRound);

  let matches = size / 2;
  while (matches > 1) {
    matches = matches / 2;
    rounds.push(Array.from({ length: matches }, () => ({ a: null, b: null })));
  }

  return { size, byes, count, rounds };
};

// Human round name based on how many matches the round contains.
export const roundName = (matchCount) => {
  switch (matchCount) {
    case 1:
      return "Final";
    case 2:
      return "Semifinals";
    case 4:
      return "Quarterfinals";
    default:
      return `Round of ${matchCount * 2}`;
  }
};
