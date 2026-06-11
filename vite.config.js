import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Aeva — AI Tutor',
        short_name: 'Aeva',
        description: 'Your personal AI tutor. Study smarter, remember more.',
        theme_color: '#08091a',
        background_color: '#08091a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Block the HTML fallback for anything that looks like a file (JS chunks, CSS, images).
        // Without this, the SW returns index.html for un-cached chunks after a new deploy,
        // causing "Expected a JS module but got text/html" MIME type errors.
        navigateFallbackDenylist: [/^\/r\//, /^\/assets\//, /\.\w{2,5}(\?.*)?$/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // JS/CSS chunks — NetworkFirst so freshly-deployed hashes are always fetched,
          // only falls back to cache when truly offline.
          {
            urlPattern: /\/assets\/.*\.(js|css)(\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'asset-chunks',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.groq\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
})
