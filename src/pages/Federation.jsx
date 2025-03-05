import LandingImage from "../components/FederationPage/LandingImage.jsx";
import "../styles/Federation.css";
import { IoArrowUpCircleOutline } from "react-icons/io5";
import Sponsors from "../components/LandingPage/Sponsors";
const Federation = () => {
  return (
    <div className="d-flex flex-col">
      <LandingImage />
      <div className="red-section md:w-9/12 w-12/12 relative">
        <p className="p-5 md:w-10/12 xs:w-12/12 federation-text ">
          The Padel Federation of Macedonia (PFM) is the official governing body
          for the sport of padel in Macedonia. Established to promote, develop,
          and regulate padel across the country, the PFM is dedicated to
          fostering a vibrant and inclusive community for players of all ages
          and skill levels.
        </p>
        <img
          className="tennis-ball"
          src="/images/FederationImages/TennisBall.svg"
          alt=""
        />
        <img
          className="hidden tennis-ball-mobile"
          src="/images/FederationImages/TennisBall-mb.svg"
          alt=""
        />
      </div>

      <div className="our-mission overflow-hidden relative md:w-9/12 w-12/12 flex md:justify-start justify-center mb-5 self-end">
        <div className="federation-overlay md:w-3/6 w-6/6 h-full flex flex-col justify-between">
          <h1 className="federation-title flex items-center justify-between mb-5">
            Our Mission
          </h1>
          <p className="federation-card-text">
            Become part of the vibrant and growing padel community! Whether
            you&apos;re an individual player eager to enhance your skills, a
            team ready to compete, or someone interested in becoming a certified
            coach, the Padel Federation of Macedonia welcomes you.
          </p>
        </div>
      </div>

      <div className="join-us overflow-hidden relative md:w-9/12 w-12/12 flex md:justify-end justify-center mb-5">
        <div className="federation-overlay md:w-3/6 w-6/6 h-full flex flex-col justify-between">
          <h1 className="federation-title flex items-center justify-between mb-5">
            Join Us{" "}
            <IoArrowUpCircleOutline className="federation-title arrow" />
          </h1>
          <p className="federation-card-text">
            Become part of the vibrant and growing padel community! Whether
            you&apos;re an individual player eager to enhance your skills, a
            team ready to compete, or someone interested in becoming a certified
            coach, the Padel Federation of Macedonia welcomes you.
          </p>
        </div>
      </div>

      <Sponsors />
    </div>
  );
};

export default Federation;
