import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NestTuner — Professional Instrument Tuner',
        short_name: 'NestTuner',
        description: 'Professional chromatic instrument tuner that runs locally in your browser.',
        theme_color: '#090B10',
        background_color: '#090B10',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/nesttuner-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/nesttuner-icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,json}']
      }
    })
  ],
  resolve: {
    alias: {
      '@nesttuner/core': path.resolve(rootDir, 'packages/tuner-core/src/index.ts'),
      '@nesttuner/audio': path.resolve(rootDir, 'packages/tuner-audio/src/index.ts'),
      '@nesttuner/ui': path.resolve(rootDir, 'packages/tuner-ui/src/index.ts')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 4173
  },
  build: {
    target: 'es2022',
    sourcemap: true
  }
});
