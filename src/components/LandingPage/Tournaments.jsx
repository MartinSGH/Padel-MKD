import { Row, Col } from "antd";
import { Link } from "react-router-dom";
import "../../styles/Tournament.css";
import TournamentCard from "./TournamentCard";
import { useTranslation } from "react-i18next";

const Tournaments = () => {
  const { t } = useTranslation();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <>
      <Row
        data-aos="fade-up"
        className="justify-center"
        style={{ background: "white", padding: "2rem 0" }}
      >
        <Col
          className="component-title-line mb-3"
          span={20}
          style={{ color: "black" }}
        >
          <h1 className="page-titles">
            {t("tournamentComponent.componentTitle")}
          </h1>
          <Link to="/tournaments" className="see-all" onClick={scrollToTop}>
            {t("tournamentComponent.buttonText")}
          </Link>
        </Col>
        <Col span={20}>
          <TournamentCard />
        </Col>
      </Row>
    </>
  );
};

export default Tournaments;
