import LandingImage from "../components/WipPage/LandingImage";
import "../styles/Wip.css";
import { Col, Row } from "antd";
import History from "../components/WipPage/History";
import Gameplay from "../components/WipPage/Gameplay";
import JoinUs from "../components/LandingPage/JoinUs";
import Sponsors from "../components/LandingPage/Sponsors";
import ReactPlayer from "react-player";

const Main = () => {
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
            <h1 className="what-title">What is PADEL?</h1>
            <div className="what-text">
              Padel also sometimes called padel tennis, is a racket sport of
              Mexican origin, typically played in doubles on an enclosed court
              slightly smaller than a doubles tennis court. Although padel
              shares the same scoring system as tennis, the rules, strokes, and
              technique are different.
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
          <h1 className="page-title text-black my-5">How to Play Padel</h1>
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
