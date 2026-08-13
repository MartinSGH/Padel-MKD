// Build the playing schedule automatically FROM the draw. The admin only sets
// the start time (and the interval); everything else is derived:
//   • the matches (pairs) are taken from the draw's real matches, in order;
//   • two matches per time slot — one on each court (Терен 1, Терен 2);
//   • each next slot starts `interval` minutes after the previous one.
//     slot 0 → "Почеток 12:00 часот", later slots → "Не пред 13:00 часот".

export const DEFAULT_SCHEDULE = { startTime: "12:00", intervalMinutes: 60 };
const COURTS = 2;

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

const isRealMatch = (m) =>
  m && m.a && m.b && m.a !== "/" && m.b !== "/";

// Ordered list of real matches from the draw, each with its court + time.
export const scheduleMatches = (draw, config) => {
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

  return matches.map((mt, idx) => {
    const court = idx % COURTS; // 0 = Терен 1, 1 = Терен 2
    const slot = Math.floor(idx / COURTS);
    const time = fmtTime(start + slot * interval);
    return { ...mt, order: idx, court, slot, time, first: slot === 0 };
  });
};

// Group the matches into slot rows for the 2-court grid (display + PDF).
export const scheduleGrid = (draw, config) => {
  const rows = [];
  scheduleMatches(draw, config).forEach((mt) => {
    if (!rows[mt.slot]) {
      rows[mt.slot] = {
        slot: mt.slot,
        time: mt.time,
        first: mt.first,
        cells: new Array(COURTS).fill(null),
      };
    }
    rows[mt.slot].cells[mt.court] = mt;
  });
  return rows.filter(Boolean);
};

// Court + time for one specific bracket match (used by the live scoreboard).
export const matchScheduleInfo = (draw, config, round, matchIndex) =>
  scheduleMatches(draw, config).find(
    (m) => m.round === round && m.matchIndex === matchIndex
  ) || null;

// "Почеток 12:00 часот" (first slot) / "Не пред 13:00 часот" (later slots).
export const slotTimeLabel = (row, labels) =>
  `${row.first ? labels.startAt : labels.notBefore} ${row.time} ${labels.hour}`;
