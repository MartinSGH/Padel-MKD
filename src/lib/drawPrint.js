// Printable "tournament draw with results" (Ждрепка со резултати). Mirrors the
// schedulePrint sheet: an official Macedonian federation document, so the frame
// labels stay in Macedonian regardless of the site's UI language.
//
// Two entry points:
//   • printDraw       — the whole draw with every result on one sheet. Used for
//                       finished tournaments.
//   • printDrawDay    — one sheet per playing day, listing that day's matches
//                       (taken from the schedule) alongside their draw phase and
//                       result. Used for upcoming / ongoing tournaments.

import { scheduleGrid, slotTimeLabel } from "./scheduleBuild";
import { groupStandings } from "./groupDraw";
import { listDraws, statusesForSlot, categoryLabelMk } from "./drawSet";
import {
  THIRD_PLACE_ROUND,
  SEMI_ROUND,
  FINAL_ROUND,
  QUARTER_ROUND,
} from "./points";

export const DRAW_LABELS = {
  title: "Ждрепка со резултати",
  date: "Дата",
  club: "Клуб / Град",
  referee: "Судија / Делегат",
  quarterfinals: "Четвртфинале",
  semifinals: "Полуфинале",
  final: "Финале",
  thirdPlace: "Меч за 3-то место",
  round: "Рунда",
  roundOf: (n) => `Рунда од ${n}`,
  bye: "Слободен",
  result: "Резултат",
  match: "Натпревар",
  court: "Терен",
  time: "Време",
  phase: "Фаза",
  standings: "Пласман",
  played: "И",
  wins: "П",
  losses: "З",
  courts: ["Терен 1", "Терен 2"],
  vs: "vs",
  hour: "часот",
  startAt: "Почеток",
  notBefore: "Не пред",
  noResult: "—",
};

const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// "6-4 6-3 10-8" from a finished/live match state, or "" when there is no score.
const scoreString = (state) => {
  const sets = state?.setsGames || [];
  const played = sets.filter(([a, b]) => a || b);
  if (!played.length) return "";
  return played.map(([a, b]) => `${a}-${b}`).join(" ");
};

// A single "TeamA — score — TeamB" match row, marking the winner in bold.
const matchRowHtml = (labels, teamA, teamB, status, firstRound = false) => {
  const bye = (raw) => raw || (firstRound ? labels.bye : "—");
  const winner = status?.winner;
  const score = scoreString(status?.state);
  const name = (side, raw) =>
    `<span class="${winner === side ? "win" : ""}">${escapeHtml(bye(raw))}</span>`;
  return `<tr>
    <td class="m-team m-a">${name("a", teamA)}</td>
    <td class="m-score">${escapeHtml(score || labels.noResult)}</td>
    <td class="m-team m-b">${name("b", teamB)}</td>
  </tr>`;
};

// A titled block of matches (one knockout phase, or one bracket round).
const phaseBlockHtml = (labels, title, matches) => {
  if (!matches.length) return "";
  const rows = matches
    .map((m) => matchRowHtml(labels, m.a, m.b, m.status, m.firstRound))
    .join("");
  return `<div class="phase">
    <div class="phase-title">${escapeHtml(title)}</div>
    <table class="matches">${rows}</table>
  </div>`;
};

const statusOf = (statuses, round, matchIndex) =>
  statuses?.[`${round}:${matchIndex}`] || null;

