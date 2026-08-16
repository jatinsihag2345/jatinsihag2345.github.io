import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Relative asset paths make the production build work from any host or subpath
  // (GitHub Pages project sites, a nested folder, file://). It must NOT apply to the
  // dev server, where a relative base breaks module resolution and renders a blank page.
  base: command === 'build' ? './' : '/',
  plugins: [
    react(),
    // Installable, offline-capable build. generateSW writes the service worker.
    //
    // "autoUpdate", not "prompt": under prompt the precached bundle keeps being
    // served until someone notices a toast and clicks it, so a returning visitor
    // sits on a stale build indefinitely — including one with a bug that has
    // already been fixed and deployed. That is exactly what happened with the
    // invisible dashboard heading: the fix was live and the visitor still saw the
    // break. Correctness of what is on screen beats never reloading unasked; the
    // toast in main.tsx stays as a courtesy for anyone mid-problem when a new
    // worker activates.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Striver SDE Sheet',
        short_name: 'Striver SDE',
        description:
          'DSA & SQL interview prep: brute force to optimal, with runnable code and step-by-step walkthroughs.',
        theme_color: '#0b0f19',
        background_color: '#0b0f19',
        display: 'standalone',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        // Long-press (Android) / right-click (desktop) on the installed icon jumps
        // straight into a work mode. Relative URLs on purpose: base is './' so the
        // app may live under a subpath (GitHub Pages project site) — an absolute
        // '/?tab=…' would escape the app there. App.tsx validates ?tab= on boot.
        shortcuts: [
          { name: 'Mock Drill', short_name: 'Drill', url: './?tab=drill', icons: [{ src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }] },
          { name: 'Review now', short_name: 'Review', url: './?tab=core', icons: [{ src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }] },
          { name: 'Daily three', short_name: 'Daily 3', url: './?tab=dashboard', icons: [{ src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }] },
        ],
      },
      workbox: {
        // App shell + everything bundled with it. The teaching content compiles
        // into the main JS chunk (several MB), so the default 2 MB precache
        // ceiling must rise or the one file that IS the app gets skipped.
        globPatterns: ['**/*.{js,css,html,svg,wasm,json,woff2}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        runtimeCaching: [
          {
            // Pyodide streams from jsDelivr on first Run: ~25 core files, plus
            // stdlib wheels that arrive lazily as learners' code imports them.
            // CacheFirst because the URL is version-pinned — the content at it
            // never changes, so revalidating is pure wasted round-trips. The
            // entry cap sits far above the core file count so late-arriving
            // wheels never evict the interpreter itself.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/pyodide\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pyodide-cdn',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The font pair index.css imports — cached so offline keeps the real
            // typefaces instead of falling back mid-revision.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // The teaching content is several MB of JSON, so the bundle is legitimately large
    // and the default 500 kB warning is just noise. Hosts serve it brotli-compressed,
    // which is what actually determines load time.
    //
    // NOTE: a manualChunks() splitting the JSON into separate chunks was tried and made
    // the build hang — dsaQuestions.ts pulls the data in synchronously, so forcing it
    // apart produces a chunk graph rolldown cannot settle. Real splitting needs the data
    // to be dynamically imported first.
    chunkSizeWarningLimit: 5000,
  },
}))
