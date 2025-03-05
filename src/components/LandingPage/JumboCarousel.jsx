import { IoArrowUpCircleOutline } from "react-icons/io5";

import { Carousel, Button, Row, Col } from "antd";
import "../../styles/JumboCarousel.css";
const slides = [
  {
    heading: "PADEL",
    subHeading: "What is PADEL?",
    text: "PadelFIP is a dynamic racket sport combining elements of tennis and squash, typically played in doubles on an enclosed court. The game is fast-paced, with walls in play, allowing for unique angles and strategic gameplay.",
    buttonText: "Learn more",
    imageDesktop: "/images/JumboCarouselImage/Carousel1-image.svg", // Desktop image
    imageMobile: "/images/JumboCarouselImage/Carousel1-image-mb.svg", // Mobile image
  },
  // {
  //   heading: "ENJOY",
  //   subHeading: "Padel in Macedonia",
  //   text: "Just Play, Have Fun, Enjoy the Game!",
  //   buttonText: "Join now",
  //   imageDesktop: "/images/JumboCarouselImage/Carousel1-image.svg", // Desktop image
  //   imageMobile: "/images/JumboCarouselImage/Carousel1-image-mb.svg", // Mobile image
  // },
];

const JumboCarousel = () => (
  <Row className="mb-5 jumbocarousel-container" justify="center ">
    <Col span={20}>
      <Carousel autoplay arrows infinite={true}>
        {slides.map((slide, index) => (
          <div key={index} className="jumbo-carousel-slide">
            <picture>
              <source srcSet={slide.imageMobile} media="(max-width: 768px)" />
              <img className="jumbo-carousel-image" src={slide.imageDesktop} />
            </picture>

            <div className="jumbo-carousel-card py-5">
              <h2 className="jumbo-carousel-title">{slide.subHeading}</h2>
              <p className="jumbo-carousel-text">{slide.text}</p>
              <Button
                className="jumbo-button"
                color="danger"
                shape="round"
                variant="outlined"
              >
                {slide.buttonText} <IoArrowUpCircleOutline className="arrow" />
              </Button>
            </div>
          </div>
        ))}
      </Carousel>
    </Col>
  </Row>
);

export default JumboCarousel;
