import { useState } from "react";
import PropTypes from "prop-types";
import {
  updateTournament,
  getTournamentById,
} from "../services/tournaments";
import { printSchedule, SCHEDULE_LABELS } from "../lib/schedulePrint";
import {
  scheduleGrid,
  slotTimeLabel,
  slotTime,
  schedulePool,
  autoLayout,
  scheduleWarnings,
  DEFAULT_SCHEDULE,
  GROUP_SCHEDULE_DAYS,
} from "../lib/scheduleBuild";
import { listDraws } from "../lib/drawSet";

const emptySchedule = () => ({
  dateRange: "",
  club: "",
  referee: "",
  startTime: DEFAULT_SCHEDULE.startTime,
  intervalMinutes: DEFAULT_SCHEDULE.intervalMinutes,
  // Day 2 = the knockout day (quarterfinals → semis → final). Its own start
  // time + interval; empty start time means "same as day 1".
  day2StartTime: "",
  day2IntervalMinutes: DEFAULT_SCHEDULE.intervalMinutes,
  // "auto": order derived from the draw. "manual": the admin's own order, kept
  // in `manual` (per day, slots of match keys — see scheduleBuild.js).
  mode: "auto",
  manual: null,
});

const COURTS = SCHEDULE_LABELS.courts.length;

// A clean, mutable copy of the manual layout with exactly `dayCount` days and
// COURTS cells per slot.
const cloneLayout = (manual, dayCount) =>
  Array.from({ length: dayCount }, (_, d) =>
    (Array.isArray(manual?.[d]) ? manual[d] : []).map((slot) =>
      Array.from({ length: COURTS }, (_, c) =>
        Array.isArray(slot) && slot[c] != null ? slot[c] : null
      )
    )
  );

const normalize = (s) => ({
  dateRange: s?.dateRange || "",
  club: s?.club || "",
  referee: s?.referee || "",
  startTime: s?.startTime || DEFAULT_SCHEDULE.startTime,
  intervalMinutes: s?.intervalMinutes || DEFAULT_SCHEDULE.intervalMinutes,
  day2StartTime: s?.day2StartTime || "",
  day2IntervalMinutes:
    s?.day2IntervalMinutes || DEFAULT_SCHEDULE.intervalMinutes,
  mode: s?.mode === "manual" ? "manual" : "auto",
  manual: Array.isArray(s?.manual) ? s.manual : null,
});

