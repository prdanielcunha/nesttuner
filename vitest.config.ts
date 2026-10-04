import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@nesttuner/core': path.resolve(rootDir, 'packages/tuner-core/src/index.ts'),
      '@nesttuner/audio': path.resolve(rootDir, 'packages/tuner-audio/src/index.ts')
    }
  }
});
