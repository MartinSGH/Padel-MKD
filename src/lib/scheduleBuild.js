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
//     court instead;
//   • a later phase of a day only starts once every match of the earlier phase
//     is placed (Sunday: the single-group categories first, then the knockout).
//
// MANUAL mode (config.mode === "manual"): the admin arranges the matches
// themselves — config.manual holds, per day, a list of time slots with one
// match key per court ("round:matchIndex", see matchKey). Keys point at draw
// POSITIONS, not pair names, so a knockout match placed before its pairs are
// known (Квалификант / Победник 1/4 …) shows the real pairs as soon as the draw
// fills them. A real match the admin hasn't placed is still appended at the end
// of its day, so nothing silently drops out of the public schedule.
//
// Elimination: matches taken in bracket order, round by round.
// Group system: round-robin round by round, group by group. Day 1 (Сабота)
//   holds the group matches of the multi-group categories (Men's pairs); Day 2
//   (Недела) opens with the categories that have only ONE group (e.g. Women's
//   pairs — a plain round-robin), then quarterfinals → semifinals → final +
//   3rd place. A lone single-group category (nothing else on Saturday) stays
//   on day 1.

import {
  SEMI_ROUND,
  FINAL_ROUND,
  THIRD_PLACE_ROUND,
  QUARTER_ROUND,
} from "./points.js";
import { listDraws, encodeRound } from "./drawSet.js";
import { roundName } from "./draw.js";

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

// Stable identity of a scheduled match: its (global) live_scores round + index.
export const matchKey = (m) => `${m.round}:${m.matchIndex}`;

// One schedulable match.
//   label       short admin-facing name (e.g. "Group 2", "Semifinal 1")
//   placeholder its pairs aren't (all) known yet
//   manualOnly  only offered in manual mode — the automatic schedule leaves it
//               out until its pairs are known (e.g. a later elimination round)
//   optional    manualOnly and may never be played (a single-group category's
//               knockout, which only exists if the admin fills it in the draw)
const item = (entry, localRound, matchIndex, a, b, extra) => {
  const placeholder = !!extra.placeholder;
  const round = encodeRound(entry.slot, localRound);
  return {
    key: matchKey({ round, matchIndex }),
    slot: entry.slot,
    category: entry.category,
    round,
    localRound,
    matchIndex,
    teamA: a,
    teamB: b,
    label: extra.label || "",
    placeholder,
    manualOnly: !!extra.manualOnly,
    optional: !!extra.optional,
    day: extra.day ?? null,
    stage: extra.stage ?? 0,
    phase: extra.phase ?? 0,
    players: [...playersOf(a, placeholder), ...playersOf(b, placeholder)],
  };
};

// ---- Queue items per draw system ----------------------------------------

const isSingleGroup = (e) => (e.draw.groups || []).length === 1;

// Group stage (on `day`): round-robin round r of every category's every group,
// before round r + 1. Each group's matches are looked up by their two teams.
const groupStageItems = (entries, day = 0) => {
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
  const groupLabel = (e, gi) =>
    (e.draw.groups || []).length > 1 ? `Group ${gi + 1}` : "Group";
  blocks.forEach(({ ei, gi, round }) =>
    round.forEach(({ mi, m }) =>
      out.push(
        item(entries[ei], gi, mi, m.a, m.b, {
          day,
          stage: 0,
          label: groupLabel(entries[ei], gi),
        })
      )
    )
  );
  // Safety net: any group match the round-robin didn't cover (e.g. a hand-
  // edited draw) is still scheduled, at the end of the group stage.
  const seen = new Set(out.map((it) => `${it.round}:${it.matchIndex}`));
  entries.forEach((e) =>
    (e.draw.groups || []).forEach((g, gi) =>
      (g.matches || []).forEach((m, mi) => {
        const it = item(e, gi, mi, m.a, m.b, {
          day,
          stage: 0,
          label: groupLabel(e, gi),
        });
        if (!seen.has(`${it.round}:${mi}`)) out.push(it);
      })
    )
  );
  return out;
};

// Placeholder text for a knockout match whose pairs aren't known yet. `ph` is
// used when neither pair is known, `side` fills a single missing pair.
const QF_PH = { a: "Квалификант", b: "Квалификант", side: "Квалификант" };
const SF_PH = { a: "Победник 1/4", b: "Победник 1/4", side: "Победник 1/4" };
const FINAL_PH = { a: "Финале", b: null, side: "Победник 1/2" };
const THIRD_PH = { a: "Меч за 3-то место", b: null, side: "Поразен 1/2" };

const withPlaceholders = (a, b, ph) =>
  !a && !b ? [ph.a, ph.b] : [a || ph.side, b || ph.side];

