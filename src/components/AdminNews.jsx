import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminCardTitle from "./AdminCardTitle";
import EmailAudiencePicker from "./EmailAudiencePicker";
import EmailListModal from "./EmailListModal";
import { useCollapsedSection } from "../hooks/useCollapsedSection";
import {
  getAllNews,
  addNews,
  updateNews,
  deleteNews,
  uploadNewsFile,
} from "../services/news";
import {
  describeEmailResult,
  emailTargetFor,
  getNewsletterSubscribers,
  sendAnnouncementEmail,
} from "../services/newsletter";
import { formatNewsDate, isEmptyHtml, newsHref } from "../lib/news";

// The editor (TipTap) is large and admin-only: load it on demand so public
// pages don't ship it.
const RichTextEditor = lazy(() => import("./RichTextEditor"));

// ISO timestamp ↔ <input type="datetime-local"> value (local time).
const toLocalInput = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const emptyNewsForm = () => ({
  title_en: "",
  title_mk: "",
  content_en: "",
  content_mk: "",
  cover_url: "",
  external_url: "",
  published: true,
  published_at: toLocalInput(),
});

// Admin panel section: write, edit and delete news articles.
export default function AdminNews() {
  const section = useCollapsedSection("news");
  const [news, setNews] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyNewsForm);
  const [lang, setLang] = useState("en"); // editor tab
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [emailTarget, setEmailTarget] = useState(() => emailTargetFor(true));
  const [emailResult, setEmailResult] = useState(null); // { error, text }
  const [subscribers, setSubscribers] = useState([]);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const formRef = useRef(null);

  const loadNews = async () => {
    try {
      setNews(await getAllNews());
      setLoadError("");
    } catch (err) {
      setLoadError(
        err.message?.includes("news")
          ? "The news table doesn't exist yet — run supabase/news_setup.sql in the Supabase SQL editor."
          : err.message || "Failed to load news.",
      );
    }
  };

  useEffect(() => {
    loadNews();
    getNewsletterSubscribers()
      .then(setSubscribers)
      .catch(() => setSubscribers([])); // newsletter_setup.sql not run yet
  }, []);

  const setField = (key) => (e) =>
    setForm((prev) => ({
      ...prev,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyNewsForm());
    setFormError("");
    setLang("en");
    setEmailTarget(emailTargetFor(true));
  };

  const openNew = () => {
    closeForm();
    setShowForm(true);
    if (section.collapsed) section.toggle();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title_en: item.title_en || "",
      title_mk: item.title_mk || "",
      content_en: item.content_en || "",
      content_mk: item.content_mk || "",
      cover_url: item.cover_url || "",
      external_url: item.external_url || "",
      published: item.published !== false,
      published_at: toLocalInput(item.published_at),
    });
    setFormError("");
    setLang("en");
    setEmailTarget(emailTargetFor(false));
    setShowForm(true);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const handleCoverFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverUploading(true);
    setFormError("");
    try {
      const url = await uploadNewsFile(file, "covers");
      setForm((prev) => ({ ...prev, cover_url: url }));
    } catch (err) {
      setFormError(err.message || "Cover upload failed.");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title_en.trim()) {
      setFormError("The English title is required.");
      return;
    }
    if (!form.external_url.trim() && isEmptyHtml(form.content_en)) {
      setFormError(
        "Write the article in the English tab, or set an outside link.",
      );
      return;
    }

    const fields = {
      title_en: form.title_en.trim(),
      title_mk: form.title_mk.trim() || null,
      content_en: isEmptyHtml(form.content_en) ? null : form.content_en,
      content_mk: isEmptyHtml(form.content_mk) ? null : form.content_mk,
      cover_url: form.cover_url.trim() || null,
      external_url: form.external_url.trim() || null,
      published: form.published,
      published_at: new Date(form.published_at || Date.now()).toISOString(),
    };

    const sendEmail = fields.published && emailTarget.audience !== "none";
    if (
      sendEmail &&
      emailTarget.audience === "manual" &&
      !emailTarget.userIds.length
    ) {
      setFormError(
        "Choose at least one user to email, or don't send an email.",
      );
      return;
    }

    setSaving(true);
    setFormError("");
    setEmailResult(null);
    let saved;
    try {
      saved = editingId
        ? await updateNews(editingId, fields)
        : await addNews(fields);
    } catch (err) {
      setFormError(err.message || "Failed to save the news.");
      setSaving(false);
      return;
    }

    // The news is saved either way; an email failure is reported separately.
    if (sendEmail) {
      try {
        const result = await sendAnnouncementEmail({
          kind: "news",
          id: saved.id,
          audience: emailTarget.audience,
          userIds: emailTarget.userIds,
        });
        setEmailResult({ error: false, text: describeEmailResult(result) });
      } catch (err) {
        setEmailResult({
          error: true,
          text: `The news was saved, but the email wasn't sent: ${err.message}`,
        });
      }
    }

    closeForm();
    await loadNews();
    setSaving(false);
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Delete "${item.title_en}"? This removes it from the website and cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      setActionId(item.id);
      await deleteNews(item.id);
      if (editingId === item.id) closeForm();
      await loadNews();
    } catch (err) {
      alert(err.message || "Failed to delete the news.");
    } finally {
      setActionId(null);
    }
  };

  const publishedCount = news.filter((n) => n.published).length;

  return (
    <div
      className={`admin-card admin-news-card${section.collapsed ? " is-collapsed" : ""}`}
    >
      <div className="admin-card-header">
        <AdminCardTitle
          title="News"
          description="Write news articles with images, files and formatting. The 4 newest published news fill the court on the News page; all of them are listed on All News."
          collapsed={section.collapsed}
          onToggle={section.toggle}
        />
        <div className="admin-clubs-header-actions">
          <div className="admin-count-pill">
            {publishedCount} Published
            {news.length > publishedCount
              ? ` · ${news.length - publishedCount} Draft`
              : ""}
          </div>
          <button
            type="button"
            className="admin-btn admin-edit-btn admin-add-club-btn"
            onClick={() => setShowSubscribers(true)}
            disabled={!subscribers.length}
            title="Newsletter subscribers from the website footer"
          >
            {subscribers.length} Subscribers
          </button>
          <button
            type="button"
            className="admin-btn approve admin-add-club-btn"
            onClick={() => (showForm ? closeForm() : openNew())}
          >
            {showForm ? "Close" : "+ Add News"}
          </button>
        </div>
      </div>

      <div className="admin-card-collapse">
        <div className="admin-card-collapse-inner">
          {showForm && (
            <form
              ref={formRef}
              className="admin-club-form admin-news-form"
              onSubmit={handleSubmit}
            >
              {editingId && (
                <p className="admin-edit-note">
                  Editing “{form.title_en || "news"}”
                </p>
              )}

              <div className="admin-club-form-grid">
                <label className="admin-field">
                  <span>Title (English) *</span>
                  <input
                    value={form.title_en}
                    onChange={setField("title_en")}
                    placeholder="News headline"
                  />
                </label>
                <label className="admin-field">
                  <span>Title (Macedonian)</span>
                  <input
                    value={form.title_mk}
                    onChange={setField("title_mk")}
                    placeholder="Наслов на веста"
                  />
                </label>
                <label className="admin-field">
                  <span>Publish date</span>
                  <input
                    type="datetime-local"
                    value={form.published_at}
                    onChange={setField("published_at")}
                  />
                  <span className="admin-field-hint">
                    Newest dates are shown first.
                  </span>
                </label>
                <label className="admin-field">
                  <span>Outside link (optional)</span>
                  <input
                    value={form.external_url}
                    onChange={setField("external_url")}
                    placeholder="https://… or /schedule-2026"
                  />
                  <span className="admin-field-hint">
                    If set, the news opens this link instead of the article.
                  </span>
                </label>
              </div>

              <div className="admin-club-logo-row">
                <label className="admin-field admin-club-file-field">
                  <span>Cover image (court square & card)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFile}
                    disabled={coverUploading}
                  />
                </label>
                <label className="admin-field admin-club-file-field">
                  <span>…or cover image URL</span>
                  <input
                    value={form.cover_url}
                    onChange={setField("cover_url")}
                    placeholder="https://… or /images/…"
                  />
                </label>
                <div className="admin-news-cover-preview">
                  {coverUploading ? (
                    <span>Uploading…</span>
                  ) : form.cover_url ? (
                    <img src={form.cover_url} alt="" />
                  ) : (
                    <span>No cover</span>
                  )}
                </div>
              </div>

              <div className="admin-news-editor-head">
                <div className="admin-news-tabs" role="tablist">
                  {[
                    ["en", "English"],
                    ["mk", "Македонски"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={lang === key}
                      className={`admin-news-tab${lang === key ? " active" : ""}`}
                      onClick={() => setLang(key)}
                    >
                      {label}
                      {!isEmptyHtml(form[`content_${key}`]) && (
                        <span
                          className="admin-news-tab-dot"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <span className="admin-field-hint">
                  {lang === "mk"
                    ? "Optional — if left empty, Macedonian readers see the English article."
                    : "The article readers see when they open the news."}
                </span>
              </div>

              {/* Both editors stay mounted so each keeps its own undo history. */}
              <Suspense
                fallback={
                  <div className="admin-empty-state">Loading editor…</div>
                }
              >
                {["en", "mk"].map((key) => (
                  <div key={key} hidden={lang !== key}>
                    <RichTextEditor
                      value={form[`content_${key}`]}
                      onChange={(html) =>
                        setForm((prev) => ({
                          ...prev,
                          [`content_${key}`]: html,
                        }))
                      }
                      onUpload={(file, folder) => uploadNewsFile(file, folder)}
                      placeholder={
                        key === "mk"
                          ? "Напишете ја веста…"
                          : "Start writing the news…"
                      }
                    />
                  </div>
                ))}
              </Suspense>

              <label className="admin-checkbox admin-news-publish">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={setField("published")}
                />
                <span>
                  Published (uncheck to keep it as a draft only admins see)
                </span>
              </label>

              <EmailAudiencePicker
                value={emailTarget}
                onChange={setEmailTarget}
                note={
                  form.published
                    ? editingId
                      ? "Choose an audience only if you want to email this news again."
                      : "Sent automatically when you publish."
                    : "Drafts aren't emailed — choose who gets it when you publish."
                }
              />

              {formError && <p className="admin-club-error">{formError}</p>}

              <div className="admin-actions">
                <button
                  type="submit"
                  className="admin-btn approve"
                  disabled={saving || coverUploading}
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : form.published && emailTarget.audience !== "none"
                        ? "Publish & send email"
                        : "Publish news"}
                </button>
                <button
                  type="button"
                  className="admin-btn decline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {emailResult && (
            <p
              className={`admin-email-result${emailResult.error ? " error" : ""}`}
              role="status"
            >
              {emailResult.text}
            </p>
          )}

          <div className="admin-tournaments-list">
            {loadError ? (
              <div className="admin-empty-state">{loadError}</div>
            ) : news.length === 0 ? (
              <div className="admin-empty-state">
                No news yet. Add the first one.
              </div>
            ) : (
              news.map((item) => {
                const href = newsHref(item);
                return (
                  <div
                    key={item.id}
                    className="admin-tournament-item admin-news-item"
                  >
                    <div
                      className="admin-news-thumb"
                      style={
                        item.cover_url
                          ? { backgroundImage: `url("${item.cover_url}")` }
                          : undefined
                      }
                    />
                    <div className="admin-tournament-info">
                      <h3>
                        {item.title_en}
                        <span
                          className={`admin-tournament-status ${
                            item.published
                              ? "admin-tournament-status-active"
                              : "admin-tournament-status-postponed"
                          }`}
                        >
                          {item.published ? "Published" : "Draft"}
                        </span>
                        {item.external_url && (
                          <span className="admin-tournament-status admin-news-status-link">
                            Link
                          </span>
                        )}
                      </h3>
                      <p className="admin-tournament-sub">
                        {formatNewsDate(item.published_at, "en")}
                      </p>
                    </div>
                    <div className="admin-tournament-actions">
                      {href.external ? (
                        <a
                          className="admin-btn admin-edit-btn"
                          href={href.to}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        <Link
                          className="admin-btn admin-edit-btn"
                          to={href.to}
                          target="_blank"
                        >
                          View
                        </Link>
                      )}
                      <button
                        type="button"
                        className="admin-btn admin-edit-btn"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn decline admin-club-delete"
                        disabled={actionId === item.id}
                        onClick={() => handleDelete(item)}
                      >
                        {actionId === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showSubscribers && (
        <EmailListModal
          title="Newsletter subscribers"
          subtitle="Everyone who subscribed in the website footer (unsubscribed addresses excluded)."
          emails={subscribers.map((x) => x.email)}
          filename={`newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.xlsx`}
          onClose={() => setShowSubscribers(false)}
        />
      )}
    </div>
  );
}
