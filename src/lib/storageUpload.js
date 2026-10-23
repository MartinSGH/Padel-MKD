import { supabase } from "./supabaseClient";
import { compressImage, IMAGE_PRESETS } from "./imageCompress";

// Uploads a file to a public Storage bucket under `folder/<uuid>.<ext>` and
// returns { publicUrl, path }. Images are compressed first with the named
// preset from IMAGE_PRESETS (pass `preset: null` to upload as-is); other files
// (PDFs, attachments) are uploaded untouched.
export const uploadPublicFile = async (
  bucket,
  folder,
  file,
  { preset = "photo", path } = {}
) => {
  const upload =
    preset && file.type.startsWith("image/")
      ? await compressImage(file, IMAGE_PRESETS[preset])
      : file;
  // iPhone HEIC photos only display in Safari. Safari converts them while
  // compressing; other browsers can't, so refuse rather than store them.
  if (/^image\/hei[cf]$/i.test(upload.type) || /\.hei[cf]$/i.test(upload.name)) {
    throw new Error(
      `"${file.name}" is a HEIC photo, which most browsers can't show. Upload it from Safari, or convert it to JPG first.`
    );
  }
  const ext = (upload.name.split(".").pop() || "bin").toLowerCase();
  const filePath = path || `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, upload, {
    // Names are unique UUIDs and never overwritten, so browsers may cache
    // them for a year instead of re-downloading (each download is egress).
    cacheControl: "31536000",
    upsert: false,
    contentType: upload.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { publicUrl: data.publicUrl, path: filePath };
};
