import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ESLint 10 flat config. `.eslintrc*` files are not supported and must not be added.
export default defineConfig([
  globalIgnores(['dist', 'coverage', 'src/routeTree.gen.ts', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Type-safety guarantees of the template.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // TanStack Router control flow: `throw redirect()` / `throw notFound()`.
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [
            { from: 'package', package: '@tanstack/router-core', name: 'Redirect' },
            { from: 'package', package: '@tanstack/router-core', name: 'NotFoundError' },
          ],
        },
      ],
      // Async handlers are wrapped with `void` at JSX boundaries instead.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },
  {
    // Route modules export a `Route` object; shadcn primitives export variants/hooks.
    files: ['src/routes/**/*.{ts,tsx}', 'src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['*.{js,mjs}', 'scripts/**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
]);
