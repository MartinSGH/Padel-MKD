// Client-side image resize + compression, no external dependency.
// Downscales large photos and re-encodes them (WebP when supported, else JPEG)
// before upload, so we never ship multi-MB originals to Storage. This keeps
// pages fast and Supabase egress low: smaller files = faster upload and load.

const DEFAULTS = {
  maxDimension: 1600, // longest edge, in px
  quality: 0.8, // 0..1
  // Logos etc.: when WebP isn't available fall back to PNG (keeps
  // transparency) instead of JPEG.
  keepAlpha: false,
  // Always re-encode, even when the original is already small (thumbnails).
  force: false,
};

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });

// Draws the image at the target size and encodes it. Resolves null when the
// browser can't produce `type`. Safari can't encode WebP and silently returns
// a PNG instead of null — that's how multi-MB PNGs ended up saved as ".webp" —
// so the blob's real type is checked.
const encode = (img, width, height, type, quality) =>
  new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (type === "image/jpeg") {
      // JPEG has no transparency: paint white instead of black.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => resolve(blob && blob.type === type ? blob : null),
      type,
      quality
    );
  });

const EXT = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

// Returns a compressed File. Falls back to the original file on any failure
// (e.g. unsupported format like SVG/GIF, or a decode error).
export const compressImage = async (file, options = {}) => {
  const { maxDimension, quality, keepAlpha, force } = {
    ...DEFAULTS,
    ...options,
  };

  // Only try to compress raster bitmaps; leave anything else untouched.
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  try {
    const img = await loadImage(file);
    const scale = Math.min(
      1,
      maxDimension / Math.max(img.naturalWidth, img.naturalHeight)
    );

    // HEIC (iPhone) only displays in Safari: always convert it.
    const convert = force || /^image\/hei[cf]$/i.test(file.type);

    // If it's already small enough and light on disk, keep the original.
    if (!convert && scale === 1 && file.size < 300 * 1024) return file;

    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    let type = "image/webp";
    let blob = await encode(img, width, height, type, quality);
    if (!blob) {
      type = keepAlpha ? "image/png" : "image/jpeg";
      blob = await encode(img, width, height, type, quality);
    }
    if (!blob) return file;

    // If compression didn't actually help, keep the smaller original.
    if (!convert && blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${EXT[type]}`, { type });
  } catch {
    return file;
  }
};

// Upload presets, so every bucket compresses the same way.
export const IMAGE_PRESETS = {
  photo: { maxDimension: 1600, quality: 0.8 }, // gallery, covers, news
  thumb: { maxDimension: 800, quality: 0.72, force: true }, // grid tiles
  avatar: { maxDimension: 512, quality: 0.8 },
  logo: { maxDimension: 512, quality: 0.85, keepAlpha: true },
};