// Knockout (day 1, phase 1 — after the Sunday group matches): quarterfinals of
// every category, then semifinals, then final + 3rd place. Empty slots show a
// placeholder until the draw fills them — except for a single-group category,
// which is a plain round-robin: its knockout is only scheduled automatically
// for the matches the admin actually fills in (manual mode still offers the
// empty ones, as optional).
const groupKnockoutItems = (entries) => {
  const out = [];
  const ko = (e, round, i, pair, ph, stage, label) => {
    const a = pair?.a || null;
    const b = pair?.b || null;
    const placeholder = !a || !b;
    const optional = placeholder && isSingleGroup(e);
    const [ta, tb] = withPlaceholders(a, b, ph);
    out.push(
      item(e, round, i, ta, tb, {
        day: 1,
        stage,
        phase: 1,
        placeholder,
        manualOnly: optional,
        optional,
        label,
      })
    );
  };
  entries.forEach((e) => {
    const qf = Array.isArray(e.draw.quarterfinals) ? e.draw.quarterfinals : [];
    [0, 1, 2, 3].forEach((i) =>
      ko(e, QUARTER_ROUND, i, qf[i], QF_PH, 1, `Quarterfinal ${i + 1}`)
    );
  });
  entries.forEach((e) =>
    [0, 1].forEach((i) =>
      ko(
        e,
        SEMI_ROUND,
        i,
        e.draw.semifinals?.[i],
        SF_PH,
        2,
        `Semifinal ${i + 1}`
      )
    )
  );
  entries.forEach((e) => {
    ko(e, FINAL_ROUND, 0, e.draw.final, FINAL_PH, 3, "Final");
    ko(e, THIRD_PLACE_ROUND, 0, e.draw.third, THIRD_PH, 3, "3rd place");
  });
  return out;
};

// Can this side of elimination match (ri, i) ever hold a pair? Only when the
// branch of the bracket feeding it has at least one real pair (a bye-vs-bye
// branch never produces one).
const sideCanFill = (rounds, ri, i, side) => {
  if (ri === 0) return isRealLabel(rounds[0]?.[i]?.[side]);
  const j = 2 * i + (side === "a" ? 0 : 1);
  return (
    sideCanFill(rounds, ri - 1, j, "a") || sideCanFill(rounds, ri - 1, j, "b")
  );
};

// "Победник 1/8" — the winner of a round with `n` matches.
const winnerOf = (n) => `Победник 1/${n}`;

// Elimination: every playable match, round by round (each round of every
// category before the next round), then the 3rd-place match with the final.
// `dayOf(round)` places rounds on days when mixed with a group draw. Later-round
// matches whose pairs aren't known yet are included as manualOnly placeholders.
const eliminationItems = (entries, dayOf) => {
  const maxRounds = Math.max(
    0,
    ...entries.map((e) => (e.draw.rounds || []).length)
  );
  const out = [];
  for (let ri = 0; ri < maxRounds; ri += 1) {
    entries.forEach((e) => {
      const rounds = e.draw.rounds || [];
      const extra = {
        day: dayOf(ri),
        stage: ri,
        phase: dayOf(ri) === 1 ? 1 : 0,
      };
      (rounds[ri] || []).forEach((m, i) => {
        const label =
          rounds[ri].length === 1
            ? roundName(1)
            : `${roundName(rounds[ri].length)} · ${i + 1}`;
        if (isRealMatch(m)) {
          out.push(item(e, ri, i, m.a, m.b, { ...extra, label }));
        } else if (
          ri > 0 &&
          sideCanFill(rounds, ri, i, "a") &&
          sideCanFill(rounds, ri, i, "b")
        ) {
          const side = winnerOf(rounds[ri - 1].length);
          const ph =
            rounds[ri].length === 1
              ? { ...FINAL_PH, side }
              : { a: side, b: side, side };
          const [ta, tb] = withPlaceholders(
            isRealLabel(m?.a) ? m.a : null,
            isRealLabel(m?.b) ? m.b : null,
            ph
          );
          out.push(
            item(e, ri, i, ta, tb, {
              ...extra,
              label,
              placeholder: true,
              manualOnly: true,
            })
          );
        }
      });
      const hasSemis = (rounds[rounds.length - 2] || []).length === 2;
      if (ri === rounds.length - 1 && hasSemis) {
        const tp = e.draw.thirdPlace;
        if (isRealMatch(tp)) {
          out.push(
            item(e, THIRD_PLACE_ROUND, 0, tp.a, tp.b, {
              ...extra,
              label: "3rd place",
            })
          );
        } else {
          const [ta, tb] = withPlaceholders(
            isRealLabel(tp?.a) ? tp.a : null,
            isRealLabel(tp?.b) ? tp.b : null,
            THIRD_PH
          );
          out.push(
            item(e, THIRD_PLACE_ROUND, 0, ta, tb, {
              ...extra,
              label: "3rd place",
              placeholder: true,
              manualOnly: true,
            })
          );
        }
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
  // Per phase: how many are still unpicked (updated as soon as a match is
  // picked, so a later phase can take a court the earlier one leaves free).
  const phaseLeft = new Map();
  pending.forEach((it) =>
    phaseLeft.set(it.phase, (phaseLeft.get(it.phase) || 0) + 1)
  );

  // A match is ready once every earlier phase of its day is picked and every
  // earlier stage of its category is scheduled in an EARLIER slot.
  const ready = (it, slotIdx) => {
    for (const [phase, n] of phaseLeft) {
      if (phase < it.phase && n > 0) return false;
    }
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
        phaseLeft.set(it.phase, phaseLeft.get(it.phase) - 1);
        it.players.forEach((p) => busy.add(p));
      });
    });
    if (!picked.length) {
      picked.push(pending[0]); // never loop forever
      phaseLeft.set(pending[0].phase, phaseLeft.get(pending[0].phase) - 1);
    }
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
  key: it.key,
  round: it.round,
  localRound: it.localRound,
  matchIndex: it.matchIndex,
  slot: it.slot,
  category: it.category,
  teamA: it.teamA,
  teamB: it.teamB,
});

