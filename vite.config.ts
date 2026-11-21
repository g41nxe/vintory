import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Manifest icons are precached automatically; these are the extra ones from index.html.
      includeAssets: ['favicon-48.png', 'apple-touch-icon.png'],
      workbox: {
        // The service worker answers navigations with the app (SPA fallback) –
        // except for the standalone privacy page, which must load as itself.
        navigateFallbackDenylist: [/^\/datenschutz\.html$/],
      },
      manifest: {
        name: 'Vintory – Verkostungstagebuch und Weinkeller',
        short_name: 'Vintory',
        lang: 'de',
        description: 'Halte verkostete und eigene Weine fest – mit KI-Etikettenscan.',
        theme_color: '#8c1c2e',
        background_color: '#12080a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
