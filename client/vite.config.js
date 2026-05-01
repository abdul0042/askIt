import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'mask-icon.svg'],
      manifest: {
        name: 'askIt - AI Document Assistant',
        short_name: 'askIt',
        description: 'Intelligent RAG-based document chat and quiz assistant',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        icons: [
          {
            src: 'logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/upload': 'http://localhost:5000',
      '/chat': 'http://localhost:5000',
      '/generate-quiz': 'http://localhost:5000',
      '/clear': 'http://localhost:5000',
      '/status': 'http://localhost:5000',
      '/auth': 'http://localhost:5000',
    },
  },
})
