import "swiper/css"; // Core Swiper styles
import "swiper/css/navigation"; // Navigation styles
import "swiper/css/pagination"; // Pagination styles
import "swiper/css/effect-coverflow";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Navigation } from "swiper/modules";
import { ArrowLeft, ArrowRight } from "phosphor-react";
import "../../styles/Clubs.css";
import { Row, Col } from "antd";

const Clubs = () => {
  const clubs = [
    {
      name: "Mondo Padel",
      address: "Ul. Ljubljanska br.4 Veles",
      hours: "Open from 10-6",
      phone: "078 436 922",
      email: "mondopadel1@gmail.com",
      logo: "/images/ClubsCardsImages/mondo.png",
    },
    {
      name: "Padel Pioneers",
      address: "Ul. Industriska 1, Skopje",
      hours: "Open from 10-6",
      phone: "078 657 744",
      email: "pioneerspadel@gmail.com",
      logo: "/images/ClubsCardsImages/pioneer.png",
    },
    {
      name: "Pr1me Padel Club",
      address: "Viktor Igo 39, Skopje",
      hours: "Open from 10-6",
      phone: "071 248 750",
      email: "pr1mepadel.mk@gmail.com",
      logo: "/images/ClubsCardsImages/prime.png",
    },
    {
      name: "Tikvesh Padel Club",
      address: "Ohridska br.49, Kavadarci",
      hours: "Open from 10-6",
      phone: "078 650 710",
      email: "padeltikvesh@gmail.com",
      logo: "/images/ClubsCardsImages/tikvesh.png",
    },
    {
      name: "Smash Masters Padel Club",
      address: "Bogomilska, Ohrid",
      hours: "Open from 10-6",
      phone: "076 801 829",
      email: "smashmastersclub@yahoo.com",
      logo: "/images/ClubsCardsImages/smash.png",
    },
  ];

  return (
    <>
      <Row data-aos="fade-up" justify={"center"}>
        <Col span={20}>
      
          <h1 className="page-titles text-white">Clubs</h1>
        </Col>
        <Col xs={24} lg={20}>
          <div style={{ padding: "2rem" }}>
            <Swiper
              effect={"coverflow"}
              grabCursor={true}
              centeredSlides={true}
              loop={true}
              slidesPerView={1.2} // Slightly larger than 1 for partial visibility of neighboring cards
              spaceBetween={10}
              coverflowEffect={{
                rotate: 0,
                stretch: 0,
                depth: 200,
                modifier: 1,
                slideShadows: false,
              }}
              navigation={{
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
                clickable: true,
              }}
              breakpoints={{
                320: {
                  slidesPerView: 1.2, // Ensure full view with some overlap
                  spaceBetween: -15,
                  centeredSlides: true,
                },
                640: {
                  slidesPerView: 2.2, // Show more cards on tablets
                  spaceBetween: -20,
                  centeredSlides: true,
                },
                1024: {
                  slidesPerView: 3, // Desktop settings
                  spaceBetween: -50,
                  centeredSlides: true,
                },
                1440: {
                  slidesPerView: 5,
                  spaceBetween: -100,
                  centeredSlides: true,
                },
              }}
              modules={[EffectCoverflow, Navigation]}
            >
              {clubs.map((club, index) => (
                <SwiperSlide className="swiper-clubs" key={index}>
                  <div
                    className="club-card w-full h-full"
                    style={{
                      height: "600px",
                      border: "5.611px solid var(--gradient-zolt, #FDE834)",
                      background:
                        "linear-gradient(89deg, rgba(253, 232, 52, 0.08) -24.54%, rgba(17, 28, 56, 0.00) 126.23%), #FFF",
                      borderRadius: "29.924px",
                      padding: "20px",
                      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-around",
                    }}
                  >
                    <img
                      src={club.logo}
                      alt={club.name}
                      style={{ marginBottom: "10px" }}
                    />
                    <div className="card-Content">
                      <h3
                        className="club-card-title"
                        style={{ fontSize: "1.2rem", margin: "10px 0" }}
                      >
                        {club.name}
                      </h3>
                      <div className="club-card-text">
                        <p>{club.address}</p>
                        <p>{club.hours}</p>
                        <p>{club.phone}</p>
                        <p>{club.email}</p>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
              <div className="slider-controler">
                <div className="swiper-button-prev">
                  <ArrowLeft size={20} />
                </div>
                <div className="swiper-button-next">
                  <ArrowRight size={20} />
                </div>
              </div>
            </Swiper>
          </div>
        </Col>
      </Row>
    </>
  );
};

export default Clubs;
