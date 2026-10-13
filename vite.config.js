import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Changes on every build, so each deploy fetches fresh translation files
  // instead of the browser's cached copy (see src/i18n.js).
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(String(Date.now())),
  },
})
