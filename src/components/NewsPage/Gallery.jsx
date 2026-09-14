import "../../styles/Gallery.css";
import { useEffect, useState } from "react";
import { Row, Col, Carousel, Modal, Input, Button, message } from "antd";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getGalleries, createGallery, thumbUrl } from "../../services/galleries";
import { useIsAdmin } from "../../hooks/useIsAdmin";

// Grid placement for the 5 dynamic tiles, in display_order. Training (the first
// tile) stays a static link to the written article page and is not in the DB.
const SLOT_CLASSES = [
  "col-span-2 row-span-2",
  "col-span-2 row-span-2 col-start-2 row-start-3",
  "row-span-3 col-start-4 row-start-1",
  "row-span-3 col-start-4 row-start-4",
  "col-span-3 row-span-2 row-start-5",
];

const Gallery = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const lang = i18n.language?.startsWith("mk") ? "mk" : "en";
  const [galleries, setGalleries] = useState([]);

  const [creating, setCreating] = useState(false); // modal open
  const [newEn, setNewEn] = useState("");
  const [newMk, setNewMk] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGalleries()
      .then(setGalleries)
      .catch(() => setGalleries([]));
  }, []);

  const handleCreate = async () => {
    if (!newEn.trim() || !newMk.trim()) {
      message.warning(t("galleryDetail.titleRequired"));
      return;
    }
    setSaving(true);
    try {
      const g = await createGallery({
        title_en: newEn.trim(),
        title_mk: newMk.trim(),
      });
      message.success(t("galleryDetail.created"));
      navigate(`/gallery/${g.slug}`);
    } catch (e) {
      message.error(e.message || t("galleryDetail.error"));
    } finally {
      setSaving(false);
    }
  };

  const titleOf = (g) => (lang === "mk" ? g.title_mk : g.title_en) || g.title_en;
  const coverStyle = (g) =>
    g.cover_url
      ? {
          backgroundImage: `linear-gradient(349deg, rgba(255,255,255,0.3) 70.88%, rgba(0,0,0,0.3) 87.54%), url("${thumbUrl(
            g.cover_url,
            900
          )}")`,
        }
      : undefined;

  return (
    <div className="gallery-container py-5">
      <Row justify={"center"} className="mb-4">
        <Col span={20}>
          <div className="gallery-head">
            <h2 className="text-white gallery-h1" id="gallery">
              {t("news.galleryTitle")}
            </h2>
            {isAdmin && (
              <Button type="primary" onClick={() => setCreating(true)}>
                + {t("galleryDetail.newGallery")}
              </Button>
            )}
          </div>
        </Col>
      </Row>

      <Row className="desktop-version mb-5" justify={"center"}>
        <Col span={20} className="text-white">
          <div className="grid grid-cols-4 grid-rows-6 gap-4">
            {/* Training keeps its written-article page. */}
            <NavLink to="/news/training" className="row-span-4 gallery-training">
              <h1 className="gallery-title">{t("galleryComponent.title1")}</h1>
            </NavLink>

            {galleries.map((g, i) => (
              <NavLink
                key={g.id}
                to={`/gallery/${g.slug}`}
                className={`gallery-tile ${SLOT_CLASSES[i] || "col-span-2 row-span-2"}`}
                style={coverStyle(g)}
              >
                <h1 className="gallery-title">{titleOf(g)}</h1>
              </NavLink>
            ))}
          </div>
        </Col>
      </Row>

      <Row className="mobile-version hidden" justify="center">
        <Col span={20}>
          <Carousel autoplay arrows infinite={true}>
            <NavLink to="/news/training" className="gallery-carousel training">
              <div className="carousel-card">
                <h2 className="gallery-carousel-title">
                  {t("galleryComponent.title1")}
                </h2>
              </div>
            </NavLink>

            {galleries.map((g) => (
              <NavLink
                to={`/gallery/${g.slug}`}
                key={g.id}
                className="gallery-carousel"
                style={coverStyle(g)}
              >
                <div className="carousel-card">
                  <h2 className="gallery-carousel-title">{titleOf(g)}</h2>
                </div>
              </NavLink>
            ))}
          </Carousel>
        </Col>
      </Row>

      <br />

      <Modal
        open={creating}
        title={t("galleryDetail.newGallery")}
        onCancel={() => setCreating(false)}
        onOk={handleCreate}
        okText={t("galleryDetail.create")}
        cancelText={t("galleryDetail.cancel")}
        confirmLoading={saving}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>EN</span>
            <Input
              value={newEn}
              onChange={(e) => setNewEn(e.target.value)}
              placeholder="Title (English)"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>MK</span>
            <Input
              value={newMk}
              onChange={(e) => setNewMk(e.target.value)}
              placeholder="Наслов (Македонски)"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default Gallery;
