import { useRef } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { MdLanguage } from "react-icons/md";
import { Row, Col } from "antd";
import { NavLink, useLocation } from "react-router-dom";
import "../styles/NavBar.css";

function Navbar() {
  const navRef = useRef();
  const location = useLocation();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const showNavbar = () => {
    navRef.current.classList.toggle("responsive_nav");
  };
  const handleClick = () => {
    showNavbar();
    scrollToTop();
  };

  const isLandingPage = location.pathname === "/";

  return (
    <header>
      <Row justify={"center"}>
        <Col className="navbar" span={20}>
          <h3>
            <NavLink to="/">
              <img src="/images/logo.svg" alt="Logo" />
            </NavLink>
          </h3>

          <nav ref={navRef}>
            <NavLink onClick={handleClick} className="nav-menu-logo hidden">
              <img className="logo-menu" src="/images/logo.svg" alt="Logo" />
            </NavLink>

            <NavLink
              onClick={handleClick}
              className={
                isLandingPage
                  ? "nav-link active-link"
                  : ({ isActive }) =>
                      isActive ? "nav-link active-link" : "nav-link"
              }
              to="/wip"
            >
              What is Padel?
            </NavLink>
            <NavLink
              onClick={handleClick}
              className={
                isLandingPage
                  ? "nav-link active-link"
                  : ({ isActive }) =>
                      isActive ? "nav-link active-link" : "nav-link"
              }
              to="/federation"
            >
              Federation
            </NavLink>
            <NavLink
              onClick={handleClick}
              className={
                isLandingPage
                  ? "nav-link active-link"
                  : ({ isActive }) =>
                      isActive ? "nav-link active-link" : "nav-link"
              }
              to="/news"
            >
              News and Media
            </NavLink>
            <h1 className="flex items-center">
              <MdLanguage />
              <span>EN/MK</span>
            </h1>

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
