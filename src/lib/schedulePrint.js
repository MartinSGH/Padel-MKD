// Printable "playing schedule" (План за играње) in the classic tennis-federation
// layout. The matches are derived from the draw (two courts, hourly slots); the
// admin only sets the start time.

import { scheduleGrid, slotTimeLabel } from "./scheduleBuild";

// The sheet is an official Macedonian federation document, so its frame labels
// stay in Macedonian regardless of the site's UI language. Two fixed courts.
export const SCHEDULE_LABELS = {
  title: "План за играње",
  date: "Дата",
  club: "Клуб / Град",
  referee: "Судија / Делегат",
  match: "Натпревар",
  courts: ["Терен 1", "Терен 2"],
  startAt: "Почеток",
  notBefore: "Не пред",
  hour: "часот",
  vs: "vs",
};

const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const cellHtml = (row, mt, labels) => {
  if (!mt) return "&nbsp;";
  return `<div class="t">${escapeHtml(slotTimeLabel(row, labels))}</div>
<div>${escapeHtml(mt.teamA)}</div><div class="vs">${escapeHtml(labels.vs)}</div><div>${escapeHtml(mt.teamB)}</div>`;
};

export const printSchedule = (tournamentName, schedule, draw) => {
  const labels = SCHEDULE_LABELS;
  const rows = scheduleGrid(draw, schedule);

  const headCourts = labels.courts
    .map((c) => `<td class="court">${escapeHtml(c)}</td>`)
    .join("");

  const body = rows
    .map(
      (row, i) =>
        `<tr><td class="rownum">${escapeHtml(labels.match)} ${i + 1}</td>` +
        labels.courts
          .map(
            (_, ci) => `<td class="cell">${cellHtml(row, row.cells[ci], labels)}</td>`
          )
          .join("") +
        `</tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(labels.title)} - ${escapeHtml(tournamentName)}</title>
<style>
  @page { margin: 12mm; }
  html { color-scheme: light; }
  body { font-family: Arial, "Segoe UI", sans-serif; color: #111; background: #fff; margin: 0; padding: 18px; }
  table { width: 100%; border-collapse: collapse; }
  .band td { padding: 6px 8px; font-size: 13px; vertical-align: top; }
  .band-l { font-weight: bold; width: 40%; }
  .band-c { text-align: center; font-weight: bold; }
  .band-r { text-align: right; font-weight: bold; white-space: nowrap; }
  .info { border-top: 2px solid #111; border-bottom: 2px solid #111; margin-bottom: 10px; }
  .info td { padding: 6px 8px; font-size: 12px; vertical-align: top; }
  .info .center { text-align: center; }
  .info .right { text-align: right; }
  .info .lbl { font-weight: bold; }
  .grid td { border: 1px solid #111; padding: 8px 6px; font-size: 12px; text-align: center; vertical-align: middle; line-height: 1.4; }
  .grid .ghead td { font-weight: bold; background: #f2f2f2; }
  .grid .corner { width: 90px; background: #fff; }
  .grid .rownum { font-weight: bold; white-space: nowrap; }
  .grid .cell { min-width: 160px; }
  .grid .cell .t { font-weight: bold; margin-bottom: 2px; }
  .grid .cell .vs { color: #666; font-style: italic; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <table class="band">
    <tr>
      <td class="band-l">${escapeHtml(tournamentName)}</td>
      <td class="band-c">${escapeHtml(labels.title)}</td>
      <td class="band-r">${escapeHtml(schedule?.dateRange || "")}</td>
    </tr>
  </table>
  <table class="info">
    <tr>
      <td><span class="lbl">${escapeHtml(labels.date)}</span><br>${escapeHtml(schedule?.dateRange || "")}</td>
      <td class="center"><span class="lbl">${escapeHtml(labels.club)}</span><br>${escapeHtml(schedule?.club || "")}</td>
      <td class="right"><span class="lbl">${escapeHtml(labels.referee)}</span><br>${escapeHtml(schedule?.referee || "")}</td>
    </tr>
  </table>
  <table class="grid">
    <tr class="ghead"><td class="corner"></td>${headCourts}</tr>
    ${body}
  </table>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=760");
  if (!w) {
    alert("Please allow pop-ups to download the schedule PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
};
