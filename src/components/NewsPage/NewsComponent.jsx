import { Row, Col } from "antd";
import "../../styles/NewsComponent.css";
import { Link } from "react-router";
const NewsComponent = () => {
  return (
    <div className="newsComponent-container py-5  mb-5 text-white">
      <Row justify={"center"} className="mb-4">
        <Col span={20}>
          <h2 className="text-white gallery-h1" id="gallery">
            News
          </h2>
        </Col>
      </Row>
      <Row className="padel-court" justify={"center"}>
        <Col span={20}>
          <Row justify={"center"}>
            <Col className="p-3 terrain-left relative" xs={24} lg={4}></Col>
            <Col className="middle" xs={24} lg={16}>
              <Row justify={"center"} className="w-full h-full text-center">
                <Col className="p-3 news-first-card" span={12}>
                  <Link
                    to={
                      "https://www.redbull.com/int-en/best-padel-players-of-all-time"
                    }
                    target="_blank"
                  >
                    <h1 className="news-card-text">
                      9 padel pros that all fans should know about
                    </h1>
                  </Link>
                </Col>
                <Col className="p-3 news-second-card" span={12}>
                  <Link
                    to={
                      "https://padel-magazine.co.uk/differences-in-playing-style-between-premier-padel-and-a1-padel/"
                    }
                    target="_blank"
                    className="news-card-text w-full h-full"
                  >
                    Differences in playing style between Premier Padel and A1
                    Padel
                  </Link>
                </Col>
                <Col className="p-3 news-third-card" span={12}>
                  <Link
                    to={
                      "https://padel-magazine.co.uk/Lionel-Messi-talks-about-football-and-padel.-The-Argentinian-star-plays-on-all-terrains./"
                    }
                    target="_blank"
                  >
                    <h1 className="news-card-text">
                      Lionel Messi opens up: between football and padel, the
                      Argentinian star plays on all terrains!
                    </h1>
                  </Link>
                </Col>
                <Col className="p-3 news-fourth-card" span={12}>
                  <Link
                    to={
                      "https://www.padelfip.com/2024/11/international-padel-federation-launches-ryder-cup-and-laver-cup-of-padel-with-new-inter-continental-cup-competition-set-for-2025-season/"
                    }
                    target="_blank"
                  >
                    <h1 className="news-card-text">
                      International Padel Federation launches Ryder Cup and
                      Laver Cup of Padel with new Inter-Continental Cup
                      competition set for 2025 season
                    </h1>
                  </Link>
                </Col>
              </Row>
            </Col>
            <Col className="terrain-right p-3 " xs={24} lg={4}></Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default NewsComponent;
