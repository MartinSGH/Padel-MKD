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

const emptyGroups = () =>
  Array.from({ length: GROUP_COUNT }, () => []);

const AdminGroupBuilder = ({
  pairs,
  tournamentId,
  tournamentName,
  initialDraw,
  published,
  onPublishedChange,
}) => {
  // Seed from an already-published group draw
  const seed = () => {
    if (
      initialDraw?.system === "group" &&
      Array.isArray(initialDraw.groups)
    ) {
      return initialDraw.groups.map((g) =>
        (g.teams || []).map(
          (label) =>
            pairs.find((p) => p.label === label) || {
              id: label,
              label,
            }
        )
      );
    }

    return emptyGroups();
  };

  const [groups, setGroups] = useState(seed);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const placedIds = new Set();

  groups.forEach((g) => {
    g.forEach((p) => {
      placedIds.add(p.id);
    });
  });

  const pool = pairs.filter((p) => !placedIds.has(p.id));
  const placedCount = pairs.length - pool.length;

  // --------------------------------------------------
  // Assignment
  // --------------------------------------------------

  const autoFill = () => {
    setGroups(autoAssignGroups(pairs, GROUP_COUNT));
  };

  const clearAll = () => {
    setGroups(emptyGroups());
  };

  const moveTo = (pairId, targetGroup) => {
    setGroups((prev) => {
      const next = prev.map((g) =>
        g.filter((p) => p.id !== pairId)
      );

      const pairObj = pairs.find((p) => p.id === pairId);

      if (pairObj && targetGroup != null) {
        next[targetGroup].push(pairObj);
      }

      return next;
    });
  };

  const removeFromGroups = (pairId) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.filter((p) => p.id !== pairId)
      )
    );
  };

  // --------------------------------------------------
  // Drag & Drop
  // --------------------------------------------------

  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropGroup = (e, gi) => {
    e.preventDefault();

    const id = e.dataTransfer.getData("text/plain");

    if (id) {
      moveTo(id, gi);
    }
  };

  const onDropPool = (e) => {
    e.preventDefault();

    const id = e.dataTransfer.getData("text/plain");

    if (id) {
      removeFromGroups(id);
    }
  };

  const allow = (e) => {
    e.preventDefault();
  };

  const canPublish = groups.some(
    (g) => g.length >= 2
  );

  // --------------------------------------------------
  // Publish
  // --------------------------------------------------

  const handlePublish = async () => {
    setBusy(true);
    setMsg("");

    try {
      const draw = buildGroupDraw(
        groups
          .filter((g) => g.length)
          .map((g) => g.map((p) => p.label))
      );

      await updateTournament(tournamentId, { draw });

      onPublishedChange(true);

      setMsg(
        "Group draw published — visible to everyone on the Draw tab."
      );
    } catch (err) {
      setMsg(
        err.message ||
          "Failed to publish the group draw."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // Remove Published Draw
  // --------------------------------------------------

  const handleRemove = async () => {
    setBusy(true);
    setMsg("");

    try {
      await updateTournament(tournamentId, {
        draw: null,
      });

      onPublishedChange(false);

      setMsg("Published draw removed.");
    } catch (err) {
      setMsg(
        err.message ||
          "Failed to remove the draw."
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // Print / PDF
  // --------------------------------------------------

  const handlePrint = () => {
  const groupBlocks = groups
    .map((g, gi) => {
      const groupName =
        GROUP_NAMES[gi] || `Group ${gi + 1}`;

      const teams = g.length
        ? g
            .map(
              (p, i) => `
                <div class="team">
                  <span class="team-number">${i + 1}</span>
                  <span>${escapeHtml(p.label)}</span>
                </div>
              `
            )
            .join("")
        : `
            <div class="empty-team">
              No teams assigned
            </div>
          `;

      return `
        <div class="group-box">
          <div class="group-title">
            ${escapeHtml(groupName)}
          </div>

          <div class="group-teams">
            ${teams}
          </div>
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />

      <title>
        ${escapeHtml(tournamentName)} - Group Draw
      </title>

      <style>
        @page {
          size: A4 landscape;
          margin: 12mm;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #fff;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          padding: 18px 24px;
        }

        /* =========================================
           HEADER
        ========================================= */

        .header {
          text-align: center;
          margin-bottom: 25px;
        }

        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
        }

        .subtitle {
          margin: 5px 0 0;
          color: #b8860b;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .tournament-name {
          margin-top: 7px;
          font-size: 15px;
          font-weight: 700;
        }

        /* =========================================
           MAIN DRAW
        ========================================= */

        .draw {
          width: 100%;
          min-height: 520px;

          display: grid;

          /*
            Groups | Semifinals | 3rd Place | Final
          */
          grid-template-columns:
            1.35fr
            1fr
            0.9fr
            0.9fr;

          column-gap: 28px;

          align-items: center;
          justify-content: center;
        }

        /* =========================================
           GROUPS
        ========================================= */

        .groups {
          height: 100%;

          display: flex;
          flex-direction: column;

          justify-content: center;

          gap: 12px;
        }

        .group-box {
          width: 100%;

          border: 1.5px solid #222;
          border-radius: 7px;

          overflow: hidden;

          background: #fff;
        }

        .group-title {
          padding: 7px 10px;

          background: #111;
          color: #fff;

          text-align: left;

          font-size: 12px;
          font-weight: 800;

          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .group-teams {
          padding: 3px 0;
          min-height: 48px;
        }

        .team {
          display: flex;
          align-items: center;

          min-height: 25px;

          padding: 4px 9px;

          border-bottom: 1px solid #eee;

          font-size: 11px;
        }

        .team:last-child {
          border-bottom: none;
        }

        .team-number {
          width: 22px;

          color: #999;

          font-weight: 700;
        }

        .empty-team {
          padding: 10px;

          color: #999;

          font-size: 11px;
          font-style: italic;
        }

        /* =========================================
           SEMIFINAL COLUMN
        ========================================= */

        .semifinals {
          height: 100%;

          display: flex;
          flex-direction: column;

          justify-content: center;

          gap: 90px;

          position: relative;
        }

        .column-title {
          position: absolute;

          top: 25px;
          left: 0;
          right: 0;

          text-align: center;

          color: #b8860b;

          font-size: 12px;
          font-weight: 800;

          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* =========================================
           MATCH BOX
        ========================================= */

        .match {
          position: relative;

          width: 100%;

          border: 1.5px solid #222;
          border-radius: 7px;

          background: #fff;

          overflow: visible;
        }

        .match-title {
          padding: 7px 5px;

          background: #111;
          color: #fff;

          text-align: center;

          font-size: 10px;
          font-weight: 800;

          text-transform: uppercase;
        }

        .match-team {
          min-height: 27px;

          padding: 6px 8px;

          border-bottom: 1px solid #eee;

          font-size: 10px;

          color: #444;
        }

        .match-team:last-child {
          border-bottom: none;
        }

        /* =========================================
           CONNECTOR LINES
        ========================================= */

        .semi-top::after {
          content: "";

          position: absolute;

          right: -28px;
          top: 50%;

          width: 28px;

          border-top: 1.5px solid #222;
        }

        .semi-bottom::after {
          content: "";

          position: absolute;

          right: -28px;
          top: 50%;

          width: 28px;

          border-top: 1.5px solid #222;
        }

        /* =========================================
           THIRD PLACE
        ========================================= */

        .third-place {
          display: flex;

          align-items: center;
          justify-content: center;

          height: 100%;
        }

        .third-place .match {
          width: 100%;
        }

        .third-place .match::before {
          content: "";

          position: absolute;

          left: -28px;
          top: 50%;

          width: 28px;

          border-top: 1.5px solid #222;
        }

        .third-place .match-title {
          background: #555;
        }

        /* =========================================
           FINAL
        ========================================= */

        .final {
          display: flex;

          align-items: center;
          justify-content: center;

          height: 100%;
        }

        .final .match {
          width: 100%;

          border: 2px solid #b8860b;
        }

        .final .match::before {
          content: "";

          position: absolute;

          left: -28px;
          top: 50%;

          width: 28px;

          border-top: 1.5px solid #222;
        }

        .final .match-title {
          background: #b8860b;
        }

        /* =========================================
           PRINT
        ========================================= */

        @media print {
          body {
            padding: 0;
          }

          .draw {
            min-height: 520px;
            page-break-inside: avoid;
          }

          .group-box,
          .match {
            break-inside: avoid;
          }
        }
      </style>
    </head>

    <body>

      <div class="header">

        <h1>
          Padel Federation of Macedonia
        </h1>

        <div class="subtitle">
          Group Draw · Групна фаза
        </div>

        <div class="tournament-name">
          ${escapeHtml(tournamentName)}
        </div>

      </div>


      <div class="draw">

        <!-- GROUPS -->

        <div class="groups">
          ${groupBlocks}
        </div>


        <!-- SEMIFINALS -->

        <div class="semifinals">

          <div class="column-title">
            Semifinals
          </div>

          <div class="match semi-top">

            <div class="match-title">
              G1 - G4
            </div>

            <div class="match-team">
              G1 — __________________
            </div>

            <div class="match-team">
              G4 — __________________
            </div>

          </div>


          <div class="match semi-bottom">

            <div class="match-title">
              G2 - G3
            </div>

            <div class="match-team">
              G2 — __________________
            </div>

            <div class="match-team">
              G3 — __________________
            </div>

          </div>

        </div>


        <!-- THIRD PLACE -->

        <div class="third-place">

          <div class="match">

            <div class="match-title">
              Match for 3rd Place
            </div>

            <div class="match-team">
              __________________
            </div>

            <div class="match-team">
              __________________
            </div>

          </div>

        </div>


        <!-- FINAL -->

        <div class="final">

          <div class="match">

            <div class="match-title">
              Final
            </div>

            <div class="match-team">
              __________________
            </div>

            <div class="match-team">
              __________________
            </div>

          </div>

        </div>

      </div>

    </body>
    </html>
  `;

  const w = window.open(
    "",
    "_blank",
    "width=1200,height=800"
  );

  if (!w) {
    alert(
      "Please allow pop-ups to export the PDF."
    );
    return;
  }

  w.document.write(html);
  w.document.close();
  w.focus();

  setTimeout(() => {
    w.print();
  }, 400);
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

      {msg && (
        <p className="admin-draw-publish-msg">
          {msg}
        </p>
      )}

      <div
        className="admin-group-pool"
        onDragOver={allow}
        onDrop={onDropPool}
      >
        <div className="admin-group-pool-head">
          Unassigned pairs ({pool.length})
        </div>

        {pool.length === 0 ? (
          <span className="admin-group-pool-empty">
            All pairs assigned.
          </span>
        ) : (
          pool.map((p) => (
            <div
              key={p.id}
              className="admin-group-chip"
              draggable
              onDragStart={(e) =>
                onDragStart(e, p.id)
              }
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
            onDrop={(e) =>
              onDropGroup(e, gi)
            }
          >

            <div className="admin-group-card-head">
              {GROUP_NAMES[gi] ||
                `Group ${gi + 1}`}

              <span className="admin-group-count">
                {g.length}
              </span>
            </div>

            {g.length === 0 ? (
              <span className="admin-group-empty">
                Drop pairs here
              </span>
            ) : (
              g.map((p) => (
                <div
                  key={p.id}
                  className="admin-group-chip"
                  draggable
                  onDragStart={(e) =>
                    onDragStart(e, p.id)
                  }
                >
                  <span>{p.label}</span>

                  <button
                    type="button"
                    className="admin-group-remove"
                    onClick={() =>
                      removeFromGroups(p.id)
                    }
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