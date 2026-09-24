// Build the playing schedule automatically FROM the draw(s). The admin only sets
// the start time (and interval); everything else is derived. Two matches per
// time slot — one on each court (Терен 1 / Терен 2). slot 0 → "Почеток 12:00
// часот", later slots → "Не пред 13:00 часот".
//
// A tournament can have one draw per category (Men's / Women's / Mixed pairs,
// see drawSet.js); all of them share the same two courts, so they are scheduled
// together into ONE grid.
//
// Every match becomes a queue item, then slots are filled greedily in queue
// order under these rules:
//   • a player is never on both courts in the same slot (hard rule — checked on
//     the individual player names, so it also holds across categories);
//   • a knockout round only starts after the previous round of its category is
//     fully scheduled in earlier slots (a QF winner can't play the SF at the
//     same time as the QF);
//   • pairs get a rest slot between matches whenever another match can fill the
//     court instead.
//
// Elimination: matches taken in bracket order, round by round.
// Group system: round-robin round by round, group by group. Day 1 (Сабота)
//   holds ALL group matches; Day 2 (Недела) is quarterfinals → semifinals →
//   final + 3rd place.

import {
  SEMI_ROUND,
  FINAL_ROUND,
  THIRD_PLACE_ROUND,
  QUARTER_ROUND,
} from "./points.js";
import { listDraws, encodeRound } from "./drawSet.js";

export const DEFAULT_SCHEDULE = { startTime: "12:00", intervalMinutes: 60 };
const COURTS = 2;
export const GROUP_SCHEDULE_DAYS = ["Сабота", "Недела"];

// Per-day start time + interval. Day 2 (the knockout day) can have its own start
// time and interval; when unset it falls back to day 1's, so schedules saved
// before day-2 timing existed keep behaving exactly as before.
const dayTiming = (config) => [
  {
    start: parseTime(config?.startTime),
    interval: Number(config?.intervalMinutes) || 60,
  },
  {
    start: parseTime(config?.day2StartTime || config?.startTime),
    interval:
      Number(config?.day2IntervalMinutes || config?.intervalMinutes) || 60,
  },
];

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

const isRealLabel = (l) => !!l && l !== "/";
const isRealMatch = (m) => m && isRealLabel(m.a) && isRealLabel(m.b);

// The individual players of a pair label ("Ana & Bojan" → ["ana", "bojan"]).
// Placeholders (no real pair yet) have no players, so they never conflict.
const playersOf = (label, placeholder) =>
  placeholder || !isRealLabel(label)
    ? []
    : String(label)
        .split("&")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

// Round-robin rounds for n teams (circle method; a bye when n is odd). Returns
// rounds of [i, j] index pairs (i < j). For n = 4 this is exactly
// {01,23} → {02,13} → {03,12}.
const roundRobinRounds = (n) => {
  if (n < 2) return [];
  const ids = Array.from({ length: n }, (_, i) => i);
  if (n % 2) ids.push(-1); // bye
  const m = ids.length;
  const rounds = [];
  for (let r = 0; r < m - 1; r += 1) {
    const round = [];
    for (let i = 0; i < m / 2; i += 1) {
      const x = ids[i];
      const y = ids[m - 1 - i];
      if (x >= 0 && y >= 0) round.push(x < y ? [x, y] : [y, x]);
    }
    round.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    rounds.push(round);
    ids.splice(1, 0, ids.pop()); // rotate, team 0 stays fixed
  }
  return rounds.reverse();
};

// One schedulable match.
const item = (entry, localRound, matchIndex, a, b, extra) => {
  const placeholder = !!extra.placeholder;
  return {
    slot: entry.slot,
    category: entry.category,
    round: encodeRound(entry.slot, localRound),
    localRound,
    matchIndex,
    teamA: a,
    teamB: b,
    day: extra.day ?? null,
    stage: extra.stage ?? 0,
    players: [...playersOf(a, placeholder), ...playersOf(b, placeholder)],
  };
};

// ---- Queue items per draw system ----------------------------------------

