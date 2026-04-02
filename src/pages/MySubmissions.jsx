import { useEffect, useState } from "react";
import { getMySubmissions } from "../services/submissions";
import "../styles/MySubmissions.css";

function getStatusClass(status) {
  if (status === "approved") return "submission-status approved";
  if (status === "declined") return "submission-status declined";
  return "submission-status pending";
}

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        const data = await getMySubmissions();
        setSubmissions(data);
      } catch (err) {
        setError(err.message || "Failed to load submissions.");
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, []);

  if (loading) {
    return <div className="submissions-page submissions-loading">Loading submissions...</div>;
  }

  if (error) {
    return <div className="submissions-page submissions-error">{error}</div>;
  }

  return (
    <section className="submissions-page">
      <div className="submissions-shell">
        <div className="submissions-header">
          <span className="submissions-eyebrow">Your Requests</span>
          <h1>My Point Submissions</h1>
          <p>
            Track every points request you submitted and check whether it is still
            pending, approved, or declined.
          </p>
        </div>

        {submissions.length === 0 ? (
          <div className="submissions-empty-card">No submissions yet.</div>
        ) : (
          <div className="submissions-grid">
            {submissions.map((item) => (
              <div key={item.id} className="submission-card">
                <div className="submission-card-top">
                  <div>
                    <h2>{item.tournament_name}</h2>
                    <p className="submission-date">
                      {item.tournament_date || "No tournament date added"}
                    </p>
                  </div>

                  <span className={getStatusClass(item.status)}>{item.status}</span>
                </div>

                <div className="submission-meta-grid">
                  <div className="submission-meta-item">
                    <span>Requested Points</span>
                    <p>{item.requested_points}</p>
                  </div>

                  <div className="submission-meta-item">
                    <span>Submitted At</span>
                    <p>{new Date(item.submitted_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="submission-link-box">
                  <span>Tournament Link</span>
                  <a href={item.tournament_link} target="_blank" rel="noreferrer">
                    Open tournament link
                  </a>
                </div>

                {item.admin_note && (
                  <div className="submission-note-box">
                    <span>Admin Note</span>
                    <p>{item.admin_note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}