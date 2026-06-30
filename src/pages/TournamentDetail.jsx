import "../styles/TournamentDetail.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { getTournamentById } from "../services/tournaments";
import {
  getPlayerDirectory,
  getTournamentRegistrations,
  getRegistrationCount,
  getTakenPlayerIds,
  registerForTournament,
  updateRegistrationPartner,
  withdrawRegistration,
} from "../services/registrations";
import { getMyProfile } from "../services/profile";
import { useAuth } from "../context/AuthContext";
import {
  formatDateRange,
  formatSingleDate,
  getTournamentTiming,
  isRegistrationOpen,
  isRegistrationWindowOpen,
  isRegistrationDeadlinePassed,
} from "../lib/tournamentUtils";

const TournamentDetail = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.language?.startsWith("mk") ? "mk" : "en";

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // Registration state
  const [directory, setDirectory] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [takenIds, setTakenIds] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [regError, setRegError] = useState("");
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [savingPartner, setSavingPartner] = useState(false);

  // In-app registration is used when the tournament has no external form URL
  // and no custom detail page.
  const useInApp =
    !!tournament && !tournament.detail_url && !tournament.registration_url;

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setActiveTab("info");
    getTournamentById(id)
      .then((data) => setTournament(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const loadRegistrations = async (tournamentId) => {
    const [dir, regs, cnt, taken] = await Promise.all([
      getPlayerDirectory().catch(() => []),
      getTournamentRegistrations(tournamentId).catch(() => []),
      getRegistrationCount(tournamentId).catch(() => 0),
      user ? getTakenPlayerIds(tournamentId).catch(() => []) : Promise.resolve([]),
    ]);
    setDirectory(dir);
    setRegistrations(regs);
    setRegistrationCount(cnt);
    setTakenIds(new Set(taken));
  };

  useEffect(() => {
    if (useInApp && tournament?.id) {
      loadRegistrations(tournament.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useInApp, tournament?.id, user]);

  // Determine whether the current user is an admin (only admins see the list).
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    getMyProfile()
      .then((p) => setIsAdmin(p?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, [user]);

  const nameById = useMemo(() => {
    const map = new Map();
    directory.forEach((p) => map.set(p.id, p.full_name || "Player"));
    return map;
  }, [directory]);

  const myRegistration = user
    ? registrations.find((reg) => reg.player_id === user.id)
    : null;
  const amPartnerIn = user
    ? registrations.find((reg) => reg.partner_id === user.id)
    : null;

  const partnerOptions = useMemo(
    () => directory.filter((p) => p.id !== user?.id && !takenIds.has(p.id)),
    [directory, user?.id, takenIds]
  );

  // Keep the partner picker in sync with the saved partner once registered.
  useEffect(() => {
    setPartnerId(myRegistration?.partner_id || "");
  }, [myRegistration?.id, myRegistration?.partner_id]);

  // Register solo — partner is chosen later, while registration stays open.
  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setRegError("");
    try {
      await registerForTournament({
        tournamentId: tournament.id,
        partnerId: null,
        category: category || null,
      });
      setCategory("");
      await loadRegistrations(tournament.id);
    } catch (err) {
      setRegError(err.message || "Failed to register.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePartner = async () => {
    if (!myRegistration) return;
    setSavingPartner(true);
    setRegError("");
    try {
      await updateRegistrationPartner(myRegistration.id, partnerId || null);
      await loadRegistrations(tournament.id);
    } catch (err) {
      setRegError(err.message || "Failed to update partner.");
    } finally {
      setSavingPartner(false);
    }
  };

  const handleWithdraw = async (registrationId) => {
    if (!window.confirm(t("tournamentsPage.registration.withdrawConfirm"))) return;
    setWithdrawingId(registrationId);
    try {
      await withdrawRegistration(registrationId);
      await loadRegistrations(tournament.id);
    } catch (err) {
      alert(err.message || "Failed to withdraw.");
    } finally {
      setWithdrawingId(null);
    }
  };

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
  const regOpen = isRegistrationOpen(tournament); // external form
  const windowOpen = isRegistrationWindowOpen(tournament); // in-app
  const deadlinePassed = isRegistrationDeadlinePassed(tournament);
  // The participant list is public once registration has closed (deadline
  // passed); before that only admins can see it.
  const showParticipants = isAdmin || deadlinePassed;

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

  const r = (key) => t(`tournamentsPage.registration.${key}`);

  // The current partner shown in the manage dropdown (they're excluded from
  // partnerOptions because they're already "taken", so add them back here).
  const currentPartnerOption = myRegistration?.partner_id
    ? {
        id: myRegistration.partner_id,
        full_name:
          myRegistration.partner_name ||
          nameById.get(myRegistration.partner_id) ||
          "Player",
      }
    : null;
  const partnerUnchanged = partnerId === (myRegistration?.partner_id || "");

  const tabs = ["info"];
  if (useInApp) tabs.push("registered");
  if (tournament.propositions_url) tabs.push("documents");
  const tabLabel = {
    info: t("tournamentsPage.tabsInfo"),
    registered: t("tournamentsPage.tabsRegistered"),
    documents: t("tournamentsPage.tabsDocuments"),
  };
  const currentTab = tabs.includes(activeTab) ? activeTab : "info";

  return (
    <div className="td-page">
      {/* Header */}
      <section className="td-hero">
        <Row justify={"center"}>
          <Col span={20}>
            <Link to="/tournaments" className="td-back">
              ← {t("tournamentsPage.backToList")}
            </Link>

            <div className="td-header">
              {tournament.image_url && (
                <div className="td-header-image">
                  <img src={tournament.image_url} alt={tournament.name} />
                </div>
              )}

              <div className="td-header-info">
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
                        {formatSingleDate(
                          tournament.registration_deadline,
                          lang
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </section>

      {/* Tabs */}
      <section className="td-tabs-section">
        <Row justify={"center"}>
          <Col span={20}>
            <div className="td-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`td-tab ${currentTab === tab ? "td-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tabLabel[tab]}
                </button>
              ))}
            </div>

            {/* Info tab */}
            {currentTab === "info" && (
              <div className="td-tab-content">
                {tournament.description && (
                  <div className="td-block">
                    <h2 className="td-section-title">
                      {t("tournamentsPage.aboutTitle")}
                    </h2>
                    <p className="td-description">{tournament.description}</p>
                  </div>
                )}

                {detailRows.length > 0 && (
                  <div className="td-block">
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
                  </div>
                )}
              </div>
            )}

            {/* Registered players tab */}
            {currentTab === "registered" && (
              <div className="td-tab-content">
                <div className="td-block">
                  <h2 className="td-section-title">{r("title")}</h2>
                  <div className="td-reg-card">
                    {!user ? (
                      <div className="td-reg-login">
                        <p>{r("loginPrompt")}</p>
                        <div className="td-reg-login-actions">
                          <Link to="/login" className="td-btn td-btn-primary">
                            {r("login")}
                          </Link>
                          <Link
                            to="/register"
                            className="td-btn td-btn-outline"
                          >
                            {r("register")}
                          </Link>
                        </div>
                      </div>
                    ) : myRegistration ? (
                      <div className="td-reg-done">
                        <p className="td-reg-done-title">
                          ✓ {r("registeredTitle")}
                        </p>
                        {myRegistration.category && (
                          <p className="td-reg-done-partner">
                            {r("category")}:{" "}
                            <strong>{myRegistration.category}</strong>
                          </p>
                        )}

                        {windowOpen ? (
                          <div className="td-partner-manage">
                            <label className="td-reg-field">
                              <span>{r("yourPartner")}</span>
                              <select
                                value={partnerId}
                                onChange={(e) => setPartnerId(e.target.value)}
                              >
                                <option value="">{r("noPartnerChosen")}</option>
                                {currentPartnerOption && (
                                  <option value={currentPartnerOption.id}>
                                    {currentPartnerOption.full_name}
                                  </option>
                                )}
                                {partnerOptions.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.full_name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="td-btn td-btn-primary td-reg-submit"
                              disabled={savingPartner || partnerUnchanged}
                              onClick={handleSavePartner}
                            >
                              {savingPartner
                                ? r("savingPartner")
                                : r("savePartner")}
                            </button>
                            <p className="td-reg-hint">{r("partnerHint")}</p>
                          </div>
                        ) : (
                          <p className="td-reg-done-partner">
                            {r("partner")}:{" "}
                            <strong>
                              {myRegistration.partner_id
                                ? myRegistration.partner_name ||
                                  nameById.get(myRegistration.partner_id)
                                : r("noPartnerChosen")}
                            </strong>
                          </p>
                        )}

                        {regError && (
                          <p className="td-reg-error">{regError}</p>
                        )}

                        {windowOpen && (
                          <button
                            type="button"
                            className="td-reg-withdraw"
                            disabled={withdrawingId === myRegistration.id}
                            onClick={() => handleWithdraw(myRegistration.id)}
                          >
                            {withdrawingId === myRegistration.id
                              ? r("withdrawing")
                              : r("withdraw")}
                          </button>
                        )}
                      </div>
                    ) : amPartnerIn ? (
                      <div className="td-reg-done">
                        <p className="td-reg-done-title">
                          ✓ {r("registeredTitle")}
                        </p>
                        <p className="td-reg-done-partner">
                          {r("inPairWith")}{" "}
                          <strong>
                            {amPartnerIn.player_name ||
                              nameById.get(amPartnerIn.player_id)}
                          </strong>
                        </p>
                      </div>
                    ) : !windowOpen ? (
                      <p className="td-reg-closed">{r("closed")}</p>
                    ) : (
                      <form
                        className="td-reg-form td-reg-form-solo"
                        onSubmit={handleRegister}
                      >
                        <p className="td-reg-spot-info">{r("spotInfo")}</p>

                        <label className="td-reg-field">
                          <span>{r("category")}</span>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                          >
                            <option value="">{r("categoryPlaceholder")}</option>
                            <option value="Men's pairs">{r("categoryMen")}</option>
                            <option value="Women's pairs">
                              {r("categoryWomen")}
                            </option>
                            <option value="Mixed pairs">
                              {r("categoryMixed")}
                            </option>
                          </select>
                        </label>

                        {regError && <p className="td-reg-error">{regError}</p>}

                        <button
                          type="submit"
                          className="td-btn td-btn-primary td-reg-submit"
                          disabled={submitting}
                        >
                          {submitting ? r("submitting") : r("submit")}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="td-block">
                  <div className="td-participants-head">
                    <h2 className="td-section-title">
                      {r("participantsTitle")}
                    </h2>
                    <span className="td-participants-count">
                      {registrationCount} {r("participantsCount")}
                    </span>
                  </div>

                  {registrationCount === 0 ? (
                    <p className="td-reg-closed">{r("noParticipants")}</p>
                  ) : showParticipants ? (
                    <div className="td-participants">
                      {registrations.map((reg, index) => {
                        const playerName =
                          reg.player_name ||
                          nameById.get(reg.player_id) ||
                          "Player";
                        const partnerName = reg.partner_id
                          ? reg.partner_name ||
                            nameById.get(reg.partner_id) ||
                            "Player"
                          : r("noPartnerChosen");
                        return (
                          <div className="td-pair" key={reg.id}>
                            <span className="td-pair-num">{index + 1}</span>
                            <div className="td-pair-names">
                              <strong>{playerName}</strong>
                              <span className="td-pair-amp">&amp;</span>
                              <strong>{partnerName}</strong>
                            </div>
                            {reg.category && (
                              <span className="td-pair-cat">{reg.category}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="td-participants-count-box">
                      <span className="td-participants-big">
                        {registrationCount}
                      </span>
                      <span className="td-participants-label">
                        {r("participantsCount")}
                      </span>
                      <p className="td-reg-hint">{r("participantsAdminOnly")}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents tab */}
            {currentTab === "documents" && (
              <div className="td-tab-content">
                <div className="td-block">
                  <h2 className="td-section-title">
                    {t("tournamentsPage.documentsTitle")}
                  </h2>

                  {tournament.propositions_url ? (
                    <div className="td-doc-card">
                      <div className="td-doc-head">
                        <span className="td-doc-name">
                          📄 {t("tournamentsPage.propositions")}
                        </span>
                        <div className="td-doc-actions">
                          <a
                            href={tournament.propositions_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="td-doc-link"
                          >
                            {t("tournamentsPage.viewPdf")}
                          </a>
                          <a
                            href={tournament.propositions_url}
                            download
                            className="td-doc-link"
                          >
                            {t("tournamentsPage.downloadPdf")}
                          </a>
                        </div>
                      </div>
                      <iframe
                        className="td-doc-frame"
                        src={`${tournament.propositions_url}#view=FitH`}
                        title={t("tournamentsPage.propositions")}
                      />
                    </div>
                  ) : (
                    <p className="td-reg-closed">
                      {t("tournamentsPage.noDocuments")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default TournamentDetail;
