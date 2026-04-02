import { useState } from "react";
import { createPointSubmission } from "../services/submissions";
import "../styles/SubmitPoints.css";

export default function SubmitPoints() {
  const [form, setForm] = useState({
    tournament_name: "",
    tournament_link: "",
    tournament_date: "",
    requested_points: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await createPointSubmission(form);
      setMessage("Points request submitted. Status: Pending approval.");
      setForm({
        tournament_name: "",
        tournament_link: "",
        tournament_date: "",
        requested_points: "",
      });
    } catch (err) {
      setError(err.message || "Failed to submit points request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="submit-points-page">
      <div className="submit-points-shell">
        <div className="submit-points-card">
          <div className="submit-points-header">
            <span className="submit-points-eyebrow">Tournament Points</span>
            <h1>Submit Tournament Points</h1>
            <p>
              Fill in your tournament information and submit it for admin review.
              Your points will be added only after approval.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="submit-points-form">
            <div className="submit-form-group">
              <label htmlFor="tournament_name">Tournament Name</label>
              <input
                id="tournament_name"
                type="text"
                name="tournament_name"
                placeholder="Enter tournament name"
                value={form.tournament_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="submit-form-group">
              <label htmlFor="tournament_link">Tournament Link</label>
              <input
                id="tournament_link"
                type="url"
                name="tournament_link"
                placeholder="Paste tournament link"
                value={form.tournament_link}
                onChange={handleChange}
                required
              />
            </div>

            <div className="submit-form-row">
              <div className="submit-form-group">
                <label htmlFor="tournament_date">Tournament Date</label>
                <input
                  id="tournament_date"
                  type="date"
                  name="tournament_date"
                  value={form.tournament_date}
                  onChange={handleChange}
                />
              </div>

              <div className="submit-form-group">
                <label htmlFor="requested_points">Requested Points</label>
                <input
                  id="requested_points"
                  type="number"
                  name="requested_points"
                  placeholder="0"
                  value={form.requested_points}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="submit-points-btn">
              {loading ? "Submitting..." : "Submit Points"}
            </button>

            {message && <p className="submit-message success">{message}</p>}
            {error && <p className="submit-message error">{error}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}