// Group-system knockout phases → [{title, matches}], in play order.
const groupKnockoutBlocks = (labels, draw, statuses) => {
  const blocks = [];
  const qf = (draw.quarterfinals || []).map((m, i) => ({
    a: m?.a,
    b: m?.b,
    status: statusOf(statuses, QUARTER_ROUND, i),
  }));
  blocks.push(phaseBlockHtml(labels, labels.quarterfinals, qf.filter((m) => m.a || m.b)));

  const sf = (draw.semifinals || []).map((m, i) => ({
    a: m?.a,
    b: m?.b,
    status: statusOf(statuses, SEMI_ROUND, i),
  }));
  blocks.push(phaseBlockHtml(labels, labels.semifinals, sf.filter((m) => m.a || m.b)));

  if (draw.third?.a || draw.third?.b) {
    blocks.push(
      phaseBlockHtml(labels, labels.thirdPlace, [
        {
          a: draw.third.a,
          b: draw.third.b,
          status: statusOf(statuses, THIRD_PLACE_ROUND, 0),
        },
      ])
    );
  }
  if (draw.final?.a || draw.final?.b) {
    blocks.push(
      phaseBlockHtml(labels, labels.final, [
        {
          a: draw.final.a,
          b: draw.final.b,
          status: statusOf(statuses, FINAL_ROUND, 0),
        },
      ])
    );
  }
  return blocks.join("");
};

// One group's standings table + its matches.
const groupBlockHtml = (labels, group, groupRound, statuses) => {
  const standings = groupStandings(group, groupRound, statuses)
    .map(
      (s, i) => `<tr>
        <td>${i + 1}</td>
        <td class="s-name">${escapeHtml(s.team)}</td>
        <td>${s.played}</td>
        <td>${s.wins}</td>
        <td>${s.losses}</td>
      </tr>`
    )
    .join("");
  const matches = group.matches
    .map((m, mi) =>
      matchRowHtml(labels, m.a, m.b, statusOf(statuses, groupRound, mi))
    )
    .join("");
  return `<div class="group">
    <div class="phase-title">${escapeHtml(group.name || "")}</div>
    <table class="standings">
      <tr class="s-head"><td>#</td><td class="s-name">${escapeHtml(
        labels.standings
      )}</td><td>${escapeHtml(labels.played)}</td><td>${escapeHtml(
    labels.wins
  )}</td><td>${escapeHtml(labels.losses)}</td></tr>
      ${standings}
    </table>
    <table class="matches">${matches}</table>
  </div>`;
};

// Elimination round label mirrors the on-screen bracket (final / semis / quarters
// / "Round of N").
const eliminationRoundLabel = (labels, matchCount) => {
  if (matchCount === 1) return labels.final;
  if (matchCount === 2) return labels.semifinals;
  if (matchCount === 4) return labels.quarterfinals;
  return labels.roundOf(matchCount * 2);
};

const bodyForFullDraw = (labels, draw, statuses) => {
  if (draw.system === "group") {
    const groups = (draw.groups || [])
      .map((g, gi) => groupBlockHtml(labels, g, gi, statuses))
      .join("");
    return `<div class="groups">${groups}</div>${groupKnockoutBlocks(
      labels,
      draw,
      statuses
    )}`;
  }

  const rounds = (draw.rounds || [])
    .map((round, ri) => {
      const matches = round.map((m, i) => ({
        a: m.a,
        b: m.b,
        status: statusOf(statuses, ri, i),
        firstRound: ri === 0,
      }));
      return phaseBlockHtml(labels, eliminationRoundLabel(labels, round.length), matches);
    })
    .join("");
  const third =
    draw.thirdPlace && (draw.thirdPlace.a || draw.thirdPlace.b)
      ? phaseBlockHtml(labels, labels.thirdPlace, [
          {
            a: draw.thirdPlace.a,
            b: draw.thirdPlace.b,
            status: statusOf(statuses, THIRD_PLACE_ROUND, 0),
          },
        ])
      : "";
  return rounds + third;
};

