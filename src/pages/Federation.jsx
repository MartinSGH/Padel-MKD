import LandingImage from "../components/FederationPage/LandingImage.jsx";
import "../styles/Federation.css";
import { IoArrowUpCircleOutline } from "react-icons/io5";
import Sponsors from "../components/LandingPage/Sponsors";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
const Federation = () => {
  const { t } = useTranslation();

  return (
    <div className="d-flex flex-col">
      <LandingImage imageSrc={t("federation.landingImage")} />
      <div className="red-section md:w-9/12 w-12/12 relative">
        <p className="p-5 md:w-10/12 xs:w-12/12 federation-text ">
          {t("federation.red-text")}
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
            {t("federation.our-mission.title")}
          </h1>
          <p className="federation-card-text">
            {t("federation.our-mission.text")}
          </p>
        </div>
      </div>

      <div className="join-us overflow-hidden relative md:w-9/12 w-12/12 flex md:justify-end justify-center mb-5">
        <div className="federation-overlay md:w-3/6 w-6/6 h-full flex flex-col justify-between">
          <h1 className="federation-title flex items-center justify-between mb-5">
            {t("federation.join-us.title")}{" "}
            <Link to="https://docs.google.com/forms/d/e/1FAIpQLScZ6YbsLCENnAxMlWQ3nzIdbg7Bly7oL2oo0VDMWcBXONJ4MA/viewform">
              {" "}
              <IoArrowUpCircleOutline className="federation-title arrow" />{" "}
            </Link>
          </h1>
          <p className="federation-card-text">{t("federation.join-us.text")}</p>
        </div>
      </div>

      <Sponsors />
    </div>
  );
};

export default Federation;
