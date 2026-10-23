import "../styles/Footer.css";
import { Row, Col } from "antd";
import { Link, useLocation } from "react-router";
import { SiFacebook, SiLinkedin, SiTiktok, SiYoutube } from "react-icons/si";
import { AiFillInstagram } from "react-icons/ai";
import { FaTwitter } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { subscribeToNewsletter } from "../services/newsletter";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Footer newsletter sign-up: subscribers get an email for every new news
// article / tournament the admins choose to announce.
const NewsletterForm = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | invalid | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setStatus("invalid");
      return;
    }
    setStatus("sending");
    try {
      await subscribeToNewsletter(value);
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  const message = {
    success: t("footer.newsletter.success"),
    invalid: t("footer.newsletter.invalid"),
    error: t("footer.newsletter.error"),
  }[status];

  return (
    <div className="footer-newsletter">
      <h3 className="footer-title">{t("footer.newsletter.title")}</h3>
      <p className="footer-newsletter-text">{t("footer.newsletter.text")}</p>
      <form
        className="footer-newsletter-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "sending") setStatus("idle");
          }}
          placeholder={t("footer.newsletter.placeholder")}
          aria-label={t("footer.newsletter.placeholder")}
          aria-invalid={status === "invalid"}
          disabled={status === "sending"}
        />
        <button type="submit" disabled={status === "sending"}>
          {status === "sending"
            ? t("footer.newsletter.sending")
            : t("footer.newsletter.button")}
        </button>
      </form>
      {message && (
        <p
          className={`footer-newsletter-status ${status}`}
          role={status === "success" ? "status" : "alert"}
        >
          {message}
        </p>
      )}
    </div>
  );
};

const Footer = () => {
  const { t } = useTranslation();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  return (
    <div data-aos="flip-right" className=" footer p-5 my-5">
      <Row justify={"center"} className="footer-row">
        <Col className="h-full footer-col" span={20}>
          <Row className="padding-footer" justify={"center"}>
            <Col xs={24} md={12} xl={6} className="footer-columns">
              <ul className="footer-list">
                <li>
                  <img src="/images/FooterLogo.svg" alt="" />
                </li>
                <li className="footer-link">
                  Luj Paster
                  <br />1 Skopje 1000,
                </li>

                <li className="footer-link">padelmkd@gmail.com</li>
              </ul>
            </Col>
            <Col xs={24} md={12} xl={4} className="footer-columns">
              <ul className="footer-list">
                <li className="footer-title">{t("footer.links.title")}</li>
                <li>
                  <Link
                    onClick={scrollToTop}
                    className={
                      isLandingPage
                        ? "footer-link "
                        : location.pathname === "/wip"
                          ? "footer-active-link"
                          : "footer-link"
                    }
                    to="/wip"
                  >
                    {t("footer.links.wip")}
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={scrollToTop}
                    className={
                      isLandingPage
                        ? "footer-link"
                        : location.pathname === "/federation"
                          ? "footer-active-link"
                          : "footer-link"
                    }
                    to="/federation"
                  >
                    {t("footer.links.federation")}
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={scrollToTop}
                    className={
                      isLandingPage
                        ? "footer-link"
                        : location.pathname === "/clubs"
                          ? "footer-active-link"
                          : "footer-link"
                    }
                    to="/clubs"
                  >
                    {t("footer.links.clubs")}
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={scrollToTop}
                    className={
                      isLandingPage
                        ? "footer-link "
                        : location.pathname === "/news"
                          ? "footer-active-link"
                          : "footer-link"
                    }
                    to="/news"
                  >
                    {t("footer.links.news")}
                  </Link>
                </li>
              </ul>
            </Col>
            <Col xs={24} md={12} xl={6} className="footer-columns">
              <ul className="footer-list">
                <li className="footer-title">{t("footer.docs.title")}</li>
                <li className="footer-link">
                  <Link
                    className="footer-link"
                    to={"/Програма.pdf"}
                    target="_blank"
                  >
                    {t("footer.docs.program")}
                  </Link>{" "}
                </li>
                <li className="footer-link">
                  <Link
                    className="footer-link"
                    to={"/Schedule-2026.pdf"}
                    target="_blank"
                  >
                    {t("footer.docs.program2026")}
                  </Link>
                </li>
                <li className="footer-link">{t("footer.docs.contact")}</li>
                <li className="footer-link">
                  <Link
                    className="footer-link"
                    to={"/Status.pdf"}
                    target="_blank"
                  >
                    {t("footer.docs.status")}
                  </Link>
                </li>
                <li className="footer-link">
                  <Link
                    className="footer-link"
                    to={"/Licence.jpg"}
                    target="_blank"
                  >
                    {t("footer.docs.license")}
                  </Link>
                </li>
                <li className="footer-link">
                  <Link
                    className="footer-link"
                    to={"/RuleBook.pdf"}
                    target="_blank"
                  >
                    {t("footer.docs.rulebook")}
                  </Link>
                </li>
              </ul>
            </Col>
            <Col xs={24} md={12} xl={8} className="footer-columns">
              <div className="footer-newsletter-col">
                <NewsletterForm />
                <div className="footer-follow">
                  <h3 className="footer-title footer-follow-title">
                    {t("footer.newsletter.follow")}
                  </h3>
                  <div className="footer-socials">
                    <span>
                      <Link
                        to={
                          "https://www.facebook.com/profile.php?id=61562298045963"
                        }
                        target="_blank"
                      >
                        <SiFacebook />
                      </Link>
                    </span>

                    <span>
                      <Link
                        to={"https://www.instagram.com/padelfederation.mk/"}
                        target="_blank"
                      >
                        <AiFillInstagram />
                      </Link>
                    </span>
                    <span>
                      <Link
                        to={
                          "https://www.linkedin.com/company/padel-macedonia/?viewAsMember=true"
                        }
                        target="_blank"
                      >
                        <SiLinkedin />
                      </Link>
                    </span>
                    <span>
                      <SiTiktok />
                    </span>
                    <span>
                      <FaTwitter />
                    </span>
                    <span>
                      <SiYoutube />
                    </span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          <Row justify={"center"}>
            <Col span={20} style={{ padding: "1rem 0" }}>
              <hr />
            </Col>
          </Row>
          <Row justify={"center"}>
            <Col span={20} className="copyright pb-2">
              <p style={{ textAlign: "center" }}>
                Copyright &#169; 2024 PFM | Designed and Developed by the
                students of{" "}
                <Link to={"https://creativehub.mk"}>
                  Creative Hub Macedonia
                </Link>
              </p>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default Footer;
