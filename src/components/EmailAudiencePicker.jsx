import { useEffect, useId, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { getAllPlayers } from "../services/admin";
import { EMAIL_AUDIENCES } from "../services/newsletter";

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// Admin: who gets an email when a news article / tournament is saved.
// `value` is { audience, userIds }; audience is a value of EMAIL_AUDIENCES.
const EmailAudiencePicker = ({ value, onChange, note }) => {
  const [users, setUsers] = useState(null); // loaded on first "manual"
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const manual = value.audience === "manual";
  const groupName = useId(); // two pickers can be open on the admin page

  useEffect(() => {
    if (!manual || users) return;
    getAllPlayers()
      .then((list) => setUsers(list.filter((u) => u.email)))
      .catch((err) => setLoadError(err.message || "Failed to load users."));
  }, [manual, users]);

  const query = normalize(search);
  const visible = useMemo(
    () =>
      (users || []).filter(
        (u) =>
          !query ||
          normalize(u.full_name).includes(query) ||
          normalize(u.email).includes(query) ||
          normalize(u.club_name).includes(query),
      ),
    [users, query],
  );

  const selected = new Set(value.userIds);
  const setSelected = (ids) => onChange({ ...value, userIds: [...ids] });
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <fieldset className="admin-email-audience">
      <legend>Email announcement</legend>
      {note && <p className="admin-field-hint">{note}</p>}

      <div className="admin-email-options">
        {EMAIL_AUDIENCES.map((option) => (
          <label key={option.value} className="admin-checkbox">
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={value.audience === option.value}
              onChange={() => onChange({ ...value, audience: option.value })}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {manual && (
        <div className="admin-email-manual">
          <div className="admin-email-manual-head">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or club…"
              aria-label="Search users"
            />
            <button
              type="button"
              className="admin-btn admin-edit-btn"
              disabled={!visible.length}
              onClick={() =>
                setSelected(new Set([...selected, ...visible.map((u) => u.id)]))
              }
            >
              Select all{query ? " shown" : ""}
            </button>
            <button
              type="button"
              className="admin-btn admin-edit-btn"
              disabled={!selected.size}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
            <span className="admin-count-pill">{selected.size} selected</span>
          </div>

          {loadError ? (
            <p className="admin-club-error">{loadError}</p>
          ) : !users ? (
            <p className="admin-field-hint">Loading users…</p>
          ) : (
            <ul className="admin-email-user-list">
              {visible.map((u) => (
                <li key={u.id}>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                    />
                    <span>
                      <strong>{u.full_name || "—"}</strong>
                      <small>
                        {u.email}
                        {u.club_name ? ` · ${u.club_name}` : ""}
                      </small>
                    </span>
                  </label>
                </li>
              ))}
              {!visible.length && (
                <li className="admin-field-hint">No users match.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </fieldset>
  );
};

EmailAudiencePicker.propTypes = {
  value: PropTypes.shape({
    audience: PropTypes.string.isRequired,
    userIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  note: PropTypes.node,
};

export default EmailAudiencePicker;
