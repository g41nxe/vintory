import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.png'],
      manifest: {
        name: 'Vintory – Verkostungstagebuch und Weinkeller',
        short_name: 'Vintory',
        description: 'Halte verkostete und eigene Weine fest – mit KI-Etikettenscan.',
        theme_color: '#8c1c2e',
        background_color: '#12080a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
