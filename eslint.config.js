import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'writable',
  require: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  performance: 'readonly',
  URL: 'readonly'
}

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  getComputedStyle: 'readonly',
  performance: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  ResizeObserver: 'readonly',
  FontFace: 'readonly',
  AudioContext: 'readonly',
  KeyboardEvent: 'readonly',
  DragEvent: 'readonly',
  Event: 'readonly',
  File: 'readonly',
  URL: 'readonly'
}

export default tseslint.config(
  {
    ignores: [
      'out/**',
      'release/**',
      'release-*/**',
      'dist2/**',
      'node_modules/**',
      'artifacts/**',
      '.npm-cache/**',
      '.build-cache/**',
      '.ref/**',
      '.asar-src/**',
      'build/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: browserGlobals
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...nodeGlobals, ...browserGlobals } }
  },
  {
    files: ['scripts/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...nodeGlobals, ...browserGlobals } },
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  },
  {
    // TS 由编译器负责未定义检查，no-undef 在 TS 上只会误报
    files: ['**/*.ts', '**/*.tsx'],
    rules: { 'no-undef': 'off' }
  },
  {
    // 从 Typewriter Nocturne 原样移植的第三方代码，不做风格检查
    files: ['src/renderer/src/stage/machine/**/*.js'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-empty': 'off',
      'prefer-const': 'off'
    }
  },
  {
    // 文件名与路径清洗必须显式匹配控制字符，这条规则在这里不适用
    files: ['src/shared/text.ts', 'src/main/ipc/file.ts'],
    rules: { 'no-control-regex': 'off' }
  }
)