// Draw phase label for a schedule cell (used by the per-day sheet). With more
// than one category draw, the category is prefixed ("Машки парови · Група 1").
const phaseLabelFor = (labels, entries, cellMatch) => {
  const entry = entries.find((e) => e.slot === cellMatch.slot) || entries[0];
  const draw = entry?.draw;
  const round = cellMatch.localRound ?? cellMatch.round;
  let phase = "";
  if (round === QUARTER_ROUND) phase = labels.quarterfinals;
  else if (round === SEMI_ROUND) phase = labels.semifinals;
  else if (round === FINAL_ROUND) phase = labels.final;
  else if (round === THIRD_PLACE_ROUND) phase = labels.thirdPlace;
  else if (draw?.system === "group") phase = draw.groups?.[round]?.name || "";
  else {
    const roundArr = draw?.rounds?.[round];
    phase = roundArr ? eliminationRoundLabel(labels, roundArr.length) : "";
  }
  const cat = entries.length > 1 ? categoryLabelMk(entry?.category) : "";
  return [cat, phase].filter(Boolean).join(" · ");
};

// One day's matches (from the schedule), in play order, with phase + result.
const bodyForDay = (labels, tournamentDraw, schedule, statuses, dayFilter) => {
  const entries = listDraws(tournamentDraw);
  const rows = scheduleGrid(tournamentDraw, schedule).filter(
    (r) => dayFilter == null || r.day === dayFilter
  );
  const body = rows
    .flatMap((row) =>
      row.cells
        .map((cellMatch, ci) => {
          if (!cellMatch) return "";
          const st = statusOf(statuses, cellMatch.round, cellMatch.matchIndex);
          const score = scoreString(st?.state);
          const name = (side, raw) =>
            `<span class="${st?.winner === side ? "win" : ""}">${escapeHtml(
              raw || labels.bye
            )}</span>`;
          return `<tr>
            <td class="d-time">${escapeHtml(slotTimeLabel(row, labels))}</td>
            <td class="d-court">${escapeHtml(labels.courts[ci] || "")}</td>
            <td class="d-phase">${escapeHtml(
              phaseLabelFor(labels, entries, cellMatch)
            )}</td>
            <td class="d-match">${name("a", cellMatch.teamA)} <span class="vs">${escapeHtml(
            labels.vs
          )}</span> ${name("b", cellMatch.teamB)}</td>
            <td class="d-score">${escapeHtml(score || labels.noResult)}</td>
          </tr>`;
        })
        .filter(Boolean)
    )
    .join("");
  return `<table class="day">
    <tr class="d-head">
      <td>${escapeHtml(labels.time)}</td>
      <td>${escapeHtml(labels.court)}</td>
      <td>${escapeHtml(labels.phase)}</td>
      <td>${escapeHtml(labels.match)}</td>
      <td>${escapeHtml(labels.result)}</td>
    </tr>
    ${body}
  </table>`;
};

const PRINT_STYLES = `
  @page { margin: 12mm; }
  html { color-scheme: light; }
  body { font-family: Arial, "Segoe UI", sans-serif; color: #111; background: #fff; margin: 0; padding: 18px; }
  table { width: 100%; border-collapse: collapse; }
  .band td { padding: 6px 8px; font-size: 13px; vertical-align: top; }
  .band-l { font-weight: bold; width: 40%; }
  .band-c { text-align: center; font-weight: bold; }
  .band-r { text-align: right; font-weight: bold; white-space: nowrap; }
  .info { border-top: 2px solid #111; border-bottom: 2px solid #111; margin-bottom: 14px; }
  .info td { padding: 6px 8px; font-size: 12px; vertical-align: top; }
  .info .center { text-align: center; }
  .info .right { text-align: right; }
  .info .lbl { font-weight: bold; }
  .win { font-weight: bold; }
  .phase { margin-bottom: 14px; break-inside: avoid; }
  .phase-title { font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; background: #eee; padding: 5px 8px; border: 1px solid #111; border-bottom: none; }
  .matches td { border: 1px solid #111; padding: 7px 8px; font-size: 12px; vertical-align: middle; }
  .matches .m-team { width: 42%; }
  .matches .m-a { text-align: right; }
  .matches .m-b { text-align: left; }
  .matches .m-score { text-align: center; white-space: nowrap; font-weight: bold; background: #fafafa; }
  .groups { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .group { break-inside: avoid; }
  .standings td { border: 1px solid #111; padding: 4px 6px; font-size: 11px; text-align: center; }
  .standings .s-head td { font-weight: bold; background: #f2f2f2; }
  .standings .s-name { text-align: left; }
  .group .matches { margin-top: -1px; }
  .day td { border: 1px solid #111; padding: 7px 8px; font-size: 12px; vertical-align: middle; }
  .day .d-head td { font-weight: bold; background: #f2f2f2; }
  .day .d-score { text-align: center; white-space: nowrap; font-weight: bold; }
  .day .d-match .vs { color: #666; font-style: italic; }
  .cat-title { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 18px 0 10px; padding-bottom: 4px; border-bottom: 2px solid #111; break-after: avoid; }
  .cat-title:first-child { margin-top: 0; }
  @media print { body { padding: 0; } }
`;

