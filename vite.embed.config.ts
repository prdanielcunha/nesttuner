import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as { version: string };
const embedFile = `nesttuner-element.v${packageJson.version}.js`;

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  define: {
    __NESTTUNER_VERSION__: JSON.stringify(packageJson.version)
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: `assets/v${packageJson.version}/[name]-[hash].js`,
        chunkFileNames: `assets/v${packageJson.version}/[name]-[hash].js`,
        assetFileNames: `assets/v${packageJson.version}/[name]-[hash][extname]`
      }
    }
  },
  resolve: {
    alias: {
      '@nesttuner/core': path.resolve(rootDir, 'packages/tuner-core/src/index.ts'),
      '@nesttuner/audio': path.resolve(rootDir, 'packages/tuner-audio/src/index.ts'),
      '@nesttuner/ui': path.resolve(rootDir, 'packages/tuner-ui/src/index.ts')
    }
  },
  build: {
    target: 'es2022',
    outDir: 'dist/embed',
    emptyOutDir: false,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(rootDir, 'packages/tuner-embed/src/element.tsx'),
      formats: ['es'],
      fileName: () => embedFile
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: `assets/v${packageJson.version}/[name]-[hash][extname]`
      }
    }
  }
});
