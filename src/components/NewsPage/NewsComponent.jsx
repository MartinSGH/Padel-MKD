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
                  <h1 className="news-card-text">
                    9 padel pros that all fans should know about
                  </h1>
                </Col>
                <Col className="p-3 news-second-card" span={12}>
                  <Link to={"/news/play-styles"} className="news-card-text w-full h-full">
                    Differences in playing style between Premier Padel and A1
                    Padel
                  </Link>
                </Col>
                <Col className="p-3 news-third-card" span={12}>
                  <h1 className="news-card-text">
                    Lionel Messi opens up: between football and padel, the
                    Argentinian star plays on all terrains!
                  </h1>
                </Col>
                <Col className="p-3 news-fourth-card" span={12}>
                  <h1 className="news-card-text">
                    International Padel Federation launches Ryder Cup and Laver
                    Cup of Padel with new Inter-Continental Cup competition set
                    for 2025 season
                  </h1>
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
