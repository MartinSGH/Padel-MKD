// import { IoArrowUpCircleOutline } from "react-icons/io5";
// import { Link } from "react-router-dom";
// import { Carousel, Button, Row, Col } from "antd";
// import "../../styles/JumboCarousel.css";
// import { useTranslation } from "react-i18next";

// const JumboCarousel = () => (
//   const { t } = useTranslation();
//   const slides = [
//     {
//       heading: "PADEL",
//       subHeading: ,
//       text: "Padel is a dynamic racket sport combining elements of tennis and squash, typically played in doubles on an enclosed court. The game is fast-paced, with walls in play, allowing for unique angles and strategic gameplay.",
//       buttonText: "Learn more",
//       imageDesktop: "/images/JumboCarouselImage/Carousel1-image.png", // Desktop image
//       imageMobile: "/images/JumboCarouselImage/Carousel1-image-mb.png", // Mobile image
//     },
//     {
//       heading: "ENJOY",
//       subHeading: "Padel in Macedonia",
//       text: "Just Play, Have Fun, Enjoy the Game!",
//       buttonText: "Join now",
//       imageDesktop: "/images/JumboCarouselImage/Carousel2-image.png", // Desktop image
//       imageMobile: "/images/JumboCarouselImage/Carousel2-image-mb.png", // Mobile image
//     },
//   ];
//   <Row className="mb-5 jumbocarousel-container" justify="center ">
//     <Col span={20}>
//       <Carousel autoplay arrows infinite={true}>
//         {slides.map((slide, index) => (
//           <div key={index} className="jumbo-carousel-slide">
//             <picture>
//               <source srcSet={slide.imageMobile} media="(max-width: 768px)" />
//               <img className="jumbo-carousel-image" src={slide.imageDesktop} />
//             </picture>

//             <div className="jumbo-carousel-card py-5">
//               <h2 className="jumbo-carousel-title">{slide.subHeading}</h2>
//               <p className="jumbo-carousel-text">{slide.text}</p>
//               <Link to={"/wip"}>
//                 <Button
//                   className="jumbo-button p-3"
//                   color="danger"
//                   shape="round"
//                   variant="outlined"
//                 >
//                   {slide.buttonText}{" "}
//                   <IoArrowUpCircleOutline className="arrow" />
//                 </Button>
//               </Link>
//             </div>
//           </div>
//         ))}
//       </Carousel>
//     </Col>
//   </Row>
// );

// export default JumboCarousel;
import { useTranslation } from "react-i18next";
import { IoArrowUpCircleOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import { Carousel, Button, Row, Col } from "antd";
import "../../styles/JumboCarousel.css";

const JumboCarousel = () => {
  const { t } = useTranslation();

  const slides = [
    {
      heading: "PADEL",
      subHeading: t("jumbo.slide1.subHeading"),
      text: t("jumbo.slide1.text"),
      buttonText: t("jumbo.slide1.buttonText"),
      imageDesktop: "/images/JumboCarouselImage/Carousel1-image.png",
      imageMobile: "/images/JumboCarouselImage/Carousel1-image-mb.png",
    },
    {
      heading: "ENJOY",
      subHeading: t("jumbo.slide2.subHeading"),
      text: t("jumbo.slide2.text"),
      buttonText: t("jumbo.slide2.buttonText"),
      imageDesktop: "/images/JumboCarouselImage/Carousel2-image.png", // Desktop image
      imageMobile: "/images/JumboCarouselImage/Carousel2-image-mb.png", // Mobile image
    },
  ];

  return (
    <Row className="mb-5 jumbocarousel-container" justify="center">
      <Col span={20}>
        <Carousel autoplay arrows infinite={true}>
          {slides.map((slide, index) => (
            <div key={index} className="jumbo-carousel-slide">
              <picture>
                <source srcSet={slide.imageMobile} media="(max-width: 768px)" />
                <img
                  className="jumbo-carousel-image"
                  src={slide.imageDesktop}
                  alt="Padel"
                />
              </picture>

              <div className="jumbo-carousel-card py-5">
                <h2 className="jumbo-carousel-title">{slide.subHeading}</h2>
                <p className="jumbo-carousel-text">{slide.text}</p>
                <Link to={"/wip"}>
                  <Button
                    className="jumbo-button"
                    color="danger"
                    shape="round"
                    variant="outlined"
                  >
                    {slide.buttonText}{" "}
                    <IoArrowUpCircleOutline className="arrow" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </Carousel>
      </Col>
    </Row>
  );
};

export default JumboCarousel;
