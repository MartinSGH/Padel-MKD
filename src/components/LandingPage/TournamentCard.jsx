import { Card, Col, Row, Modal } from "antd";

import { useState, useRef } from "react";
import { IoArrowUpCircleOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const TournamentCard = () => {
  const { t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const scrollContainerRef = useRef(null);
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  const cards = [
    {
      class: "orange-card",
      title: t("tournaments.card1.title"),
      type: t("tournaments.card1.type"),
      date: t("tournaments.card1.date"),
      location: t("tournaments.card1.location"),
      category: t("tournaments.card1.category"),
      format: t("tournaments.card1.format"),
      duration: t("tournaments.card1.duration"),
      prizes: t("tournaments.card1.prizes"),
      qualifications: t("tournaments.card1.qualifications"),
      competitors: t("tournaments.card1.competitors"),
      description: t("tournaments.card1.description"),
      link: "/national-championship-2026",
    },
    {
      class: "lblue-card",
      title: t("tournaments.card2.title"),
      type: t("tournaments.card2.type"),
      date: t("tournaments.card2.date"),
      competitors: t("tournaments.card2.competitors"),
      category: t("tournaments.card2.category"),
      divisions: t("tournaments.card2.divisions"),
      format: t("tournaments.card2.format"),
      description: t("tournaments.card2.description"),
      final: t("tournaments.card2.final"),
      prizes: t("tournaments.card2.prizes"),
    },
    {
      class: "purple-card",
      title: t("tournaments.card3.title"),
      type: t("tournaments.card3.type"),
      date: t("tournaments.card3.date"),
      category: t("tournaments.card3.category"),
      competitors: t("tournaments.card3.competitors"),
      age: t("tournaments.card3.age"),
      format: t("tournaments.card3.format"),
      final: t("tournaments.card3.final"),
      prizes: t("tournaments.card3.prizes"),
      qualifications: t("tournaments.card3.qualifications"),
      description: t("tournaments.card3.description"),
    },
    {
      class: "green-card",
      title: t("tournaments.card4.title"),
      type: t("tournaments.card4.type"),
      date: t("tournaments.card4.date"),
      location: t("tournaments.card4.location"),
      category: t("tournaments.card4.category"),
      competitors: t("tournaments.card4.competitors"),
      format: t("tournaments.card4.format"),
      prizes: t("tournaments.card4.prizes"),
      registration: t("tournaments.card4.registration"),
      description: t("tournaments.card4.description"),
    },
    {
      class: "yellow-card",
      title: t("tournaments.card5.title"),
      type: t("tournaments.card5.type"),
      date: t("tournaments.card5.date"),
      location: t("tournaments.card5.location"),
      category: t("tournaments.card5.category"),
      competitors: t("tournaments.card5.competitors"),
      duration: t("tournaments.card5.duration"),
      format: t("tournaments.card5.format"),
      prizes: t("tournaments.card5.prizes"),
      description: t("tournaments.card5.description"),
    },
    {
      class: "dblue-card",
      title: t("tournaments.card6.title"),
      type: t("tournaments.card6.type"),
      date: t("tournaments.card6.date"),
      location: t("tournaments.card6.location"),
      category: t("tournaments.card6.category"),
      events: t("tournaments.card6.events"),
      prizes: t("tournaments.card6.prizes"),
      description: t("tournaments.card6.description"),
    },
    {
      class: "red-card",
      title: t("tournaments.card7.title"),
      type: t("tournaments.card7.type"),
      date: t("tournaments.card7.date"),
      location: t("tournaments.card7.location"),
      category: t("tournaments.card7.category"),
      competitors: t("tournaments.card7.competitors"),
      format: t("tournaments.card7.format"),
      prizes: t("tournaments.card7.prizes"),
      description: t("tournaments.card7.description"),
    },
    {
      class: "pink-card",
      title: t("tournaments.card8.title"),
      type: t("tournaments.card8.type"),
      date: t("tournaments.card8.date"),
      location: t("tournaments.card8.location"),
      category: t("tournaments.card8.category"),
      competitors: t("tournaments.card8.competitors"),
      format: t("tournaments.card8.format"),
      prizes: t("tournaments.card8.prizes"),
      description: t("tournaments.card8.description"),
    },
    {
      class: "ddblue-card",
      title: t("tournaments.card9.title"),
      type: t("tournaments.card9.type"),
      date: t("tournaments.card9.date"),
      location: t("tournaments.card9.location"),
      category: t("tournaments.card9.category"),
      format: t("tournaments.card9.format"),
      competitors: t("tournaments.card9.competitors"),
      prizes: t("tournaments.card9.prizes"),
      description: t("tournaments.card9.description"),
    },
    {
      class: "lgreen-card",
      title: t("tournaments.card10.title"),
      type: t("tournaments.card10.type"),
      date: t("tournaments.card10.date"),
      location: t("tournaments.card10.location"),
      category: t("tournaments.card10.category"),
      format: t("tournaments.card10.format"),
      competitors: t("tournaments.card10.competitors"),
      result: t("tournaments.card10.result"),
      description: t("tournaments.card10.description"),
    },
  ];

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

  

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleLinkClick = () => {
    setIsModalVisible(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                onClick={() => showModal(card)}
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
          title={`${selectedCard.title} ${selectedCard.type}`}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={null}
        >
          <div>
            <p>{selectedCard.description}</p>
            <b>Details</b>
            <ul className="modal-list">
              {Object.entries({
                Type: selectedCard.type,
                Date: selectedCard.date,
                Location: selectedCard.location,
                Format: selectedCard.format,
                Competitors: selectedCard.competitors,
                Prize: selectedCard.prizes,
                Result: selectedCard.result,
                Duration: selectedCard.duration,
                Qualifications: selectedCard.qualifications,
                Divisions: selectedCard.divisions,
                Final: selectedCard.final,
                Age: selectedCard.age,
                Registration: selectedCard.registration,
              }).map(([key, value]) =>
                value ? (
                  <li key={key}>
                    <b>{key}:</b> {value}
                  </li>
                ) : null
              )}
            </ul>

            {selectedCard.link && (
              <Link
                to={selectedCard.link}
                onClick={handleLinkClick}
                className="modal-cta-button"
              >
                {t("tournaments.viewPage")}
                <IoArrowUpCircleOutline />
              </Link>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default TournamentCard;
