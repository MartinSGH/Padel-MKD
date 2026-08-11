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

// Build a single-elimination bracket from a list of pairs.
// `pairs` is an array of arbitrary pair objects. Returns:
//   { size, byes, count, rounds: [ [ {a, b} ... ], ... ] }
// where round 0 holds the real first-round matches and later rounds are empty
// slots representing the bracket structure.
//
// The pairs are simply matched two-by-two after a shuffle, so the draw stays
// clean: an even count has NO empty slots, and an odd count leaves exactly one
// bye (the last pair's second slot is null → shown as "/").
export const buildBracket = (pairs) => {
  const count = pairs.length;
  if (count < 2) return null;

  const shuffled = shuffle(pairs);
  const firstRound = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    firstRound.push({ a: shuffled[i], b: shuffled[i + 1] || null });
  }

  const byes = count % 2; // 0 (even) or 1 (odd)
  const rounds = [firstRound];

  // Later rounds are placeholders (winners advance): halve the match count,
  // rounding up so an odd number of winners still terminates at a final.
  let matches = firstRound.length;
  while (matches > 1) {
    matches = Math.ceil(matches / 2);
    rounds.push(Array.from({ length: matches }, () => ({ a: null, b: null })));
  }

  return { size: firstRound.length * 2, byes, count, rounds };
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
