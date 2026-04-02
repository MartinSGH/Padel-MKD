import { useEffect, useState } from "react";
import {
  getAllPlayers,
  getAllSubmissions,
  approveSubmission,
  declineSubmission,
} from "../services/admin";
import "../styles/Admin.css";

function getStatusClass(status) {
  if (status === "approved") return "status-badge approved";
  if (status === "declined") return "status-badge declined";
  return "status-badge pending";
}

export default function Admin() {
  const [players, setPlayers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setError("");
      const [playersData, submissionsData] = await Promise.all([
        getAllPlayers(),
        getAllSubmissions(),
      ]);

      setPlayers(playersData);
      setSubmissions(submissionsData);
    } catch (err) {
      setError(err.message || "Failed to load admin panel.");
    } finally {
      setLoading(false);
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
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="admin-empty-cell">
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
              {submissions.length === 0 ? (
                <div className="admin-empty-state">
                  No point submissions available.
                </div>
              ) : (
                submissions.map((item) => (
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
      </div>
    </section>
  );
}