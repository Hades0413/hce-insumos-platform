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
    // Arquitectura hexagonal verificada en CI: el DOMINIO no depende de frameworks ni de adaptadores.
    files: ['apps/*/src/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@hce/common', message: 'Importe solo AppError (@hce/common/errors/app-error).' }],
          patterns: [
            {
              group: ['@nestjs/*', 'mssql', 'nats', 'express', 'rxjs'],
              message: 'El dominio debe ser independiente del framework.',
            },
            { group: ['**/infrastructure/**', '**/application/**'], message: 'El dominio no conoce capas externas.' },
          ],
        },
      ],
    },
  },
  {
    // La capa de aplicación no conoce adaptadores concretos (solo puertos).
    files: ['apps/*/src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/infrastructure/**', 'mssql', 'nats'], message: 'Use puertos, no adaptadores.' }] },
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
      // Los e2e deben fijar process.env ANTES de cargar los módulos de Nest.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
