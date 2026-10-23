import DOMPurify from "dompurify";

// Helpers shared by the public news pages and the admin News section.

// Only YouTube embeds are allowed through as iframes.
const ALLOWED_IFRAME_SRC =
  /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//;

DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName === "iframe") {
    const src = node.getAttribute("src") || "";
    if (!ALLOWED_IFRAME_SRC.test(src)) node.parentNode?.removeChild(node);
  }
});

// Links in articles open in a new tab safely.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("href")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

// Article HTML comes from the admin editor; sanitize anyway before rendering.
export const sanitizeNewsHtml = (html) =>
  DOMPurify.sanitize(html || "", {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "target",
      "allow",
      "allowfullscreen",
      "frameborder",
      "data-align",
      "data-youtube-video",
      "colspan",
      "rowspan",
      "colwidth",
    ],
  });

// The editor's empty document.
export const isEmptyHtml = (html) =>
  !html || html.replace(/<p><\/p>/g, "").trim() === "";

export const newsLang = (i18n) =>
  i18n.language?.startsWith("mk") ? "mk" : "en";

export const newsTitle = (item, lang) =>
  (lang === "mk" && item.title_mk) || item.title_en;

export const newsContent = (item, lang) =>
  (lang === "mk" && !isEmptyHtml(item.content_mk) && item.content_mk) ||
  item.content_en ||
  "";

// Plain-text excerpt of the article body for cards.
export const newsExcerpt = (item, lang, max = 160) => {
  const html = newsContent(item, lang);
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = sanitizeNewsHtml(html);
  const text = (div.textContent || "").replace(/\s+/g, " ").trim();
  return text.length > max
    ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…`
    : text;
};

// Where a news card leads: an internal page, an outside link, or the article.
export const newsHref = (item) => {
  const url = item.external_url?.trim();
  if (!url) return { to: `/all-news/${item.slug}`, external: false };
  if (url.startsWith("/")) return { to: url, external: false };
  return { to: url, external: true };
};

export const formatNewsDate = (iso, lang) =>
  iso
    ? new Date(iso).toLocaleDateString(lang === "mk" ? "mk-MK" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
