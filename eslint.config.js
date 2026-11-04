import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  // Rule ve format (space thua, thut dong, dau cham phay...): `eslint --fix` va save trong editor se tu sua.
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    commaDangle: 'always-multiline',
    braceStyle: '1tbs',
    arrowParens: true,
  }),
  {
    // Giu dung kieu dang dung trong project: toan tu o cuoi dong, "'" khong can escape.
    rules: {
      '@stylistic/operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before' } }],
      '@stylistic/indent-binary-ops': 'off',
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/quote-props': ['error', 'as-needed'],
    },
  },
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Hop voi verbatimModuleSyntax trong tsconfig: import chi dung cho type
      // phai ghi `import type` de Node xoa duoc khi chay truc tiep file .ts.
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
)
