import "../styles/GalleryDetail.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Row, Col, Button, Input, Modal, message, Spin, Popconfirm } from "antd";
import { useTranslation } from "react-i18next";
import { useIsAdmin } from "../hooks/useIsAdmin";
import {
  getGalleryBySlug,
  getGalleryImages,
  updateGallery,
  addGalleryImage,
  deleteGalleryImage,
  deleteGalleryImages,
  deleteGallery,
  uploadGalleryPhoto,
  thumbUrl,
} from "../services/galleries";

const GalleryDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("mk") ? "mk" : "en";
  const { isAdmin } = useIsAdmin();

  const [gallery, setGallery] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [titleEn, setTitleEn] = useState("");
  const [titleMk, setTitleMk] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // {done,total}

  const [lightbox, setLightbox] = useState(null); // index or null
  const [selected, setSelected] = useState(() => new Set()); // selected image ids
  const [deletingBulk, setDeletingBulk] = useState(false);

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    getGalleryBySlug(slug)
      .then(async (g) => {
        setGallery(g);
        setTitleEn(g.title_en || "");
        setTitleMk(g.title_mk || "");
        const imgs = await getGalleryImages(g.id);
        setImages(imgs);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const titleOf = (g) => (lang === "mk" ? g?.title_mk : g?.title_en) || g?.title_en;

  // ---------------------------------------------------------------- rename ---
  const handleSaveTitle = async () => {
    if (!titleEn.trim() || !titleMk.trim()) {
      message.warning(t("galleryDetail.titleRequired"));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateGallery(gallery.id, {
        title_en: titleEn.trim(),
        title_mk: titleMk.trim(),
      });
      setGallery(updated);
      message.success(t("galleryDetail.saved"));
    } catch (e) {
      message.error(e.message || t("galleryDetail.error"));
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------ add images ---
  const handleAddFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    let order = images.length;
    const added = [];
    try {
      for (const file of files) {
        const { publicUrl } = await uploadGalleryPhoto(file, gallery.slug);
        const row = await addGalleryImage(gallery.id, publicUrl, order++);
        added.push(row);
        setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setImages((prev) => [...prev, ...added]);
      message.success(t("galleryDetail.uploaded", { count: added.length }));
    } catch (e) {
      message.error(e.message || t("galleryDetail.error"));
      if (added.length) setImages((prev) => [...prev, ...added]);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ---------------------------------------------------------- delete image ---
  const handleDeleteImage = async (img) => {
    try {
      await deleteGalleryImage(img);
      setImages((prev) => prev.filter((x) => x.id !== img.id));
      message.success(t("galleryDetail.deleted"));
    } catch (e) {
      message.error(e.message || t("galleryDetail.error"));
    }
  };

  // ------------------------------------------------------- multi-selection ---
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(images.map((i) => i.id)));
  const clearSelection = () => setSelected(new Set());

  const handleDeleteSelected = async () => {
    const toDelete = images.filter((i) => selected.has(i.id));
    if (!toDelete.length) return;
    setDeletingBulk(true);
    try {
      await deleteGalleryImages(toDelete);
      setImages((prev) => prev.filter((i) => !selected.has(i.id)));
      clearSelection();
      message.success(t("galleryDetail.deletedMany", { count: toDelete.length }));
    } catch (e) {
      message.error(e.message || t("galleryDetail.error"));
    } finally {
      setDeletingBulk(false);
    }
  };

  // -------------------------------------------------------- delete gallery ---
  const handleDeleteGallery = async () => {
    try {
      await deleteGallery(gallery);
      message.success(t("galleryDetail.galleryDeleted"));
      navigate("/news#gallery");
    } catch (e) {
      message.error(e.message || t("galleryDetail.error"));
    }
  };

  // ------------------------------------------------------------- set cover ---
  const handleSetCover = async (fileList) => {
    const file = Array.from(fileList || [])[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { publicUrl } = await uploadGalleryPhoto(file, gallery.slug);
      const updated = await updateGallery(gallery.id, { cover_url: publicUrl });
      setGallery(updated);
      message.success(t("galleryDetail.coverUpdated"));
    } catch (e) {
      message.error(e.message || t("galleryDetail.error"));
    } finally {
      setUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleSetImageAsCover = async (img) => {
    try {
      const updated = await updateGallery(gallery.id, { cover_url: img.image_url });
      setGallery(updated);
      message.success(t("galleryDetail.coverUpdated"));
    } catch (e) {
      message.error(e.message || t("galleryDetail.error"));
    }
  };

  // ------------------------------------------------------------- lightbox ----
  const showPrev = useCallback(
    () => setLightbox((i) => (i > 0 ? i - 1 : images.length - 1)),
    [images.length]
  );
  const showNext = useCallback(
    () => setLightbox((i) => (i < images.length - 1 ? i + 1 : 0)),
    [images.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, showPrev, showNext]);

  // ------------------------------------------------------------- rendering ---
  if (loading) {
    return (
      <div className="gd-page gd-center">
        <Spin size="large" />
      </div>
    );
  }

  if (notFound || !gallery) {
    return (
      <div className="gd-page gd-center">
        <p className="gd-status">{t("galleryDetail.notFound")}</p>
        <Link to="/news#gallery" className="gd-back">
          ← {t("galleryDetail.backToGallery")}
        </Link>
      </div>
    );
  }

  return (
    <div className="gd-page">
      <section className="gd-hero">
        <Row justify="center">
          <Col span={20}>
            <Link to="/news#gallery" className="gd-back">
              ← {t("galleryDetail.backToGallery")}
            </Link>
            <div className="gd-hero-row">
              <h1 className="gd-title">{titleOf(gallery)}</h1>
              {isAdmin && (
                <Button
                  type={editing ? "primary" : "default"}
                  onClick={() => {
                    setEditing((v) => !v);
                    clearSelection();
                  }}
                >
                  {editing ? t("galleryDetail.doneEditing") : t("galleryDetail.edit")}
                </Button>
              )}
            </div>
            <p className="gd-count">
              {images.length} {t("galleryDetail.photos")}
            </p>
          </Col>
        </Row>
      </section>

      {isAdmin && editing && (
        <section className="gd-admin">
          <Row justify="center">
            <Col span={20}>
              <div className="gd-admin-panel">
                <h3 className="gd-admin-heading">{t("galleryDetail.rename")}</h3>
                <div className="gd-rename">
                  <label>
                    <span>EN</span>
                    <Input
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      placeholder="Title (English)"
                    />
                  </label>
                  <label>
                    <span>MK</span>
                    <Input
                      value={titleMk}
                      onChange={(e) => setTitleMk(e.target.value)}
                      placeholder="Наслов (Македонски)"
                    />
                  </label>
                  <Button type="primary" loading={saving} onClick={handleSaveTitle}>
                    {t("galleryDetail.save")}
                  </Button>
                </div>

                <div className="gd-admin-actions">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploading}
                  >
                    {t("galleryDetail.addPhotos")}
                  </Button>
                  <Button onClick={() => coverInputRef.current?.click()}>
                    {t("galleryDetail.uploadCover")}
                  </Button>
                  {uploadProgress && (
                    <span className="gd-progress">
                      {uploadProgress.done}/{uploadProgress.total}
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => handleAddFiles(e.target.files)}
                />
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleSetCover(e.target.files)}
                />

                {/* Selection controls */}
                {images.length > 0 && (
                  <div className="gd-select-bar">
                    {selected.size === images.length ? (
                      <Button size="small" onClick={clearSelection}>
                        {t("galleryDetail.clearSelection")}
                      </Button>
                    ) : (
                      <Button size="small" onClick={selectAll}>
                        {t("galleryDetail.selectAll")}
                      </Button>
                    )}
                    <Popconfirm
                      title={t("galleryDetail.confirmDeleteMany", {
                        count: selected.size,
                      })}
                      okText={t("galleryDetail.delete")}
                      cancelText={t("galleryDetail.cancel")}
                      onConfirm={handleDeleteSelected}
                      disabled={selected.size === 0}
                    >
                      <Button
                        danger
                        size="small"
                        loading={deletingBulk}
                        disabled={selected.size === 0}
                      >
                        {t("galleryDetail.deleteSelected", { count: selected.size })}
                      </Button>
                    </Popconfirm>
                  </div>
                )}

                {/* Danger zone: delete the whole gallery */}
                <div className="gd-danger-zone">
                  <Popconfirm
                    title={t("galleryDetail.confirmDeleteGallery")}
                    description={t("galleryDetail.confirmDeleteGalleryDesc")}
                    okText={t("galleryDetail.deleteGallery")}
                    okButtonProps={{ danger: true }}
                    cancelText={t("galleryDetail.cancel")}
                    onConfirm={handleDeleteGallery}
                  >
                    <Button danger>{t("galleryDetail.deleteGallery")}</Button>
                  </Popconfirm>
                </div>
              </div>
            </Col>
          </Row>
        </section>
      )}

      <section className="gd-section">
        <Row justify="center">
          <Col span={20}>
            {images.length === 0 ? (
              <p className="gd-status">
                {isAdmin ? t("galleryDetail.empty") : t("galleryDetail.comingSoon")}
              </p>
            ) : (
              <div className="gd-grid">
                {images.map((img, idx) => {
                  const editMode = isAdmin && editing;
                  const isSel = selected.has(img.id);
                  return (
                    <figure
                      className={`gd-item ${isSel ? "gd-item-selected" : ""}`}
                      key={img.id}
                    >
                      <img
                        src={thumbUrl(img.image_url, 500)}
                        alt={img.caption || titleOf(gallery)}
                        loading="lazy"
                        className="gd-img"
                        onClick={() =>
                          editMode ? toggleSelect(img.id) : setLightbox(idx)
                        }
                      />
                      {editMode && (
                        <>
                          <button
                            type="button"
                            className={`gd-check ${isSel ? "gd-check-on" : ""}`}
                            title={t("galleryDetail.select")}
                            onClick={() => toggleSelect(img.id)}
                          >
                            {isSel ? "✓" : ""}
                          </button>
                          <div className="gd-item-tools">
                            <button
                              type="button"
                              className="gd-tool"
                              title={t("galleryDetail.makeCover")}
                              onClick={() => handleSetImageAsCover(img)}
                            >
                              ★
                            </button>
                            <Popconfirm
                              title={t("galleryDetail.confirmDelete")}
                              okText={t("galleryDetail.delete")}
                              cancelText={t("galleryDetail.cancel")}
                              onConfirm={() => handleDeleteImage(img)}
                            >
                              <button
                                type="button"
                                className="gd-tool gd-tool-danger"
                                title={t("galleryDetail.delete")}
                              >
                                ✕
                              </button>
                            </Popconfirm>
                          </div>
                        </>
                      )}
                    </figure>
                  );
                })}
              </div>
            )}
          </Col>
        </Row>
      </section>

      <Modal
        open={lightbox !== null}
        footer={null}
        onCancel={() => setLightbox(null)}
        centered
        width="auto"
        className="gd-lightbox"
        styles={{ body: { padding: 0 } }}
      >
        {lightbox !== null && images[lightbox] && (
          <div className="gd-lightbox-inner">
            <button className="gd-nav gd-nav-prev" onClick={showPrev} aria-label="Previous">
              ‹
            </button>
            <img
              src={images[lightbox].image_url}
              alt={images[lightbox].caption || titleOf(gallery)}
              className="gd-lightbox-img"
            />
            <button className="gd-nav gd-nav-next" onClick={showNext} aria-label="Next">
              ›
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GalleryDetail;