// Every match the schedule can hold (manualOnly ones included), in the
// automatic queue order. `multiDay`: a group draw spreads over two days.
const buildQueue = (tournamentDraw) => {
  const entries = listDraws(tournamentDraw).filter(
    (e) =>
      (e.draw?.system === "group" && Array.isArray(e.draw.groups)) ||
      Array.isArray(e.draw?.rounds)
  );
  if (!entries.length) return { queue: [], multiDay: false };
  const groupEntries = entries.filter((e) => e.draw.system === "group");
  const elimEntries = entries.filter((e) => e.draw.system !== "group");
  const multiDay = groupEntries.length > 0;
  // Single-group categories play on Sunday, before the knockout — but only
  // when a multi-group category is there to fill Saturday.
  const sunday = groupEntries.some((e) => !isSingleGroup(e))
    ? groupEntries.filter(isSingleGroup)
    : [];

  const queue = [
    ...groupStageItems(groupEntries.filter((e) => !sunday.includes(e)), 0),
    ...groupStageItems(sunday, 1),
    // Mixed with a group draw: an elimination's first round goes on day 1,
    // everything after it on day 2.
    ...eliminationItems(elimEntries, (ri) =>
      multiDay ? (ri === 0 ? 0 : 1) : null
    ),
    ...groupKnockoutItems(groupEntries),
  ];
  return { queue, multiDay };
};

export const isManualSchedule = (config) =>
  config?.mode === "manual" && Array.isArray(config?.manual);

// Time of slot `idx` on day `dayIdx` (0 / 1), e.g. "13:00".
export const slotTime = (config, dayIdx, idx) => {
  const { start, interval } = dayTiming(config)[dayIdx || 0];
  return fmtTime(start + idx * interval);
};

const dayIndexOf = (it) => it.day || 0;

// Automatic: pack each day's queue into slots → per day, a list of slots of
// items (null = free court).
const autoDays = (queue, multiDay) =>
  (multiDay ? [0, 1] : [0]).map((d) =>
    packSlots(
      queue.filter((it) => !it.manualOnly && dayIndexOf(it) === d)
    ).map((picked) =>
      Array.from({ length: COURTS }, (_, c) => picked[c] || null)
    )
  );

// Manual: resolve the admin's layout (match keys) against the current draw.
// Unknown / duplicate keys are dropped. A real match that isn't placed anywhere
// is appended (auto-packed) after its day's slots, flagged `appended`.
const manualDays = (queue, multiDay, layout) => {
  const byKey = new Map(queue.map((it) => [it.key, it]));
  const used = new Set();
  const days = (multiDay ? [0, 1] : [0]).map((d) =>
    (Array.isArray(layout[d]) ? layout[d] : []).map((slot) =>
      Array.from({ length: COURTS }, (_, c) => {
        const k = Array.isArray(slot) ? slot[c] : null;
        const it = k != null && !used.has(k) ? byKey.get(k) : null;
        if (!it) return null;
        used.add(k);
        return it;
      })
    )
  );
  days.forEach((slots, d) => {
    const rest = queue.filter(
      (it) => !used.has(it.key) && !it.manualOnly && dayIndexOf(it) === d
    );
    packSlots(rest).forEach((picked) =>
      slots.push(
        Array.from({ length: COURTS }, (_, c) =>
          picked[c] ? { ...picked[c], appended: true } : null
        )
      )
    );
  });
  return days;
};

const placedDays = (tournamentDraw, config) => {
  const { queue, multiDay } = buildQueue(tournamentDraw);
  if (!queue.length) return { days: [], multiDay, queue };
  const days = isManualSchedule(config)
    ? manualDays(queue, multiDay, config.manual)
    : autoDays(queue, multiDay);
  return { days, multiDay, queue };
};

