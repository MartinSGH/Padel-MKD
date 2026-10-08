import PropTypes from "prop-types";

// Clickable title block of an admin card header: toggles the card body.
// A string description is wrapped in <p>; pass JSX for multi-paragraph text.
const AdminCardTitle = ({ title, description, collapsed, onToggle }) => (
  <div
    role="button"
    tabIndex={0}
    className="admin-card-title"
    onClick={onToggle}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    }}
    aria-expanded={!collapsed}
  >
    <span className="admin-card-chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path
          d="M6 9l6 6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <div className="admin-card-title-text">
      <h2>{title}</h2>
      {description && (
        <div className="admin-card-desc">
          <div className="admin-card-desc-inner">
            {typeof description === "string" ? (
              <p>{description}</p>
            ) : (
              description
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);

AdminCardTitle.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  collapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default AdminCardTitle;
