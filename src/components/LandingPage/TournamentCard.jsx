import { Card, Col, Row } from "antd";
import { useRef } from "react";
import { IoArrowUpCircleOutline } from "react-icons/io5";

const cards = [
  {
    class:"orange-card",
    
    title: "National Padel ",
    type: "Championship",
    date: "Yearly, every August",
    location: "Skopje",
    category: "All",
  },
  {
    class:"lblue-card",
    title: "National Club ",
    type: "League",
    date: "March-November",

    category: "All",
  },
  {
    class:"purple-card",
    title: "National Junior ",
    type: "League",
    date: "March-November",

    category: "All",
  },
  {
    class:"green-card",
    title: "Regional Open ",
    type: "Tournaments",
    date: "Every two months",
    location: "Skopje",
    category: "All",
  },
  {
    class:"yellow-card",
    title: "National Veteran ",
    type: "Championship",
    date: "Every July",
    location: "Different locations",
    category: "Senior",
  },
  {
    class:"dblue-card",
    title: "National Festival and ",
    type: "Exhibition Competitions",
    date: "Every May",
    location: "Skopje",
    category: "All",
  },
  {
    class:"red-card",
    title: "International ",
    type: "Invitational Tournament",
    date: "Every September",
    location: "Skopje",
    category: "Top 8 and guests",
  },
  {
    class:"pink-card",
    title: "Women's National ",
    type: "Padel Cup",
    date: "Every April",
    location: "Skopje",
    category: "Women",
  },
  {
    class:"ddblue-card",
    title: "Mixed Doubles ",
    type: "Championship",
    date: "Every June",
    category: "Doubles-Male and Female",
  },
  {
    class:"lgreen-card",
    title: "Regional youth ",
    type: "development camps",
    date: "June-August",
    location: "Skopje",
    category: "Junior",
  },
];

const TournamentCard = () => {
  const scrollContainerRef = useRef(null);
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  const onMouseDown = (e) => {
    isDragging = true;
    startX = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeft = scrollContainerRef.current.scrollLeft;
  };

  const onMouseLeaveOrUp = () => {
    isDragging = false;
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Adjust scroll speed here
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div data-aos="fade-right"
      className="scroll-container"
      ref={scrollContainerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeaveOrUp}
      onMouseUp={onMouseLeaveOrUp}
    >
      <Row className="card-row" gutter={16}>
        {cards.map((card, index) => (
          <Col key={index} lg={7} xs={24}>
            <Card className={`card ${card.class} h-full relative overflow-hidden`}>
              <div className="card-content w-full h-full  p-3 m-0">
                <div className="d-flex flex-col w-full h-full justify-between ">
                  <h3 className="d-flex t-card-title justify-between">
                    {card.title} <IoArrowUpCircleOutline className="arrow" />
                  </h3>
                  <h3 className="t-card-title">{card.type}</h3>
                  <div className=" blur-background ">
                    <span className="t-card-date  ">{card.date}</span>
                  </div>

                  <p className="text-right t-card-cat ">Category</p>
                  <div className="d-flex justify-between">
                    <p className="t-card-location">{card.location}</p>
                    <p className="t-card-category"> {card.category} </p>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default TournamentCard;
