import js from '@eslint/js';
import typescript from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...typescript.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: typescript.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript.plugin,
      prettier: prettier,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js', 'scripts/', 'android/', 'ios/'],
  },
];