const openAndPrint = (html) => {
  const w = window.open("", "_blank", "width=900,height=760");
  if (!w) {
    alert("Please allow pop-ups to download the draw PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
};

// `meta`: { dateRange, club, referee } — the same header fields the schedule
// sheet shows. `subtitle` (optional) appends e.g. the day to the title band.
const shellHtml = (labels, tournamentName, meta, subtitle, body) => {
  const heading = subtitle ? `${labels.title} — ${subtitle}` : labels.title;
  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(heading)} - ${escapeHtml(tournamentName)}</title>
<style>${PRINT_STYLES}</style></head>
<body>
  <table class="band">
    <tr>
      <td class="band-l">${escapeHtml(tournamentName)}</td>
      <td class="band-c">${escapeHtml(heading)}</td>
      <td class="band-r">${escapeHtml(meta?.dateRange || "")}</td>
    </tr>
  </table>
  <table class="info">
    <tr>
      <td><span class="lbl">${escapeHtml(labels.date)}</span><br>${escapeHtml(
    meta?.dateRange || ""
  )}</td>
      <td class="center"><span class="lbl">${escapeHtml(
        labels.club
      )}</span><br>${escapeHtml(meta?.club || "")}</td>
      <td class="right"><span class="lbl">${escapeHtml(
        labels.referee
      )}</span><br>${escapeHtml(meta?.referee || "")}</td>
    </tr>
  </table>
  ${body}
</body></html>`;
};

// Whole draw, every result, on one sheet. `tournamentDraw` is the stored
// tournaments.draw (every category draw is printed, each under its own title);
// `statuses` is keyed by live_scores round (category offset included).
export const printDraw = (tournamentName, tournamentDraw, statuses, meta = {}) => {
  const entries = listDraws(tournamentDraw);
  if (!entries.length) return;
  const labels = DRAW_LABELS;
  const body = entries
    .map((e) => {
      const title = categoryLabelMk(e.category);
      const inner = bodyForFullDraw(
        labels,
        e.draw,
        statusesForSlot(statuses || {}, e.slot)
      );
      return title && entries.length > 1
        ? `<h2 class="cat-title">${escapeHtml(title)}</h2>${inner}`
        : inner;
    })
    .join("");
  const subtitle =
    entries.length === 1 ? categoryLabelMk(entries[0].category) || null : null;
  openAndPrint(shellHtml(labels, tournamentName, meta, subtitle, body));
};

// One playing day's matches (from the schedule) with their draw phase + result.
export const printDrawDay = (
  tournamentName,
  tournamentDraw,
  schedule,
  statuses,
  dayFilter = null,
  meta = {}
) => {
  if (!tournamentDraw) return;
  const labels = DRAW_LABELS;
  const body = bodyForDay(
    labels,
    tournamentDraw,
    schedule,
    statuses || {},
    dayFilter
  );
  openAndPrint(shellHtml(labels, tournamentName, meta, dayFilter, body));
};
