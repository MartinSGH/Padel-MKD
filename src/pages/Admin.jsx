import { useEffect, useState } from "react";
import {
  getAllPlayers,
  getAllSubmissions,
  approveSubmission,
  declineSubmission,
} from "../services/admin";
import {
  getAllClubs,
  addClub,
  updateClub,
  deleteClub,
  uploadClubLogo,
} from "../services/clubs";
import {
  getAllTournaments,
  addTournament,
  updateTournament,
  deleteTournament,
  uploadTournamentFile,
} from "../services/tournaments";
import { formatDateRange } from "../lib/tournamentUtils";
import AdminTournamentDraw from "../components/AdminTournamentDraw";
import "../styles/Admin.css";

const emptyClubForm = {
  name: "",
  address: "",
  hours: "",
  phone: "",
  email: "",
  logo_url: "",
};

const emptyTournamentForm = {
  name: "",
  code: "",
  type: "",
  category: "",
  location: "",
  start_date: "",
  end_date: "",
  status: "active",
  registration_url: "",
  registration_deadline: "",
  format: "",
  competitors: "",
  prizes: "",
  qualifications: "",
  result: "",
  description: "",
  detail_url: "",
  image_url: "",
  propositions_url: "",
};

function getStatusClass(status) {
  if (status === "approved") return "status-badge approved";
  if (status === "declined") return "status-badge declined";
  return "status-badge pending";
}

