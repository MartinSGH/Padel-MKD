import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Row, Col } from "antd";
import "../../styles/NewsComponent.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublishedNews } from "../../services/news";
import { newsHref, newsLang, newsTitle } from "../../lib/news";

// Court squares, top-left → bottom-right, newest news first.
const SQUARE_CLASSES = [
  "news-first-card",
  "news-second-card",
  "news-third-card",
  "news-fourth-card",
];

const NewsSquare = ({ item, lang }) => {
  const title = <h1 className="news-card-text">{newsTitle(item, lang)}</h1>;
  const href = newsHref(item);
  return href.external ? (
    <a
      className="full-size-link"
      href={href.to}
      target="_blank"
      rel="noopener noreferrer"
    >
      {title}
    </a>
  ) : (
    <Link className="full-size-link" to={href.to}>
      {title}
    </Link>
  );
};

NewsSquare.propTypes = {
  item: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
};

const NewsComponent = () => {
  const { t, i18n } = useTranslation();
  const lang = newsLang(i18n);
  const [news, setNews] = useState(null); // null while loading

  useEffect(() => {
    getPublishedNews(4).then(setNews);
  }, []);

  return (
    <div className="newsComponent-container py-5  mb-5 text-white">
      <Row justify={"center"} className="mb-4">
        <Col span={20}>
          <div className="news-head">
            <h2 className="text-white gallery-h1" id="gallery">
              {t("news.newsTitle")}
            </h2>
            <Link to="/all-news" className="news-see-more">
              {t("news.seeMore")} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Col>
      </Row>
      <Row className="padel-court" justify={"center"}>
        <Col span={20}>
          <Row justify={"center"}>
            <Col className="p-3 terrain-left relative" xs={24} lg={4}></Col>
            <Col className="middle" xs={24} lg={16}>
              <Row justify={"center"} className="w-full h-full text-center">
                {SQUARE_CLASSES.map((cls, i) => {
                  const item = news?.[i];
                  return (
                    <Col
                      key={item?.id || cls}
                      className={`p-3 ${cls}${item ? "" : " news-card-empty"}`}
                      span={12}
                      style={
                        item?.cover_url
                          ? {
                              backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) 100%), url("${item.cover_url}")`,
                            }
                          : undefined
                      }
                    >
                      {item && <NewsSquare item={item} lang={lang} />}
                    </Col>
                  );
                })}
              </Row>
            </Col>
            <Col className="terrain-right p-3 " xs={24} lg={4}></Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default NewsComponent;
