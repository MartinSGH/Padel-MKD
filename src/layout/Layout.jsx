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

  // On every route change, recompute element positions and reveal anything
  // already in view. Without this, persistent chrome like the Footer keeps the
  // stale position AOS measured on the previous page and stays hidden as an
  // empty area on pages where it never gets scrolled into view.
  useEffect(() => {
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
