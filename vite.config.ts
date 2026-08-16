import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'branding/emblem.svg',
        'branding/brigada-onse-logo.png',
      ],
      manifest: {
        name: 'Brigada Onse SVFAR Studio',
        short_name: 'SVFAR Studio',
        description:
          'Brigada Onse Sun Valley Fire & Rescue Frame Studio for incident documentation',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'branding/brigada-onse-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    pool: 'threads',
    fileParallelism: false,
    testTimeout: 20000,
  },
})
