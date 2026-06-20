// After `vite build`, copy dist/index.html to dist/404.html.
//
// GitHub Pages is a static host: a direct request to a client-side route
// (e.g. /schedule-2026) has no matching file and returns GitHub's own 404.
// GitHub Pages serves 404.html for any unmatched path, so making it an exact
// copy of index.html lets the SPA boot and React Router render the route,
// while keeping the clean URL intact.
//
// It must be copied AFTER the build so it references the current hashed assets.
import { copyFileSync, existsSync } from "node:fs";

const src = "dist/index.html";
const dest = "dist/404.html";

if (!existsSync(src)) {
  throw new Error(`postbuild: ${src} not found — did vite build run?`);
}

copyFileSync(src, dest);
console.log(`postbuild: created ${dest} (SPA fallback for GitHub Pages)`);
