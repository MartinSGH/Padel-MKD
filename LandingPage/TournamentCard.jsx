import { Card, Col, Row, Modal } from "antd";

import { useState, useRef } from "react";
import { IoArrowUpCircleOutline } from "react-icons/io5";

const cards = [
  {
    class: "orange-card",
    title: "National Padel ",
    type: "Championship",
    date: "Yearly, middle of August",
    location: "Skopje",
    category: "All",
    format:
      "Man and Woman mix matches,Man and Woman 2v2 matches, Veteran and Junior Competition",
    duration: "7-10 Days",
    prize:
      "Trophy, Money, Points used for ranking system for national team selection",
    qualifications: "Based on ranking of regional matches and league matches",
    competitors:
      "Best 32 man and women players, top 16 junior players (U16, U18)",
    description:
      "The main event to determine the national champions in the men's and women's categories, as well as in the junior and veteran categories. The championship will include the top ranked players and clubs from across the country.",
  },
  {
    class: "lblue-card",
    title: "National Club ",
    type: "League",
    date: " Whole year season(March-November)",
    competitors: "Registered Padel clubs from whole country",
    category: "All",
    divisions:
      "Premier Division: Top 8 clubs, Division 1: Next 12 clubs, Division 2: New and lower ranked clubs",
    format:
      " Home&Away matches, Teams of 4-6 players by club, Mix and doubles matches by duel",
    description:
      "An annual, multi-division league in which registered padel clubs participate, competing in a structured format for the title of the best club in North Macedonia.",
    final:
      "Top 4 teams of Premier Division will play play-off for champion title",
    prize:
      "National Club Champion title, promotion to higher division, prizes for most successfull clubs",
  },
  {
    class: "purple-card",
    title: "National Junior ",
    type: "League",
    date: "March-November",
    category: "All",
    competitors: "Junior players from padel academies and schools",
    age: "U12, U14, U16, U18",
    format:
      "Mix and doubles matches for every age group. MAtches organized in regional centers, for decreasing travel costs. The best competitors will continue to national finals",
    final: " National final in October",
    prize: "Trophies,medals, points for selection in Youth National Team",
    qualifications: "Based on performance in regional league matches",
    description:
      "Youth league for players from 12-18 years old, separated by age group, with a focus on developing young talents and making posibilities for them to compete on a national level.",
  },
  {
    class: "green-card",
    title: "Regional Open ",
    type: "Tournaments",
    date: "Every two months",
    location: "Skopje",
    category: "All",
    competitors: "Opwn for all registered players",
    format:
      "Cup system matches, 2v2 matches, mix matches. Open for amateurs, semi-pro and pro players",
    prizes: "Trophies, medals, points for ranking",
    registration: "Open registration with registration fee",
    description:
      "Open tournaments organized in capital cities, in order to encourage participation of players of all skill levels and to provide additional opportunities for competition.",
  },
  {
    class: "yellow-card",
    title: "National Veteran ",
    type: "Championship",
    date: "Yearly, beginning of July",
    location: "Different locations",
    category: "Senior",
    competitors: "Players 40+ years old",
    duration: "3-5 days",
    format: "Man and Woman mix,Man and Women doubles",
    prizes: "Trophies, medals, points for ranking",
    description:
      "A special competition for veterans, players aged 40 and over, with the aim of encouraging the further participation of older athletes in padel.",
  },
  {
    class: "dblue-card",
    title: "National Festival and ",
    type: "Exhibition Competitions",
    date: "Yearly, end of May",
    location: "Skopje",
    category: "All",
    events:
      "Exhibition matches between the best players, Clinics for beginners and children, Social matches for amateur players",
    prizes: "Medals for participation, promotional gifts",
    description:
      " An annual event that combines friendly competitions, exhibitions and demonstrations, with the aim of promoting padel to the general public and encouraging social participation.",
  },
  {
    class: "red-card",
    title: "International ",
    type: "Invitational Tournament",
    date: "Yearly, middle of September",
    location: "Skopje",
    category: "Top 8 and guests",
    competitors: "Top 8 national players, invited international players",
    format: "Cup system matches, 2v2 matches, mix matches",
    prizes: "Trophies, money prizes, points for ranking",
    description:
      "An invitational tournament with top players from neighboring countries and international padel federations, aiming to raise the competitive level in North Macedonia.",
  },

  {
    class: "pink-card",
    title: "Women's National ",
    type: "Padel Cup",
    date: "Yearly, April",
    location: "Skopje",
    category: "Women",
    competitors: "All registered woman players",
    format:
      "Doubles, group stage with match system-'everyone with everyone', and finals",
    prizes: "Trophies, points for ranking, promotion posibilities",
    description:
      "A tournament exclusively for women, with the aim of increasing women's participation in the sport and creating a platform for competitive padel for women.",
  },
  {
    class: "ddblue-card",
    title: "Mixed Doubles ",
    type: "Championship",
    date: "Yearly, end of June",
    location: "Skopje",
    category: "Doubles-Male and Female",
    format: "Cup system matches",
    competitors: "Teams of mixed doubles from registered clubs",
    prizes: "Trophies,ponts for ranking",
    description:
      "National Mixed Doubles Championship, aiming to encourage inclusivity and teamwork between male and female players.",
  },
  {
    class: "lgreen-card",
    title: "Regional youth ",
    type: "development camps",
    date: "June-August",
    location: "Skopje",
    category: "Junior",
    format:
      "Training sessions, matches, social activities guided by national and international coaches",
    competitors:
      "Top junior players selected based on performance in junior leagues",
    result:
      "Improvement of skills and identification of talents for national team",
    description:
      "A series of training camps focused on developing young talent, identifying potential players and educating elite athletes, integrated into the competition calendar.",
  },
];

