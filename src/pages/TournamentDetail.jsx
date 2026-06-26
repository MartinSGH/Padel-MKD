import "../styles/TournamentDetail.css";
import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { getTournamentById } from "../services/tournaments";
import {
  formatDateRange,
  formatSingleDate,
  getTournamentTiming,
  isRegistrationOpen,
} from "../lib/tournamentUtils";

const TournamentDetail = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("mk") ? "mk" : "en";

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getTournamentById(id)
      .then((data) => setTournament(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="td-page td-center">
        <p className="td-status-text">{t("tournamentsPage.loading")}</p>
      </div>
    );
  }

  if (notFound || !tournament) {
    return (
      <div className="td-page td-center">
        <p className="td-status-text">{t("tournamentsPage.empty")}</p>
        <Link to="/tournaments" className="td-back">
          ← {t("tournamentsPage.backToList")}
        </Link>
      </div>
    );
  }

  // Tournaments with their own rich page (e.g. the championship) redirect there.
  if (tournament.detail_url) {
    return <Navigate to={tournament.detail_url} replace />;
  }

  const timing = getTournamentTiming(tournament);
  const regOpen = isRegistrationOpen(tournament);

  const detailRows = [
    [t("tournaments.details.type"), tournament.type],
    [t("tournaments.category"), tournament.category],
    [t("tournaments.details.location"), tournament.location],
    [
      t("tournaments.details.date"),
      formatDateRange(tournament.start_date, tournament.end_date, lang),
    ],
    [t("tournaments.details.format"), tournament.format],
    [t("tournaments.details.competitors"), tournament.competitors],
    [t("tournaments.details.prizes"), tournament.prizes],
    [t("tournaments.details.qualifications"), tournament.qualifications],
    [t("tournaments.details.result"), tournament.result],
    [
      t("tournamentsPage.registrationDeadline"),
      tournament.registration_deadline
        ? formatSingleDate(tournament.registration_deadline, lang)
        : null,
    ],
  ].filter(([, value]) => value);

  return (
    <div className="td-page">
      <section className="td-hero">
        <Row justify={"center"}>
          <Col span={20}>
            <Link to="/tournaments" className="td-back">
              ← {t("tournamentsPage.backToList")}
            </Link>

            <div className="td-hero-top">
              <span className="td-eyebrow">
                {[tournament.type, tournament.category]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className={`td-badge td-badge-${timing}`}>
                {t(`tournamentsPage.status.${timing}`)}
              </span>
            </div>

            <h1 className="td-title">{tournament.name}</h1>

            <div className="td-meta">
              {(tournament.start_date || tournament.end_date) && (
                <span className="td-meta-item">
                  {formatDateRange(
                    tournament.start_date,
                    tournament.end_date,
                    lang
                  )}
                </span>
              )}
              {tournament.location && (
                <span className="td-meta-item">{tournament.location}</span>
              )}
              {tournament.code && (
                <span className="td-meta-item td-meta-code">
                  {tournament.code}
                </span>
              )}
            </div>

            {regOpen && (
              <div className="td-actions">
                <a
                  href={tournament.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-btn td-btn-primary"
                >
                  {t("tournamentsPage.register")}
                </a>
                {tournament.registration_deadline && (
                  <span className="td-deadline">
                    {t("tournamentsPage.registrationDeadline")}:{" "}
                    {formatSingleDate(tournament.registration_deadline, lang)}
                  </span>
                )}
              </div>
            )}
          </Col>
        </Row>
      </section>

      {tournament.description && (
        <section className="td-section">
          <Row justify={"center"}>
            <Col span={20}>
              <h2 className="td-section-title">
                {t("tournamentsPage.aboutTitle")}
              </h2>
              <p className="td-description">{tournament.description}</p>
            </Col>
          </Row>
        </section>
      )}

      {detailRows.length > 0 && (
        <section className="td-section">
          <Row justify={"center"}>
            <Col span={20}>
              <h2 className="td-section-title">
                {t("tournamentsPage.detailsTitle")}
              </h2>
              <div className="td-details-grid">
                {detailRows.map(([label, value]) => (
                  <div className="td-detail" key={label}>
                    <span className="td-detail-label">{label}</span>
                    <span className="td-detail-value">{value}</span>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </section>
      )}
    </div>
  );
};

export default TournamentDetail;
