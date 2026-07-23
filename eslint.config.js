import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'docs/.vitepress/cache',
      'docs/.vitepress/dist',
      '**/*.mjs',
      '**/*.cjs',
      '*.config.ts',
      '*.config.js',
    ],
  },

  // Library + tests: recommended TS rules (non-type-checked — fast, tsconfig-decoupled).
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  },

  // The library is silent: no console.* in committed source (diagnostics ride the
  // typed result or an injected logger). Tests may log.
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },

  // Import boundary — the one that matters: adapters are declarative. They describe
  // calls (buildUrl + pure transform); they must never import the I/O leaf or the client.
  {
    files: ['src/adapters/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/http', '**/core/http.js'],
              message:
                'Adapters are declarative — they must never import core/http (the I/O leaf).',
            },
            {
              group: ['**/client', '**/client.js'],
              message: 'Adapters must not import the client (composition root).',
            },
          ],
        },
      ],
    },
  },

  // Import boundary — pure core logic must never touch the I/O leaf.
  {
    files: ['src/core/compose.ts', 'src/core/select.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/http', '**/core/http.js', './http', './http.js'],
              message:
                'Pure core (compose/select) must never import core/http — no I/O in pure logic.',
            },
          ],
        },
      ],
    },
  },

  // Import boundary — schema/result/errors are types + pure helpers only: each other,
  // nothing that does I/O (docs/stack.md §2 import-boundary table).
  {
    files: ['src/core/schema.ts', 'src/core/result.ts', 'src/core/errors.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/http', '**/core/http.js', './http', './http.js'],
              message:
                'core/{schema,result,errors} are types + pure helpers only — never import core/http.',
            },
          ],
        },
      ],
    },
  },

  prettier,
)
