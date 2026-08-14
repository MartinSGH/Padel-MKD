import { useState } from "react";
import PropTypes from "prop-types";
import { updateTournament } from "../services/tournaments";
import {
  autoAssignGroups,
  buildGroupDraw,
  GROUP_COUNT,
  GROUP_NAMES,
} from "../lib/groupDraw";

const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const emptyGroups = () => Array.from({ length: GROUP_COUNT }, () => []);

const AdminGroupBuilder = ({
  pairs,
  tournamentId,
  tournamentName,
  initialDraw,
  published,
  onPublishedChange,
}) => {
  // Seed from an already-published group draw (match labels back to pairs), else
  // empty groups.
  const seed = () => {
    if (initialDraw?.system === "group" && Array.isArray(initialDraw.groups)) {
      return initialDraw.groups.map((g) =>
        (g.teams || []).map(
          (label) =>
            pairs.find((p) => p.label === label) || { id: label, label }
        )
      );
    }
    return emptyGroups();
  };

  const [groups, setGroups] = useState(seed);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const placedIds = new Set();
  groups.forEach((g) => g.forEach((p) => placedIds.add(p.id)));
  const pool = pairs.filter((p) => !placedIds.has(p.id));
  const placedCount = pairs.length - pool.length;

  // ---- assignment ----
  const autoFill = () => {
    setGroups(autoAssignGroups(pairs, GROUP_COUNT));
  };
  const clearAll = () => setGroups(emptyGroups());

  const moveTo = (pairId, targetGroup) => {
    setGroups((prev) => {
      const next = prev.map((g) => g.filter((p) => p.id !== pairId));
      const pairObj = pairs.find((p) => p.id === pairId);
      if (pairObj && targetGroup != null) next[targetGroup].push(pairObj);
      return next;
    });
  };
  const removeFromGroups = (pairId) =>
    setGroups((prev) => prev.map((g) => g.filter((p) => p.id !== pairId)));

  // ---- drag & drop ----
  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropGroup = (e, gi) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveTo(id, gi);
  };
  const onDropPool = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) removeFromGroups(id);
  };
  const allow = (e) => e.preventDefault();

  const canPublish = groups.some((g) => g.length >= 2);

  const handlePublish = async () => {
    setBusy(true);
    setMsg("");
    try {
      const draw = buildGroupDraw(
        groups.filter((g) => g.length).map((g) => g.map((p) => p.label))
      );
      await updateTournament(tournamentId, { draw });
      onPublishedChange(true);
      setMsg("Group draw published — visible to everyone on the Draw tab.");
    } catch (err) {
      setMsg(err.message || "Failed to publish the group draw.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setMsg("");
    try {
      await updateTournament(tournamentId, { draw: null });
      onPublishedChange(false);
      setMsg("Published draw removed.");
    } catch (err) {
      setMsg(err.message || "Failed to remove the draw.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const blocks = groups
      .filter((g) => g.length)
      .map((g, gi) => {
        const teams = g.map((p) => p.label);
        const rows = teams
          .map(
            (t, i) =>
              `<tr><td class="n">${i + 1}</td><td>${escapeHtml(t)}</td></tr>`
          )
          .join("");
        return `<div class="grp"><h2>${escapeHtml(
          GROUP_NAMES[gi] || `Group ${gi + 1}`
        )}</h2><table>${rows}</table></div>`;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Groups - ${escapeHtml(tournamentName)}</title>
<style>
  @page { margin: 12mm; } html { color-scheme: light; }
  body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 20px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #b8860b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; margin: 0 0 18px; }
  .grid { display: flex; flex-wrap: wrap; gap: 18px; }
  .grp { flex: 1 1 300px; border: 1px solid #ccc; border-radius: 8px; padding: 12px 14px; }
  .grp h2 { font-size: 15px; color: #b8860b; margin: 0 0 10px; border-bottom: 2px solid #111; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px; border-bottom: 1px solid #eee; font-size: 14px; }
  td.n { width: 28px; color: #999; font-weight: bold; }
</style></head>
<body>
  <h1>Padel Federation of Macedonia</h1>
  <p class="sub">Group draw · Групна фаза</p>
  <p><strong>${escapeHtml(tournamentName)}</strong></p>
  <div class="grid">${blocks}</div>
</body></html>`;
    const w = window.open("", "_blank", "width=1000,height=760");
    if (!w) {
      alert("Please allow pop-ups to export the PDF.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="admin-group-builder">
      <div className="admin-draw-summary">
        <span className="admin-count-pill">
          {placedCount}/{pairs.length} pairs placed
        </span>
        {published && (
          <span className="admin-tournament-status admin-tournament-status-active">
            Published
          </span>
        )}
        <button
          type="button"
          className="admin-btn admin-edit-btn"
          onClick={autoFill}
        >
          Auto-draw groups
        </button>
        <button
          type="button"
          className="admin-btn admin-edit-btn"
          onClick={clearAll}
        >
          Clear
        </button>
        <button
          type="button"
          className="admin-btn admin-edit-btn"
          onClick={handlePrint}
          disabled={!canPublish}
        >
          Export PDF
        </button>
        <button
          type="button"
          className="admin-btn approve"
          onClick={handlePublish}
          disabled={busy || !canPublish}
        >
          {busy
            ? "Publishing…"
            : published
              ? "Re-publish groups"
              : "Publish groups"}
        </button>
        {published && (
          <button
            type="button"
            className="admin-btn decline"
            onClick={handleRemove}
            disabled={busy}
          >
            Remove published
          </button>
        )}
      </div>

      {msg && <p className="admin-draw-publish-msg">{msg}</p>}

      <div
        className="admin-group-pool"
        onDragOver={allow}
        onDrop={onDropPool}
      >
        <div className="admin-group-pool-head">Unassigned pairs ({pool.length})</div>
        {pool.length === 0 ? (
          <span className="admin-group-pool-empty">All pairs assigned.</span>
        ) : (
          pool.map((p) => (
            <div
              key={p.id}
              className="admin-group-chip"
              draggable
              onDragStart={(e) => onDragStart(e, p.id)}
            >
              {p.label}
            </div>
          ))
        )}
      </div>

      <div className="admin-groups-grid">
        {groups.map((g, gi) => (
          <div
            className="admin-group-card"
            key={gi}
            onDragOver={allow}
            onDrop={(e) => onDropGroup(e, gi)}
          >
            <div className="admin-group-card-head">
              {GROUP_NAMES[gi] || `Group ${gi + 1}`}
              <span className="admin-group-count">{g.length}</span>
            </div>
            {g.length === 0 ? (
              <span className="admin-group-empty">Drop pairs here</span>
            ) : (
              g.map((p) => (
                <div
                  key={p.id}
                  className="admin-group-chip"
                  draggable
                  onDragStart={(e) => onDragStart(e, p.id)}
                >
                  <span>{p.label}</span>
                  <button
                    type="button"
                    className="admin-group-remove"
                    onClick={() => removeFromGroups(p.id)}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

AdminGroupBuilder.propTypes = {
  pairs: PropTypes.array.isRequired,
  tournamentId: PropTypes.string.isRequired,
  tournamentName: PropTypes.string,
  initialDraw: PropTypes.object,
  published: PropTypes.bool,
  onPublishedChange: PropTypes.func.isRequired,
};

export default AdminGroupBuilder;
