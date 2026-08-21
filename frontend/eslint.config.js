import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // eslint-plugin-react is not installed, so JSX references do not count as
      // usage. Component-shaped bindings (icon: Icon) are therefore exempt.
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' },
      ],
    },
  },
  {
    // react-refresh/only-export-components guards Fast Refresh ergonomics, not
    // correctness. The Vite entry has no exports by design, and these modules
    // intentionally publish a hook or a constant next to their components.
    files: ['src/main.jsx', 'src/lib/auth.jsx', 'src/portfolio/Sections.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
