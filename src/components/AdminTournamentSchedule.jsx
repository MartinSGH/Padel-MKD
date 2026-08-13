import { useState } from "react";
import PropTypes from "prop-types";
import { updateTournament } from "../services/tournaments";
import { printSchedule, SCHEDULE_LABELS } from "../lib/schedulePrint";

const COURTS = SCHEDULE_LABELS.courts; // fixed 2 courts

const emptyDay = () => ({
  dayLabel: "",
  date: "",
  rows: [
    ["", ""],
    ["", ""],
  ],
});

const emptySchedule = () => ({
  dateRange: "",
  club: "",
  referee: "",
  days: [emptyDay()],
});

// Normalise a stored schedule so every day has exactly 2 court cells per row.
const normalize = (sched) => {
  if (!sched || !Array.isArray(sched.days) || sched.days.length === 0) {
    return emptySchedule();
  }
  return {
    dateRange: sched.dateRange || "",
    club: sched.club || "",
    referee: sched.referee || "",
    days: sched.days.map((d) => ({
      dayLabel: d.dayLabel || "",
      date: d.date || "",
      rows:
        Array.isArray(d.rows) && d.rows.length
          ? d.rows.map((r) => [r[0] || "", r[1] || ""])
          : [["", ""]],
    })),
  };
};

const AdminTournamentSchedule = ({ tournaments }) => {
  const [selectedId, setSelectedId] = useState("");
  const [schedule, setSchedule] = useState(emptySchedule());
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const selectedTournament =
    tournaments.find((tn) => tn.id === selectedId) || null;

  const handleSelect = (id) => {
    setSelectedId(id);
    setMsg("");
    const tn = tournaments.find((x) => x.id === id);
    setPublished(!!tn?.schedule);
    setSchedule(normalize(tn?.schedule));
  };

  // ---- header fields ----
  const setField = (field, value) =>
    setSchedule((s) => ({ ...s, [field]: value }));

  // ---- day helpers ----
  const setDayField = (di, field, value) =>
    setSchedule((s) => ({
      ...s,
      days: s.days.map((d, i) => (i === di ? { ...d, [field]: value } : d)),
    }));

  const addDay = () =>
    setSchedule((s) => ({ ...s, days: [...s.days, emptyDay()] }));

  const removeDay = (di) =>
    setSchedule((s) => ({
      ...s,
      days: s.days.length > 1 ? s.days.filter((_, i) => i !== di) : s.days,
    }));

  // ---- row / cell helpers ----
  const addRow = (di) =>
    setSchedule((s) => ({
      ...s,
      days: s.days.map((d, i) =>
        i === di ? { ...d, rows: [...d.rows, ["", ""]] } : d
      ),
    }));

  const removeRow = (di, ri) =>
    setSchedule((s) => ({
      ...s,
      days: s.days.map((d, i) =>
        i === di
          ? {
              ...d,
              rows:
                d.rows.length > 1
                  ? d.rows.filter((_, r) => r !== ri)
                  : d.rows,
            }
          : d
      ),
    }));

  const setCell = (di, ri, ci, value) =>
    setSchedule((s) => ({
      ...s,
      days: s.days.map((d, i) =>
        i === di
          ? {
              ...d,
              rows: d.rows.map((row, r) =>
                r === ri ? row.map((c, k) => (k === ci ? value : c)) : row
              ),
            }
          : d
      ),
    }));

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
    if (!selectedTournament) return;
    printSchedule(selectedTournament.name, schedule, SCHEDULE_LABELS);
  };

  return (
    <div className="admin-card admin-draw-card">
      <div className="admin-card-header">
        <div>
          <h2>Playing schedule</h2>
          <p>
            Fill in the playing schedule (План за играње) — one sheet per day,
            two courts. Publish it to show a “Schedule” tab on the tournament
            page, or export it as a printable PDF.
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

        {selectedId && (
          <>
            <div className="admin-schedule-head">
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

            {schedule.days.map((day, di) => (
              <div className="admin-schedule-day" key={di}>
                <div className="admin-schedule-day-head">
                  <label className="admin-field">
                    <span>Day (e.g. петок)</span>
                    <input
                      type="text"
                      placeholder="петок"
                      value={day.dayLabel}
                      onChange={(e) =>
                        setDayField(di, "dayLabel", e.target.value)
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span>Date</span>
                    <input
                      type="text"
                      placeholder="14.08.2026"
                      value={day.date}
                      onChange={(e) => setDayField(di, "date", e.target.value)}
                    />
                  </label>
                  {schedule.days.length > 1 && (
                    <button
                      type="button"
                      className="admin-btn decline"
                      onClick={() => removeDay(di)}
                    >
                      Remove day
                    </button>
                  )}
                </div>

                <div className="admin-schedule-grid-wrap">
                  <table className="admin-schedule-grid">
                    <thead>
                      <tr>
                        <th className="corner" />
                        {COURTS.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                        <th className="corner" />
                      </tr>
                    </thead>
                    <tbody>
                      {day.rows.map((row, ri) => (
                        <tr key={ri}>
                          <td className="rownum">
                            {SCHEDULE_LABELS.match} {ri + 1}
                          </td>
                          {COURTS.map((_, ci) => (
                            <td key={ci}>
                              <textarea
                                rows={3}
                                placeholder={
                                  "Почеток 9,00 часот\nИме Презиме\nvs\nИме Презиме"
                                }
                                value={row[ci]}
                                onChange={(e) =>
                                  setCell(di, ri, ci, e.target.value)
                                }
                              />
                            </td>
                          ))}
                          <td className="rowdel">
                            {day.rows.length > 1 && (
                              <button
                                type="button"
                                className="admin-schedule-x"
                                aria-label="Remove match"
                                onClick={() => removeRow(di, ri)}
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  className="admin-btn admin-edit-btn"
                  onClick={() => addRow(di)}
                >
                  + Add match
                </button>
              </div>
            ))}

            <div className="admin-schedule-actions">
              <button
                type="button"
                className="admin-btn admin-edit-btn"
                onClick={addDay}
              >
                + Add day
              </button>
              <button
                type="button"
                className="admin-btn admin-edit-btn"
                onClick={handlePrint}
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
