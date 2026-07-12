import "../styles/TournamentDetail.css";
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
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
  respondToPartnerInvite,
  withdrawRegistration,
} from "../services/registrations";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { getMyProfile } from "../services/profile";
import {
  formatDateRange,
  formatSingleDate,
  getTournamentTiming,
  isRegistrationOpen,
  isRegistrationWindowOpen,
  isRegistrationDeadlinePassed,
} from "../lib/tournamentUtils";

// Canonical category values (also stored on the registration rows). Used as the
// fallback when a tournament hasn't been given an explicit category list.
const CANON_CATEGORIES = ["Men's pairs", "Women's pairs", "Mixed pairs"];
const CATEGORY_LABEL_KEYS = {
  "Men's pairs": "categoryMen",
  "Women's pairs": "categoryWomen",
  "Mixed pairs": "categoryMixed",
};

// One of the current user's own registrations (a category they entered). Manages
// its own partner draft so several categories can be shown at once.
function OwnRegistrationCard({
  reg,
  windowOpen,
  deadlinePassed,
  directory,
  takenSet,
  nameById,
  userId,
  catLabel,
  onChanged,
  t,
}) {
  const r = (key) => t(`tournamentsPage.registration.${key}`);
  const [partnerId, setPartnerId] = useState(reg.partner_id || "");
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPartnerId(reg.partner_id || "");
  }, [reg.partner_id]);

  const confirmed = !!reg.partner_id && reg.partner_status === "accepted";
  const disqualified = deadlinePassed && !confirmed;

  // Exclude players already taken in THIS category, but keep the current partner
  // selectable so they don't vanish from the dropdown.
  const partnerOptions = directory.filter(
    (p) => p.id !== userId && (!takenSet.has(p.id) || p.id === reg.partner_id)
  );
  const partnerUnchanged = partnerId === (reg.partner_id || "");

  const savePartner = async () => {
    setSaving(true);
    setError("");
    try {
      await updateRegistrationPartner(reg.id, partnerId || null);
      await onChanged();
    } catch (err) {
      setError(err.message || "Failed to update partner.");
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    if (!window.confirm(r("withdrawConfirm"))) return;
    setWithdrawing(true);
    try {
      await withdrawRegistration(reg.id);
      await onChanged();
    } catch (err) {
      alert(err.message || "Failed to withdraw.");
    } finally {
      setWithdrawing(false);
    }
  };

  if (disqualified) {
    return (
      <div className="td-reg-disqualified">
        {reg.category && (
          <p className="td-reg-done-partner">
            {r("category")}: <strong>{catLabel(reg.category)}</strong>
          </p>
        )}
        <p className="td-reg-disqualified-title">
          {r("disqualifiedNoPartner")}
        </p>
      </div>
    );
  }

  return (
    <div className="td-reg-done">
      <p className="td-reg-done-title">✓ {r("registeredTitle")}</p>
      {reg.category && (
        <p className="td-reg-done-partner">
          {r("category")}: <strong>{catLabel(reg.category)}</strong>
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
              <option value="">{r("choosePartnerPlaceholder")}</option>
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
            disabled={saving || partnerUnchanged}
            onClick={savePartner}
          >
            {saving ? r("savingPartner") : r("savePartner")}
          </button>
          <p className="td-reg-hint">{r("partnerHint")}</p>
          {reg.partner_id && reg.partner_status === "pending" && (
            <p className="td-reg-pending-note">
              {t("tournamentsPage.registration.invitePendingNote", {
                name:
                  reg.partner_name ||
                  nameById.get(reg.partner_id) ||
                  r("partnerFallback"),
              })}
            </p>
          )}
          {reg.partner_id && reg.partner_status === "accepted" && (
            <p className="td-reg-accepted-note">
              {t("tournamentsPage.registration.inviteAcceptedNote", {
                name:
                  reg.partner_name ||
                  nameById.get(reg.partner_id) ||
                  r("partnerFallback"),
              })}
            </p>
          )}
        </div>
      ) : (
        <p className="td-reg-done-partner">
          {r("partner")}:{" "}
          <strong>
            {reg.partner_id
              ? reg.partner_name || nameById.get(reg.partner_id)
              : r("noPartnerChosen")}
          </strong>
          {reg.partner_id && reg.partner_status === "pending" && (
            <span className="td-reg-pending-tag"> {r("partnerPending")}</span>
          )}
        </p>
      )}

      {error && <p className="td-reg-error">{error}</p>}

      {windowOpen && (
        <button
          type="button"
          className="td-reg-withdraw"
          disabled={withdrawing}
          onClick={withdraw}
        >
          {withdrawing ? r("withdrawing") : r("withdraw")}
        </button>
      )}
    </div>
  );
}

