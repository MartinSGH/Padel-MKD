import { supabase } from "../lib/supabaseClient";
import { compressImage } from "../lib/imageCompress";

const NEWS_BUCKET = "news-files";

// The news that were hard-coded on /news before the admin editor existed.
// Shown only when the `news` table can't be read (e.g. before
// supabase/news_setup.sql has been run) so the court is never empty.
export const STATIC_NEWS = [
  {
    id: "static-1",
    slug: "schedule-2026",
    title_en: "Schedule 2026",
    title_mk: "Распоред 2026",
    cover_url: "/images/NewsComponentImages/Image-1.png",
    external_url: "/schedule-2026",
    published: true,
    published_at: "2026-01-20T09:00:00Z",
  },
  {
    id: "static-2",
    slug: "premier-padel-vs-a1-padel",
    title_en: "Differences in playing style between Premier Padel and A1 Padel",
    cover_url: "/images/NewsComponentImages/Image-2.jpg",
    external_url:
      "https://padel-magazine.co.uk/differences-in-playing-style-between-premier-padel-and-a1-padel/",
    published: true,
    published_at: "2026-01-15T09:00:00Z",
  },
  {
    id: "static-3",
    slug: "messi-football-and-padel",
    title_en:
      "Lionel Messi opens up: between football and padel, the Argentinian star plays on all terrains!",
    cover_url: "/images/NewsComponentImages/Image-3.jpg",
    external_url:
      "https://padel-magazine.co.uk/Lionel-Messi-talks-about-football-and-padel.-The-Argentinian-star-plays-on-all-terrains./",
    published: true,
    published_at: "2026-01-10T09:00:00Z",
  },
  {
    id: "static-4",
    slug: "fip-inter-continental-cup",
    title_en:
      "International Padel Federation launches Ryder Cup and Laver Cup of Padel with new Inter-Continental Cup competition set for 2025 season",
    cover_url: "/images/NewsComponentImages/image-4.jpg",
    external_url:
      "https://www.padelfip.com/2024/11/international-padel-federation-launches-ryder-cup-and-laver-cup-of-padel-with-new-inter-continental-cup-competition-set-for-2025-season/",
    published: true,
    published_at: "2026-01-05T09:00:00Z",
  },
];

// ----------------------------------------------------------------- READS -----

// Public — newest first. `limit` is used by the court on /news (4 squares).
// List views don't need the article bodies, except to build a short excerpt.
export const getPublishedNews = async (limit) => {
  let query = supabase
    .from("news")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.warn("News table unavailable, showing static news:", error.message);
    return limit ? STATIC_NEWS.slice(0, limit) : STATIC_NEWS;
  }
  return data || [];
};

export const getNewsBySlug = async (slug) => {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Admin — every article, drafts included (RLS lets admins read drafts).
export const getAllNews = async () => {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------------ CRUD -----

const slugify = (text) =>
  (text || "news")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "news";

export const addNews = async (fields) => {
  // Slug from the English title, plus a short suffix to guarantee uniqueness.
  const slug = `${slugify(fields.title_en)}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase
    .from("news")
    .insert([{ ...fields, slug }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateNews = async (id, fields) => {
  const { data, error } = await supabase
    .from("news")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteNews = async (id) => {
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) throw error;
};

// -------------------------------------------------------------- STORAGE -----

// Uploads a cover / inline image (compressed) or any attachment to the
// news-files bucket. Returns the public URL.
export const uploadNewsFile = async (file, folder = "files") => {
  const upload = file.type.startsWith("image/")
    ? await compressImage(file)
    : file;
  const ext = (upload.name.split(".").pop() || "bin").toLowerCase();
  const filePath = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(NEWS_BUCKET)
    .upload(filePath, upload, {
      cacheControl: "31536000", // 1 year — files are content-addressed by UUID
      upsert: false,
      contentType: upload.type || undefined,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(NEWS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};