// Group stage (day 0): round-robin round r of every category's every group,
// before round r + 1. Each group's matches are looked up by their two teams.
const groupStageItems = (entries) => {
  const perEntry = entries.map((e) =>
    (e.draw.groups || []).map((g) => {
      const idx = new Map();
      (g.matches || []).forEach((m, mi) => idx.set(`${m.a}\u0000${m.b}`, mi));
      const teams = g.teams || [];
      return roundRobinRounds(teams.length).map((round) =>
        round
          .map(([i, j]) => {
            const mi =
              idx.get(`${teams[i]}\u0000${teams[j]}`) ??
              idx.get(`${teams[j]}\u0000${teams[i]}`);
            return mi == null ? null : { mi, m: g.matches[mi] };
          })
          .filter(Boolean)
      );
    })
  );
  // Spread each group's rounds evenly over the day: round r of a group with n
  // rounds sits at (r + ½) / n. Equal-sized groups interleave round by round;
  // a bigger group (5 pairs → 5 rounds) isn't left with its extra rounds
  // bunched up at the end of the day.
  const blocks = [];
  perEntry.forEach((groups, ei) =>
    groups.forEach((rounds, gi) =>
      rounds.forEach((round, r) =>
        blocks.push({ at: (r + 0.5) / rounds.length, ei, gi, round })
      )
    )
  );
  blocks.sort((x, y) => x.at - y.at || x.ei - y.ei || x.gi - y.gi);
  const out = [];
  blocks.forEach(({ ei, gi, round }) =>
    round.forEach(({ mi, m }) =>
      out.push(item(entries[ei], gi, mi, m.a, m.b, { day: 0, stage: 0 }))
    )
  );
  // Safety net: any group match the round-robin didn't cover (e.g. a hand-
  // edited draw) is still scheduled, at the end of the group stage.
  const seen = new Set(out.map((it) => `${it.round}:${it.matchIndex}`));
  entries.forEach((e) =>
    (e.draw.groups || []).forEach((g, gi) =>
      (g.matches || []).forEach((m, mi) => {
        const it = item(e, gi, mi, m.a, m.b, { day: 0, stage: 0 });
        if (!seen.has(`${it.round}:${mi}`)) out.push(it);
      })
    )
  );
  return out;
};

// Knockout (day 1): quarterfinals of every category, then semifinals, then
// final + 3rd place. Empty slots show a placeholder until the draw fills them.
const groupKnockoutItems = (entries) => {
  const ko = (e, round, i, pair, ph, stage) => {
    const a = pair?.a || null;
    const b = pair?.b || null;
    return item(e, round, i, a || ph.a, b || ph.b, {
      day: 1,
      stage,
      placeholder: !a || !b,
    });
  };
  const qfPh = { a: "Квалификант", b: "Квалификант" };
  const sfPh = { a: "Победник 1/4", b: "Победник 1/4" };
  const out = [];
  entries.forEach((e) => {
    const qf = Array.isArray(e.draw.quarterfinals) ? e.draw.quarterfinals : [];
    [0, 1, 2, 3].forEach((i) =>
      out.push(ko(e, QUARTER_ROUND, i, qf[i], qfPh, 1))
    );
  });
  entries.forEach((e) =>
    [0, 1].forEach((i) =>
      out.push(ko(e, SEMI_ROUND, i, e.draw.semifinals?.[i], sfPh, 2))
    )
  );
  entries.forEach((e) => {
    out.push(ko(e, FINAL_ROUND, 0, e.draw.final, { a: "Финале", b: null }, 3));
    out.push(
      ko(
        e,
        THIRD_PLACE_ROUND,
        0,
        e.draw.third,
        { a: "Меч за 3-то место", b: null },
        3
      )
    );
  });
  return out;
};

// Elimination: every playable match, round by round (each round of every
// category before the next round), then the 3rd-place match with the final.
// `dayOf(round)` places rounds on days when mixed with a group draw.
const eliminationItems = (entries, dayOf) => {
  const maxRounds = Math.max(
    0,
    ...entries.map((e) => (e.draw.rounds || []).length)
  );
  const out = [];
  for (let ri = 0; ri < maxRounds; ri += 1) {
    entries.forEach((e) => {
      const rounds = e.draw.rounds || [];
      (rounds[ri] || []).forEach((m, i) => {
        if (isRealMatch(m)) {
          out.push(item(e, ri, i, m.a, m.b, { day: dayOf(ri), stage: ri }));
        }
      });
      if (ri === rounds.length - 1 && isRealMatch(e.draw.thirdPlace)) {
        out.push(
          item(e, THIRD_PLACE_ROUND, 0, e.draw.thirdPlace.a, e.draw.thirdPlace.b, {
            day: dayOf(ri),
            stage: ri,
          })
        );
      }
    });
  }
  return out;
};

// ---- Slot packing --------------------------------------------------------

