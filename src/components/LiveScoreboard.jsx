import "../styles/LiveScoreboard.css";
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  DEFAULT_CONFIG,
  initState,
  applyPoint,
  undo,
  gameLabel,
  isGoldenPoint,
} from "../lib/padelScore";
import {
  getMatch,
  startMatch,
  saveState,
  endMatch,
  editMatch,
  discardMatch,
  subscribeToMatch,
} from "../services/liveScores";
import { formatDateRange } from "../lib/tournamentUtils";

const clockText = (start, end) => {
  if (!start) return "";
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
};

const LiveScoreboard = ({
  tournament,
  round,
  matchIndex,
  teamA,
  teamB,
  isAdmin,
  onClose,
  onDrawChanged,
  t,
  lang,
}) => {
  const [match, setMatch] = useState(null);
  const [sstate, setSstate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  const sstateRef = useRef(sstate);
  sstateRef.current = sstate;

  const L = (k, fallback) => t(`tournamentsPage.live.${k}`, fallback);

  const load = async () => {
    const data = await getMatch(tournament.id, round, matchIndex).catch(
      () => null
    );
    setMatch(data);
    setSstate((prev) => {
      if (!data?.state) return prev;
      if (!isAdmin) return data.state; // viewers always mirror the server
      if (prev == null) return data.state; // first load
      if (data.status !== "live") return data.state; // not actively scoring
      return prev; // keep the admin's local, authoritative state
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = subscribeToMatch(tournament.id, round, matchIndex, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, round, matchIndex]);

  // Match clock ticks while live.
  useEffect(() => {
    if (match?.status !== "live") return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [match?.status]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = match?.status || "not_started";
  const canScore = isAdmin && (status === "live" || editing);
  const golden = sstate && isGoldenPoint(sstate);
  const points = sstate ? gameLabel(sstate) : { a: "", b: "" };
  const sets = sstate?.setsGames || [];

  const point = (team) => {
    if (!canScore || !match || !sstate || sstate.winner) return;
    const ns = applyPoint(sstate, team);
    setSstate(ns);
    saveState(match.id, ns).catch(() => {});
  };
  const doUndo = () => {
    if (!canScore || !match || !sstate) return;
    const ns = undo(sstate);
    setSstate(ns);
    saveState(match.id, ns).catch(() => {});
  };

  const start = async () => {
    setBusy(true);
    try {
      const init = initState(config);
      const row = await startMatch({
        tournamentId: tournament.id,
        round,
        matchIndex,
        teamA,
        teamB,
        config,
        state: init,
      });
      setMatch(row);
      setSstate(init);
    } catch (e) {
      alert(e.message || "Failed to start the match.");
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    if (!sstate?.winner || !match) return;
    setBusy(true);
    try {
      await endMatch(match.id, tournament.id, sstate, sstate.winner);
      await load();
      onDrawChanged && onDrawChanged();
    } catch (e) {
      alert(e.message || "Failed to end the match.");
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (!match) return;
    if (
      !window.confirm(
        L(
          "discardConfirm",
          "Discard this match and reset it to not started?"
        )
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await discardMatch(match.id, tournament.id);
      onDrawChanged && onDrawChanged();
      onClose();
    } catch (e) {
      alert(e.message || "Failed to discard the match.");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!match) return;
    setBusy(true);
    try {
      await editMatch(
        match.id,
        tournament.id,
        sstate,
        sstate?.winner || null
      );
      await load();
      onDrawChanged && onDrawChanged();
      setEditing(false);
    } catch (e) {
      alert(e.message || "Failed to save the changes.");
    } finally {
      setBusy(false);
    }
  };

  const nameA = teamA || match?.team_a || "A";
  const nameB = teamB || match?.team_b || "B";
  const winnerSide = sstate?.winner;

  const teamRow = (side, name, isWinner) => (
    <div className={`ls-row${isWinner ? " ls-row-win" : ""}`}>
      <span className="ls-name">{name}</span>
      <span className="ls-sets">
        {sets.map((setGames, i) => (
          <span className="ls-set" key={i}>
            {setGames[side === "a" ? 0 : 1]}
          </span>
        ))}
      </span>
      {(status === "live" || editing) && !sstate?.winner && (
        <span className={`ls-points${golden ? " ls-points-gp" : ""}`}>
          {points[side]}
        </span>
      )}
    </div>
  );

  return (
    <div className="ls-overlay" onClick={onClose}>
      <div
        className="ls-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="ls-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="ls-head">
          <span className="ls-tournament">{tournament.name}</span>
          <span
            className={`ls-status ls-status-${status}`}
          >
            {status === "live" && (
              <>
                <span className="ls-live-dot" /> {L("live", "LIVE")}
              </>
            )}
            {status === "finished" && L("finished", "Finished")}
            {status === "not_started" && L("notStarted", "Not started")}
          </span>
        </div>

        {loading ? (
          <p className="ls-msg">…</p>
        ) : status === "not_started" ? (
          <div className="ls-prestart">
            <div className="ls-teams-static">
              <strong>{nameA}</strong>
              <span className="ls-vs">{L("vs", "vs")}</span>
              <strong>{nameB}</strong>
            </div>
            {isAdmin ? (
              <>
                <div className="ls-config">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.goldenPoint}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          goldenPoint: e.target.checked,
                        }))
                      }
                    />
                    {L("goldenPoint", "Golden point")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={config.thirdSetSuperTB}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          thirdSetSuperTB: e.target.checked,
                        }))
                      }
                    />
                    {L("superTB", "3rd set super tie-break")}
                  </label>
                </div>
                <button
                  type="button"
                  className="ls-btn ls-btn-primary"
                  onClick={start}
                  disabled={busy}
                >
                  {busy ? "…" : L("start", "Start match")}
                </button>
              </>
            ) : (
              <p className="ls-msg">
                {L("startsOn", "Starts on")}{" "}
                {formatDateRange(
                  tournament.start_date,
                  tournament.end_date,
                  lang
                )}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="ls-board">
              {teamRow("a", nameA, winnerSide === "a")}
              {teamRow("b", nameB, winnerSide === "b")}
            </div>

            <div className="ls-meta">
              {golden && (
                <span className="ls-gp-tag">{L("goldenPointTag", "Golden point")}</span>
              )}
              <span className="ls-clock">
                {clockText(match?.started_at, match?.ended_at)}
              </span>
            </div>

            {sstate?.winner && !editing && (
              <p className="ls-winner">
                🏆 {L("winner", "Winner")}:{" "}
                <strong>{winnerSide === "a" ? nameA : nameB}</strong>
              </p>
            )}

            {isAdmin && (status === "live" || editing) && (
              <div className="ls-controls">
                {!sstate?.winner && (
                  <div className="ls-point-btns">
                    <button
                      type="button"
                      className="ls-btn ls-btn-point"
                      onClick={() => point("a")}
                    >
                      +1 {nameA}
                    </button>
                    <button
                      type="button"
                      className="ls-btn ls-btn-point"
                      onClick={() => point("b")}
                    >
                      +1 {nameB}
                    </button>
                  </div>
                )}
                <div className="ls-action-btns">
                  <button
                    type="button"
                    className="ls-btn ls-btn-ghost"
                    onClick={doUndo}
                    disabled={!sstate?.history?.length}
                  >
                    {L("undo", "Undo")}
                  </button>
                  {editing ? (
                    <button
                      type="button"
                      className="ls-btn ls-btn-primary"
                      onClick={saveEdit}
                      disabled={busy}
                    >
                      {L("save", "Save")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ls-btn ls-btn-primary"
                      onClick={end}
                      disabled={busy || !sstate?.winner}
                    >
                      {L("end", "End match")}
                    </button>
                  )}
                </div>
              </div>
            )}

            {isAdmin && status === "finished" && !editing && (
              <button
                type="button"
                className="ls-btn ls-btn-ghost ls-edit"
                onClick={() => setEditing(true)}
              >
                {L("edit", "Edit result")}
              </button>
            )}

            {isAdmin && match && (
              <button
                type="button"
                className="ls-btn ls-btn-danger ls-discard"
                onClick={discard}
                disabled={busy}
              >
                {L("discard", "Discard match")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

LiveScoreboard.propTypes = {
  tournament: PropTypes.object.isRequired,
  round: PropTypes.number.isRequired,
  matchIndex: PropTypes.number.isRequired,
  teamA: PropTypes.string,
  teamB: PropTypes.string,
  isAdmin: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onDrawChanged: PropTypes.func,
  t: PropTypes.func.isRequired,
  lang: PropTypes.string,
};

export default LiveScoreboard;
