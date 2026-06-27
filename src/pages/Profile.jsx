import { useEffect, useState } from "react";
import {
  getMyProfile,
  updateMyProfile,
  uploadProfileAvatar,
  updateMyEmail,
  updateMyPassword,
} from "../services/profile";
import "../styles/Profile.css";

const emptyForm = {
  first_name: "",
  last_name: "",
  sex: "",
  birth_date: "",
  place_of_birth: "",
  email: "",
  newPassword: "",
};

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

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

  useEffect(() => {
    loadProfile();
  }, []);

  const startEdit = () => {
    setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      sex: profile.sex || "",
      birth_date: profile.birth_date || "",
      place_of_birth: profile.place_of_birth || "",
      email: profile.email || "",
      newPassword: "",
    });
    setAvatarFile(null);
    setAvatarPreview("");
    setSaveError("");
    setSaveMessage("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview("");
    setSaveError("");
  };

  const handleField = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const profileFields = {
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        sex: form.sex || null,
        birth_date: form.birth_date || null,
        place_of_birth: form.place_of_birth.trim() || null,
      };

      if (avatarFile) {
        profileFields.avatar_url = await uploadProfileAvatar(avatarFile);
      }

      await updateMyProfile(profileFields);

      const messages = [];

      if (form.email && form.email !== profile.email) {
        await updateMyEmail(form.email.trim());
        messages.push(
          "A confirmation link was sent to your new email — the change completes once you confirm it."
        );
      }

      if (form.newPassword) {
        await updateMyPassword(form.newPassword);
        messages.push("Your password was updated.");
      }

      await loadProfile();
      setEditing(false);
      setSaveMessage(
        messages.length ? messages.join(" ") : "Profile updated successfully."
      );
    } catch (err) {
      setSaveError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="profile-page profile-loading">Loading profile...</div>;
  if (error) return <div className="profile-page profile-error">{error}</div>;

  const shownAvatar = avatarPreview || profile.avatar_url;

  return (
    <section className="profile-page">
      <div className="profile-shell">
        <div className="profile-card">
          <div className="profile-top">
            <div className="profile-avatar-wrap">
              {shownAvatar ? (
                <img
                  src={shownAvatar}
                  alt={profile.full_name}
                  className="profile-avatar"
                />
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

          {saveMessage && !editing && (
            <div className="profile-save-message">{saveMessage}</div>
          )}

          {!editing ? (
            <div className="profile-details-card">
              <div className="profile-details-head">
                <h2>Account Information</h2>
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={startEdit}
                >
                  Edit Profile
                </button>
              </div>

              <div className="profile-details-grid">
                <div className="profile-detail-item">
                  <span>First Name</span>
                  <p>{profile.first_name || "—"}</p>
                </div>

                <div className="profile-detail-item">
                  <span>Last Name</span>
                  <p>{profile.last_name || "—"}</p>
                </div>

                <div className="profile-detail-item">
                  <span>Sex</span>
                  <p>
                    {profile.sex
                      ? profile.sex.charAt(0).toUpperCase() +
                        profile.sex.slice(1)
                      : "—"}
                  </p>
                </div>

                <div className="profile-detail-item">
                  <span>Date of Birth</span>
                  <p>
                    {profile.birth_date
                      ? new Date(
                          `${profile.birth_date}T00:00:00`
                        ).toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                <div className="profile-detail-item">
                  <span>Place of Birth</span>
                  <p>{profile.place_of_birth || "—"}</p>
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
          ) : (
            <form className="profile-edit-card" onSubmit={handleSave}>
              <h2>Edit Profile</h2>

              <div className="profile-edit-avatar-row">
                <div className="profile-avatar-wrap profile-edit-avatar">
                  {shownAvatar ? (
                    <img
                      src={shownAvatar}
                      alt="Avatar preview"
                      className="profile-avatar"
                    />
                  ) : (
                    <div className="profile-avatar-fallback">
                      {(form.first_name || "P").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <label className="profile-file-btn">
                  Change Profile Picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              <div className="profile-edit-grid">
                <label className="profile-field">
                  <span>First Name</span>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleField}
                    placeholder="First name"
                  />
                </label>

                <label className="profile-field">
                  <span>Last Name</span>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleField}
                    placeholder="Last name"
                  />
                </label>

                <label className="profile-field">
                  <span>Sex</span>
                  <select name="sex" value={form.sex} onChange={handleField}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <label className="profile-field">
                  <span>Date of Birth</span>
                  <input
                    type="date"
                    name="birth_date"
                    value={form.birth_date}
                    onChange={handleField}
                  />
                </label>

                <label className="profile-field">
                  <span>Place of Birth</span>
                  <input
                    name="place_of_birth"
                    value={form.place_of_birth}
                    onChange={handleField}
                    placeholder="City, Country"
                  />
                </label>

                <label className="profile-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleField}
                    placeholder="you@email.com"
                  />
                </label>

                <label className="profile-field">
                  <span>New Password</span>
                  <input
                    type="password"
                    name="newPassword"
                    value={form.newPassword}
                    onChange={handleField}
                    placeholder="Leave blank to keep current"
                    autoComplete="new-password"
                  />
                </label>
              </div>

              {saveError && <p className="profile-edit-error">{saveError}</p>}

              <div className="profile-edit-actions">
                <button
                  type="submit"
                  className="profile-save-btn"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
