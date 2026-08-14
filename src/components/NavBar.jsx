import { useEffect, useRef, useState } from "react";
import { FaBars, FaTimes, FaUserCircle } from "react-icons/fa";
import { Row, Col, Badge } from "antd";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/NavBar.css";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { signOut } from "../services/auth";
import { getMyProfile } from "../services/profile";

function Navbar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 1024);

  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const data = await getMyProfile();
        setProfile(data);
      } catch {
        setProfile(null);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobileView(mobile);

      if (!mobile) {
        setProfileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showNavbar = () => {
    navRef.current?.classList.toggle("responsive_nav");
    setProfileOpen(false);
  };

  const handleClick = () => {
    if (navRef.current?.classList.contains("responsive_nav")) {
      navRef.current.classList.remove("responsive_nav");
    }
    scrollToTop();
    setProfileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setProfileOpen(false);

      if (navRef.current?.classList.contains("responsive_nav")) {
        navRef.current.classList.remove("responsive_nav");
      }

      navigate("/");
    } catch (error) {
      alert(error.message || "Logout failed.");
    }
  };

  const linkClassName = ({ isActive }) =>
    isLandingPage
      ? "nav-link active-link"
      : isActive
      ? "nav-link active-link"
      : "nav-link";

  const avatarContent =
    user && profile?.avatar_url ? (
      <img
        src={profile.avatar_url}
        alt="Profile"
        className="profile-avatar-image"
      />
    ) : (
      <FaUserCircle size={20} />
    );

  const renderProfileDropdown = (mobile = false) => {
    const dropdownClass = mobile
      ? "profile-dropdown profile-dropdown-mobile"
      : "profile-dropdown";

    return (
      <div className={dropdownClass}>
        {!user ? (
          <>
            <NavLink
              to="/login"
              onClick={handleClick}
              className="profile-dropdown-link"
            >
              Login
            </NavLink>

            <NavLink
              to="/register"
              onClick={handleClick}
              className="profile-dropdown-link no-border"
            >
              Register
            </NavLink>
          </>
        ) : (
          <>
            <div className="profile-dropdown-header">
              

              <div className="profile-dropdown-user">
                <p className="profile-dropdown-name">
                  {profile?.full_name || "Player"}
                </p>
                <p className="profile-dropdown-email">{user.email}</p>
              </div>
            </div>

            <NavLink
              to="/profile"
              onClick={handleClick}
              className="profile-dropdown-link"
            >
              My Profile
            </NavLink>

            <NavLink
              to="/my-submissions"
              onClick={handleClick}
              className="profile-dropdown-link"
            >
              My Submissions
            </NavLink>

            <NavLink
  to="/submit-points"
  onClick={handleClick}
  className="profile-dropdown-link"
>
  Submit Points
</NavLink>

{profile?.role === "admin" && (
  <NavLink
    to="/admin"
    onClick={handleClick}
    className="profile-dropdown-link"
  >
    Admin Panel
  </NavLink>
)}

<button
  onClick={handleLogout}
  type="button"
  className="profile-dropdown-logout"
>
  Logout
</button>
          </>
        )}
      </div>
    );
  };

  return (
    <header>
      <Row justify={"center"}>
        <Col className="navbar" span={20}>
          <h3>
            <NavLink to="/" onClick={scrollToTop}>
              <img src="/images/logo.svg" alt="Logo" />
            </NavLink>
          </h3>

          <nav ref={navRef}>
            <NavLink onClick={handleClick} className="nav-menu-logo hidden" to="/">
              <img className="logo-menu" src="/images/logo.svg" alt="Logo" />
            </NavLink>

            {isMobileView && (
              <div className="mobile-profile-block" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileOpen((prev) => !prev)}
                  type="button"
                  aria-label="Profile menu"
                  className="mobile-profile-trigger"
                >
                  <div className="mobile-profile-avatar">{avatarContent}</div>

                  
                </button>

                {profileOpen && renderProfileDropdown(true)}
              </div>
            )}

            <NavLink
              onClick={handleClick}
              className={linkClassName}
              to="/wip"
            >
              {t("navbar.whatIsPadel")}
            </NavLink>

            <NavLink
              onClick={handleClick}
              className={linkClassName}
              to="/federation"
            >
              {t("navbar.federation")}
            </NavLink>

            <NavLink
              onClick={handleClick}
              className={linkClassName}
              to="/news"
            >
              {t("navbar.newsMedia")}
            </NavLink>

            <Badge
              count={user ? unreadCount : 0}
              size="small"
              offset={[8, 2]}
            >
              <NavLink
                onClick={handleClick}
                className={linkClassName}
                to="/tournaments"
              >
                {t("navbar.competitions")}
              </NavLink>
            </Badge>

            <NavLink
              onClick={handleClick}
              className={linkClassName}
              to="/ranking"
            >
              {t("navbar.rankList")}
            </NavLink>

            {isMobileView && (
              <div className="mobile-language-switcher">
                <LanguageSwitcher />
              </div>
            )}

            {!isMobileView && (
              <div className="navbar-actions">
                <LanguageSwitcher />

                <div className="desktop-profile-wrapper" ref={profileMenuRef}>
                  <button
                    onClick={() => setProfileOpen((prev) => !prev)}
                    type="button"
                    aria-label="Profile menu"
                    className="desktop-profile-trigger"
                  >
                    {avatarContent}
                  </button>

                  {profileOpen && renderProfileDropdown(false)}
                </div>
              </div>
            )}

            <button
              className="nav-btn nav-close-btn flex ms-auto"
              onClick={handleClick}
            >
              <h1>Menu</h1> <FaTimes />
            </button>
          </nav>

          <button className="nav-btn" onClick={showNavbar}>
            <FaBars />
          </button>
        </Col>
      </Row>
    </header>
  );
}

export default Navbar;