// One match as a draggable chip (pool or court slot).
const MatchChip = ({
  m,
  showCategory,
  selected,
  onSelect,
  onRemove,
  onDragStart,
}) => {
  const solo = m.teamA && !m.teamB;
  return (
    <div
      className={`admin-manual-chip admin-sched-chip${
        m.placeholder ? " placeholder" : ""
      }${selected ? " selected" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, m.key)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(m.key);
      }}
      title="Drag to a court, or click and then click a court"
    >
      <div className="admin-sched-chip-body">
        <div className="admin-sched-chip-meta">
          {showCategory && m.category ? `${m.category} · ` : ""}
          {m.label}
        </div>
        <div className="admin-sched-chip-teams">
          {m.teamA}
          {!solo && (
            <>
              {" "}
              <span className="vs">{SCHEDULE_LABELS.vs}</span> {m.teamB}
            </>
          )}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          className="admin-manual-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(m.key);
          }}
          aria-label="Back to unplaced matches"
        >
          ×
        </button>
      )}
    </div>
  );
};

MatchChip.propTypes = {
  m: PropTypes.object.isRequired,
  showCategory: PropTypes.bool,
  selected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  onDragStart: PropTypes.func.isRequired,
};

const AdminTournamentSchedule = ({ tournaments }) => {
  const [selectedId, setSelectedId] = useState("");
  // The fresh tournament row (so a draw published a moment ago is picked up
  // without a page reload — the `tournaments` prop can be stale).
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [schedule, setSchedule] = useState(emptySchedule());
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  // Manual mode: the match picked for click-to-place (alternative to dragging).
  const [selectedKey, setSelectedKey] = useState(null);

  // The stored draw column: one draw per category (Men's / Women's …), all
  // scheduled together on the same two courts.
  const draw = selectedTournament?.draw || null;
  const drawEntries = listDraws(draw);
  const isGroup = drawEntries.some((e) => e.draw?.system === "group");
  const multiDraw = drawEntries.length > 1;
  const rows = draw ? scheduleGrid(draw, schedule) : [];

  // ---- Manual mode ---------------------------------------------------------
  const isManual = schedule.mode === "manual";
  const pool = draw ? schedulePool(draw) : { matches: [], days: [null] };
  const dayCount = pool.days.length;
  const byKey = new Map(pool.matches.map((m) => [m.key, m]));
  const layout = cloneLayout(schedule.manual, dayCount);
  const placedKeys = new Set(
    layout.flat(2).filter((k) => k != null && byKey.has(k))
  );
  const unplaced = pool.matches.filter((m) => !placedKeys.has(m.key));
  const unplacedRequired = unplaced.filter((m) => !m.optional);
  const unplacedOptional = unplaced.filter((m) => m.optional);
  const warnings = isManual && draw ? scheduleWarnings(draw, schedule) : [];

  const setLayout = (fn) =>
    setSchedule((s) => {
      const next = cloneLayout(s.manual, dayCount);
      fn(next);
      return { ...s, manual: next };
    });

  const enterManual = () => {
    setSelectedKey(null);
    setSchedule((s) => {
      // First time (or nothing placed yet): start from the automatic order.
      const hasAny =
        Array.isArray(s.manual) && s.manual.flat(2).some((k) => k != null);
      return {
        ...s,
        mode: "manual",
        manual: hasAny ? s.manual : autoLayout(draw),
      };
    });
  };

  const enterAuto = () => {
    setSelectedKey(null);
    setField("mode", "auto");
  };

  const resetFromAuto = () => {
    if (
      !window.confirm(
        "Replace your manual order with the automatic schedule?"
      )
    ) {
      return;
    }
    setSelectedKey(null);
    setField("manual", autoLayout(draw));
  };

  const clearManual = () => {
    setSelectedKey(null);
    setLayout((L) =>
      L.forEach((slots) => slots.forEach((cells) => cells.fill(null)))
    );
  };

  // Put match `key` on court `c` of slot `r`, day `d`. A match already there
  // swaps into the moved match's old place (or back to the pool).
  const placeMatch = (key, d, r, c) => {
    setSelectedKey(null);
    setLayout((L) => {
      if (!L[d]?.[r]) return;
      let from = null;
      L.forEach((slots, dd) =>
        slots.forEach((cells, rr) =>
          cells.forEach((k, cc) => {
            if (k === key) {
              if (!from) from = [dd, rr, cc];
              cells[cc] = null;
            }
          })
        )
      );
      const occupant = L[d][r][c];
      L[d][r][c] = key;
      if (from && occupant !== key) L[from[0]][from[1]][from[2]] = occupant;
    });
  };

  const unplaceMatch = (key) => {
    setSelectedKey(null);
    setLayout((L) =>
      L.forEach((slots) =>
        slots.forEach((cells) =>
          cells.forEach((k, c) => {
            if (k === key) cells[c] = null;
          })
        )
      )
    );
  };

  const insertSlot = (d, at) =>
    setLayout((L) => L[d].splice(at, 0, Array(COURTS).fill(null)));
  const removeSlot = (d, r) => setLayout((L) => L[d].splice(r, 1));

  const onChipDragStart = (e, key) => {
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
  };
  const allowDrop = (e) => e.preventDefault();
  const onCellDrop = (e, d, r, c) => {
    e.preventDefault();
    const key = e.dataTransfer.getData("text/plain");
    if (key) placeMatch(key, d, r, c);
  };
  const onPoolDrop = (e) => {
    e.preventDefault();
    const key = e.dataTransfer.getData("text/plain");
    if (key) unplaceMatch(key);
  };
  const toggleSelect = (key) =>
    setSelectedKey((cur) => (cur === key ? null : key));

  const handleSelect = async (id) => {
    setSelectedId(id);
    setMsg("");
    if (!id) {
      setSelectedTournament(null);
      return;
    }
    // Fetch the latest tournament so we read the just-published draw.
    const tn =
      (await getTournamentById(id).catch(() => null)) ||
      tournaments.find((x) => x.id === id) ||
      null;
    setSelectedTournament(tn);
    setPublished(!!tn?.schedule);
    setSchedule(normalize(tn?.schedule));
    setSelectedKey(null);
  };

  const setField = (field, value) =>
    setSchedule((s) => ({ ...s, [field]: value }));

  const handlePublish = async () => {
    if (!selectedId) return;
    setSaving(true);
    setMsg("");
    try {
      await updateTournament(selectedId, { schedule });
      setPublished(true);
      setMsg(
        "Schedule published — the “Schedule” tab is now visible to everyone."
      );
    } catch (err) {
      setMsg(err.message || "Failed to publish the schedule.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedId) return;
    setSaving(true);
    setMsg("");
    try {
      await updateTournament(selectedId, { schedule: null });
      setPublished(false);
      setMsg("Schedule unpublished — the tab is hidden again.");
    } catch (err) {
      setMsg(err.message || "Failed to unpublish the schedule.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (dayFilter = null) => {
    if (selectedTournament) {
      printSchedule(selectedTournament.name, schedule, draw, dayFilter);
    }
  };

  // Which day labels actually have matches (group draws span two days; an
  // elimination draw is a single day, so per-day export doesn't apply).
  const dayLabels = isGroup
    ? GROUP_SCHEDULE_DAYS.filter((d) => rows.some((r) => r.day === d))
    : [];

  return (
    <div className="admin-card admin-draw-card">
      <div className="admin-card-header">
        <div>
          <h2>Playing schedule</h2>
          <p>
            The matches come straight from the published draw(s) — when a
            tournament has several category draws (e.g. Men&apos;s and
            Women&apos;s pairs), they share the two courts in one schedule, and a
            pair is never put on both courts at the same time. Just set the start
            time of the first two matches — the courts (Терен 1 / Терен 2) and all
            the following times are calculated automatically. For a group
            tournament you can set Day 1 (group stage) and Day 2 times
            separately. A category with only one group (e.g. Women&apos;s pairs)
            plays its matches first on Day 2, followed by the quarterfinals →
            semifinals → 3rd place → final; the knockout matchups appear once the
            quarterfinal draw is made.
          </p>
          <p>
            <strong>Manual</strong> lets you set the order yourself: drag each
            match onto a court and time slot (or click a match, then click a
            slot). Quarterfinals, semifinals and the final can be placed before
            their pairs are known — they show as “Квалификант” / “Победник 1/4”
            and switch to the real pairs automatically once they qualify.
          </p>
        </div>
      </div>

      <div className="admin-draw-body">
        <div className="admin-draw-controls">
          <label className="admin-field">
            <span>Tournament</span>
            <select
              value={selectedId}
              onChange={(e) => handleSelect(e.target.value)}
            >
              <option value="">Select a tournament…</option>
              {tournaments.map((tn) => (
                <option key={tn.id} value={tn.id}>
                  {tn.name}
                </option>
              ))}
            </select>
          </label>
          {selectedId && draw && (
            <div className="admin-draw-modes">
              <button
                type="button"
                className={`admin-mode-btn${!isManual ? " active" : ""}`}
                onClick={enterAuto}
              >
                Automatic
              </button>
              <button
                type="button"
                className={`admin-mode-btn${isManual ? " active" : ""}`}
                onClick={enterManual}
              >
                Manual
              </button>
            </div>
          )}
        </div>

        {selectedId && !draw && (
          <p className="admin-empty-state">
            Publish the draw first — the schedule is built from the draw’s pairs.
          </p>
        )}

        {selectedId && draw && (
          <>
            <div className="admin-schedule-head">
              <label className="admin-field">
                <span>
                  {isGroup
                    ? "Day 1 · Group stage — start time"
                    : "Start time (first two matches)"}
                </span>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => setField("startTime", e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>
                  {isGroup
                    ? "Day 1 · interval (minutes)"
                    : "Interval between slots (minutes)"}
                </span>
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={schedule.intervalMinutes}
                  onChange={(e) =>
                    setField(
                      "intervalMinutes",
                      parseInt(e.target.value, 10) || 60
                    )
                  }
                />
              </label>
              {isGroup && (
                <>
                  <label className="admin-field">
                    <span>Day 2 · Knockout — start time</span>
                    <input
                      type="time"
                      value={schedule.day2StartTime}
                      onChange={(e) =>
                        setField("day2StartTime", e.target.value)
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span>Day 2 · interval (minutes)</span>
                    <input
                      type="number"
                      min="10"
                      step="5"
                      value={schedule.day2IntervalMinutes}
                      onChange={(e) =>
                        setField(
                          "day2IntervalMinutes",
                          parseInt(e.target.value, 10) || 60
                        )
                      }
                    />
                  </label>
                </>
              )}
              <label className="admin-field">
                <span>{SCHEDULE_LABELS.date} (range)</span>
                <input
                  type="text"
                  placeholder="14-16.08.2026"
                  value={schedule.dateRange}
                  onChange={(e) => setField("dateRange", e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>{SCHEDULE_LABELS.club}</span>
                <input
                  type="text"
                  placeholder="Тенис Клуб Поинтер / Скопје"
                  value={schedule.club}
                  onChange={(e) => setField("club", e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>{SCHEDULE_LABELS.referee}</span>
                <input
                  type="text"
                  placeholder="Име Презиме 07x xxx xxx"
                  value={schedule.referee}
                  onChange={(e) => setField("referee", e.target.value)}
                />
              </label>
            </div>

            {isManual ? (
              <div className="admin-manual-draw">
                <div className="admin-draw-modes-actions">
                  <button
                    type="button"
                    className="admin-btn admin-edit-btn"
                    onClick={resetFromAuto}
                  >
                    Reset to automatic order
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-edit-btn"
                    onClick={clearManual}
                  >
                    Clear
                  </button>
                </div>

                <div
                  className={`admin-manual-pool admin-sched-pool${
                    selectedKey && placedKeys.has(selectedKey)
                      ? " droppable"
                      : ""
                  }`}
                  onDragOver={allowDrop}
                  onDrop={onPoolDrop}
                  onClick={() =>
                    selectedKey && placedKeys.has(selectedKey)
                      ? unplaceMatch(selectedKey)
                      : setSelectedKey(null)
                  }
                >
                  <div className="admin-manual-pool-head">
                    Unplaced matches ({unplacedRequired.length})
                  </div>
                  {unplacedRequired.length === 0 ? (
                    <span className="admin-manual-pool-empty">
                      All matches placed.
                    </span>
                  ) : (
                    unplacedRequired.map((m) => (
                      <MatchChip
                        key={m.key}
                        m={m}
                        showCategory={multiDraw}
                        selected={selectedKey === m.key}
                        onSelect={toggleSelect}
                        onDragStart={onChipDragStart}
                      />
                    ))
                  )}
                  {unplacedOptional.length > 0 && (
                    <>
                      <div className="admin-manual-pool-head admin-sched-pool-sub">
                        Optional knockout — only if played (
                        {unplacedOptional.length})
                      </div>
                      {unplacedOptional.map((m) => (
                        <MatchChip
                          key={m.key}
                          m={m}
                          showCategory={multiDraw}
                          selected={selectedKey === m.key}
                          onSelect={toggleSelect}
                          onDragStart={onChipDragStart}
                        />
                      ))}
                    </>
                  )}
                </div>

                {warnings.length > 0 && (
                  <ul className="admin-sched-warnings">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}

                {pool.days.map((dayLabel, d) => (
                  <div className="admin-schedule-grid-wrap" key={d}>
                    <table className="admin-schedule-grid admin-sched-manual">
                      <thead>
                        {dayLabel && (
                          <tr className="admin-schedule-dayrow">
                            <td colSpan={COURTS + 2}>{dayLabel}</td>
                          </tr>
                        )}
                        <tr>
                          <th className="corner" />
                          {SCHEDULE_LABELS.courts.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                          <th className="corner" />
                        </tr>
                      </thead>
                      <tbody>
                        {layout[d].map((cells, r) => (
                          <tr key={r}>
                            <td className="rownum">
                              <div>
                                {SCHEDULE_LABELS.match} {r + 1}
                              </div>
                              <div className="admin-sched-time">
                                {slotTime(schedule, d, r)}
                              </div>
                            </td>
                            {cells.map((k, c) => {
                              const m = k != null ? byKey.get(k) : null;
                              return (
                                <td
                                  key={c}
                                  className={`admin-sched-cell${
                                    m ? " filled" : ""
                                  }${selectedKey ? " droppable" : ""}`}
                                  onDragOver={allowDrop}
                                  onDrop={(e) => onCellDrop(e, d, r, c)}
                                  onClick={() =>
                                    selectedKey &&
                                    placeMatch(selectedKey, d, r, c)
                                  }
                                >
                                  {m ? (
                                    <MatchChip
                                      m={m}
                                      showCategory={multiDraw}
                                      selected={selectedKey === m.key}
                                      onSelect={(key) =>
                                        selectedKey && selectedKey !== key
                                          ? placeMatch(selectedKey, d, r, c)
                                          : toggleSelect(key)
                                      }
                                      onRemove={unplaceMatch}
                                      onDragStart={onChipDragStart}
                                    />
                                  ) : (
                                    <span className="admin-manual-empty">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="rowdel">
                              <button
                                type="button"
                                className="admin-schedule-x admin-sched-rowbtn"
                                onClick={() => insertSlot(d, r)}
                                title="Insert an empty slot above"
                                aria-label="Insert an empty slot above"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                className="admin-schedule-x"
                                onClick={() => removeSlot(d, r)}
                                title="Remove this slot (its matches go back to unplaced)"
                                aria-label="Remove slot"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      className="admin-btn admin-edit-btn admin-sched-addslot"
                      onClick={() => insertSlot(d, layout[d].length)}
                    >
                      + Add slot{dayLabel ? ` (${dayLabel})` : ""}
                    </button>
                  </div>
                ))}
                <p className="admin-sched-hint">
                  An empty slot is left out of the published schedule but keeps
                  its time — use it for a break.
                </p>
              </div>
            ) : rows.length === 0 ? (
              <p className="admin-empty-state">
                No matches to schedule yet — the draw has no playable pairs.
              </p>
            ) : (
              <div className="admin-schedule-grid-wrap">
                <table className="admin-schedule-grid admin-schedule-preview">
                  <thead>
                    <tr>
                      <th className="corner" />
                      {SCHEDULE_LABELS.courts.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const out = [];
                      let curDay = null;
                      let n = 0;
                      rows.forEach((row, ri) => {
                        if (row.day && row.day !== curDay) {
                          curDay = row.day;
                          n = 0;
                          out.push(
                            <tr key={`d-${ri}`} className="admin-schedule-dayrow">
                              <td colSpan={SCHEDULE_LABELS.courts.length + 1}>
                                {row.day}
                              </td>
                            </tr>
                          );
                        }
                        n += 1;
                        out.push(
                          <tr key={ri}>
                            <td className="rownum">
                              {SCHEDULE_LABELS.match} {n}
                            </td>
                            {SCHEDULE_LABELS.courts.map((_, ci) => {
                              const mt = row.cells[ci];
                              const solo = mt && mt.teamA && !mt.teamB;
                              return (
                                <td key={ci} className="cell">
                                  {mt ? (
                                    <>
                                      {multiDraw && mt.category && (
                                        <div className="cat">{mt.category}</div>
                                      )}
                                      <div className="t">
                                        {slotTimeLabel(row, SCHEDULE_LABELS)}
                                      </div>
                                      <div>{mt.teamA}</div>
                                      {!solo && (
                                        <>
                                          <div className="vs">
                                            {SCHEDULE_LABELS.vs}
                                          </div>
                                          <div>{mt.teamB}</div>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                      return out;
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-schedule-actions">
              {isGroup && dayLabels.length > 1 ? (
                <>
                  {dayLabels.map((d, di) => (
                    <button
                      key={d}
                      type="button"
                      className="admin-btn admin-edit-btn"
                      onClick={() => handlePrint(d)}
                      disabled={rows.length === 0}
                    >
                      Export Day {di + 1} PDF ({d})
                    </button>
                  ))}
                  <button
                    type="button"
                    className="admin-btn admin-edit-btn"
                    onClick={() => handlePrint()}
                    disabled={rows.length === 0}
                  >
                    Export both days
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="admin-btn admin-edit-btn"
                  onClick={() => handlePrint()}
                  disabled={rows.length === 0}
                >
                  Export PDF
                </button>
              )}
              <button
                type="button"
                className="admin-btn approve"
                onClick={handlePublish}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : published
                    ? "Update / re-publish"
                    : "Publish schedule"}
              </button>
              {published && (
                <button
                  type="button"
                  className="admin-btn decline"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  Unpublish
                </button>
              )}
            </div>

            {msg && <p className="admin-draw-publish-msg">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
};

AdminTournamentSchedule.propTypes = {
  tournaments: PropTypes.array.isRequired,
};

export default AdminTournamentSchedule;
