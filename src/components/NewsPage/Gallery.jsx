import "../../styles/Gallery.css";
import { Row, Col } from "antd";
import { NavLink } from "react-router-dom";
import { Carousel } from "antd";
const slides = [
  {
    subHeading: "Training",
    imageMobile: "training",
    linkLocation: "/news/training",
  },
  {
    subHeading: "Players",
    imageMobile: "players",
  },
  {
    subHeading: "Women in Padel",
    imageMobile: "women-pad",
  },
  {
    subHeading: "Our Courts",
    imageMobile: "courts",
  },
  {
    subHeading: "Padel Tournaments 2024",
    imageMobile: "tournament",
  },
  {
    subHeading: "Padel Competition Skopje 2024",
    imageMobile: "competition",
  },
];
const Gallery = () => {
  return (
    <div className="gallery-container py-5">
      <Row justify={"center"} className="mb-4">
        <Col  span={20}>
          <h2 className="text-white gallery-h1" id="gallery">
            Gallery
          </h2>
        </Col>
      </Row>
      <Row className="desktop-version mb-5" justify={"center"}>
        <Col span={20} className="text-white">
          <div className="grid grid-cols-4 grid-rows-6 gap-4">
            <NavLink to="/news/training" className="row-span-4 gallery-training">
              <h1 className="gallery-title">Training</h1>
            </NavLink>

            <div className="col-span-2 row-span-2 gallery-players">
              <h1 className="gallery-title">Players</h1>
            </div>
            <div className="col-span-2 row-span-2 col-start-2 row-start-3 gallery-woman">
              <h1 className="gallery-title">Women in Padel</h1>
            </div>
            <div className="row-span-3 col-start-4 row-start-1 gallery-competition">
              <h1 className="gallery-title">Padel Competitions Skopje 2024</h1>
            </div>
            <div className="row-span-3 col-start-4 row-start-4 gallery-tournament">
              <h1 className="gallery-title">Padel Tournaments 2024</h1>
            </div>
            <div className="col-span-3 row-span-2 row-start-5 gallery-courts">
              <h1 className="gallery-title">Courts</h1>
            </div>
          </div>
        </Col>
      </Row>
      <Row className="mobile-version hidden  " justify="center">
        <Col span={20}>
          <Carousel className="" autoplay arrows infinite={true}>
            {slides.map((slide, index) => (
              <NavLink
                to={slide.linkLocation}
                key={index}
                className={`gallery-carousel ${slide.imageMobile}`}
              >
                <div className="carousel-card">
                  <h2 className="gallery-carousel-title">{slide.subHeading}</h2>
                </div>
              </NavLink>
            ))}
          </Carousel>
        </Col>
      </Row>

      <br />
    </div>
  );
};

export default Gallery;
