import "../styles/NationalChampionship2026.css";
import { useState } from "react";
import { Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { IoArrowUpCircleOutline } from "react-icons/io5";
import {
  FaRegCalendarAlt,
  FaMapMarkerAlt,
  FaUsersCog,
  FaRegClock,
} from "react-icons/fa";

const REGISTRATION_URL = "https://forms.gle/zWTQLv1DRfEFdfaA7";
const POSTER_PATH = "/images/Padel2026.png";

const NationalChampionship2026 = () => {
  const { t } = useTranslation();
  const [posterError, setPosterError] = useState(false);

  const facts = [
    { key: "date", Icon: FaRegCalendarAlt },
    { key: "location", Icon: FaMapMarkerAlt },
    { key: "organizer", Icon: FaUsersCog },
    { key: "deadline", Icon: FaRegClock },
  ];

  const highlights = ["recognition", "ranking", "international", "status"];

  const regMeta = t("championship2026.regulations.meta", { returnObjects: true });
  const regArticles = t("championship2026.regulations.articles", {
    returnObjects: true,
  });

  const renderBlock = (block, idx) => {
    switch (block.type) {
      case "subhead":
        return (
          <h4 key={idx} className="nc-reg-subhead">
            {block.text}
          </h4>
        );
      case "p":
        return (
          <p key={idx} className="nc-reg-p">
            {block.text}
          </p>
        );
      case "ul":
        return (
          <ul key={idx} className="nc-reg-list">
            {block.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={idx} className="nc-reg-list nc-reg-list-ol">
            {block.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        );
      case "table":
        return (
          <div key={idx} className="nc-reg-table-wrap">
            <table className="nc-reg-table">
              <thead>
                <tr>
                  {block.head.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="nc-page">
      {/* Hero */}
      <section className="nc-hero">
        <Row justify={"center"}>
          <Col span={20}>
            <Row gutter={[40, 40]} align={"middle"}>
              <Col xs={24} lg={13}>
                <span className="nc-eyebrow">
                  {t("championship2026.eyebrow")}
                </span>
                <h1 className="nc-title">{t("championship2026.title")}</h1>
                <p className="nc-subtitle">{t("championship2026.subtitle")}</p>
                <p className="nc-intro">{t("championship2026.intro")}</p>

                <div className="nc-actions">
                  <a
                    href={REGISTRATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nc-btn nc-btn-primary"
                  >
                    {t("championship2026.registerButton")}
                    <IoArrowUpCircleOutline className="nc-btn-icon" />
                  </a>
                  <span className="nc-deadline-chip">
                    <FaRegClock className="nc-deadline-icon" />
                    {t("championship2026.deadlineChip")}
                  </span>
                </div>
              </Col>

              <Col xs={24} lg={11}>
                <div className="nc-poster-frame">
                  {posterError ? (
                    <div className="nc-poster-fallback">
                      <span className="nc-poster-fallback-eyebrow">
                        {t("championship2026.eyebrow")}
                      </span>
                      <span className="nc-poster-fallback-title">
                        {t("championship2026.title")}
                      </span>
                      <span className="nc-poster-fallback-meta">
                        {t("championship2026.subtitle")}
                      </span>
                    </div>
                  ) : (
                    <img
                      className="nc-poster-img"
                      src={POSTER_PATH}
                      alt={t("championship2026.posterAlt")}
                      onError={() => setPosterError(true)}
                    />
                  )}
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </section>

      {/* Key facts */}
      <section className="nc-section">
        <Row justify={"center"}>
          <Col span={20}>
            <h2 className="nc-section-title">
              {t("championship2026.facts.title")}
            </h2>
            <Row gutter={[24, 24]}>
              {facts.map(({ key, Icon }) => (
                <Col xs={24} sm={12} lg={6} key={key}>
                  <div className="nc-fact-card">
                    <span className="nc-fact-icon">
                      <Icon />
                    </span>
                    <p className="nc-fact-label">
                      {t(`championship2026.facts.${key}.label`)}
                    </p>
                    <p className="nc-fact-value">
                      {t(`championship2026.facts.${key}.value`)}
                    </p>
                  </div>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* About */}
      <section className="nc-section">
        <Row justify={"center"}>
          <Col span={20}>
            <h2 className="nc-section-title">
              {t("championship2026.aboutTitle")}
            </h2>
            <div className="nc-prose">
              <p>{t("championship2026.about.p1")}</p>
              <p>{t("championship2026.about.p2")}</p>
              <p>{t("championship2026.about.p3")}</p>
            </div>
          </Col>
        </Row>
      </section>

      {/* Why take part */}
      <section className="nc-section">
        <Row justify={"center"}>
          <Col span={20}>
            <h2 className="nc-section-title">
              {t("championship2026.highlightsTitle")}
            </h2>
            <Row gutter={[24, 24]}>
              {highlights.map((key, index) => (
                <Col xs={24} md={12} key={key}>
                  <div className="nc-card">
                    <span className="nc-card-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="nc-card-title">
                      {t(`championship2026.highlights.${key}.title`)}
                    </h3>
                    <p className="nc-card-text">
                      {t(`championship2026.highlights.${key}.text`)}
                    </p>
                  </div>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* Registration */}
      <section className="nc-section">
        <Row justify={"center"}>
          <Col span={20}>
            <div className="nc-register">
              <h2 className="nc-register-title">
                {t("championship2026.registerTitle")}
              </h2>
              <p className="nc-register-text">
                {t("championship2026.registerText")}
              </p>
              <p className="nc-register-note">
                {t("championship2026.registerNote")}
              </p>
              <a
                href={REGISTRATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="nc-btn nc-btn-primary"
              >
                {t("championship2026.registerCta")}
                <IoArrowUpCircleOutline className="nc-btn-icon" />
              </a>
            </div>
          </Col>
        </Row>
      </section>

      {/* Closing */}
      <section className="nc-section">
        <Row justify={"center"}>
          <Col span={20}>
            <p className="nc-closing">{t("championship2026.closing")}</p>
          </Col>
        </Row>
      </section>

      {/* Regulations / Propositions */}
      {Array.isArray(regArticles) && regArticles.length > 0 && (
        <section className="nc-section">
          <Row justify={"center"}>
            <Col span={20}>
              <h2 className="nc-section-title">
                {t("championship2026.regulations.title")}
              </h2>
              <p className="nc-reg-intro">
                {t("championship2026.regulations.intro")}
              </p>

              {Array.isArray(regMeta) && (
                <div className="nc-reg-meta">
                  {regMeta.map((item, i) => (
                    <div className="nc-reg-meta-item" key={i}>
                      <span className="nc-reg-meta-label">{item.label}</span>
                      <span className="nc-reg-meta-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="nc-reg-articles">
                {regArticles.map((article, ai) => (
                  <article className="nc-reg-article" key={ai}>
                    <h3 className="nc-reg-article-title">{article.title}</h3>
                    <div className="nc-reg-article-body">
                      {article.blocks.map(renderBlock)}
                    </div>
                  </article>
                ))}
              </div>

              <p className="nc-reg-signature">
                {t("championship2026.regulations.signature")}
              </p>
            </Col>
          </Row>
        </section>
      )}
    </div>
  );
};

export default NationalChampionship2026;
