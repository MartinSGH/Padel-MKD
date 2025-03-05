import "../../styles/Training.css";
import { Row, Col } from "antd";
import { Carousel } from "antd";
import Sponsors from "../LandingPage/Sponsors";
import Programs from "../LandingPage/Programs";
const slides = [
  {
    imageMobile: "image-1",
  },
  {
    imageMobile: "image-2",
  },
  {
    imageMobile: "image-3",
  },
  {
    imageMobile: "image-4",
  },
  {
    imageMobile: "image-5",
  },
  {  
    imageMobile: "image-6",
  },
  {  
    imageMobile: "image-7",
  },
  {  
    imageMobile: "image-8",
  },
  {  
    imageMobile: "image-9",
  },
  {  
    imageMobile: "image-10",
  },
];

const Training = () => {
  return (
    <>
      <div className="training-container py-5 text-white">
        <Row justify={"center"} className="mb-4">
          <Col xs={20} lg={20}>
            <h2 className="text-white gallery-h1" id="gallery">
              Training
            </h2>
          </Col>
        </Row>

        <Row className="desktop-version mb-5" justify={"center"}>
          <Col xs={24} lg={20} className="text-white grid gap-4">
            <div className="grid grid-cols-4 grid-rows-6 gap-4">
              <div className="row-span-4 image-1"></div>
              <div className="col-span-2 row-span-2 image-2"></div>
              <div className="col-span-2 row-span-2 col-start-2 row-start-3 image-3"></div>
              <div className="row-span-3 col-start-4 row-start-1 image-4"></div>
              <div className="row-span-3 col-start-4 row-start-4 image-5"></div>
              <div className="col-span-3 row-span-2 row-start-5 image-6"></div>
            </div>
            <div className="grid grid-cols-7 grid-rows-6 gap-4 ">
              <div className="col-span-2 row-span-3 image-7"></div>
              <div className="col-span-2 row-span-3 col-start-1 row-start-4 image-8"></div>
              <div className="col-span-3 row-span-6 col-start-3 row-start-1 image-9"></div>
              <div className="col-span-2 row-span-6 col-start-6 row-start-1 image-10"></div>
            </div>
          </Col>
        </Row>
        <Row className="mobile-version mb-5" justify={"center"}>
          <Col span={20}>
            <Carousel className="" autoplay arrows infinite={true}>
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`training-carousel ${slide.imageMobile}`}
                >
                  
                </div>
              ))}
            </Carousel>
          </Col>
        </Row>
      </div>
      <Sponsors className="mb-5" />
      <Programs />
    </>
  );
};

export default Training;
