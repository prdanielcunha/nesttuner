import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const locale = env.VITE_APP_LOCALE || 'pt-BR';
  const isPt = locale === 'pt-BR';

  return {
    root: rootDir,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: isPt ? 'NestTuner — Afinador' : 'NestTuner — Tuner',
          short_name: 'NestTuner',
          description: env.VITE_APP_DESCRIPTION,
          theme_color: '#090B10',
          background_color: '#090B10',
          display: 'standalone',
          start_url: '/',
          lang: locale,
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
  };
});
