// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'eslint.config.mjs', 'jest*.config.js'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['apps/*/src/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@hce/common', message: 'El dominio solo usa @hce/core y @hce/contracts.' }],
          patterns: [
            {
              group: ['@nestjs/*', 'mssql', 'nats', 'express', 'rxjs', 'prom-client', 'pino*'],
              message: 'El dominio debe ser independiente del framework.',
            },
            { group: ['**/infrastructure/**', '**/application/**'], message: 'El dominio no conoce capas externas.' },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/*/src/application/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.test-doubles.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@hce/common', message: 'La aplicación no depende de infraestructura (use puertos).' }],
          patterns: [
            {
              group: ['@nestjs/*', 'mssql', 'nats', 'express', 'prom-client', 'pino*'],
              message: 'Casos de uso sin framework.',
            },
            { group: ['**/infrastructure/**'], message: 'Use puertos, no adaptadores.' },
          ],
        },
      ],
    },
  },
  {
    files: ['libs/core/src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@hce/common', message: '@hce/core no puede depender de infraestructura.' }],
          patterns: [
            {
              group: ['@nestjs/*', 'mssql', 'nats', 'express', 'rxjs', 'prom-client', 'pino*'],
              message: 'Núcleo sin framework.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
