import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

const Layout = () => {
  const location = useLocation();

  // Initialize AOS once for the whole app. Doing it here (instead of inside a
  // single page) guarantees scroll animations work no matter which route the
  // user lands on first. `once: true` keeps revealed elements visible so they
  // can never flip back to the hidden (opacity: 0) state.
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  // On every route change: jump back to the top of the page (so a new page
  // never opens scrolled down to where the previous page was), then recompute
  // AOS element positions and reveal anything already in view. Without the
  // scroll reset, navigating (e.g. "See more") could land you at the footer;
  // without the refresh, persistent chrome like the Footer keeps the stale
  // position AOS measured on the previous page and stays hidden.
  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.refreshHard();
  }, [location.pathname]);

  return (
    <div>
      <NavBar />
      <main>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
export default Layout;
