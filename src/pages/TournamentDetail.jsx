import "../styles/TournamentDetail.css";
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useParams, Link, Navigate } from "react-router-dom";
import { Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { getTournamentById, updateTournament } from "../services/tournaments";
import {
  getPlayerDirectory,
  getTournamentRegistrations,
  getRegistrationCount,
  getPublishedPairs,
  getTakenPlayerIds,
  registerForTournament,
  updateRegistrationPartner,
  respondToPartnerInvite,
  withdrawRegistration,
} from "../services/registrations";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { getMyProfile } from "../services/profile";
import { printSchedule, SCHEDULE_LABELS } from "../lib/schedulePrint";
import { scheduleGrid, slotTimeLabel } from "../lib/scheduleBuild";
import { gameLabel } from "../lib/padelScore";
import { hasThirdPlace } from "../lib/drawAdvance";
import { THIRD_PLACE_ROUND, SEMI_ROUND, FINAL_ROUND } from "../lib/points";
import { groupStandings } from "../lib/groupDraw";
import {
  getTournamentMatches,
  subscribeTournament,
} from "../services/liveScores";
import LiveScoreboard from "../components/LiveScoreboard";
import {
  formatDateRange,
  formatSingleDate,
  getTournamentTiming,
  isRegistrationOpen,
  isRegistrationWindowOpen,
  isRegistrationDeadlinePassed,
} from "../lib/tournamentUtils";

// Federation contact shown to disqualified players so they can ask to be added
// back before the draw is made.
const FEDERATION_CONTACT_EMAIL = "padelmkd@gmail.com";

// Canonical category values (also stored on the registration rows). Used as the
// fallback when a tournament hasn't been given an explicit category list.
const CANON_CATEGORIES = ["Men's pairs", "Women's pairs", "Mixed pairs"];
const CATEGORY_LABEL_KEYS = {
  "Men's pairs": "categoryMen",
  "Women's pairs": "categoryWomen",
  "Mixed pairs": "categoryMixed",
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

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
        <p className="td-reg-disqualified-contact">
          {r("disqualifiedContact")}{" "}
          <a href={`mailto:${FEDERATION_CONTACT_EMAIL}`}>
            {FEDERATION_CONTACT_EMAIL}
          </a>
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
  const [canScore, setCanScore] = useState(false); // admin OR referee
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [regError, setRegError] = useState("");
  // Public "list of pairs" publishing (admin toggles it; everyone can then see).
  const [publishedPairs, setPublishedPairs] = useState([]);
  const [pairsBusy, setPairsBusy] = useState(false);
  const [pairsMsg, setPairsMsg] = useState("");
  // Live match scoreboard (open match + per-match statuses for badges).
  const [scoreMatch, setScoreMatch] = useState(null);
  const [matchStatuses, setMatchStatuses] = useState({});

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
      setCanScore(false);
      return;
    }
    getMyProfile()
      .then((p) => {
        setIsAdmin(p?.role === "admin");
        setCanScore(p?.role === "admin" || p?.role === "referee");
      })
      .catch(() => {
        setIsAdmin(false);
        setCanScore(false);
      });
  }, [user]);

  // When the list of pairs is published, load it (names only) for non-admins so
  // they can see it too. Admins already have the full list.
  useEffect(() => {
    if (useInApp && tournament?.id && tournament.pairs_published && !isAdmin) {
      getPublishedPairs(tournament.id)
        .then(setPublishedPairs)
        .catch(() => setPublishedPairs([]));
    } else {
      setPublishedPairs([]);
    }
  }, [useInApp, tournament?.id, tournament?.pairs_published, isAdmin]);

  // Load + live-subscribe the per-match statuses so the bracket can badge live /
  // finished matches and refresh as results come in.
  const loadMatchStatuses = async (tournamentId) => {
    const rows = await getTournamentMatches(tournamentId).catch(() => []);
    const map = {};
    rows.forEach((rrow) => {
      map[`${rrow.round}:${rrow.match_index}`] = {
        status: rrow.status,
        winner: rrow.winner,
        state: rrow.state,
      };
    });
    setMatchStatuses(map);
  };

  useEffect(() => {
    if (!tournament?.id || !tournament.draw) {
      setMatchStatuses({});
      return undefined;
    }
    loadMatchStatuses(tournament.id);
    const unsub = subscribeTournament(tournament.id, () => {
      loadMatchStatuses(tournament.id);
    });
    return unsub;
  }, [tournament?.id, tournament?.draw]);

  // Refetch the tournament (bracket) + statuses after a result changes.
  const refreshAfterResult = async () => {
    if (!tournament?.id) return;
    const fresh = await getTournamentById(tournament.id).catch(() => null);
    if (fresh) setTournament(fresh);
    loadMatchStatuses(tournament.id);
  };

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
  // Admins always see the full list. Everyone else sees it only once the admin
  // has published it (confirmed pairs only, names + category).
  const pairsPublished = !!tournament.pairs_published;
  const showParticipants = isAdmin || pairsPublished;

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

  // Group a list of pair-like rows by category (Men's / Women's / Mixed, in that
  // order, then any others, then uncategorised) so each category gets one clean
  // list.
  const groupByCategory = (list) => {
    const byCat = new Map();
    list.forEach((reg) => {
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
  };

  const participantGroups = groupByCategory(participantList);

  // Public (published) view: names-only rows normalised to the same shape.
  const publishedRows = publishedPairs.map((p, i) => ({
    id: `pub-${i}`,
    player_name: p.player_name,
    partner_name: p.partner_name,
    partner_id: null,
    category: p.category,
  }));
  const publishedGroups = groupByCategory(publishedRows);

  // What the list section actually renders + how many pairs it shows.
  const listGroups = isAdmin ? participantGroups : publishedGroups;
  const listCount = isAdmin ? participantCount : publishedPairs.length;

  const handleTogglePairsPublished = async (publish) => {
    setPairsBusy(true);
    setPairsMsg("");
    try {
      await updateTournament(tournament.id, { pairs_published: publish });
      setTournament((prev) => ({ ...prev, pairs_published: publish }));
    } catch (err) {
      setPairsMsg(err.message || "Failed to update the published list.");
    } finally {
      setPairsBusy(false);
    }
  };

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

  // Download a printable PDF of one category's registered pairs (admin only).
  const handleDownloadCategory = (group) => {
    const title = group.key ? catLabel(group.key) : r("categoryOther");
    const rows = group.regs
      .map((reg, i) => {
        const a =
          reg.player_name || nameById.get(reg.player_id) || "Player";
        const hasPartner = reg.partner_id || reg.partner_name;
        const b = hasPartner
          ? reg.partner_name || nameById.get(reg.partner_id) || "Player"
          : "—";
        return `<tr><td class="num">${i + 1}</td><td>${escapeHtml(
          a
        )}</td><td class="amp">&amp;</td><td>${escapeHtml(b)}</td></tr>`;
      })
      .join("");

    const dateStr = formatDateRange(
      tournament.start_date,
      tournament.end_date,
      "en"
    );
    const meta = [dateStr, tournament.location, title]
      .filter(Boolean)
      .map(escapeHtml)
      .join(" · ");

    const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(tournament.name)} - ${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, "Segoe UI", sans-serif; color: #111; padding: 32px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #b8860b; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; font-size: 12px; margin: 0 0 18px; }
  .name { font-size: 16px; font-weight: bold; margin: 0 0 4px; }
  .meta { color: #555; font-size: 13px; margin: 0 0 22px; }
  h2 { font-size: 14px; margin: 0 0 8px; border-bottom: 2px solid #111; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 14px; }
  td.num { width: 42px; color: #999; font-weight: bold; }
  td.amp { width: 28px; text-align: center; color: #999; }
  .foot { margin-top: 22px; font-size: 12px; color: #888; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>Padel Federation of Macedonia</h1>
  <p class="sub">Registered pairs · ${escapeHtml(title)}</p>
  <p class="name">${escapeHtml(tournament.name)}</p>
  <p class="meta">${meta}</p>
  <h2>${escapeHtml(title)}</h2>
  <table>${rows}</table>
  <p class="foot">${group.regs.length} pair(s)</p>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=720");
    if (!w) {
      alert("Please allow pop-ups to download the PDF.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleDownloadSchedule = () => {
    if (tournament.schedule) {
      printSchedule(tournament.name, tournament.schedule, tournament.draw);
    }
  };

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
  if (tournament.schedule) tabs.push("schedule");
  if (tournament.propositions_url) tabs.push("documents");
  const tabLabel = {
    info: t("tournamentsPage.tabsInfo"),
    registered: t("tournamentsPage.tabsRegistered"),
    draw: t("tournamentsPage.draw.tab"),
    schedule: t("tournamentsPage.schedule.tab"),
    documents: t("tournamentsPage.tabsDocuments"),
  };
  const currentTab = tabs.includes(activeTab) ? activeTab : "info";

  const drawRoundLabel = (matchCount) => {
    if (matchCount === 1) return t("tournamentsPage.draw.final");
    if (matchCount === 2) return t("tournamentsPage.draw.semifinals");
    if (matchCount === 4) return t("tournamentsPage.draw.quarterfinals");
    return t("tournamentsPage.draw.roundOf", { n: matchCount * 2 });
  };

  // One bracket match cell (with live badge + inline score). Shared by the main
  // bracket and the 3rd-place match box.
  const renderBracketMatch = (round, matchIndex, rawA, rawB, firstRound) => {
    const st = matchStatuses[`${round}:${matchIndex}`];
    const aReal = !!(rawA && rawA !== "/");
    const bReal = !!(rawB && rawB !== "/");
    const playable = aReal && bReal;
    const open = () =>
      playable &&
      setScoreMatch({ round, matchIndex, teamA: rawA, teamB: rawB });
    const sc = st?.state;
    const gl = sc ? gameLabel(sc) : null;
    const slotScore = (side) => {
      if (!sc) return null;
      const idx = side === "a" ? 0 : 1;
      const games = (sc.setsGames || []).map((s) => s[idx]);
      const pt =
        st?.status === "live" && !sc.winner && gl ? gl[side] : null;
      return { games, pt };
    };
    const label = (raw) => raw || (firstRound ? t("tournamentsPage.draw.bye") : "—");
    const renderSlot = (side, raw, real) => {
      const s = real ? slotScore(side) : null;
      return (
        <span
          className={`td-bracket-slot${
            st?.status === "finished" && st.winner === side ? " is-winner" : ""
          }`}
        >
          <span className="td-bracket-team">{label(raw)}</span>
          {s && (
            <span className="td-bracket-score">
              {s.games.map((g, gi) => (
                <span className="td-bg" key={gi}>
                  {g}
                </span>
              ))}
              {s.pt != null && (
                <>
                  <span className="td-bdiv" />
                  <span className="td-bp">{s.pt}</span>
                </>
              )}
            </span>
          )}
        </span>
      );
    };
    return (
      <div
        className={`td-bracket-match${
          playable ? " td-bracket-clickable" : ""
        }${st?.status === "live" ? " is-live" : ""}`}
        role={playable ? "button" : undefined}
        tabIndex={playable ? 0 : undefined}
        onClick={open}
        onKeyDown={
          playable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open();
                }
              }
            : undefined
        }
      >
        {st?.status === "live" && (
          <span className="td-bracket-badge live">
            ● {t("tournamentsPage.live.live", "LIVE")}
          </span>
        )}
        {st?.status === "finished" && (
          <span className="td-bracket-badge done">✓</span>
        )}
        {renderSlot("a", rawA, aReal)}
        {renderSlot("b", rawB, bReal)}
      </div>
    );
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
                        {listCount} {r("participantsCount")}
                      </span>
                    )}
                    {isAdmin && (
                      <div className="td-pairs-publish">
                        {pairsPublished ? (
                          <>
                            <span className="td-pairs-live">
                              {r("pairsPublishedNote")}
                            </span>
                            <button
                              type="button"
                              className="td-btn td-btn-outline td-pairs-btn"
                              disabled={pairsBusy}
                              onClick={() => handleTogglePairsPublished(false)}
                            >
                              {r("pairsHide")}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="td-btn td-btn-primary td-pairs-btn"
                            disabled={pairsBusy}
                            onClick={() => handleTogglePairsPublished(true)}
                          >
                            {r("pairsPublish")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {pairsMsg && <p className="td-reg-error">{pairsMsg}</p>}

                  {showParticipants ? (
                    listCount === 0 ? (
                      <p className="td-reg-closed">{r("noParticipants")}</p>
                    ) : (
                      <div className="td-participants-groups">
                        {listGroups.map((group) => (
                          <div
                            className="td-participants-group"
                            key={group.key || "other"}
                          >
                            <h3 className="td-participants-group-title">
                              {group.key ? catLabel(group.key) : r("categoryOther")}
                              <span className="td-participants-group-count">
                                {group.regs.length}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="td-download-btn"
                                  onClick={() => handleDownloadCategory(group)}
                                >
                                  {r("downloadPdf")}
                                </button>
                              )}
                            </h3>
                            <div className="td-participants">
                              {group.regs.map((reg, index) => {
                                const playerName =
                                  reg.player_name ||
                                  nameById.get(reg.player_id) ||
                                  "Player";
                                // Use the stored name first (covers guests and
                                // the published list, which carry names only).
                                // Before the deadline an admin may see a pair
                                // whose partner isn't chosen yet — blank there.
                                const partnerName =
                                  reg.partner_name ||
                                  (reg.partner_id
                                    ? nameById.get(reg.partner_id) || "Player"
                                    : "");
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

                  {tournament.draw.system === "group" ? (
                    <>
                      <div className="td-groups">
                        {(tournament.draw.groups || []).map((g, gi) => (
                          <div className="td-group" key={gi}>
                            <div className="td-group-title">{g.name}</div>
                            <div className="td-standings-wrap">
                              <table className="td-standings">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>{t("ranking.player")}</th>
                                    <th>W</th>
                                    <th>L</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupStandings(g, gi, matchStatuses).map(
                                    (s, i) => (
                                      <tr key={s.team}>
                                        <td>{i + 1}</td>
                                        <td className="td-standings-name">
                                          {s.team}
                                        </td>
                                        <td>{s.wins}</td>
                                        <td>{s.losses}</td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                            <div className="td-group-matches">
                              {g.matches.map((m, mi) => (
                                <div key={mi}>
                                  {renderBracketMatch(gi, mi, m.a, m.b, false)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="td-bracket td-knockout">
                        <div className="td-bracket-col">
                          <div className="td-bracket-round">
                            {t("tournamentsPage.draw.semifinals")}
                          </div>
                          <div className="td-bracket-note">
                            {t("tournamentsPage.draw.thirdPlaceNote")}
                          </div>
                          <div>
                            {renderBracketMatch(
                              SEMI_ROUND,
                              0,
                              tournament.draw.semifinals?.[0]?.a,
                              tournament.draw.semifinals?.[0]?.b,
                              false
                            )}
                          </div>
                          <div>
                            {renderBracketMatch(
                              SEMI_ROUND,
                              1,
                              tournament.draw.semifinals?.[1]?.a,
                              tournament.draw.semifinals?.[1]?.b,
                              false
                            )}
                          </div>
                        </div>
                        <div className="td-bracket-col">
                          <div className="td-bracket-round">
                            {t("tournamentsPage.draw.final")}
                          </div>
                          <div>
                            {renderBracketMatch(
                              FINAL_ROUND,
                              0,
                              tournament.draw.final?.a,
                              tournament.draw.final?.b,
                              false
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="td-thirdplace">
                        <div className="td-bracket-round">
                          {t("tournamentsPage.draw.thirdPlace")}
                        </div>
                        {renderBracketMatch(
                          THIRD_PLACE_ROUND,
                          0,
                          tournament.draw.third?.a,
                          tournament.draw.third?.b,
                          false
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="td-bracket">
                        {tournament.draw.rounds.map((round, ri) => (
                          <div className="td-bracket-col" key={ri}>
                            <div className="td-bracket-round">
                              {drawRoundLabel(round.length)}
                            </div>
                            {round.length === 2 && (
                              <div className="td-bracket-note">
                                {t("tournamentsPage.draw.thirdPlaceNote")}
                              </div>
                            )}
                            {round.map((m, i) => (
                              <div key={i}>
                                {renderBracketMatch(ri, i, m.a, m.b, ri === 0)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {hasThirdPlace(tournament.draw) && (
                        <div className="td-thirdplace">
                          <div className="td-bracket-round">
                            {t("tournamentsPage.draw.thirdPlace")}
                          </div>
                          {renderBracketMatch(
                            THIRD_PLACE_ROUND,
                            0,
                            tournament.draw.thirdPlace?.a,
                            tournament.draw.thirdPlace?.b,
                            false
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Schedule tab */}
            {currentTab === "schedule" && tournament.schedule && (
              <div className="td-tab-content">
                <div className="td-block">
                  <div className="td-schedule-head-row">
                    <h2 className="td-section-title">
                      {SCHEDULE_LABELS.title}
                    </h2>
                    <button
                      type="button"
                      className="td-btn td-btn-outline td-pairs-btn"
                      onClick={handleDownloadSchedule}
                    >
                      {t("tournamentsPage.downloadPdf")}
                    </button>
                  </div>

                  <div className="td-schedule-info">
                    {tournament.schedule.dateRange && (
                      <div>
                        <span>{SCHEDULE_LABELS.date}</span>
                        {tournament.schedule.dateRange}
                      </div>
                    )}
                    {tournament.schedule.club && (
                      <div>
                        <span>{SCHEDULE_LABELS.club}</span>
                        {tournament.schedule.club}
                      </div>
                    )}
                    {tournament.schedule.referee && (
                      <div>
                        <span>{SCHEDULE_LABELS.referee}</span>
                        {tournament.schedule.referee}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const rows = scheduleGrid(
                      tournament.draw,
                      tournament.schedule
                    );
                    if (rows.length === 0) {
                      return (
                        <p className="td-reg-closed">
                          {t("tournamentsPage.schedule.empty")}
                        </p>
                      );
                    }
                    return (
                      <div className="td-schedule-table-wrap">
                        <table className="td-schedule-table">
                          <thead>
                            <tr>
                              <th className="corner" />
                              {SCHEDULE_LABELS.courts.map((c) => (
                                <th key={c}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const out = [];
                              let curDay = null;
                              let n = 0;
                              rows.forEach((row, ri) => {
                                if (row.day && row.day !== curDay) {
                                  curDay = row.day;
                                  n = 0;
                                  out.push(
                                    <tr
                                      key={`d-${ri}`}
                                      className="td-schedule-dayrow"
                                    >
                                      <td
                                        colSpan={
                                          SCHEDULE_LABELS.courts.length + 1
                                        }
                                      >
                                        {row.day}
                                      </td>
                                    </tr>
                                  );
                                }
                                n += 1;
                                out.push(
                                  <tr key={ri}>
                                    <td className="rownum">
                                      {SCHEDULE_LABELS.match} {n}
                                    </td>
                                    {SCHEDULE_LABELS.courts.map((_, ci) => {
                                      const mt = row.cells[ci];
                                      const solo = mt && mt.teamA && !mt.teamB;
                                      return (
                                        <td key={ci} className="cell">
                                          {mt ? (
                                            <>
                                              <div className="t">
                                                {slotTimeLabel(
                                                  row,
                                                  SCHEDULE_LABELS
                                                )}
                                              </div>
                                              <div>{mt.teamA}</div>
                                              {!solo && (
                                                <>
                                                  <div className="vs">
                                                    {SCHEDULE_LABELS.vs}
                                                  </div>
                                                  <div>{mt.teamB}</div>
                                                </>
                                              )}
                                            </>
                                          ) : (
                                            "—"
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              });
                              return out;
                            })()}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
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

      {scoreMatch && (
        <LiveScoreboard
          tournament={tournament}
          round={scoreMatch.round}
          matchIndex={scoreMatch.matchIndex}
          teamA={scoreMatch.teamA}
          teamB={scoreMatch.teamB}
          isAdmin={isAdmin}
          canScore={canScore}
          onClose={() => setScoreMatch(null)}
          onDrawChanged={refreshAfterResult}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
};

export default TournamentDetail;
