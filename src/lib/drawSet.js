// A tournament can hold ONE DRAW PER CATEGORY (e.g. Men's pairs + Women's
// pairs). They all live in the single `tournaments.draw` column as:
//
//   { multi: true, draws: [ { slot, category, draw }, … ] }
//
// A legacy single draw (a plain draw object, as published before categories
// were supported) is read as one entry at slot 0, so old tournaments keep
// working untouched.
//
// live_scores rows are keyed by (tournament_id, round, match_index). To keep
// the categories' matches apart without a schema change, a category's rounds
// are offset by slot × SLOT_STRIDE. Slot 0 uses the raw round numbers, so every
// result recorded before this change still maps to the same match.

export const SLOT_STRIDE = 1000;

export const encodeRound = (slot, round) => (slot || 0) * SLOT_STRIDE + round;

// Inverse of encodeRound. Local rounds range from -1 (3rd place) to ~102, so
// rounding to the nearest stride recovers the slot.
export const decodeRound = (globalRound) => {
  const slot = Math.floor((globalRound + SLOT_STRIDE / 2) / SLOT_STRIDE);
  return { slot, round: globalRound - slot * SLOT_STRIDE };
};

const catKey = (category) => category || "";

// Display order: Men → Women → Mixed → anything else → uncategorized.
const CATEGORY_ORDER = ["Men's pairs", "Women's pairs", "Mixed pairs"];
const orderOf = (category) => {
  if (!category) return CATEGORY_ORDER.length + 1;
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length : i;
};

// Short Macedonian names for the official schedule / draw sheets.
const CATEGORY_MK = {
  "Men's pairs": "Машки парови",
  "Women's pairs": "Женски парови",
  "Mixed pairs": "Мешани парови",
};
export const categoryLabelMk = (category) =>
  category ? CATEGORY_MK[category] || category : "";

export const isDrawSet = (tDraw) =>
  !!tDraw && tDraw.multi === true && Array.isArray(tDraw.draws);

// Every category draw of a tournament → [{ slot, category, draw }], in display
// order. Accepts the stored column value (set, legacy single draw, or null).
export const listDraws = (tDraw) => {
  if (!tDraw) return [];
  if (!isDrawSet(tDraw)) {
    return [{ slot: 0, category: tDraw.category || null, draw: tDraw }];
  }
  return tDraw.draws
    .filter((e) => e && e.draw)
    .map((e) => ({
      slot: Number.isFinite(e.slot) ? e.slot : 0,
      category: e.category || null,
      draw: e.draw,
    }))
    .sort(
      (x, y) => orderOf(x.category) - orderOf(y.category) || x.slot - y.slot
    );
};

export const findDraw = (tDraw, category) =>
  listDraws(tDraw).find((e) => catKey(e.category) === catKey(category)) ||
  null;

const pack = (entries) =>
  entries.length
    ? {
        multi: true,
        draws: entries.map(({ slot, category, draw }) => ({
          slot,
          category: category || null,
          draw,
        })),
      }
    : null;

// Set (add or replace) one category's draw. A replaced draw keeps its slot so
// its recorded results stay attached; a new category gets the next free slot.
export const withCategoryDraw = (tDraw, category, draw) => {
  const entries = listDraws(tDraw);
  const i = entries.findIndex((e) => catKey(e.category) === catKey(category));
  if (i >= 0) {
    entries[i] = { ...entries[i], draw };
  } else {
    const slot = entries.length
      ? Math.max(...entries.map((e) => e.slot)) + 1
      : 0;
    entries.push({ slot, category: category || null, draw });
  }
  return pack(entries);
};

// Remove one category's draw (null once no draw is left).
export const withoutCategoryDraw = (tDraw, category) =>
  pack(
    listDraws(tDraw).filter((e) => catKey(e.category) !== catKey(category))
  );

// Re-label a draw's category (keeps its slot, so its results stay attached).
// Used to adopt a legacy uncategorized draw as e.g. the Men's pairs draw.
export const renameCategoryDraw = (tDraw, fromCategory, toCategory) =>
  pack(
    listDraws(tDraw).map((e) =>
      catKey(e.category) === catKey(fromCategory)
        ? { ...e, category: toCategory || null }
        : e
    )
  );

// Transform every category draw with fn(entry) → new draw, keeping the stored
// shape (a legacy single draw stays a single draw).
export const mapDraws = (tDraw, fn) => {
  if (!tDraw) return tDraw;
  if (!isDrawSet(tDraw)) return fn(listDraws(tDraw)[0]);
  return pack(listDraws(tDraw).map((e) => ({ ...e, draw: fn(e) })));
};

// live_scores rows of one category, with their rounds decoded to the draw's
// own (local) round numbers.
export const rowsForSlot = (rows = [], slot = 0) =>
  rows
    .map((r) => {
      const d = decodeRound(r.round);
      return d.slot === slot ? { ...r, round: d.round } : null;
    })
    .filter(Boolean);

// A "globalRound:index" → value map narrowed to one category, re-keyed by the
// draw's local round numbers.
export const statusesForSlot = (map = {}, slot = 0) => {
  const out = {};
  Object.entries(map).forEach(([key, value]) => {
    const [g, idx] = key.split(":");
    const d = decodeRound(Number(g));
    if (d.slot === slot) out[`${d.round}:${idx}`] = value;
  });
  return out;
};
