import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { updateTournament } from "../services/tournaments";
import { getTournamentMatches } from "../services/liveScores";
import {
  autoAssignGroups,
  buildGroupDraw,
  groupQualifiers,
  allGroupsComplete,
  recomputeGroupDraw,
  resultMapFromRows,
  GROUP_COUNT,
  GROUP_NAMES,
  QUARTER_COUNT,
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

  // ---- Quarterfinal draw (top 2 of each group, drawn manually) -------------
  const seedQf = () => {
    const stored = initialDraw?.quarterfinals;
    return Array.from({ length: QUARTER_COUNT }, (_, i) => ({
      a: (stored && stored[i]?.a) || null,
      b: (stored && stored[i]?.b) || null,
    }));
  };
  const [qf, setQf] = useState(seedQf);
  const [resultMap, setResultMap] = useState({});
  const [qfBusy, setQfBusy] = useState(false);
  const [qfMsg, setQfMsg] = useState("");

  // Load the group results so we can list the qualifiers (top 2 per group).
  useEffect(() => {
    let active = true;
    if (!tournamentId) return undefined;
    getTournamentMatches(tournamentId)
      .then((rows) => {
        if (active) setResultMap(resultMapFromRows(rows));
      })
      .catch(() => {
        if (active) setResultMap({});
      });
    return () => {
      active = false;
    };
  }, [tournamentId]);

  const groupDrawPublished =
    published && initialDraw?.system === "group";
  const qualifiers = groupDrawPublished
    ? groupQualifiers(initialDraw, resultMap)
    : [];
  const groupsDone = groupDrawPublished
    ? allGroupsComplete(initialDraw, resultMap)
    : false;

  // Group-stage progress (e.g. 24 matches for 4 groups of 4), so the admin can
  // see how close the quarterfinal draw is to unlocking.
  const totalGroupMatches = groupDrawPublished
    ? (initialDraw.groups || []).reduce(
        (n, g) => n + (g.matches?.length || 0),
        0
      )
    : 0;
  const finishedGroupMatches = groupDrawPublished
    ? (initialDraw.groups || []).reduce(
        (n, g, gi) =>
          n +
          (g.matches || []).filter((_, mi) => {
            const r = resultMap[`${gi}:${mi}`];
            return r && (r.winner === "a" || r.winner === "b");
          }).length,
        0
      )
    : 0;

  // Flat list of qualifier chips: { id, label, groupName, rank }.
  const qualifierChips = [];
  qualifiers.forEach((q) => {
    q.teams.forEach((label, ri) => {
      if (label) {
        qualifierChips.push({
          id: label,
          label,
          groupName: q.name,
          rank: ri + 1,
        });
      }
    });
  });

  const placedQf = new Set();
  qf.forEach((m) => {
    if (m.a) placedQf.add(m.a);
    if (m.b) placedQf.add(m.b);
  });
  const qfPool = qualifierChips.filter((c) => !placedQf.has(c.label));
  const qfPlacedCount = qf.reduce(
    (n, m) => n + (m.a ? 1 : 0) + (m.b ? 1 : 0),
    0
  );

  const placeQf = (label, idx, slot) => {
    setQf((prev) => {
      const next = prev.map((m) => ({ ...m }));
      let ci = -1;
      let cs = null;
      next.forEach((m, i) => {
        if (m.a === label) {
          ci = i;
          cs = "a";
        }
        if (m.b === label) {
          ci = i;
          cs = "b";
        }
      });
      const occupant = next[idx][slot];
      next[idx][slot] = label;
      if (ci >= 0) next[ci][cs] = occupant || null;
      return next;
    });
  };

  const removeQf = (label) => {
    setQf((prev) =>
      prev.map((m) => ({
        a: m.a === label ? null : m.a,
        b: m.b === label ? null : m.b,
      }))
    );
  };

  const clearQf = () =>
    setQf(Array.from({ length: QUARTER_COUNT }, () => ({ a: null, b: null })));

  const onQfChipDragStart = (e, label) => {
    e.dataTransfer.setData("text/plain", label);
    e.dataTransfer.effectAllowed = "move";
  };
  const onQfSlotDrop = (e, idx, slot) => {
    e.preventDefault();
    const label = e.dataTransfer.getData("text/plain");
    if (label) placeQf(label, idx, slot);
  };
  const onQfPoolDrop = (e) => {
    e.preventDefault();
    const label = e.dataTransfer.getData("text/plain");
    if (label) removeQf(label);
  };

  const handlePublishQf = async () => {
    // Preserve the already-published group structure (so group results keep
    // mapping to the same match positions); only set the QF pairings and let the
    // later rounds recompute from any results already in.
    const base =
      initialDraw?.system === "group" && Array.isArray(initialDraw.groups)
        ? initialDraw
        : null;
    if (!base) {
      setQfMsg("Publish the group draw first.");
      return;
    }
    setQfBusy(true);
    setQfMsg("");
    try {
      const quarterfinals = qf.map((m) => ({
        a: m.a || null,
        b: m.b || null,
      }));
      const draw = recomputeGroupDraw(
        { ...base, quarterfinals },
        resultMap
      );
      await updateTournament(tournamentId, { draw });
      const rows = await getTournamentMatches(tournamentId).catch(() => []);
      setResultMap(resultMapFromRows(rows));
      onPublishedChange(true);
      setQfMsg(
        "Quarterfinal draw published — it's now live on the Draw and Schedule tabs."
      );
    } catch (err) {
      setQfMsg(err.message || "Failed to publish the quarterfinal draw.");
    } finally {
      setQfBusy(false);
    }
  };

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

  // Quarterfinal boxes: show the drawn pairing where set, blank lines otherwise.
  const qfBlocks = qf
    .map(
      (m, i) => `
        <div class="match qf-${i < 2 ? "top" : "bottom"}">
          <div class="match-title">1/4 ${i + 1}</div>
          <div class="match-team">
            ${m.a ? escapeHtml(m.a) : "__________________"}
          </div>
          <div class="match-team">
            ${m.b ? escapeHtml(m.b) : "__________________"}
          </div>
        </div>
      `
    )
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
          height: auto;
          background: #fff;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          padding: 14px 20px;
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
          min-height: 480px;

          display: grid;

          /*
            Groups | Quarterfinals | Semifinals | Finals (3rd place + Final)
          */
          grid-template-columns:
            1.25fr
            1fr
            1fr
            0.95fr;

          column-gap: 22px;

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

        .quarterfinals {
          height: 100%;

          display: flex;
          flex-direction: column;

          justify-content: center;

          gap: 16px;

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
           FINALS COLUMN (3rd place on top, Final below)
        ========================================= */

        .finals {
          height: 100%;

          display: flex;
          flex-direction: column;

          justify-content: center;

          gap: 40px;
        }

        .finals .third .match-title {
          background: #555;
        }

        .finals .final-box {
          border: 2px solid #b8860b;
        }

        .finals .final-box .match-title {
          background: #b8860b;
        }

        /* =========================================
           PRINT
        ========================================= */

        @media print {
          html,
          body {
            height: auto;
            padding: 0;
          }

          .draw {
            min-height: 460px;
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


        <!-- QUARTERFINALS -->

        <div class="quarterfinals">

          <div class="column-title">
            Quarterfinals
          </div>

          ${qfBlocks}

        </div>


        <!-- SEMIFINALS -->

        <div class="semifinals">

          <div class="column-title">
            Semifinals
          </div>

          <div class="match semi-top">

            <div class="match-title">
              1/2 1
            </div>

            <div class="match-team">
              __________________
            </div>

            <div class="match-team">
              __________________
            </div>

          </div>


          <div class="match semi-bottom">

            <div class="match-title">
              1/2 2
            </div>

            <div class="match-team">
              __________________
            </div>

            <div class="match-team">
              __________________
            </div>

          </div>

        </div>


        <!-- FINALS: 3rd place on top, Final below -->

        <div class="finals">

          <div class="match third">

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


          <div class="match final-box">

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

      {groupDrawPublished && (
        <div className="admin-qf-draw">
          <div className="admin-rescue-head">
            <h3>Quarterfinal draw</h3>
            <p>
              The top 2 of every group qualify (8 teams). Once every group match
              is finished, drag each qualifier into a quarterfinal slot to set
              the matchups manually, then publish — the semifinals, final and
              3rd-place match then fill in automatically as results come in.
            </p>
          </div>

          {!groupsDone ? (
            <div className="admin-qf-locked">
              <span className="admin-qf-lock-icon" aria-hidden="true">
                🔒
              </span>
              <div>
                <strong>Unlocks when the group stage is finished.</strong>
                <p className="admin-qf-hint">
                  {finishedGroupMatches}/{totalGroupMatches} group matches
                  played. The 8 qualifiers appear here once all results are in.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="admin-draw-summary">
                <span className="admin-count-pill">
                  {qfPlacedCount}/{QUARTER_COUNT * 2} placed
                </span>
                <button
                  type="button"
                  className="admin-btn admin-edit-btn"
                  onClick={clearQf}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="admin-btn approve"
                  onClick={handlePublishQf}
                  disabled={qfBusy || qfPlacedCount === 0}
                >
                  {qfBusy ? "Publishing…" : "Publish quarterfinals"}
                </button>
              </div>

              {qfMsg && <p className="admin-draw-publish-msg">{qfMsg}</p>}

              <div className="admin-manual-draw">
                <div
                  className="admin-manual-pool"
                  onDragOver={allow}
                  onDrop={onQfPoolDrop}
                >
                  <div className="admin-manual-pool-head">
                    Qualifiers ({qfPool.length})
                  </div>
                  {qfPool.length === 0 ? (
                    <span className="admin-manual-pool-empty">
                      All qualifiers placed.
                    </span>
                  ) : (
                    qfPool.map((c) => (
                      <div
                        key={c.id}
                        className="admin-manual-chip"
                        draggable
                        onDragStart={(e) => onQfChipDragStart(e, c.label)}
                      >
                        <span className="admin-qf-rank">
                          {c.groupName} · #{c.rank}
                        </span>
                        <span>{c.label}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="admin-qf-grid">
                  {qf.map((m, i) => (
                    <div className="admin-qf-match" key={i}>
                      <div className="admin-qf-match-head">QF {i + 1}</div>
                      {["a", "b"].map((slot) => {
                        const label = m[slot];
                        return (
                          <div
                            key={slot}
                            className={`admin-bracket-slot admin-bracket-slot-drop${
                              label ? " filled" : ""
                            }`}
                            onDragOver={allow}
                            onDrop={(e) => onQfSlotDrop(e, i, slot)}
                          >
                            {label ? (
                              <div
                                className="admin-manual-chip"
                                draggable
                                onDragStart={(e) => onQfChipDragStart(e, label)}
                              >
                                <span>{label}</span>
                                <button
                                  type="button"
                                  className="admin-manual-remove"
                                  onClick={() => removeQf(label)}
                                  aria-label="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <span className="admin-manual-empty">/</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

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