// Slot rows for the 2-court grid (display + PDF). Rows carry an optional `day`.
// `tournamentDraw` is the stored `tournaments.draw` value (see drawSet.js).
// Times restart each day, each day using its own start time + interval. A slot
// the admin left empty in a manual schedule isn't shown, but still takes its
// time (a break); the day's first shown slot reads "Почеток".
export const scheduleGrid = (tournamentDraw, config) => {
  const { days, multiDay } = placedDays(tournamentDraw, config);
  return days.flatMap((slots, d) => {
    const rows = [];
    slots.forEach((cells, idx) => {
      if (cells.every((c) => !c)) return;
      rows.push({
        day: multiDay ? GROUP_SCHEDULE_DAYS[d] : null,
        slot: idx,
        time: slotTime(config, d, idx),
        first: rows.length === 0,
        cells: cells.map((c) => (c ? toCell(c) : null)),
      });
    });
    return rows;
  });
};

// Everything the manual editor needs: every match (current pair names or
// placeholders) and the day structure.
export const schedulePool = (tournamentDraw) => {
  const { queue, multiDay } = buildQueue(tournamentDraw);
  return {
    matches: queue.map(({ players, ...rest }) => ({
      ...rest,
      hasPlayers: players.length > 0,
    })),
    multiDay,
    days: multiDay ? GROUP_SCHEDULE_DAYS : [null],
  };
};

// The automatic schedule as a manual layout (per day, slots of match keys) —
// the starting point when the admin switches to manual.
export const autoLayout = (tournamentDraw) => {
  const { queue, multiDay } = buildQueue(tournamentDraw);
  return autoDays(queue, multiDay).map((slots) =>
    slots.map((cells) => cells.map((c) => (c ? c.key : null)))
  );
};

// Problems in a manual schedule, as readable strings:
//   • the same player on both courts in one slot;
//   • a knockout round placed before (or alongside) an earlier round of its
//     category — e.g. a semifinal before every quarterfinal is played;
//   • real matches not placed (they get appended at the end of their day);
//   • knockout matches with no pairs yet that aren't placed.
export const scheduleWarnings = (tournamentDraw, config) => {
  if (!isManualSchedule(config)) return [];
  const { days, multiDay, queue } = placedDays(tournamentDraw, config);
  const out = [];
  const dayName = (d) => (multiDay ? `${GROUP_SCHEDULE_DAYS[d]} ` : "");
  // The player's name as written in the draw (players are matched lowercased).
  const nameOf = (it, p) =>
    [it.teamA, it.teamB]
      .flatMap((t) => String(t || "").split("&"))
      .map((x) => x.trim())
      .find((x) => x.toLowerCase() === p) || p;
  // key → global position (day, slot) of every match the ADMIN placed (not the
  // appended ones — those are reported as "not placed" below).
  const pos = new Map();
  days.forEach((slots, d) =>
    slots.forEach((cells, idx) => {
      cells.forEach(
        (it) => it && !it.appended && pos.set(it.key, d * 10000 + idx)
      );
      const seen = new Set();
      cells.forEach((it) => {
        if (!it) return;
        const clash = it.players.find((p) => seen.has(p));
        if (clash) {
          out.push(
            `${dayName(d)}${slotTime(config, d, idx)}: ${nameOf(it, clash)} is on both courts.`
          );
        }
        it.players.forEach((p) => seen.add(p));
      });
    })
  );

  // Knockout order per category.
  const reported = new Set();
  queue.forEach((it) => {
    if (!it.stage || !pos.has(it.key)) return;
    const early = queue.find(
      (o) =>
        o.slot === it.slot &&
        o.stage < it.stage &&
        pos.has(o.key) &&
        pos.get(o.key) >= pos.get(it.key)
    );
    const rk = `${it.slot}|${it.stage}`;
    if (early && !reported.has(rk)) {
      reported.add(rk);
      out.push(
        `${it.category ? `${it.category}: ` : ""}${it.label} is scheduled before (or at the same time as) ${early.label}.`
      );
    }
  });

  const appended = days
    .flat(2)
    .filter((it) => it && it.appended).length;
  if (appended) {
    out.push(
      `${appended} match${appended > 1 ? "es are" : " is"} not placed — the public schedule adds ${appended > 1 ? "them" : "it"} at the end of the day.`
    );
  }
  const pendingKo = queue.filter(
    (it) => it.manualOnly && !it.optional && !pos.has(it.key)
  ).length;
  if (pendingKo) {
    out.push(
      `${pendingKo} upcoming knockout match${pendingKo > 1 ? "es" : ""} (pairs not known yet) ${pendingKo > 1 ? "are" : "is"} not placed.`
    );
  }
  return out;
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
