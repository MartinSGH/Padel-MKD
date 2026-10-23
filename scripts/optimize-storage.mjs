// One-time clean-up of oversized images in Supabase Storage.
//
// Shrinks every image the site references (gallery photos and covers,
// tournament covers, avatars, club logos, news covers) to a compressed WebP,
// creates the small gallery thumbnails the grids use (thumbs/<path>), points
// the database rows at the new files and deletes the old ones.
//
// Needs the service-role key (it bypasses RLS to update every profile).
// Add it to .env — never commit it, never put it in a VITE_ variable:
//   SUPABASE_SERVICE_ROLE_KEY=...   (Dashboard → Project Settings → API)
//
// Usage:
//   node scripts/optimize-storage.mjs           dry run: report only
//   node scripts/optimize-storage.mjs --apply   do it
//
// Safe to run again: already-small files are skipped.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

// Same sizes as src/lib/imageCompress.js IMAGE_PRESETS.
const PRESETS = {
  photo: { max: 1600, quality: 78, skipBelow: 350 * 1024 },
  thumb: { max: 800, quality: 70 },
  avatar: { max: 512, quality: 80, skipBelow: 120 * 1024 },
  logo: { max: 512, quality: 85, skipBelow: 150 * 1024 },
};

// Every database column that holds a Storage URL.
const REFS = [
  { table: "gallery_images", column: "image_url", bucket: "gallery-photos", preset: "photo", thumb: true },
  { table: "galleries", column: "cover_url", bucket: "gallery-photos", preset: "photo", thumb: true },
  { table: "tournaments", column: "image_url", bucket: "tournament-files", preset: "photo" },
  { table: "profiles", column: "avatar_url", bucket: "avatars", preset: "avatar" },
  { table: "clubs", column: "logo_url", bucket: "club-logos", preset: "logo" },
  { table: "news", column: "cover_url", bucket: "news-files", preset: "photo" },
];

const THUMB_PREFIX = "thumbs/";

// ------------------------------------------------------------------ setup ---
const readEnv = () => {
  const env = { ...process.env };
  if (fs.existsSync(".env")) {
    for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
};

const env = readEnv();
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY (and/or VITE_SUPABASE_URL) in .env.\n" +
      "Find it in Supabase → Project Settings → API → service_role."
  );
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const kb = (n) => `${Math.round(n / 1024)} KB`;
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

// Storage path of a public URL in `bucket`, or null if it lives elsewhere.
const pathOf = (publicUrl, bucket) => {
  const marker = `/object/public/${bucket}/`;
  const i = publicUrl?.indexOf(marker) ?? -1;
  return i === -1 ? null : decodeURIComponent(publicUrl.slice(i + marker.length).split("?")[0]);
};

// path → size for every object in a bucket.
const listBucket = async (bucket, prefix = "", out = new Map()) => {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const f of data) {
      const p = prefix ? `${prefix}/${f.name}` : f.name;
      if (f.id === null) await listBucket(bucket, p, out);
      else out.set(p, f.metadata?.size || 0);
    }
    if (data.length < 1000) return out;
  }
};

// Formats browsers other than Safari can't show (iPhone photos are HEIC):
// always converted, whatever their size.
const NOT_WEB_SAFE = /\.(heic|heif|tiff?|bmp)$/i;

