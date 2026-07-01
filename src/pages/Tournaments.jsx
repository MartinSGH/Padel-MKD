import "../styles/TournamentsPage.css";
import { useEffect, useMemo, useState } from "react";
import { Row, Col } from "antd";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAllTournaments } from "../services/tournaments";
import { useNotifications } from "../context/NotificationsContext";
import {
  formatDateRange,
  getTournamentTiming,
  getTournamentYear,
  getTournamentMonth,
  isPastTournament,
  isRegistrationOpen,
} from "../lib/tournamentUtils";

const TournamentsPage = () => {
  const { t, i18n } = useTranslation();
  const { pendingInviteTournamentIds } = useNotifications();
  const lang = i18n.language?.startsWith("mk") ? "mk" : "en";

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("all"); // all | upcoming | past
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [location, setLocation] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllTournaments()
      .then((data) => setTournaments(data || []))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const set = new Set(
      tournaments.map(getTournamentYear).filter((y) => y != null)
    );
    return Array.from(set).sort((a, b) => b - a);
  }, [tournaments]);

  const locations = useMemo(() => {
    const set = new Set(
      tournaments.map((tn) => tn.location).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tournaments]);

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) =>
        new Date(2020, m, 1).toLocaleDateString(lang === "mk" ? "mk-MK" : "en-GB", {
          month: "long",
        })
      ),
    [lang]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tournaments.filter((tn) => {
      if (status === "upcoming" && isPastTournament(tn)) return false;
      if (status === "past" && !isPastTournament(tn)) return false;
      if (year !== "all" && getTournamentYear(tn) !== Number(year)) return false;
      if (month !== "all" && getTournamentMonth(tn) !== Number(month)) return false;
      if (location !== "all" && tn.location !== location) return false;
      if (q && !(tn.name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tournaments, status, year, month, location, search]);

  const hasActiveFilters =
    status !== "all" ||
    year !== "all" ||
    month !== "all" ||
    location !== "all" ||
    search.trim() !== "";

  const clearFilters = () => {
    setStatus("all");
    setYear("all");
    setMonth("all");
    setLocation("all");
    setSearch("");
  };

  return (
    <div className="tp-page">
      <section className="tp-hero">
        <Row justify={"center"}>
          <Col span={20}>
            <span className="tp-eyebrow">{t("tournamentsPage.eyebrow")}</span>
            <h1 className="tp-title">{t("tournamentsPage.title")}</h1>
            <p className="tp-subtitle">{t("tournamentsPage.subtitle")}</p>
          </Col>
        </Row>
      </section>

      <section className="tp-section">
        <Row justify={"center"}>
          <Col span={20}>
            {/* Status tabs */}
            <div className="tp-tabs">
              {["all", "upcoming", "past"].map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`tp-tab ${status === key ? "tp-tab-active" : ""}`}
                  onClick={() => setStatus(key)}
                >
                  {t(`tournamentsPage.filter.${key}`)}
                </button>
              ))}
            </div>

            {/* Filter controls */}
            <div className="tp-filters">
              <input
                type="search"
                className="tp-input"
                placeholder={t("tournamentsPage.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="tp-select"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="all">{t("tournamentsPage.yearAll")}</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                className="tp-select"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="all">{t("tournamentsPage.monthAll")}</option>
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                className="tp-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="all">{t("tournamentsPage.locationAll")}</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="tp-clear"
                  onClick={clearFilters}
                >
                  {t("tournamentsPage.clear")}
                </button>
              )}
            </div>

            {!loading && (
              <p className="tp-count">
                {filtered.length} {t("tournamentsPage.resultsLabel")}
              </p>
            )}

            {/* List */}
            {loading ? (
              <p className="tp-status-text">{t("tournamentsPage.loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="tp-status-text">{t("tournamentsPage.empty")}</p>
            ) : (
              <div className="tp-list">
                {filtered.map((tn) => {
                  const timing = getTournamentTiming(tn);
                  const detail = tn.detail_url || `/tournaments/${tn.id}`;
                  return (
                    <article className="tp-item" key={tn.id}>
                      <div className="tp-item-date">
                        <span className="tp-date-range">
                          {formatDateRange(tn.start_date, tn.end_date, lang) ||
                            "—"}
                        </span>
                        {tn.code && <span className="tp-code">{tn.code}</span>}
                      </div>

                      <div className="tp-item-main">
                        <h3 className="tp-item-name">
                          {tn.name}
                          {pendingInviteTournamentIds.has(tn.id) && (
                            <span className="tp-invite-badge">
                              {t("tournamentsPage.inviteBadge")}
                            </span>
                          )}
                        </h3>
                        <p className="tp-item-meta">
                          {[tn.type, tn.category].filter(Boolean).join(" · ")}
                        </p>
                        {tn.location && (
                          <p className="tp-item-loc">{tn.location}</p>
                        )}
                      </div>

                      <div className="tp-item-aside">
                        <span className={`tp-badge tp-badge-${timing}`}>
                          {t(`tournamentsPage.status.${timing}`)}
                        </span>
                        <div className="tp-item-actions">
                          <Link to={detail} className="tp-details-link">
                            {t("tournamentsPage.details")}
                          </Link>
                          {isRegistrationOpen(tn) && (
                            <a
                              href={tn.registration_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tp-register-link"
                            >
                              {t("tournamentsPage.register")}
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default TournamentsPage;
