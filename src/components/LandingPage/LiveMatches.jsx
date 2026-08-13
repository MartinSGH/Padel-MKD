import "../../styles/LiveMatches.css";
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getLiveMatches, subscribeToLive } from "../../services/liveScores";
import { gameLabel } from "../../lib/padelScore";

const Row = ({ name, games, point, win }) => (
  <div className={`lm-row${win ? " lm-row-win" : ""}`}>
    <span className="lm-name">{name}</span>
    <span className="lm-games">
      {games.map((g, i) => (
        <span key={i} className="lm-game">
          {g}
        </span>
      ))}
    </span>
    {point !== "" && <span className="lm-point">{point}</span>}
  </div>
);

Row.propTypes = {
  name: PropTypes.string,
  games: PropTypes.array,
  point: PropTypes.string,
  win: PropTypes.bool,
};

const LiveMatches = () => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);

  const load = async () => {
    const rows = await getLiveMatches().catch(() => []);
    setMatches(rows);
  };

  useEffect(() => {
    load();
    const unsub = subscribeToLive(load);
    return unsub;
  }, []);

  if (matches.length === 0) return null;

  return (
    <section className="lm-section" data-aos="fade-up">
      <div className="lm-inner">
        <h2 className="lm-title">
          <span className="lm-dot" /> {t("live.sectionTitle", "Live now")}
        </h2>
        <div className="lm-grid">
          {matches.map((m) => {
            const state = m.state || {};
            const sets = state.setsGames || [];
            const gl = gameLabel(state);
            return (
              <Link
                to={`/tournaments/${m.tournament_id}`}
                className="lm-card"
                key={m.id}
              >
                <div className="lm-card-head">
                  <span className="lm-tournament">{m.tournaments?.name}</span>
                  <span className="lm-badge">
                    <span className="lm-dot" /> {t("live.live", "LIVE")}
                  </span>
                </div>
                <Row
                  name={m.team_a || "A"}
                  games={sets.map((s) => s[0])}
                  point={gl.a}
                  win={state.winner === "a"}
                />
                <Row
                  name={m.team_b || "B"}
                  games={sets.map((s) => s[1])}
                  point={gl.b}
                  win={state.winner === "b"}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LiveMatches;
