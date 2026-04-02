import { useEffect, useState } from "react";
import { getMyProfile } from "../services/profile";
import "../styles/Profile.css";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getMyProfile();
        setProfile(data);
      } catch (err) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) return <div className="profile-page profile-loading">Loading profile...</div>;
  if (error) return <div className="profile-page profile-error">{error}</div>;

  return (
    <section className="profile-page">
      <div className="profile-shell">
        <div className="profile-card">
          <div className="profile-top">
            <div className="profile-avatar-wrap">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="profile-avatar" />
              ) : (
                <div className="profile-avatar-fallback">
                  {(profile.full_name || "P").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="profile-intro">
              <span className="profile-eyebrow">Player Account</span>
              <h1>{profile.full_name}</h1>
              <p>{profile.email}</p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat-card highlight">
              <span>Total Points</span>
              <strong>{profile.total_points}</strong>
            </div>

            <div className="profile-stat-card">
              <span>Role</span>
              <strong>{profile.role}</strong>
            </div>

            <div className="profile-stat-card">
              <span>Joined</span>
              <strong>{new Date(profile.created_at).toLocaleDateString()}</strong>
            </div>
          </div>

          <div className="profile-details-card">
            <h2>Account Information</h2>

            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span>Full Name</span>
                <p>{profile.full_name}</p>
              </div>

              <div className="profile-detail-item">
                <span>Email</span>
                <p>{profile.email}</p>
              </div>

              <div className="profile-detail-item">
                <span>Role</span>
                <p>{profile.role}</p>
              </div>

              <div className="profile-detail-item">
                <span>Created At</span>
                <p>{new Date(profile.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}