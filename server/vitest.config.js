import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/tests/**', 'src/config/seed.js', 'src/config/seed.production.js']
    }
  }
});