// sharp's prebuilt binaries can't decode HEIC; on macOS convert it to JPEG
// with the built-in `sips` first.
const toDecodable = (buf) => {
  if (process.platform !== "darwin") return buf;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "optimize-"));
  try {
    fs.writeFileSync(path.join(dir, "in"), buf);
    execFileSync("sips", ["-s", "format", "jpeg", path.join(dir, "in"), "--out", path.join(dir, "out.jpg")], {
      stdio: "ignore",
    });
    return fs.readFileSync(path.join(dir, "out.jpg"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const encodeWith = (buf, { max, quality }) =>
  sharp(buf)
    .rotate() // honour EXIF orientation
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

const encode = async (buf, preset) => {
  try {
    return await encodeWith(buf, preset);
  } catch {
    return encodeWith(toDecodable(buf), preset);
  }
};

const upload = async (bucket, path, body) => {
  const { error } = await sb.storage.from(bucket).upload(path, body, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`upload ${bucket}/${path}: ${error.message}`);
};

// ------------------------------------------------------------------- scan ---
const files = new Map(); // `${bucket}/${path}` → { bucket, path, preset, thumb, url, rows }
const bucketSizes = new Map();

for (const ref of REFS) {
  const { data, error } = await sb
    .from(ref.table)
    .select(`id, ${ref.column}`)
    .like(ref.column, `%/object/public/${ref.bucket}/%`);
  if (error) {
    console.warn(`skip ${ref.table}.${ref.column}: ${error.message}`);
    continue;
  }
  if (!bucketSizes.has(ref.bucket)) bucketSizes.set(ref.bucket, await listBucket(ref.bucket));
  for (const row of data) {
    const publicUrl = row[ref.column];
    const path = pathOf(publicUrl, ref.bucket);
    if (!path || path.startsWith(THUMB_PREFIX)) continue;
    const id = `${ref.bucket}/${path}`;
    const entry = files.get(id) || { bucket: ref.bucket, path, preset: ref.preset, thumb: false, url: publicUrl, rows: [] };
    entry.thumb ||= !!ref.thumb;
    entry.rows.push({ table: ref.table, column: ref.column, id: row.id, url: publicUrl });
    files.set(id, entry);
  }
}

const plan = [];
for (const f of files.values()) {
  const sizes = bucketSizes.get(f.bucket);
  const size = sizes.get(f.path);
  if (size === undefined) {
    console.warn(`missing in storage (row points nowhere): ${f.bucket}/${f.path}`);
    continue;
  }
  const shrink = size > PRESETS[f.preset].skipBelow || NOT_WEB_SAFE.test(f.path);
  const needThumb = f.thumb && !sizes.has(`${THUMB_PREFIX}${f.path}`);
  if (shrink || needThumb) plan.push({ ...f, size, shrink, needThumb });
}

const toShrink = plan.filter((f) => f.shrink);
console.log(`\nReferenced images: ${files.size}`);
console.log(`To shrink: ${toShrink.length} (${mb(toShrink.reduce((s, f) => s + f.size, 0))} now)`);
console.log(`Thumbnails to create: ${plan.filter((f) => f.thumb).length}`);
for (const [bucket, sizes] of bucketSizes) {
  const used = new Set([...files.values()].filter((f) => f.bucket === bucket).map((f) => f.path));
  const orphans = [...sizes].filter(([p]) => !used.has(p) && !p.startsWith(THUMB_PREFIX));
  if (orphans.length) {
    console.log(
      `  ${bucket}: ${orphans.length} unreferenced files (${mb(orphans.reduce((s, [, n]) => s + n, 0))}) — left alone`
    );
  }
}

if (!APPLY) {
  for (const f of toShrink.slice(0, 15)) console.log(`  ${kb(f.size).padStart(8)}  ${f.bucket}/${f.path}`);
  console.log("\nDry run. Re-run with --apply to optimize.");
  process.exit(0);
}

// ------------------------------------------------------------------ apply ---
let before = 0;
let after = 0;
let done = 0;

for (const f of plan) {
  const label = `[${++done}/${plan.length}] ${f.bucket}/${f.path}`;
  try {
    const { data: blob, error } = await sb.storage.from(f.bucket).download(f.path);
    if (error) throw new Error(`download: ${error.message}`);
    const original = Buffer.from(await blob.arrayBuffer());

    let finalPath = f.path;
    let newSize = 0;
    if (f.shrink) {
      const small = await encode(original, PRESETS[f.preset]);
      if (small.length < original.length * 0.9 || NOT_WEB_SAFE.test(f.path)) {
        // New file name, so no browser or CDN keeps serving the old bytes.
        const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "";
        finalPath = `${dir ? `${dir}/` : ""}${crypto.randomUUID()}.webp`;
        await upload(f.bucket, finalPath, small);
        newSize = small.length;
        before += original.length;
        after += small.length;
      }
    }

    if (f.thumb && (finalPath !== f.path || f.needThumb)) {
      await upload(f.bucket, `${THUMB_PREFIX}${finalPath}`, await encode(original, PRESETS.thumb));
    }

    if (finalPath !== f.path) {
      const { data } = sb.storage.from(f.bucket).getPublicUrl(finalPath);
      for (const row of f.rows) {
        const { error: upErr } = await sb
          .from(row.table)
          .update({ [row.column]: data.publicUrl })
          .eq("id", row.id)
          .eq(row.column, row.url); // don't clobber a change made meanwhile
        if (upErr) throw new Error(`update ${row.table}: ${upErr.message}`);
      }
      await sb.storage.from(f.bucket).remove([f.path, `${THUMB_PREFIX}${f.path}`]);
      console.log(`${label}  ${kb(original.length)} → ${kb(newSize)}`);
    } else {
      console.log(`${label}  thumbnail only`);
    }
  } catch (e) {
    console.error(`${label}  FAILED: ${e.message}`);
  }
}

console.log(`\nDone. Shrunk ${mb(before)} → ${mb(after)}.`);
