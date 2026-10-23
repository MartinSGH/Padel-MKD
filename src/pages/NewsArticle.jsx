import { useEffect, useState } from "react";
import { Row, Col, Spin } from "antd";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getNewsBySlug } from "../services/news";
import { useIsAdmin } from "../hooks/useIsAdmin";
import {
  formatNewsDate,
  newsContent,
  newsHref,
  newsLang,
  newsTitle,
  sanitizeNewsHtml,
} from "../lib/news";
import "../styles/AllNews.css";
import "../styles/NewsProse.css";

const NewsArticle = () => {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const lang = newsLang(i18n);
  const { isAdmin } = useIsAdmin();
  const [item, setItem] = useState(undefined); // undefined loading, null missing

  useEffect(() => {
    setItem(undefined);
    getNewsBySlug(slug)
      .then(setItem)
      .catch(() => setItem(null));
  }, [slug]);

  if (item === undefined) {
    return (
      <div className="an-page an-status">
        <Spin size="large" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="an-page an-status">
        <p>{t("news.notFound")}</p>
        <Link to="/all-news" className="gd-back">
          ← {t("news.backToAllNews")}
        </Link>
      </div>
    );
  }

  const html = newsContent(item, lang);
  const href = newsHref(item);

  return (
    <article className="an-page na-page">
      <div
        className="na-hero"
        style={
          item.cover_url
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(8,23,56,0.35) 0%, rgba(8,23,56,0.92) 100%), url("${item.cover_url}")`,
              }
            : undefined
        }
      >
        <Row justify="center">
          <Col span={20} className="na-hero-inner">
            <Link to="/all-news" className="gd-back">
              ← {t("news.backToAllNews")}
            </Link>
            <span className="an-card-date">
              {formatNewsDate(item.published_at, lang)}
              {!item.published && ` · ${t("news.draft")}`}
            </span>
            <h1 className="na-title">{newsTitle(item, lang)}</h1>
            {isAdmin && (
              <Link to="/admin" className="na-admin-link">
                {t("news.editInAdmin")}
              </Link>
            )}
          </Col>
        </Row>
      </div>

      <Row justify="center">
        <Col xs={22} lg={16} xl={14}>
          {html && (
            <div
              className="na-paper news-prose"
              dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(html) }}
            />
          )}
          {item.external_url && (
            <div className="na-external">
              {href.external ? (
                <a href={href.to} target="_blank" rel="noopener noreferrer">
                  {t("news.openLink")} ↗
                </a>
              ) : (
                <Link to={href.to}>{t("news.openLink")} →</Link>
              )}
            </div>
          )}
        </Col>
      </Row>
    </article>
  );
};

export default NewsArticle;
