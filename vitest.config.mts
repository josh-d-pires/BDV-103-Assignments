import { defineConfig } from 'vitest/config';
import openApiPlugin from './vitest-openapi-plugin';

export default defineConfig({
  plugins: [openApiPlugin],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    includeSource: ['src/**/*.ts'],
    exclude: ['node_modules', 'dist', 'adapter/**', 'build/**', 'client/**'],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    watch: false,
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
});
