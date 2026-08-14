import "../styles/Ranking.css";
import { useEffect, useState } from "react";
import { Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { getRanking } from "../services/ranking";

const Ranking = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRanking()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rk-page">
      <Row justify="center">
        <Col span={20}>
          <div className="rk-head">
            <span className="rk-eyebrow">{t("ranking.eyebrow")}</span>
            <h1 className="rk-title">{t("ranking.title")}</h1>
            <p className="rk-sub">{t("ranking.subtitle")}</p>
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
                  className={`rk-row${i < 3 ? ` rk-top rk-top-${i + 1}` : ""}`}
                  key={r.player_id}
                >
                  <span className="rk-rank">{i + 1}</span>
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
