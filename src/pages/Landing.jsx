import JumboCarousel from "../components/LandingPage/JumboCarousel";
import Tournaments from "../components/LandingPage/Tournaments";
import Clubs from "../components/LandingPage/Clubs";
import Programs from "../components/LandingPage/Programs";
import JoinUs from "../components/LandingPage/JoinUs";
import Sponsors from "../components/LandingPage/Sponsors";
import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect } from "react";

const Landing = () => {
  useEffect(() => {
    AOS.init({
      duration: 1000,
    });
  }, []);

  return (
    <div>
      <JumboCarousel />
      <Tournaments />
      <br />
      <div className="red-line" data-aos="fade-up"></div>
      <br />
      <Clubs />
      <br />
      <Programs />
      <br />
      <JoinUs />

      <br />
      <Sponsors />
    </div>
  );
};
export default Landing;
