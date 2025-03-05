import { Col, Row } from "antd";
import "../../styles/JoinUs.css";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
const joinCards = [
  {
    image: "/images/JoinUsImages/JoinUs-First.svg",
    button: "Apply as a Player",
    class: "card-button button-yellow",
  },
  {
    image: "/images/JoinUsImages/JoinUs-Second.svg",
    button: "Apply as a Coach",
    class: "card-button button-transparent",
  },
  {
    image: "/images/JoinUsImages/JoinUs-Third.svg",
    button: "Get a coach Certification",
    class: "card-button button-white",
  },
];
const JoinUs = () => {
  return (
    <Row data-aos="fade-up"
      className="join-us-row"
      justify="center"
      style={{ position: "relative" }}
    >
      <Col span={20}>
        <Card className="card">
          <img
            className="card-img desktop-img"
            src="/images/JoinUsImages/JoinUsBig.svg"
            alt="Desktop version"
          />
          <img
            className="card-img mobile-img"
            src="/images/JoinUsImages/JoinUsMobile.svg"
            alt="Mobile version"
          />
          <div className="card-text">
            <h1 className="page-titles  yellow-border text-white">Join Us</h1>
            <p className="join-card-text">
              Join the Padel Federation of Macedonia and be part of an
              energetic, welcoming community that’s passionate about padel. Dive
              in, play, and connect with others who share your love for the
              game!
            </p>
          </div>
        </Card>
      </Col>
      <Col className="join-cards" span={18}>
        <Row justify={"center"}>
          {joinCards.map((card, index) => (
            <Col key={index} lg={8} md={20}>
              <Card>
                <Card.Img
                  className="join-card-image"
                  variant="top"
                  src={card.image}
                />
                <Card.Body>
                  <Button className={card.class}>{card.button}</Button>
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
