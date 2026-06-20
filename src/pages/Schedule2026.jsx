import "../styles/Schedule2026.css";
import { Row, Col } from "antd";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaRegFilePdf } from "react-icons/fa6";
import { IoArrowUpCircleOutline, IoDownloadOutline } from "react-icons/io5";

const PDF_PATH = "/Schedule-2026.pdf";

const Schedule2026 = () => {
  const { t } = useTranslation();

  const highlights = [
    { key: "education", index: "01" },
    { key: "competitions", index: "02" },
    { key: "development", index: "03" },
    { key: "infrastructure", index: "04" },
  ];

  const phases = ["one", "two", "three"];

  return (
    <div className="schedule-page">
      {/* Hero */}
      <section className="schedule-hero">
        <Row justify={"center"}>
          <Col span={20}>
            <span className="schedule-eyebrow">{t("schedule2026.eyebrow")}</span>
            <h1 className="schedule-title">{t("schedule2026.title")}</h1>
            <p className="schedule-subtitle">{t("schedule2026.subtitle")}</p>
            <p className="schedule-intro">{t("schedule2026.intro")}</p>

            <div className="schedule-actions">
              <Link
                to={PDF_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="schedule-btn schedule-btn-primary"
              >
                <FaRegFilePdf className="schedule-btn-icon" />
                {t("schedule2026.viewButton")}
              </Link>
              <a
                href={PDF_PATH}
                download
                className="schedule-btn schedule-btn-secondary"
              >
                <IoDownloadOutline className="schedule-btn-icon" />
                {t("schedule2026.downloadButton")}
              </a>
            </div>
          </Col>
        </Row>
      </section>

      {/* Highlights */}
      <section className="schedule-section">
        <Row justify={"center"}>
          <Col span={20}>
            <h2 className="schedule-section-title">
              {t("schedule2026.highlightsTitle")}
            </h2>
            <Row gutter={[24, 24]}>
              {highlights.map(({ key, index }) => (
                <Col xs={24} sm={12} lg={6} key={key}>
                  <div className="schedule-card">
                    <span className="schedule-card-index">{index}</span>
                    <h3 className="schedule-card-title">
                      {t(`schedule2026.highlights.${key}.title`)}
                    </h3>
                    <p className="schedule-card-text">
                      {t(`schedule2026.highlights.${key}.text`)}
                    </p>
                  </div>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* Implementation phases */}
      <section className="schedule-section">
        <Row justify={"center"}>
          <Col span={20}>
            <h2 className="schedule-section-title">
              {t("schedule2026.phasesTitle")}
            </h2>
            <Row gutter={[24, 24]}>
              {phases.map((phase) => (
                <Col xs={24} md={8} key={phase}>
                  <div className="schedule-phase">
                    <p className="schedule-phase-label">
                      {t(`schedule2026.phases.${phase}.label`)}
                    </p>
                    <span className="schedule-phase-period">
                      {t(`schedule2026.phases.${phase}.period`)}
                    </span>
                    <p className="schedule-phase-text">
                      {t(`schedule2026.phases.${phase}.text`)}
                    </p>
                  </div>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* Embedded PDF document */}
      <section className="schedule-section">
        <Row justify={"center"}>
          <Col span={20}>
            <h2 className="schedule-section-title">
              {t("schedule2026.documentTitle")}
            </h2>
            <p className="schedule-doc-note">{t("schedule2026.documentNote")}</p>

            <div className="schedule-viewer">
              <div className="schedule-viewer-bar">
                <div className="schedule-viewer-bar-name">
                  <FaRegFilePdf className="schedule-doc-icon" />
                  <span>{t("schedule2026.title")} — PDF</span>
                </div>
                <Link
                  to={PDF_PATH}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="schedule-viewer-bar-link"
                >
                  {t("schedule2026.viewButton")}
                  <IoArrowUpCircleOutline />
                </Link>
              </div>

              <iframe
                className="schedule-viewer-frame"
                src={`${PDF_PATH}#view=FitH`}
                title={t("schedule2026.documentTitle")}
              />

              <div className="schedule-viewer-fallback">
                {t("schedule2026.fallback")}{" "}
                <a href={PDF_PATH} target="_blank" rel="noopener noreferrer">
                  {t("schedule2026.viewButton")}
                </a>
              </div>
            </div>
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default Schedule2026;
