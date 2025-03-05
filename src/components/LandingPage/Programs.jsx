import "../../styles/Programs.css";
import { Card, Row, Col, Typography } from "antd";
import { IoArrowUpCircleOutline } from "react-icons/io5";

const { Title, Paragraph } = Typography;
const Programs = () => {
  return (
    <Row data-aos="fade-up" justify={"center"}>
      <Col span={20}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card
              className="h-full"
              style={{
                padding: "2rem",
                background: "linear-gradient(135deg, #FFD700, #FFC000)",
                borderRadius: "16px",
                height: "100%",
              }}
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  <Title className=" mb-6 page-titles">Our programs</Title>
                  <Paragraph className="programs-text ">
                    Join the Padel Federation of Macedonia and be part of an
                    energetic, welcoming community that&apos;s passionate about
                    padel! Dive in, play, and connect with others who share your
                    love for the game!
                  </Paragraph>
                </div>
                <button className="programs-details d-flex items-center justify-between gap-2 mt-4 hover:gap-4 transition-all">
                  Read more details
                  <IoArrowUpCircleOutline className="arrow" />
                </button>
              </div>
            </Card>
          </Col>

          {/* Right grid of cards */}
          <Col xs={24} md={16}>
            <Row gutter={[24, 24]}>
              {[
                {
                  title: "Coaching and Training Players",
                  image: "/images/ProgramsImages/Program-1.jpg",
                },
                {
                  title: "Youth Development Program",
                  image: "/images/ProgramsImages/Program-2.jpg",
                },
                {
                  title: "Coach Certification",
                  image: "/images/ProgramsImages/Program-3.jpg",
                },
                {
                  title: "Club Support Program",
                  image: "/images/ProgramsImages/Program-4.jpg",
                },
              ].map((program, index) => (
                <Col xs={24} sm={12} key={index}>
                  <Card
                    className="h-full relative overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                    cover={
                      <div className="program-card relative h-48">
                        <img
                          src={program.image}
                          alt={program.title}
                          className="object-cover w-full h-full program-image"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient" />
                        <Title
                          level={4}
                          className="!text-white programs-titles absolute top-4 left-4 right-4 m-0 "
                        >
                          {program.title}
                        </Title>
                      </div>
                    }
                    style={{
                      borderRadius: "16px",
                      background: "#1e293b",
                      border: "none",
                    }}
                  />
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </Col>
    </Row>
  );
};

export default Programs;
