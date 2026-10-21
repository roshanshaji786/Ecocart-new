import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'EcoCart',
        short_name: 'EcoCart',
        description: 'Eco-friendly products & personalised gifts, right from source. Made in Kerala.',
        theme_color: '#06120c',
        background_color: '#06120c',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'https://fckeyyrdzlrreidttimo.supabase.co/storage/v1/object/public/catalog/site/cropped-ecocart-removebg.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/assets\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/v1/object/public/') || url.hostname === 'ecocart.co.in',
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 300, maxAgeSeconds: 30 * 86400 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url, request }) => url.pathname.startsWith('/rest/v1/') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 6, expiration: { maxEntries: 100, maxAgeSeconds: 7 * 86400 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'vendor', test: /node_modules[\\/](@supabase|zustand|lucide-react)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
})
