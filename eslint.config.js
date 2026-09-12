// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/.output/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // CDP 验收脚本与 playground 的 Node 脚本：跑在 Node 22+（内置 fetch / WebSocket），声明其全局
    files: ['scripts/**/*.mjs', 'playgrounds/*/scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        WebSocket: 'readonly',
        performance: 'readonly',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
)
