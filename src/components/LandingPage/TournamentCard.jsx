import { Card, Col, Row, Modal } from "antd";

import { useState, useRef, useEffect } from "react";
import { IoArrowUpCircleOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getAllTournaments } from "../../services/tournaments";
import {
  formatDateRange,
  formatSingleDate,
  isRegistrationOpen,
} from "../../lib/tournamentUtils";

const COLOR_CLASSES = [
  "orange-card",
  "lblue-card",
  "purple-card",
  "green-card",
  "yellow-card",
  "dblue-card",
  "red-card",
  "pink-card",
  "ddblue-card",
  "lgreen-card",
];

const TournamentCard = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("mk") ? "mk" : "en";

  const [tournaments, setTournaments] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const scrollContainerRef = useRef(null);
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  useEffect(() => {
    getAllTournaments()
      .then((data) => setTournaments(data || []))
      .catch(() => setTournaments([]));
  }, []);

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

  const detailEntries = (card) => [
    [t("tournaments.details.type"), card.type],
    [t("tournaments.details.date"), formatDateRange(card.start_date, card.end_date, lang)],
    [t("tournaments.details.location"), card.location],
    [t("tournaments.category"), card.category],
    [t("tournaments.details.format"), card.format],
    [t("tournaments.details.competitors"), card.competitors],
    [t("tournaments.details.prizes"), card.prizes],
    [t("tournaments.details.qualifications"), card.qualifications],
    [t("tournaments.details.result"), card.result],
    [
      t("tournaments.details.registration"),
      card.registration_deadline
        ? formatSingleDate(card.registration_deadline, lang)
        : null,
    ],
  ];

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
          {tournaments.map((card, index) => (
            <Col key={card.id} lg={7} xs={24}>
              <Card
                className={`card ${
                  COLOR_CLASSES[index % COLOR_CLASSES.length]
                } h-full relative overflow-hidden`}
                onClick={() => showModal(card)}
              >
                <div className="card-content w-full h-full p-3 m-0">
                  <div className="d-flex flex-col w-full h-full justify-between">
                    <h3 className="d-flex t-card-title t-card-title-row justify-between">
                      <span className="t-card-name">{card.name}</span>
                      <IoArrowUpCircleOutline className="arrow" />
                    </h3>
                    <h3 className="t-card-title">{card.type}</h3>
                    <div className="blur-background">
                      <span className="t-card-date">
                        {formatDateRange(card.start_date, card.end_date, lang)}
                      </span>
                    </div>
                    <p className="text-right t-card-cat">
                      {t("tournaments.category")}
                    </p>
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
          title={`${selectedCard.name}${
            selectedCard.type ? ` — ${selectedCard.type}` : ""
          }`}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={null}
        >
          <div>
            {selectedCard.description && (
              <p style={{ whiteSpace: "pre-line" }}>
                {selectedCard.description}
              </p>
            )}
            <b>{t("tournaments.detailsLabel")}</b>
            <ul className="modal-list">
              {detailEntries(selectedCard).map(([key, value]) =>
                value ? (
                  <li key={key}>
                    <b>{key}:</b> {value}
                  </li>
                ) : null
              )}
            </ul>

            <div className="modal-cta-row">
              <Link
                to={selectedCard.detail_url || `/tournaments/${selectedCard.id}`}
                onClick={handleLinkClick}
                className="modal-cta-button"
              >
                {selectedCard.detail_url
                  ? t("tournaments.viewPage")
                  : t("tournaments.viewDetails")}
                <IoArrowUpCircleOutline />
              </Link>

              {isRegistrationOpen(selectedCard) && (
                <a
                  href={selectedCard.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-cta-button modal-cta-register"
                >
                  {t("tournamentsPage.register")}
                </a>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default TournamentCard;