// A pending partner invitation waiting on the current user, for one category.
function InviteCard({ invite, nameById, catLabel, onResponded, t }) {
  const r = (key) => t(`tournamentsPage.registration.${key}`);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState("");

  const respond = async (accept) => {
    setResponding(true);
    setError("");
    try {
      await respondToPartnerInvite(invite.id, accept);
      await onResponded();
    } catch (err) {
      setError(err.message || "Failed to respond to the invitation.");
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="td-reg-invite">
      <p className="td-reg-invite-title">
        {t("tournamentsPage.registration.invitePendingForYou", {
          name:
            invite.player_name ||
            nameById.get(invite.player_id) ||
            r("partnerFallback"),
        })}
      </p>
      {invite.category && (
        <p className="td-reg-done-partner">
          {r("category")}: <strong>{catLabel(invite.category)}</strong>
        </p>
      )}
      {error && <p className="td-reg-error">{error}</p>}
      <div className="td-invite-actions">
        <button
          type="button"
          className="td-btn td-btn-primary"
          disabled={responding}
          onClick={() => respond(true)}
        >
          {responding ? r("inviteResponding") : r("inviteAccept")}
        </button>
        <button
          type="button"
          className="td-btn td-btn-outline"
          disabled={responding}
          onClick={() => respond(false)}
        >
          {r("inviteDecline")}
        </button>
      </div>
    </div>
  );
}

OwnRegistrationCard.propTypes = {
  reg: PropTypes.object.isRequired,
  windowOpen: PropTypes.bool,
  deadlinePassed: PropTypes.bool,
  directory: PropTypes.array.isRequired,
  takenSet: PropTypes.instanceOf(Set).isRequired,
  nameById: PropTypes.instanceOf(Map).isRequired,
  userId: PropTypes.string,
  catLabel: PropTypes.func.isRequired,
  onChanged: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

InviteCard.propTypes = {
  invite: PropTypes.object.isRequired,
  nameById: PropTypes.instanceOf(Map).isRequired,
  catLabel: PropTypes.func.isRequired,
  onResponded: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

const TournamentDetail = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const lang = i18n.language?.startsWith("mk") ? "mk" : "en";

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // Registration state
  const [directory, setDirectory] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [registrationCount, setRegistrationCount] = useState(0);
  // Players already in a pair, per category: { player_id, category } rows.
  const [takenRows, setTakenRows] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [regError, setRegError] = useState("");

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
    setTakenRows(taken);
  };

  useEffect(() => {
    if (useInApp && tournament?.id) {
      loadRegistrations(tournament.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useInApp, tournament?.id, user]);

  // Only admins can see the full participant list.
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

  // The current user's own registrations (one per category they entered).
  const myRegistrations = user
    ? registrations.filter((reg) => reg.player_id === user.id)
    : [];
  // Pending invitations waiting on the current user (one per category).
  const myPendingInvites = user
    ? registrations.filter(
        (reg) => reg.partner_id === user.id && reg.partner_status === "pending"
      )
    : [];
  // Categories where the current user is already the accepted partner.
  const myAcceptedPartnerRegs = user
    ? registrations.filter(
        (reg) => reg.partner_id === user.id && reg.partner_status === "accepted"
      )
    : [];

  // player ids already taken, grouped by category, so each partner picker only
  // excludes people taken in its own category.
  const takenByCategory = useMemo(() => {
    const map = new Map();
    takenRows.forEach(({ player_id, category: cat }) => {
      const key = cat || "";
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(player_id);
    });
    return map;
  }, [takenRows]);

  // Register solo — partner is chosen later, while registration stays open.
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!category) {
      setRegError(t("tournamentsPage.registration.categoryRequired"));
      return;
    }
    setSubmitting(true);
    setRegError("");
    try {
      await registerForTournament({
        tournamentId: tournament.id,
        partnerId: null,
        category,
      });
      setCategory("");
      await loadRegistrations(tournament.id);
    } catch (err) {
      setRegError(err.message || "Failed to register.");
    } finally {
      setSubmitting(false);
    }
  };

  // Partner management, invite responses and withdrawals now live in the
  // per-registration cards (OwnRegistrationCard / InviteCard) so several
  // categories can be managed independently. They call these to refresh.
  const reloadRegistrations = () => loadRegistrations(tournament.id);
  const reloadAfterInvite = async () => {
    await loadRegistrations(tournament.id);
    await refreshNotifications();
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
  // The full list of pairings is visible to admins only.
  const showParticipants = isAdmin;

  // A pair only counts once the invited partner has accepted.
  const isConfirmedPair = (reg) =>
    !!reg.partner_id && reg.partner_status === "accepted";
  // Once the deadline passes, registrations without a confirmed partner (solo,
  // or a pending invite that was never accepted) are disqualified: they drop
  // off the participant list, and the affected player sees a message instead of
  // their registration card.
  const participantList = deadlinePassed
    ? registrations.filter(isConfirmedPair)
    : registrations;
  const participantCount = deadlinePassed
    ? participantList.length
    : registrationCount;

  // Group the participant list by category (Men's / Women's / Mixed, in that
  // order, then any others, then uncategorised) so the admin gets one clean
  // list per category.
  const participantGroups = (() => {
    const byCat = new Map();
    participantList.forEach((reg) => {
      const key = reg.category || "";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key).push(reg);
    });
    const orderedKeys = [
      ...CANON_CATEGORIES.filter((c) => byCat.has(c)),
      ...[...byCat.keys()].filter((c) => c && !CANON_CATEGORIES.includes(c)),
      ...(byCat.has("") ? [""] : []),
    ];
    return orderedKeys.map((key) => ({ key, regs: byCat.get(key) }));
  })();

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
  const catLabel = (value) =>
    CATEGORY_LABEL_KEYS[value] ? r(CATEGORY_LABEL_KEYS[value]) : value;

  // Categories players may register for (admin-chosen, or all three by default).
  const availableCategories =
    tournament.categories && tournament.categories.length
      ? tournament.categories
      : CANON_CATEGORIES;
  // Categories the current user is already involved in (as player or partner) —
  // those are removed from the "register in another category" picker.
  const myUsedCategories = new Set(
    registrations
      .filter((reg) => reg.player_id === user?.id || reg.partner_id === user?.id)
      .map((reg) => reg.category)
  );
  const remainingCategories = availableCategories.filter(
    (c) => !myUsedCategories.has(c)
  );

  const tabs = ["info"];
  if (useInApp) tabs.push("registered");
  if (tournament.draw) tabs.push("draw");
  if (tournament.propositions_url) tabs.push("documents");
  const tabLabel = {
    info: t("tournamentsPage.tabsInfo"),
    registered: t("tournamentsPage.tabsRegistered"),
    draw: t("tournamentsPage.draw.tab"),
    documents: t("tournamentsPage.tabsDocuments"),
  };
  const currentTab = tabs.includes(activeTab) ? activeTab : "info";

  const drawRoundLabel = (matchCount) => {
    if (matchCount === 1) return t("tournamentsPage.draw.final");
    if (matchCount === 2) return t("tournamentsPage.draw.semifinals");
    if (matchCount === 4) return t("tournamentsPage.draw.quarterfinals");
    return t("tournamentsPage.draw.roundOf", { n: matchCount * 2 });
  };

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
                  {tab === "registered" &&
                    myPendingInvites.length > 0 &&
                    windowOpen && (
                      <span className="td-tab-badge" aria-hidden="true" />
                    )}
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
                    ) : (
                      <>
                        {/* One card per category the user has entered. */}
                        {myRegistrations.map((reg) => (
                          <OwnRegistrationCard
                            key={reg.id}
                            reg={reg}
                            windowOpen={windowOpen}
                            deadlinePassed={deadlinePassed}
                            directory={directory}
                            takenSet={
                              takenByCategory.get(reg.category || "") ||
                              new Set()
                            }
                            nameById={nameById}
                            userId={user.id}
                            catLabel={catLabel}
                            onChanged={reloadRegistrations}
                            t={t}
                          />
                        ))}

                        {/* Pending invitations waiting on the user. */}
                        {windowOpen &&
                          myPendingInvites.map((invite) => (
                            <InviteCard
                              key={invite.id}
                              invite={invite}
                              nameById={nameById}
                              catLabel={catLabel}
                              onResponded={reloadAfterInvite}
                              t={t}
                            />
                          ))}

                        {/* Categories where the user is the accepted partner. */}
                        {myAcceptedPartnerRegs.map((reg) => (
                          <div className="td-reg-done" key={reg.id}>
                            <p className="td-reg-done-title">
                              ✓ {r("registeredTitle")}
                            </p>
                            {reg.category && (
                              <p className="td-reg-done-partner">
                                {r("category")}:{" "}
                                <strong>{catLabel(reg.category)}</strong>
                              </p>
                            )}
                            <p className="td-reg-done-partner">
                              {r("inPairWith")}{" "}
                              <strong>
                                {reg.player_name ||
                                  nameById.get(reg.player_id)}
                              </strong>
                            </p>
                          </div>
                        ))}

                        {/* Register in another (not-yet-entered) category. */}
                        {windowOpen && remainingCategories.length > 0 && (
                          <form
                            className="td-reg-form td-reg-form-solo"
                            onSubmit={handleRegister}
                          >
                            {myRegistrations.length > 0 && (
                              <p className="td-reg-add-title">
                                {r("addCategoryTitle")}
                              </p>
                            )}
                            <p className="td-reg-spot-info">{r("spotInfo")}</p>

                            <label className="td-reg-field">
                              <span>{r("category")}</span>
                              <select
                                value={category}
                                required
                                onChange={(e) => setCategory(e.target.value)}
                              >
                                <option value="" disabled>
                                  {r("categoryPlaceholder")}
                                </option>
                                {remainingCategories.map((c) => (
                                  <option key={c} value={c}>
                                    {catLabel(c)}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {regError && (
                              <p className="td-reg-error">{regError}</p>
                            )}

                            <button
                              type="submit"
                              className="td-btn td-btn-primary td-reg-submit"
                              disabled={submitting || !category}
                            >
                              {submitting ? r("submitting") : r("submit")}
                            </button>
                          </form>
                        )}

                        {/* Registration closed and the user isn't involved. */}
                        {!windowOpen &&
                          myRegistrations.length === 0 &&
                          myAcceptedPartnerRegs.length === 0 && (
                            <p className="td-reg-closed">{r("closed")}</p>
                          )}
                      </>
                    )}
                  </div>
                </div>

                <div className="td-block">
                  <div className="td-participants-head">
                    <h2 className="td-section-title">
                      {r("participantsTitle")}
                    </h2>
                    {showParticipants && (
                      <span className="td-participants-count">
                        {participantCount} {r("participantsCount")}
                      </span>
                    )}
                  </div>

                  {showParticipants ? (
                    participantCount === 0 ? (
                      <p className="td-reg-closed">{r("noParticipants")}</p>
                    ) : (
                      <div className="td-participants-groups">
                        {participantGroups.map((group) => (
                          <div
                            className="td-participants-group"
                            key={group.key || "other"}
                          >
                            <h3 className="td-participants-group-title">
                              {group.key ? catLabel(group.key) : r("categoryOther")}
                              <span className="td-participants-group-count">
                                {group.regs.length}
                              </span>
                            </h3>
                            <div className="td-participants">
                              {group.regs.map((reg, index) => {
                                const playerName =
                                  reg.player_name ||
                                  nameById.get(reg.player_id) ||
                                  "Player";
                                // Before the deadline an admin may see pairs
                                // whose partner isn't chosen yet — blank there.
                                const partnerName = reg.partner_id
                                  ? reg.partner_name ||
                                    nameById.get(reg.partner_id) ||
                                    "Player"
                                  : "";
                                return (
                                  <div className="td-pair" key={reg.id}>
                                    <span className="td-pair-num">
                                      {index + 1}
                                    </span>
                                    <div className="td-pair-names">
                                      <strong>{playerName}</strong>
                                      <span className="td-pair-amp">&amp;</span>
                                      <strong>{partnerName}</strong>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="td-participants-message">
                      <p>{r("participantsThankYou")}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Draw tab */}
            {currentTab === "draw" && tournament.draw && (
              <div className="td-tab-content">
                <div className="td-block">
                  <h2 className="td-section-title">
                    {t("tournamentsPage.draw.title")}
                  </h2>
                  <div className="td-bracket">
                    {tournament.draw.rounds.map((round, ri) => (
                      <div className="td-bracket-col" key={ri}>
                        <div className="td-bracket-round">
                          {drawRoundLabel(round.length)}
                        </div>
                        {round.map((m, i) => (
                          <div className="td-bracket-match" key={i}>
                            <span className="td-bracket-slot">
                              {ri === 0
                                ? m.a || t("tournamentsPage.draw.bye")
                                : m.a || "—"}
                            </span>
                            <span className="td-bracket-slot">
                              {ri === 0
                                ? m.b || t("tournamentsPage.draw.bye")
                                : m.b || "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
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
