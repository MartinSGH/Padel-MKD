import { Col, Row } from "antd";
import "../../styles/JoinUs.css";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { Link } from "react-router-dom";
import {useTranslation} from "react-i18next";

const JoinUs = () => {
  const { t } = useTranslation();

  const joinCards = [
    {
      image: "/images/JoinUsImages/JoinUs-First.png",
      button: t("joinUsComponent.card1.buttonText"),
      class: "card-button button-yellow",
    },
    {
      image: "/images/JoinUsImages/JoinUs-Second.svg",
      button: t("joinUsComponent.card2.buttonText"),
      class: "card-button button-transparent",
    },
    {
      image: "/images/JoinUsImages/JoinUs-Third.png",
      button: t("joinUsComponent.card3.buttonText"),
      class: "card-button button-white",
    },
  ];
  return (
    <Row
      data-aos="fade-up"
      className="join-us-row"
      justify="center"
      style={{ position: "relative" }}
    >
      <Col span={20}>
        <Card className="card">
          <img
            className="card-img desktop-img"
            src="/images/JoinUsImages/JoinUsBig.png"
            alt="Desktop version"
          />
          <img
            className="card-img mobile-img"
            src="/images/JoinUsImages/JoinUsMobile.png"
            alt="Mobile version"
          />
          <div className="card-text">
            <h1 className="page-titles  yellow-border text-white">{t("joinUsComponent.componentTitle")}</h1>
            <p className="join-card-text">
              {t("joinUsComponent.paragraph")}
            </p>
          </div>
        </Card>
      </Col>
      <Col className="join-cards" span={18}>
        <Row justify={"center"}>
          {joinCards.map((card, index) => (
            <Col key={index} lg={8} md={8} sm={20}>
              <Card>
                <Card.Img
                  className="join-card-image"
                  variant="top"
                  src={card.image}
                />
                <Card.Body>
                  <Link
                    to={
                      "https://docs.google.com/forms/d/e/1FAIpQLScZ6YbsLCENnAxMlWQ3nzIdbg7Bly7oL2oo0VDMWcBXONJ4MA/viewform"
                    }
                    target="_blank"
                  >
                    <Button className={card.class}>{card.button}</Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Col>
    </Row>
  );
};

export default JoinUs;
