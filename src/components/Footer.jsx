import "../styles/Footer.css";
import { Row, Col } from "antd";
import { Link, useLocation } from "react-router";
import { SiFacebook, SiLinkedin, SiTiktok, SiYoutube } from "react-icons/si";
import { AiFillInstagram } from "react-icons/ai";
import { FaTwitter } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
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
            <Col xs={20} lg={8} className="footer-columns">
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
            <Col xs={20} lg={8} className="footer-columns">
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
                    className="footer-link"
                    to="#clubs"
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
            <Col xs={20} lg={8} className="footer-columns">
              <ul className="footer-list">
                <li className="footer-title">{t("footer.docs.title")}</li>
                <li className="footer-link">
                  <Link
                    className="footer-link"
                    to={"/Програма.pdf"}
                    target="_blank"
                  >
                    {t("footer.docs.program")}
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
          </Row>
          <Row justify={"center"}>
            <Col span={10}>
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
