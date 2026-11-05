import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages project-site base. Keep this matching the repository name.
  base: '/YourWardrobe/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'YourWardrobe',
        short_name: 'Wardrobe',
        description: 'Plan, style and save your outfits.',
        theme_color: '#f5f5f3',
        background_color: '#f5f5f3',
        display: 'standalone',
        start_url: '/YourWardrobe/',
        scope: '/YourWardrobe/',
        icons: [
          { src: '/YourWardrobe/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/YourWardrobe/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }
        ]
      }
    })
  ]
})