import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { parseEnv } from './src/lib/env.schema.ts';

export default defineConfig(({ mode }) => {
  // Fail fast: a missing or malformed VITE_* variable aborts `vite dev` and
  // `vite build` before a single module is compiled.
  parseEnv(loadEnv(mode, process.cwd(), 'VITE_'));

  return {
    plugins: [
      // Must run before the React plugin so generated route files are transformed.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
