import "../styles/Ranking.css";
import { useCallback, useEffect, useState } from "react";
import { Row, Col, message } from "antd";
import { useTranslation } from "react-i18next";
import { getRanking, setPlayerRankingPoints } from "../services/ranking";
import { useIsAdmin } from "../hooks/useIsAdmin";

// One Rank List per category; the value is the category stored on the points.
const LISTS = [
  { category: "Men's pairs", labelKey: "ranking.men" },
  { category: "Women's pairs", labelKey: "ranking.women" },
];

const Ranking = () => {
  const { t } = useTranslation();
  const { isAdmin } = useIsAdmin();
  const [category, setCategory] = useState(LISTS[0].category);
  const [rowsByCategory, setRowsByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  // Admin editing: the typed points per player_id for the list on screen.
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () =>
      Promise.all(LISTS.map((l) => getRanking(l.category).catch(() => [])))
        .then((lists) =>
          setRowsByCategory(
            Object.fromEntries(LISTS.map((l, i) => [l.category, lists[i]]))
          )
        )
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const rows = rowsByCategory[category] || [];
  // Players with equal points share a position, and the next player skips
  // ahead accordingly (70, 70, 60 → 5, 5, 7).
  const positions = rows.map((r) => 1 + rows.filter((o) => o.points > r.points).length);

  const stopEditing = () => {
    setEditing(false);
    setDrafts({});
  };

  const selectCategory = (next) => {
    setCategory(next);
    setDrafts({});
  };

  const saveEdits = async () => {
    const changes = [];
    for (const r of rows) {
      const raw = drafts[r.player_id];
      if (raw === undefined) continue;
      const points = Number(raw);
      if (String(raw).trim() === "" || !Number.isInteger(points) || points < 0) {
        message.error(t("ranking.invalid"));
        return;
      }
      if (points !== r.points) changes.push({ player_id: r.player_id, points });
    }
    if (!changes.length) {
      stopEditing();
      return;
    }

    setSaving(true);
    try {
      for (const c of changes) {
        await setPlayerRankingPoints(c.player_id, category, c.points);
      }
      message.success(t("ranking.saved"));
      stopEditing();
    } catch (e) {
      message.error(e.message || t("ranking.saveError"));
    } finally {
      await load();
      setSaving(false);
    }
  };

  return (
    <div className="rk-page">
      <Row justify="center">
        <Col span={20}>
          <div className="rk-head">
            <span className="rk-eyebrow">{t("ranking.eyebrow")}</span>
            <h1 className="rk-title">{t("ranking.title")}</h1>
            <p className="rk-sub">{t("ranking.subtitle")}</p>
          </div>

          <div className="rk-bar">
            <div className="rk-tabs" role="tablist">
              {LISTS.map((l) => (
                <button
                  key={l.category}
                  type="button"
                  role="tab"
                  aria-selected={category === l.category}
                  className={`rk-tab${category === l.category ? " active" : ""}`}
                  onClick={() => selectCategory(l.category)}
                  disabled={saving}
                >
                  {t(l.labelKey)}
                </button>
              ))}
            </div>

            {isAdmin && rows.length > 0 && (
              <div className="rk-actions">
                {editing ? (
                  <>
                    <button
                      type="button"
                      className="rk-btn"
                      onClick={stopEditing}
                      disabled={saving}
                    >
                      {t("ranking.cancel")}
                    </button>
                    <button
                      type="button"
                      className="rk-btn rk-btn-primary"
                      onClick={saveEdits}
                      disabled={saving}
                    >
                      {saving ? t("ranking.saving") : t("ranking.save")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="rk-btn"
                    onClick={() => setEditing(true)}
                  >
                    {t("ranking.edit")}
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <p className="rk-empty">{t("ranking.loading")}</p>
          ) : rows.length === 0 ? (
            <p className="rk-empty">{t("ranking.empty")}</p>
          ) : (
            <div className="rk-table">
              <div className="rk-row rk-row-head">
                <span className="rk-rank">#</span>
                <span className="rk-name">{t("ranking.player")}</span>
                <span className="rk-points">{t("ranking.points")}</span>
              </div>
              {rows.map((r, i) => (
                <div
                  className={`rk-row${
                    positions[i] <= 3 ? ` rk-top rk-top-${positions[i]}` : ""
                  }`}
                  key={r.player_id}
                >
                  <span className="rk-rank">{positions[i]}</span>
                  <span className="rk-name">{r.player_name || "Player"}</span>
                  {isAdmin && editing ? (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      className="rk-points-input"
                      aria-label={`${t("ranking.points")} – ${r.player_name || "Player"}`}
                      value={drafts[r.player_id] ?? r.points}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [r.player_id]: e.target.value }))
                      }
                      disabled={saving}
                    />
                  ) : (
                    <span className="rk-points">{r.points}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default Ranking;
