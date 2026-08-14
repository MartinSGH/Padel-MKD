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
  DEFAULT_SCHEDULE,
} from "../lib/scheduleBuild";

const emptySchedule = () => ({
  dateRange: "",
  club: "",
  referee: "",
  startTime: DEFAULT_SCHEDULE.startTime,
  intervalMinutes: DEFAULT_SCHEDULE.intervalMinutes,
});

const normalize = (s) => ({
  dateRange: s?.dateRange || "",
  club: s?.club || "",
  referee: s?.referee || "",
  startTime: s?.startTime || DEFAULT_SCHEDULE.startTime,
  intervalMinutes: s?.intervalMinutes || DEFAULT_SCHEDULE.intervalMinutes,
});

const AdminTournamentSchedule = ({ tournaments }) => {
  const [selectedId, setSelectedId] = useState("");
  // The fresh tournament row (so a draw published a moment ago is picked up
  // without a page reload — the `tournaments` prop can be stale).
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [schedule, setSchedule] = useState(emptySchedule());
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const draw = selectedTournament?.draw || null;
  const rows = draw ? scheduleGrid(draw, schedule) : [];

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

  const handlePrint = () => {
    if (selectedTournament) {
      printSchedule(selectedTournament.name, schedule, draw);
    }
  };

  return (
    <div className="admin-card admin-draw-card">
      <div className="admin-card-header">
        <div>
          <h2>Playing schedule</h2>
          <p>
            The matches come straight from the published draw. Just set the start
            time of the first two matches — the courts (Терен 1 / Терен 2) and all
            the following times are calculated automatically.
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
                <span>Start time (first two matches)</span>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => setField("startTime", e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>Interval between slots (minutes)</span>
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

            {rows.length === 0 ? (
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
              <button
                type="button"
                className="admin-btn admin-edit-btn"
                onClick={handlePrint}
                disabled={rows.length === 0}
              >
                Export PDF
              </button>
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
