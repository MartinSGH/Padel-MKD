import "../styles/ClubsPage.css";
import { useEffect, useState } from "react";
import { Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import { getAllClubs } from "../services/clubs";

const ClubsPage = () => {
  const { t } = useTranslation();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllClubs()
      .then((data) => setClubs(data || []))
      .catch((err) => setError(err.message || "Failed to load clubs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="clubs-page">
      <section className="clubs-page-hero">
        <Row justify={"center"}>
          <Col span={20}>
            <span className="clubs-page-eyebrow">{t("clubs.pageEyebrow")}</span>
            <h1 className="clubs-page-title">{t("clubs.title")}</h1>
            <p className="clubs-page-subtitle">{t("clubs.pageSubtitle")}</p>
          </Col>
        </Row>
      </section>

      <section className="clubs-page-section">
        <Row justify={"center"}>
          <Col span={20}>
            {loading ? (
              <p className="clubs-page-status">{t("clubs.loading")}</p>
            ) : error || clubs.length === 0 ? (
              <p className="clubs-page-status">{t("clubs.empty")}</p>
            ) : (
              <div className="clubs-page-grid">
                {clubs.map((club) => (
                  <article className="clubs-page-card" key={club.id}>
                    <div className="clubs-page-card-logo">
                      {club.logo_url ? (
                        <img src={club.logo_url} alt={club.name} />
                      ) : (
                        <span>{(club.name || "C").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <h3 className="clubs-page-card-title">{club.name}</h3>
                    <div className="clubs-page-card-details">
                      {club.address && <p>{club.address}</p>}
                      {club.hours && <p>{club.hours}</p>}
                      {club.phone && (
                        <p>
                          <a href={`tel:${club.phone.replace(/\s+/g, "")}`}>
                            {club.phone}
                          </a>
                        </p>
                      )}
                      {club.email && (
                        <p>
                          <a href={`mailto:${club.email}`}>{club.email}</a>
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default ClubsPage;
