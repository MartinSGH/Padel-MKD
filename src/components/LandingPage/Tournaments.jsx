import { Row, Col } from "antd";
import "../../styles/Tournament.css";
import TournamentCard from "./TournamentCard";
import { useTranslation } from "react-i18next";

const Tournaments = () => {
  const { t } = useTranslation();
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
          <span className="see-all">{t("tournamentComponent.buttonText")}</span>
        </Col>
        <Col span={20}>
          <TournamentCard />
        </Col>
      </Row>
    </>
  );
};

export default Tournaments;