const overlaps = (players, busy) => players.some((p) => busy.has(p));

// Pack one day's queue into slots of up to COURTS matches.
const packSlots = (queue) => {
  const pending = [...queue];
  const slots = [];
  // Per category+stage: how many are still unscheduled / last slot used.
  const stageKey = (it) => `${it.slot}|${it.stage}`;
  const left = new Map();
  const lastSlot = new Map();
  pending.forEach((it) =>
    left.set(stageKey(it), (left.get(stageKey(it)) || 0) + 1)
  );

  // A match is ready once every earlier stage of its category is scheduled in
  // an EARLIER slot.
  const ready = (it, slotIdx) => {
    for (let s = 0; s < it.stage; s += 1) {
      const k = `${it.slot}|${s}`;
      if ((left.get(k) || 0) > 0) return false;
      if (lastSlot.has(k) && lastSlot.get(k) >= slotIdx) return false;
    }
    return true;
  };

  while (pending.length) {
    const slotIdx = slots.length;
    const prevPlayers = new Set(
      slotIdx > 0 ? slots[slotIdx - 1].flatMap((it) => it.players) : []
    );
    const picked = [];
    const busy = new Set();
    // Pass 1 prefers pairs that just rested; pass 2 fills any free court.
    [true, false].forEach((wantRest) => {
      pending.forEach((it) => {
        if (picked.length >= COURTS || picked.includes(it)) return;
        if (!ready(it, slotIdx)) return;
        if (overlaps(it.players, busy)) return;
        if (wantRest && overlaps(it.players, prevPlayers)) return;
        picked.push(it);
        it.players.forEach((p) => busy.add(p));
      });
    });
    if (!picked.length) picked.push(pending[0]); // never loop forever
    picked.forEach((it) => {
      pending.splice(pending.indexOf(it), 1);
      const k = stageKey(it);
      left.set(k, left.get(k) - 1);
      lastSlot.set(k, slotIdx);
    });
    slots.push(picked);
  }
  return slots;
};

const toCell = (it) => ({
  round: it.round,
  localRound: it.localRound,
  matchIndex: it.matchIndex,
  slot: it.slot,
  category: it.category,
  teamA: it.teamA,
  teamB: it.teamB,
});

// Slot rows for the 2-court grid (display + PDF). Rows carry an optional `day`.
// `tournamentDraw` is the stored `tournaments.draw` value (see drawSet.js).
export const scheduleGrid = (tournamentDraw, config) => {
  const entries = listDraws(tournamentDraw).filter(
    (e) =>
      (e.draw?.system === "group" && Array.isArray(e.draw.groups)) ||
      Array.isArray(e.draw?.rounds)
  );
  if (!entries.length) return [];
  const groupEntries = entries.filter((e) => e.draw.system === "group");
  const elimEntries = entries.filter((e) => e.draw.system !== "group");
  const multiDay = groupEntries.length > 0;

  const queue = [
    ...groupStageItems(groupEntries),
    // Mixed with a group draw: an elimination's first round goes on day 1,
    // everything after it on day 2.
    ...eliminationItems(elimEntries, (ri) =>
      multiDay ? (ri === 0 ? 0 : 1) : null
    ),
    ...groupKnockoutItems(groupEntries),
  ];

  if (!multiDay) {
    const { start, interval } = dayTiming(config)[0];
    return packSlots(queue).map((picked, idx) => ({
      day: null,
      slot: idx,
      time: fmtTime(start + idx * interval),
      first: idx === 0,
      cells: Array.from({ length: COURTS }, (_, c) =>
        picked[c] ? toCell(picked[c]) : null
      ),
    }));
  }

  // Times restart each day, each day using its own start time + interval.
  const timing = dayTiming(config);
  return [0, 1].flatMap((day) => {
    const { start, interval } = timing[day];
    return packSlots(queue.filter((it) => it.day === day)).map(
      (picked, idx) => ({
        day: GROUP_SCHEDULE_DAYS[day],
        slot: idx,
        time: fmtTime(start + idx * interval),
        first: idx === 0,
        cells: Array.from({ length: COURTS }, (_, c) =>
          picked[c] ? toCell(picked[c]) : null
        ),
      })
    );
  });
};

// Court + time for one specific match (used by the live scoreboard). `round` is
// the live_scores round (category offset included — see drawSet.js).
export const matchScheduleInfo = (tournamentDraw, config, round, matchIndex) => {
  const rows = scheduleGrid(tournamentDraw, config);
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