const TournamentCard = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
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

  const showModal = (card) => {
    setSelectedCard(card);
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <div
        data-aos="fade-right"
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
              <Card
                className={`card ${card.class} h-full relative overflow-hidden`}
                onClick={() => showModal(card)} // Trigger modal on card click
              >
                <div className="card-content w-full h-full p-3 m-0">
                  <div className="d-flex flex-col w-full h-full justify-between">
                    <h3 className="d-flex t-card-title justify-between">
                      {card.title} <IoArrowUpCircleOutline className="arrow" />
                    </h3>
                    <h3 className="t-card-title">{card.type}</h3>
                    <div className="blur-background">
                      <span className="t-card-date">{card.date}</span>
                    </div>
                    <p className="text-right t-card-cat">Category</p>
                    <div className="d-flex justify-between">
                      <p className="t-card-location">{card.location}</p>
                      <p className="t-card-category">{card.category}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {selectedCard && (
        <Modal
          className="tournament-modal"
          title={selectedCard.title + " " + selectedCard.type}
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
        >
          <div>
            <p>{selectedCard.description}</p>
            <b>Details</b>
            <ul
              style={{
                listStyleType: "none",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <li>
                <b>Type:</b> {selectedCard.type}
              </li>
              <li>
                <b>Date:</b> {selectedCard.date}
              </li>
              <li>
                <b>Location:</b> {selectedCard.location}
              </li>
              <li>
                <b>Format:</b> {selectedCard.format}
              </li>
              <li>
                <b>Competitors:</b> {selectedCard.competitors}
              </li>
              <li>
                <b>Prize:</b> {selectedCard.prizes}
              </li>
              <li>
                <b>Result:</b> {selectedCard.result}
              </li>
              <li>
                <b>Duration:</b> {selectedCard.duration}
              </li>
              <li>
                <b>Qualification:</b> {selectedCard.qualification}
              </li>
              <li>
                <b>Divisions:</b> {selectedCard.divisions}
              </li>
              <li>
                <b>Final</b> {selectedCard.final}
              </li>
              <li>
                <b>Age:</b> {selectedCard.age}
              </li>
              <li>
                <b>Registration:</b> {selectedCard.registration}
              </li>
            </ul>
          </div>
        </Modal>
      )}
    </>
  );
};

export default TournamentCard;
