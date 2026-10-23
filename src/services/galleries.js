import { supabase } from "../lib/supabaseClient";
import { uploadPublicFile } from "../lib/storageUpload";

const GALLERY_BUCKET = "gallery-photos";

// ----------------------------------------------------------------- READS -----

// Public — used by the News page gallery grid.
export const getGalleries = async () => {
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getGalleryBySlug = async (slug) => {
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
};

export const getGalleryImages = async (galleryId) => {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("gallery_id", galleryId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
};

// ------------------------------------------------------------ GALLERY CRUD ---

const slugify = (text) =>
  (text || "gallery")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "gallery";

export const createGallery = async ({ title_en, title_mk }) => {
  // Slug from the English title, plus a short suffix to guarantee uniqueness.
  const slug = `${slugify(title_en)}-${crypto.randomUUID().slice(0, 6)}`;

  // Put the new gallery at the end.
  const { data: last } = await supabase
    .from("galleries")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.display_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("galleries")
    .insert([{ slug, title_en, title_mk, display_order: nextOrder }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Deletes a gallery, its image rows (DB cascade) and the stored files.
export const deleteGallery = async (gallery) => {
  const images = await getGalleryImages(gallery.id);

  const { error } = await supabase
    .from("galleries")
    .delete()
    .eq("id", gallery.id);

  if (error) throw error;

  // Best-effort storage cleanup (photos + cover).
  await Promise.all(
    [...images.map((i) => i.image_url), gallery.cover_url].map((url) =>
      removeStorageObject(url).catch(() => {})
    )
  );
};

export const updateGallery = async (id, fields) => {
  const { data, error } = await supabase
    .from("galleries")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// -------------------------------------------------------------- STORAGE -----

// Every photo also gets a small thumbnail at thumbs/<same path>, used by the
// grids and tiles so they don't download the full photo (see thumbUrl).
const THUMB_PREFIX = "thumbs/";

// Compress in the browser, then upload the photo and its thumbnail to
// Storage. Returns { publicUrl, path }.
export const uploadGalleryPhoto = async (file, slug = "misc") => {
  const photo = await uploadPublicFile(GALLERY_BUCKET, slug, file, {
    preset: "photo",
  });
  await uploadPublicFile(GALLERY_BUCKET, slug, file, {
    preset: "thumb",
    path: `${THUMB_PREFIX}${photo.path}`,
  }).catch(() => {}); // thumbUrl's <img> fallback covers a missing thumb
  return photo;
};

// Delete the underlying storage object for a public URL in our bucket.
// Silently ignores files that live outside the bucket (e.g. seeded /images/...).
const removeStorageObject = async (publicUrl) => {
  if (!publicUrl) return;
  const marker = `/object/public/${GALLERY_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  await supabase.storage
    .from(GALLERY_BUCKET)
    .remove([path, `${THUMB_PREFIX}${path}`]);
};

// -------------------------------------------------------------- IMAGE CRUD ---

// Adds a photo row for an already-uploaded URL.
export const addGalleryImage = async (galleryId, imageUrl, displayOrder = 0) => {
  const { data, error } = await supabase
    .from("gallery_images")
    .insert([{ gallery_id: galleryId, image_url: imageUrl, display_order: displayOrder }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateGalleryImage = async (id, fields) => {
  const { data, error } = await supabase
    .from("gallery_images")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteGalleryImage = async (image) => {
  const { error } = await supabase
    .from("gallery_images")
    .delete()
    .eq("id", image.id);

  if (error) throw error;
  // Best-effort cleanup of the stored file.
  await removeStorageObject(image.image_url).catch(() => {});
};

// Delete several images at once. `images` are full rows (need id + image_url).
export const deleteGalleryImages = async (images) => {
  if (!images?.length) return;
  const ids = images.map((i) => i.id);

  const { error } = await supabase
    .from("gallery_images")
    .delete()
    .in("id", ids);

  if (error) throw error;
  await Promise.all(
    images.map((i) => removeStorageObject(i.image_url).catch(() => {}))
  );
};

// ---------------------------------------------------------------- THUMBS -----

// Thumbnail URL for grid/tile display: the ~800px copy stored next to each
// photo at thumbs/<path> (Supabase's on-the-fly image resizing is a paid
// feature). URLs outside the bucket (e.g. seeded /images/...) are returned as-is.
export const thumbUrl = (url) => {
  if (!url) return url;
  const marker = `/object/public/${GALLERY_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1 || url.includes(`${marker}${THUMB_PREFIX}`)) return url;
  const at = idx + marker.length;
  return `${url.slice(0, at)}${THUMB_PREFIX}${url.slice(at)}`;
};

// Resolves to the thumbnail if it exists, else the original URL. For CSS
// backgrounds, which (unlike <img onError>) can't fall back on their own.
export const loadThumbOrOriginal = (url) =>
  new Promise((resolve) => {
    const thumb = thumbUrl(url);
    if (!thumb || thumb === url) return resolve(url);
    const img = new Image();
    img.onload = () => resolve(thumb);
    img.onerror = () => resolve(url);
    img.src = thumb;
  });