export default function Admin() {
  const [players, setPlayers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  // Clubs management state
  const [showAddClub, setShowAddClub] = useState(false);
  const [clubForm, setClubForm] = useState(emptyClubForm);
  const [clubLogoFile, setClubLogoFile] = useState(null);
  const [clubLogoPreview, setClubLogoPreview] = useState("");
  const [clubSubmitting, setClubSubmitting] = useState(false);
  const [clubError, setClubError] = useState("");
  const [clubActionId, setClubActionId] = useState(null);
  const [editingClubId, setEditingClubId] = useState(null);

  // Tournaments management state
  const [tournaments, setTournaments] = useState([]);
  const [showAddTournament, setShowAddTournament] = useState(false);
  const [tournamentForm, setTournamentForm] = useState(emptyTournamentForm);
  const [tournamentSubmitting, setTournamentSubmitting] = useState(false);
  const [tournamentError, setTournamentError] = useState("");
  const [tournamentActionId, setTournamentActionId] = useState(null);
  const [editingTournamentId, setEditingTournamentId] = useState(null);
  const [tournamentImageFile, setTournamentImageFile] = useState(null);
  const [tournamentPdfFile, setTournamentPdfFile] = useState(null);

  const loadData = async () => {
    try {
      setError("");
      const [playersData, submissionsData] = await Promise.all([
        getAllPlayers(),
        getAllSubmissions(),
      ]);

      setPlayers(playersData);
      setSubmissions(submissionsData);

      // Loaded separately and tolerantly so a missing `clubs`/`tournaments`
      // table (before the SQL migration is run) doesn't break the rest of the
      // admin panel.
      try {
        const clubsData = await getAllClubs();
        setClubs(clubsData);
      } catch {
        setClubs([]);
      }

      try {
        const tournamentsData = await getAllTournaments();
        setTournaments(tournamentsData);
      } catch {
        setTournaments([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load admin panel.");
    } finally {
      setLoading(false);
    }
  };

  const handleClubFieldChange = (field) => (e) => {
    setClubForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleClubLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setClubLogoFile(file);
    setClubLogoPreview(file ? URL.createObjectURL(file) : "");
  };

  const resetClubForm = () => {
    setClubForm(emptyClubForm);
    setEditingClubId(null);
    setClubLogoFile(null);
    setClubLogoPreview("");
    setClubError("");
  };

  const startEditClub = (club) => {
    setEditingClubId(club.id);
    setClubForm({
      name: club.name || "",
      address: club.address || "",
      hours: club.hours || "",
      phone: club.phone || "",
      email: club.email || "",
      logo_url: club.logo_url || "",
    });
    setClubLogoFile(null);
    setClubLogoPreview("");
    setClubError("");
    setShowAddClub(true);
    document
      .querySelector(".admin-clubs-card")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmitClub = async (e) => {
    e.preventDefault();

    if (!clubForm.name.trim()) {
      setClubError("Club name is required.");
      return;
    }

    try {
      setClubSubmitting(true);
      setClubError("");

      let logoUrl = clubForm.logo_url.trim();
      if (clubLogoFile) {
        logoUrl = await uploadClubLogo(clubLogoFile);
      }

      const payload = {
        name: clubForm.name.trim(),
        address: clubForm.address.trim() || null,
        hours: clubForm.hours.trim() || null,
        phone: clubForm.phone.trim() || null,
        email: clubForm.email.trim() || null,
        logo_url: logoUrl || null,
      };

      if (editingClubId) {
        await updateClub(editingClubId, payload);
      } else {
        const nextOrder =
          clubs.reduce((max, c) => Math.max(max, c.display_order || 0), 0) + 1;
        await addClub({ ...payload, display_order: nextOrder });
      }

      resetClubForm();
      setShowAddClub(false);
      await loadData();
    } catch (err) {
      setClubError(err.message || "Failed to save club.");
    } finally {
      setClubSubmitting(false);
    }
  };

  const handleDeleteClub = async (club) => {
    if (
      !window.confirm(
        `Delete "${club.name}"? This removes it from the website and cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setClubActionId(club.id);
      await deleteClub(club.id);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to delete club.");
    } finally {
      setClubActionId(null);
    }
  };

  const handleTournamentFieldChange = (field) => (e) => {
    setTournamentForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetTournamentForm = () => {
    setTournamentForm(emptyTournamentForm);
    setEditingTournamentId(null);
    setTournamentImageFile(null);
    setTournamentPdfFile(null);
    setTournamentError("");
  };

  const startEditTournament = (tournament) => {
    setEditingTournamentId(tournament.id);
    setTournamentForm({
      name: tournament.name || "",
      code: tournament.code || "",
      type: tournament.type || "",
      category: tournament.category || "",
      location: tournament.location || "",
      start_date: tournament.start_date || "",
      end_date: tournament.end_date || "",
      status: tournament.status || "active",
      registration_url: tournament.registration_url || "",
      registration_deadline: tournament.registration_deadline || "",
      format: tournament.format || "",
      competitors: tournament.competitors || "",
      prizes: tournament.prizes || "",
      qualifications: tournament.qualifications || "",
      result: tournament.result || "",
      description: tournament.description || "",
      detail_url: tournament.detail_url || "",
      image_url: tournament.image_url || "",
      propositions_url: tournament.propositions_url || "",
    });
    setTournamentImageFile(null);
    setTournamentPdfFile(null);
    setTournamentError("");
    setShowAddTournament(true);
    document
      .querySelector(".admin-tournaments-card")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmitTournament = async (e) => {
    e.preventDefault();

    if (!tournamentForm.name.trim()) {
      setTournamentError("Tournament name is required.");
      return;
    }

    if (!tournamentForm.registration_deadline) {
      setTournamentError("Registration deadline is required.");
      return;
    }

    try {
      setTournamentSubmitting(true);
      setTournamentError("");

      // Trim text fields; convert empty strings to null.
      const clean = (v) => {
        const trimmed = (v || "").trim();
        return trimmed === "" ? null : trimmed;
      };

      // Upload a freshly chosen image / PDF (a file overrides the URL field).
      let imageUrl = clean(tournamentForm.image_url);
      if (tournamentImageFile) {
        imageUrl = await uploadTournamentFile(tournamentImageFile, "images");
      }

      let propositionsUrl = clean(tournamentForm.propositions_url);
      if (tournamentPdfFile) {
        propositionsUrl = await uploadTournamentFile(
          tournamentPdfFile,
          "documents"
        );
      }

      const payload = {
        name: tournamentForm.name.trim(),
        code: clean(tournamentForm.code),
        type: clean(tournamentForm.type),
        category: clean(tournamentForm.category),
        location: clean(tournamentForm.location),
        start_date: tournamentForm.start_date || null,
        end_date: tournamentForm.end_date || null,
        status: tournamentForm.status || "active",
        registration_url: clean(tournamentForm.registration_url),
        registration_deadline: tournamentForm.registration_deadline || null,
        format: clean(tournamentForm.format),
        competitors: clean(tournamentForm.competitors),
        prizes: clean(tournamentForm.prizes),
        qualifications: clean(tournamentForm.qualifications),
        result: clean(tournamentForm.result),
        description: clean(tournamentForm.description),
        detail_url: clean(tournamentForm.detail_url),
        image_url: imageUrl,
        propositions_url: propositionsUrl,
      };

      if (editingTournamentId) {
        await updateTournament(editingTournamentId, payload);
      } else {
        const nextOrder =
          tournaments.reduce(
            (max, x) => Math.max(max, x.display_order || 0),
            0
          ) + 1;
        await addTournament({ ...payload, display_order: nextOrder });
      }

      resetTournamentForm();
      setShowAddTournament(false);
      await loadData();
    } catch (err) {
      setTournamentError(err.message || "Failed to save tournament.");
    } finally {
      setTournamentSubmitting(false);
    }
  };

  const handleDeleteTournament = async (tournament) => {
    if (
      !window.confirm(
        `Delete "${tournament.name}"? This removes it from the website and cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setTournamentActionId(tournament.id);
      await deleteTournament(tournament.id);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to delete tournament.");
    } finally {
      setTournamentActionId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (item) => {
    try {
      setActionLoadingId(item.id);
      await approveSubmission(item);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to approve submission.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (id) => {
    try {
      setActionLoadingId(id);
      await declineSubmission(id);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to decline submission.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return <div className="admin-page admin-loading">Loading admin panel...</div>;
  }

  if (error) {
    return <div className="admin-page admin-error">{error}</div>;
  }

  const pendingSubmissions = submissions.filter(
    (item) => item.status === "pending"
  );
  const resolvedSubmissions = submissions.filter(
    (item) => item.status !== "pending"
  );

  return (
    <section className="admin-page">
      <div className="admin-shell">
        <div className="admin-heading">
          <span className="admin-eyebrow">Management</span>
          <h1>Admin Panel</h1>
          <p>
            Manage all registered players and review tournament point submissions
            from one place.
          </p>
        </div>

        <div className="admin-layout">
          <div className="admin-card admin-players-card">
            <div className="admin-card-header">
              <div>
                <h2>Player List</h2>
                <p>All registered players with current points.</p>
              </div>
              <div className="admin-count-pill">{players.length} Players</div>
            </div>

            <div className="admin-players-table-wrap">
              <table className="admin-players-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Club</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="admin-empty-cell">
                        No players found.
                      </td>
                    </tr>
                  ) : (
                    players.map((player) => (
                      <tr key={player.id}>
                        <td>
                          <div className="admin-player-meta">
                            <div className="admin-player-avatar">
                              {player.avatar_url ? (
                                <img src={player.avatar_url} alt={player.full_name} />
                              ) : (
                                <span>
                                  {(player.full_name || "P").charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="admin-player-name">
                                {player.full_name || "Unnamed Player"}
                              </p>
                              <span className="admin-player-role">{player.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="admin-player-email">{player.email}</td>
                        <td className="admin-player-phone">
                          {player.phone || "—"}
                        </td>
                        <td className="admin-player-club">
                          {player.club_name || "—"}
                        </td>
                        <td>
                          <span className="admin-points-pill">
                            {player.total_points}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card admin-submissions-card">
            <div className="admin-card-header">
              <div>
                <h2>Point Submissions</h2>
                <p>Approve or decline submitted tournament points.</p>
              </div>
              <div className="admin-count-pill">
                {submissions.filter((item) => item.status === "pending").length} Pending
              </div>
            </div>

            <div className="admin-submissions-list">
              {pendingSubmissions.length === 0 ? (
                <div className="admin-empty-state">
                  No pending submissions.
                </div>
              ) : (
                pendingSubmissions.map((item) => (
                  <div key={item.id} className="admin-submission-item">
                    <div className="admin-submission-top">
                      <div>
                        <h3>{item.tournament_name}</h3>
                        <p>
                          <strong>Player:</strong>{" "}
                          {item.profiles?.full_name || "Unknown Player"}
                        </p>
                        <p>
                          <strong>Email:</strong> {item.profiles?.email || "-"}
                        </p>
                      </div>

                      <span className={getStatusClass(item.status)}>
                        {item.status}
                      </span>
                    </div>

                    <div className="admin-submission-grid">
                      <div>
                        <span className="admin-label">Tournament Link</span>
                        <a
                          href={item.tournament_link}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-link"
                        >
                          Open tournament link
                        </a>
                      </div>

                      <div>
                        <span className="admin-label">Requested Points</span>
                        <p>{item.requested_points}</p>
                      </div>

                      <div>
                        <span className="admin-label">Tournament Date</span>
                        <p>{item.tournament_date || "-"}</p>
                      </div>

                      <div>
                        <span className="admin-label">Submitted At</span>
                        <p>{new Date(item.submitted_at).toLocaleString()}</p>
                      </div>
                    </div>

                    {item.admin_note && (
                      <div className="admin-note-box">
                        <span className="admin-label">Admin Note</span>
                        <p>{item.admin_note}</p>
                      </div>
                    )}

                    {item.status === "pending" && (
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn approve"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleApprove(item)}
                        >
                          {actionLoadingId === item.id ? "Processing..." : "Approve"}
                        </button>

                        <button
                          type="button"
                          className="admin-btn decline"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleDecline(item.id)}
                        >
                          {actionLoadingId === item.id ? "Processing..." : "Decline"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Submissions history (resolved → accordion) */}
        <div className="admin-card admin-history-card">
          <div className="admin-card-header">
            <div>
              <h2>Submissions History</h2>
              <p>Approved and declined submissions. Click to expand details.</p>
            </div>
            <div className="admin-count-pill">
              {resolvedSubmissions.length} Resolved
            </div>
          </div>

          <div className="admin-history-list">
            {resolvedSubmissions.length === 0 ? (
              <div className="admin-empty-state">
                No resolved submissions yet.
              </div>
            ) : (
              resolvedSubmissions.map((item) => (
                <details key={item.id} className="admin-history-item">
                  <summary className="admin-history-summary">
                    <div className="admin-history-head">
                      <span className="admin-history-title">
                        {item.tournament_name}
                      </span>
                      <span className="admin-history-player">
                        {item.profiles?.full_name || "Unknown Player"}
                      </span>
                    </div>
                    <span className={getStatusClass(item.status)}>
                      {item.status}
                    </span>
                  </summary>

                  <div className="admin-history-body">
                    <div className="admin-submission-grid">
                      <div>
                        <span className="admin-label">Email</span>
                        <p>{item.profiles?.email || "-"}</p>
                      </div>
                      <div>
                        <span className="admin-label">Requested Points</span>
                        <p>{item.requested_points}</p>
                      </div>
                      <div>
                        <span className="admin-label">Tournament Link</span>
                        <a
                          href={item.tournament_link}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-link"
                        >
                          Open tournament link
                        </a>
                      </div>
                      <div>
                        <span className="admin-label">Tournament Date</span>
                        <p>{item.tournament_date || "-"}</p>
                      </div>
                      <div>
                        <span className="admin-label">Submitted At</span>
                        <p>{new Date(item.submitted_at).toLocaleString()}</p>
                      </div>
                      {item.reviewed_at && (
                        <div>
                          <span className="admin-label">Reviewed At</span>
                          <p>{new Date(item.reviewed_at).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {item.admin_note && (
                      <div className="admin-note-box">
                        <span className="admin-label">Admin Note</span>
                        <p>{item.admin_note}</p>
                      </div>
                    )}
                  </div>
                </details>
              ))
            )}
          </div>
        </div>

        {/* Clubs management */}
        <div className="admin-card admin-clubs-card">
          <div className="admin-card-header">
            <div>
              <h2>Clubs</h2>
              <p>
                Manage the clubs shown in the landing page carousel and on the
                Clubs page.
              </p>
            </div>
            <div className="admin-clubs-header-actions">
              <div className="admin-count-pill">{clubs.length} Clubs</div>
              <button
                type="button"
                className="admin-btn approve admin-add-club-btn"
                onClick={() => {
                  if (showAddClub) {
                    setShowAddClub(false);
                    resetClubForm();
                  } else {
                    resetClubForm();
                    setShowAddClub(true);
                  }
                }}
              >
                {showAddClub ? "Close" : "+ Add Club"}
              </button>
            </div>
          </div>

          {showAddClub && (
            <form className="admin-club-form" onSubmit={handleSubmitClub}>
              {editingClubId && (
                <p className="admin-edit-note">
                  Editing “{clubForm.name || "club"}”
                </p>
              )}
              <div className="admin-club-form-grid">
                <label className="admin-field">
                  <span>Name *</span>
                  <input
                    value={clubForm.name}
                    onChange={handleClubFieldChange("name")}
                    placeholder="Club name"
                  />
                </label>
                <label className="admin-field">
                  <span>Address</span>
                  <input
                    value={clubForm.address}
                    onChange={handleClubFieldChange("address")}
                    placeholder="Street, City"
                  />
                </label>
                <label className="admin-field">
                  <span>Working hours</span>
                  <input
                    value={clubForm.hours}
                    onChange={handleClubFieldChange("hours")}
                    placeholder="Open from 10-6"
                  />
                </label>
                <label className="admin-field">
                  <span>Phone</span>
                  <input
                    value={clubForm.phone}
                    onChange={handleClubFieldChange("phone")}
                    placeholder="07x xxx xxx"
                  />
                </label>
                <label className="admin-field">
                  <span>Email</span>
                  <input
                    value={clubForm.email}
                    onChange={handleClubFieldChange("email")}
                    placeholder="club@email.com"
                  />
                </label>
                <label className="admin-field">
                  <span>Logo URL</span>
                  <input
                    value={clubForm.logo_url}
                    onChange={handleClubFieldChange("logo_url")}
                    placeholder="https://… or /images/…"
                    disabled={!!clubLogoFile}
                  />
                </label>
              </div>

              <div className="admin-club-logo-row">
                <label className="admin-field admin-club-file-field">
                  <span>…or upload a logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleClubLogoChange}
                  />
                </label>
                {clubLogoPreview && (
                  <div className="admin-club-logo-preview">
                    <img src={clubLogoPreview} alt="Logo preview" />
                  </div>
                )}
              </div>

              {clubError && <p className="admin-club-error">{clubError}</p>}

              <div className="admin-actions">
                <button
                  type="submit"
                  className="admin-btn approve"
                  disabled={clubSubmitting}
                >
                  {clubSubmitting
                    ? "Saving…"
                    : editingClubId
                      ? "Update Club"
                      : "Save Club"}
                </button>
                <button
                  type="button"
                  className="admin-btn decline"
                  onClick={() => {
                    resetClubForm();
                    setShowAddClub(false);
                  }}
                  disabled={clubSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="admin-clubs-grid">
            {clubs.length === 0 ? (
              <div className="admin-empty-state">
                No clubs yet. Add the first one.
              </div>
            ) : (
              clubs.map((club) => (
                <div key={club.id} className="admin-club-item">
                  <div className="admin-club-logo">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} />
                    ) : (
                      <span>{(club.name || "C").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="admin-club-info">
                    <h3>{club.name}</h3>
                    {club.address && <p>{club.address}</p>}
                    {club.hours && <p>{club.hours}</p>}
                    {club.phone && <p>{club.phone}</p>}
                    {club.email && (
                      <p className="admin-club-email">{club.email}</p>
                    )}
                  </div>
                  <div className="admin-tournament-actions">
                    <button
                      type="button"
                      className="admin-btn admin-edit-btn"
                      onClick={() => startEditClub(club)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn decline admin-club-delete"
                      disabled={clubActionId === club.id}
                      onClick={() => handleDeleteClub(club)}
                    >
                      {clubActionId === club.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tournaments management */}
        <div className="admin-card admin-tournaments-card">
          <div className="admin-card-header">
            <div>
              <h2>Tournaments</h2>
              <p>
                Manage the tournaments shown in the landing section and on the
                Tournaments page.
              </p>
            </div>
            <div className="admin-clubs-header-actions">
              <div className="admin-count-pill">
                {tournaments.length} Tournaments
              </div>
              <button
                type="button"
                className="admin-btn approve admin-add-club-btn"
                onClick={() => {
                  if (showAddTournament) {
                    setShowAddTournament(false);
                    resetTournamentForm();
                  } else {
                    resetTournamentForm();
                    setShowAddTournament(true);
                  }
                }}
              >
                {showAddTournament ? "Close" : "+ Add Tournament"}
              </button>
            </div>
          </div>

          {showAddTournament && (
            <form className="admin-club-form" onSubmit={handleSubmitTournament}>
              {editingTournamentId && (
                <p className="admin-edit-note">
                  Editing “{tournamentForm.name || "tournament"}”
                </p>
              )}
              <div className="admin-club-form-grid">
                <label className="admin-field">
                  <span>Name *</span>
                  <input
                    value={tournamentForm.name}
                    onChange={handleTournamentFieldChange("name")}
                    placeholder="Tournament name"
                  />
                </label>
                <label className="admin-field">
                  <span>Code</span>
                  <input
                    value={tournamentForm.code}
                    onChange={handleTournamentFieldChange("code")}
                    placeholder="e.g. NPC-2026"
                  />
                </label>
                <label className="admin-field">
                  <span>Type</span>
                  <input
                    value={tournamentForm.type}
                    onChange={handleTournamentFieldChange("type")}
                    placeholder="Championship / League / Tournament"
                  />
                </label>
                <label className="admin-field">
                  <span>Category</span>
                  <input
                    value={tournamentForm.category}
                    onChange={handleTournamentFieldChange("category")}
                    placeholder="Open / Juniors / Women / Veterans"
                  />
                </label>
                <label className="admin-field">
                  <span>Location</span>
                  <input
                    value={tournamentForm.location}
                    onChange={handleTournamentFieldChange("location")}
                    placeholder="Venue, City"
                  />
                </label>
                <label className="admin-field">
                  <span>Status</span>
                  <select
                    className="admin-select"
                    value={tournamentForm.status}
                    onChange={handleTournamentFieldChange("status")}
                  >
                    <option value="active">Active</option>
                    <option value="postponed">Postponed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>Start date</span>
                  <input
                    type="date"
                    value={tournamentForm.start_date}
                    onChange={handleTournamentFieldChange("start_date")}
                  />
                </label>
                <label className="admin-field">
                  <span>End date</span>
                  <input
                    type="date"
                    value={tournamentForm.end_date}
                    onChange={handleTournamentFieldChange("end_date")}
                  />
                </label>
                <label className="admin-field">
                  <span>Registration URL</span>
                  <input
                    value={tournamentForm.registration_url}
                    onChange={handleTournamentFieldChange("registration_url")}
                    placeholder="https://forms.gle/…"
                  />
                </label>
                <label className="admin-field">
                  <span>Registration deadline *</span>
                  <input
                    type="date"
                    required
                    value={tournamentForm.registration_deadline}
                    onChange={handleTournamentFieldChange(
                      "registration_deadline"
                    )}
                  />
                </label>
                <label className="admin-field">
                  <span>Format</span>
                  <input
                    value={tournamentForm.format}
                    onChange={handleTournamentFieldChange("format")}
                    placeholder="Men's / Women's / Mixed pairs"
                  />
                </label>
                <label className="admin-field">
                  <span>Competitors</span>
                  <input
                    value={tournamentForm.competitors}
                    onChange={handleTournamentFieldChange("competitors")}
                    placeholder="Who can take part"
                  />
                </label>
                <label className="admin-field">
                  <span>Prizes</span>
                  <input
                    value={tournamentForm.prizes}
                    onChange={handleTournamentFieldChange("prizes")}
                    placeholder="Trophies, medals…"
                  />
                </label>
                <label className="admin-field">
                  <span>Qualifications</span>
                  <input
                    value={tournamentForm.qualifications}
                    onChange={handleTournamentFieldChange("qualifications")}
                    placeholder="Qualification criteria"
                  />
                </label>
                <label className="admin-field">
                  <span>Result</span>
                  <input
                    value={tournamentForm.result}
                    onChange={handleTournamentFieldChange("result")}
                    placeholder="Winner / outcome (after the event)"
                  />
                </label>
                <label className="admin-field">
                  <span>Custom page URL</span>
                  <input
                    value={tournamentForm.detail_url}
                    onChange={handleTournamentFieldChange("detail_url")}
                    placeholder="/national-championship-2026 (optional)"
                  />
                </label>
                <label className="admin-field">
                  <span>Image URL</span>
                  <input
                    value={tournamentForm.image_url}
                    onChange={handleTournamentFieldChange("image_url")}
                    placeholder="https://… or upload below"
                    disabled={!!tournamentImageFile}
                  />
                </label>
                <label className="admin-field">
                  <span>Propositions PDF URL</span>
                  <input
                    value={tournamentForm.propositions_url}
                    onChange={handleTournamentFieldChange("propositions_url")}
                    placeholder="https://… or upload below"
                    disabled={!!tournamentPdfFile}
                  />
                </label>
              </div>

              <div className="admin-club-logo-row">
                <label className="admin-field admin-club-file-field">
                  <span>…or upload a cover image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setTournamentImageFile(e.target.files?.[0] || null)
                    }
                  />
                </label>
                <label className="admin-field admin-club-file-field">
                  <span>…or upload propositions (PDF)</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) =>
                      setTournamentPdfFile(e.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>

              <label className="admin-field admin-field-full">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={tournamentForm.description}
                  onChange={handleTournamentFieldChange("description")}
                  placeholder="Short description shown in the modal and detail page"
                />
              </label>

              {tournamentError && (
                <p className="admin-club-error">{tournamentError}</p>
              )}

              <div className="admin-actions">
                <button
                  type="submit"
                  className="admin-btn approve"
                  disabled={tournamentSubmitting}
                >
                  {tournamentSubmitting
                    ? "Saving…"
                    : editingTournamentId
                      ? "Update Tournament"
                      : "Save Tournament"}
                </button>
                <button
                  type="button"
                  className="admin-btn decline"
                  onClick={() => {
                    resetTournamentForm();
                    setShowAddTournament(false);
                  }}
                  disabled={tournamentSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="admin-tournaments-list">
            {tournaments.length === 0 ? (
              <div className="admin-empty-state">
                No tournaments yet. Add the first one.
              </div>
            ) : (
              tournaments.map((tournament) => (
                <div key={tournament.id} className="admin-tournament-item">
                  <div className="admin-tournament-info">
                    <h3>
                      {tournament.name}
                      <span
                        className={`admin-tournament-status admin-tournament-status-${tournament.status}`}
                      >
                        {tournament.status}
                      </span>
                    </h3>
                    <p className="admin-tournament-meta">
                      {[tournament.type, tournament.category]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="admin-tournament-sub">
                      {formatDateRange(
                        tournament.start_date,
                        tournament.end_date,
                        "en"
                      )}
                      {tournament.location ? ` — ${tournament.location}` : ""}
                    </p>
                  </div>
                  <div className="admin-tournament-actions">
                    <button
                      type="button"
                      className="admin-btn admin-edit-btn"
                      onClick={() => startEditTournament(tournament)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn decline admin-club-delete"
                      disabled={tournamentActionId === tournament.id}
                      onClick={() => handleDeleteTournament(tournament)}
                    >
                      {tournamentActionId === tournament.id
                        ? "Deleting…"
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <AdminTournamentDraw tournaments={tournaments} />
      </div>
    </section>
  );
}