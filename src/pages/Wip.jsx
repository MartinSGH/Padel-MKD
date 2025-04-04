import LandingImage from "../components/WipPage/LandingImage";
import "../styles/Wip.css";
import { Col, Row } from "antd";
import History from "../components/WipPage/History";
import Gameplay from "../components/WipPage/Gameplay";
import JoinUs from "../components/LandingPage/JoinUs";
import Sponsors from "../components/LandingPage/Sponsors";
import ReactPlayer from "react-player";
import { useTranslation } from "react-i18next";
const Main = () => {
  const { t } = useTranslation();
  return (
    <div>
      <LandingImage />
      <br />
      <Row className="what-is-padel-section mb-56" justify={"center"}>
        <Col span={20} className="relative">
          <img
            className="wip-tennis-ball absolute"
            src="/images/WIP/Wip-Tennis-ball.svg"
            alt=""
          />
          <div className="what-is-padel absolute text-white md:w-5/12 xs:w-12/12 p-4  ">
            <h1 className="what-title">{t("wip.title")}</h1>
            <div className="what-text">
              {t("wip.paragraph")}
            </div>
          </div>
        </Col>
      </Row>
      <br />
      <Row className="history-section mt-5" justify={"center"}>
        <Col span={20}>
          <History />
        </Col>
      </Row>
      <br />
      <Row className="video-section" justify={"center"}>
        
        <Col span={20}>
          <h1 className="page-title text-black my-5">{t("wip.title2")}</h1>
          <div className="video-frame flex justify-center items-center">
            <ReactPlayer
              className="video-player"
              url="https://www.youtube.com/watch?v=NX-68fxhL_4"
              controls
            />
          </div>
        </Col>
      </Row>
      <br />
      <Row className="gameplay-section" justify={"center"}>
        <Col span={20}>
          <Gameplay />
        </Col>
      </Row>
      <br />
      <JoinUs />

      <br />
      <Sponsors />
    </div>
  );
};

export default Main;
