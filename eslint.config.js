import tseslint from 'typescript-eslint';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
    ],
  },

  // Base TypeScript configuration
  ...tseslint.configs.recommended,

  // TypeScript-specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: path.join(projectRoot, 'tsconfig.json'),
        tsconfigRootDir: projectRoot,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
