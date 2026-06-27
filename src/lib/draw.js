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

// Build a single-elimination bracket from a list of pairs.
// `pairs` is an array of arbitrary pair objects. Returns:
//   { size, byes, count, rounds: [ [ {a, b} ... ], ... ] }
// where round 0 holds the real first-round matches (a/b may be null = BYE),
// and later rounds are empty slots representing the bracket structure.
export const buildBracket = (pairs) => {
  const count = pairs.length;
  if (count < 2) return null;

  const size = nextPow2(count);
  const byes = size - count;

  // Real pairs first, byes (null) padded at the end, then "first vs last"
  // pairing so the byes spread out across the bracket.
  const slots = [...shuffle(pairs)];
  for (let i = 0; i < byes; i++) slots.push(null);

  const rounds = [];
  const firstRound = [];
  for (let i = 0; i < size / 2; i++) {
    firstRound.push({ a: slots[i], b: slots[size - 1 - i] });
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
