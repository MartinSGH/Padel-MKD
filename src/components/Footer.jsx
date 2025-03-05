import "../styles/Footer.css";
import { Row, Col } from "antd";
import { Link, useLocation } from "react-router";
import { SiFacebook, SiLinkedin, SiTiktok, SiYoutube } from "react-icons/si";
import { AiFillInstagram } from "react-icons/ai";
import { FaTwitter } from "react-icons/fa6";

const Footer = () => {
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
                  ul.Kuzman Josifovski <br /> br.22/14 Skopje 1000,
                </li>
                <li className="  footer-link">mob:077 123 456</li>
                <li className="footer-link">info@padelflip.mk</li>
              </ul>
            </Col>
            <Col xs={20} lg={8} className="footer-columns">
              <ul className="footer-list">
                <li className="footer-title">Menu</li>
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
                    What is Padel?
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
                    Federation
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={scrollToTop}
                    className="footer-link"
                     to="#clubs"
                  >
                    Clubs
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
                    News and Media
                  </Link>
                </li>
              </ul>
            </Col>
            <Col xs={20} lg={8} className="footer-columns">
              <ul className="footer-list">
                <li className="footer-title">Documentations</li>
                <li className="footer-link">Programs</li>
                <li className="footer-link">Contact us</li>
                <li className="footer-link">Status of Federation</li>
                <li className="footer-link">License of Federation</li>
              </ul>
            </Col>
          </Row>
          <Row justify={"center"}>
            <Col span={10}>
              <div className="footer-socials">
                <span>
                  <SiFacebook />
                </span>

                <span>
                  <AiFillInstagram />
                </span>
                <span>
                  <SiLinkedin />
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
