// Client-side image resize + compression, no external dependency.
// Downscales large photos and re-encodes them (WebP when supported, else JPEG)
// before upload, so we never ship multi-MB originals to Storage. This keeps
// gallery pages fast: smaller files = faster upload and faster load.

const DEFAULTS = {
  maxDimension: 1600, // longest edge, in px
  quality: 0.82, // 0..1
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

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// Returns a compressed File. Falls back to the original file on any failure
// (e.g. unsupported format like SVG/GIF, or a decode error).
export const compressImage = async (file, options = {}) => {
  const { maxDimension, quality } = { ...DEFAULTS, ...options };

  // Only try to compress raster bitmaps; leave anything else untouched.
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  try {
    const img = await loadImage(file);
    const { width, height } = img;
    const scale = Math.min(1, maxDimension / Math.max(width, height));

    // If it's already small enough and not huge on disk, keep the original.
    if (scale === 1 && file.size < 600 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Prefer WebP; fall back to JPEG if the browser can't encode WebP.
    let type = "image/webp";
    let blob = await canvasToBlob(canvas, type, quality);
    if (!blob) {
      type = "image/jpeg";
      blob = await canvasToBlob(canvas, type, quality);
    }
    if (!blob) return file;

    // If compression didn't actually help, keep the smaller original.
    if (blob.size >= file.size) return file;

    const ext = type === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type });
  } catch {
    return file;
  }
};
