import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
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
      fileName: () => 'nesttuner-element.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
