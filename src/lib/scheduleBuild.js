// Build the playing schedule automatically FROM the draw. The admin only sets
// the start time (and interval); everything else is derived. Two matches per
// time slot — one on each court (Терен 1 / Терен 2). slot 0 → "Почеток 12:00
// часот", later slots → "Не пред 13:00 часот".
//
// Elimination: matches taken in bracket order.
// Group system: round-robin round by round, group by group (a group's two
//   matches of a round run at the same time on the two courts). Day 1 (Сабота)
//   holds ALL group matches (12 per court); Day 2 (Недела) is semifinals + final.

import {
  SEMI_ROUND,
  FINAL_ROUND,
  THIRD_PLACE_ROUND,
  QUARTER_ROUND,
} from "./points.js";

export const DEFAULT_SCHEDULE = { startTime: "12:00", intervalMinutes: 60 };
const COURTS = 2;

// Round-robin match indices per round for a group of 4. The matches array is in
// order [0,1],[0,2],[0,3],[1,2],[1,3],[2,3] → indices 0..5.
const RR_ROUNDS = [
  [0, 5],
  [1, 4],
  [2, 3],
];
export const GROUP_SCHEDULE_DAYS = ["Сабота", "Недела"];

const parseTime = (s) => {
  const [h, m] = String(s || "12:00")
    .split(":")
    .map((n) => parseInt(n, 10));
  return (Number.isFinite(h) ? h : 12) * 60 + (Number.isFinite(m) ? m : 0);
};

const fmtTime = (mins) => {
  const t = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
};

const isRealMatch = (m) => m && m.a && m.b && m.a !== "/" && m.b !== "/";

// ---- Elimination: matches in bracket order, 2 per slot -------------------
const eliminationGrid = (draw, config) => {
  if (!draw || !Array.isArray(draw.rounds)) return [];
  const start = parseTime(config?.startTime);
  const interval = Number(config?.intervalMinutes) || 60;

  const matches = [];
  draw.rounds.forEach((round, ri) => {
    round.forEach((m, i) => {
      if (isRealMatch(m)) {
        matches.push({ round: ri, matchIndex: i, teamA: m.a, teamB: m.b });
      }
    });
  });

  const rows = [];
  matches.forEach((mt, idx) => {
    const court = idx % COURTS;
    const slot = Math.floor(idx / COURTS);
    if (!rows[slot]) {
      rows[slot] = {
        day: null,
        slot,
        time: fmtTime(start + slot * interval),
        first: slot === 0,
        cells: new Array(COURTS).fill(null),
      };
    }
    rows[slot].cells[court] = mt;
  });
  return rows.filter(Boolean);
};

// ---- Group system: round-robin round-by-round, split over two days -------
const cell = (round, matchIndex, a, b) => ({
  round,
  matchIndex,
  teamA: a,
  teamB: b,
});
const groupCell = (draw, g, rrIndex) => {
  const m = draw.groups?.[g]?.matches?.[rrIndex];
  return m ? cell(g, rrIndex, m.a, m.b) : null;
};
const koCell = (round, matchIndex, pair, ph) =>
  cell(
    round,
    matchIndex,
    pair?.a || ph?.a || null,
    pair?.b || ph?.b || null
  );

const groupGrid = (draw, config) => {
  if (draw?.system !== "group" || !Array.isArray(draw.groups)) return [];
  const start = parseTime(config?.startTime);
  const interval = Number(config?.intervalMinutes) || 60;
  const ng = draw.groups.length;

  // [dayIndex, courtA cell, courtB cell] per slot, in play order.
  const slots = [];
  // Сабота: ALL group matches — round-robin rounds 1, 2 & 3 of every group
  // (12 slots → 12 matches per court).
  [0, 1, 2].forEach((r) => {
    for (let g = 0; g < ng; g += 1) {
      slots.push([
        0,
        groupCell(draw, g, RR_ROUNDS[r][0]),
        groupCell(draw, g, RR_ROUNDS[r][1]),
      ]);
    }
  });
  // Недела: quarterfinals first — 4 matches over two slots (two courts) — then
  // the semifinals. The QF pairings come from the admin's manual draw.
  const qf = Array.isArray(draw.quarterfinals) ? draw.quarterfinals : [];
  const qfPh = { a: "Квалификант", b: "Квалификант" };
  slots.push([
    1,
    koCell(QUARTER_ROUND, 0, qf[0], qfPh),
    koCell(QUARTER_ROUND, 1, qf[1], qfPh),
  ]);
  slots.push([
    1,
    koCell(QUARTER_ROUND, 2, qf[2], qfPh),
    koCell(QUARTER_ROUND, 3, qf[3], qfPh),
  ]);
  slots.push([
    1,
    koCell(SEMI_ROUND, 0, draw.semifinals?.[0], {
      a: "Победник ЧФ",
      b: "Победник ЧФ",
    }),
    koCell(SEMI_ROUND, 1, draw.semifinals?.[1], {
      a: "Победник ЧФ",
      b: "Победник ЧФ",
    }),
  ]);
  slots.push([
    1,
    koCell(FINAL_ROUND, 0, draw.final, { a: "Финале", b: null }),
    koCell(THIRD_PLACE_ROUND, 0, draw.third, {
      a: "Меч за 3-то место",
      b: null,
    }),
  ]);

  // Times restart each day.
  const perDay = {};
  return slots.map(([day, c1, c2]) => {
    const idx = (perDay[day] = (perDay[day] ?? -1) + 1);
    return {
      day: GROUP_SCHEDULE_DAYS[day] || "",
      slot: idx,
      time: fmtTime(start + idx * interval),
      first: idx === 0,
      cells: [c1, c2],
    };
  });
};

// Slot rows for the 2-court grid (display + PDF). Rows carry an optional `day`.
export const scheduleGrid = (draw, config) =>
  draw?.system === "group"
    ? groupGrid(draw, config)
    : eliminationGrid(draw, config);

// Court + time for one specific match (used by the live scoreboard).
export const matchScheduleInfo = (draw, config, round, matchIndex) => {
  const rows = scheduleGrid(draw, config);
  for (const row of rows) {
    for (let court = 0; court < row.cells.length; court += 1) {
      const c = row.cells[court];
      if (c && c.round === round && c.matchIndex === matchIndex) {
        return { court, time: row.time, first: row.first, day: row.day };
      }
    }
  }
  return null;
};

// "Почеток 12:00 часот" (first slot) / "Не пред 13:00 часот" (later slots).
export const slotTimeLabel = (row, labels) =>
  `${row.first ? labels.startAt : labels.notBefore} ${row.time} ${labels.hour}`;
