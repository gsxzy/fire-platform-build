import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'wvp-latest/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      /* 存量业务大量 any；清零 lint 告警后请在新代码中优先用 unknown + 窄化 */
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': 'off',
      'prefer-const': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      /* 列表页大量稳定回调/派生状态，严格 deps 噪声高；关键逻辑已局部处理 */
      'react-hooks/exhaustive-deps': 'off',
      /* usePrevious 等惯用法会在渲染期读取 ref 快照；与 DOM ref 误用不同 */
      'react-hooks/refs': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
])
