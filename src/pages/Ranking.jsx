import "../styles/Ranking.css";
import { useEffect, useState } from "react";
import { Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { getRanking } from "../services/ranking";

// One Rank List per category; the value is the category stored on the points.
const LISTS = [
  { category: "Men's pairs", labelKey: "ranking.men" },
  { category: "Women's pairs", labelKey: "ranking.women" },
];

const Ranking = () => {
  const { t } = useTranslation();
  const [category, setCategory] = useState(LISTS[0].category);
  const [rowsByCategory, setRowsByCategory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      LISTS.map((l) => getRanking(l.category).catch(() => []))
    )
      .then((lists) =>
        setRowsByCategory(
          Object.fromEntries(LISTS.map((l, i) => [l.category, lists[i]]))
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const rows = rowsByCategory[category] || [];
  // Players with equal points share a position, and the next player skips
  // ahead accordingly (70, 70, 60 → 5, 5, 7).
  const positions = rows.map((r) => 1 + rows.filter((o) => o.points > r.points).length);

  return (
    <div className="rk-page">
      <Row justify="center">
        <Col span={20}>
          <div className="rk-head">
            <span className="rk-eyebrow">{t("ranking.eyebrow")}</span>
            <h1 className="rk-title">{t("ranking.title")}</h1>
            <p className="rk-sub">{t("ranking.subtitle")}</p>
          </div>

          <div className="rk-tabs" role="tablist">
            {LISTS.map((l) => (
              <button
                key={l.category}
                type="button"
                role="tab"
                aria-selected={category === l.category}
                className={`rk-tab${category === l.category ? " active" : ""}`}
                onClick={() => setCategory(l.category)}
              >
                {t(l.labelKey)}
              </button>
            ))}
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
                  <span className="rk-points">{r.points}</span>
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
