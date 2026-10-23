import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Row, Col, Spin } from "antd";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublishedNews } from "../services/news";
import {
  formatNewsDate,
  newsExcerpt,
  newsHref,
  newsLang,
  newsTitle,
} from "../lib/news";
import "../styles/AllNews.css";

// One news card. Outside links open in a new tab; everything else in-app.
const NewsCard = ({ item, lang, featured }) => {
  const { t } = useTranslation();
  const href = newsHref(item);
  const excerpt = newsExcerpt(item, lang, featured ? 260 : 140);

  const body = (
    <>
      <div
        className="an-card-cover"
        style={
          item.cover_url
            ? { backgroundImage: `url("${item.cover_url}")` }
            : undefined
        }
      >
        {href.external && (
          <span className="an-card-badge">{t("news.externalBadge")}</span>
        )}
      </div>
      <div className="an-card-body">
        <span className="an-card-date">
          {formatNewsDate(item.published_at, lang)}
        </span>
        <h3 className="an-card-title">{newsTitle(item, lang)}</h3>
        {excerpt && <p className="an-card-excerpt">{excerpt}</p>}
        <span className="an-card-more">
          {href.external ? t("news.openLink") : t("news.readMore")}{" "}
          <span aria-hidden="true">{href.external ? "↗" : "→"}</span>
        </span>
      </div>
    </>
  );

  const className = `an-card${featured ? " an-card-featured" : ""}`;
  return href.external ? (
    <a
      className={className}
      href={href.to}
      target="_blank"
      rel="noopener noreferrer"
    >
      {body}
    </a>
  ) : (
    <Link className={className} to={href.to}>
      {body}
    </Link>
  );
};

NewsCard.propTypes = {
  item: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  featured: PropTypes.bool,
};

const AllNews = () => {
  const { t, i18n } = useTranslation();
  const lang = newsLang(i18n);
  const [news, setNews] = useState(null); // null while loading

  useEffect(() => {
    getPublishedNews().then(setNews);
  }, []);

  const [latest, ...rest] = news || [];

  return (
    <div className="an-page">
      <Row justify="center">
        <Col span={20}>
          <Link to="/news" className="gd-back an-back">
            ← {t("news.backToNews")}
          </Link>
          <h1 className="gallery-h1 an-title">{t("news.allNewsTitle")}</h1>

          {news === null ? (
            <div className="an-status">
              <Spin size="large" />
            </div>
          ) : news.length === 0 ? (
            <p className="an-status">{t("news.empty")}</p>
          ) : (
            <>
              <NewsCard item={latest} lang={lang} featured />
              {rest.length > 0 && (
                <div className="an-grid">
                  {rest.map((item) => (
                    <NewsCard key={item.id} item={item} lang={lang} />
                  ))}
                </div>
              )}
            </>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default AllNews;
