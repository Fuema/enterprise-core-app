import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so unit tests never depend on a populated .env file.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
