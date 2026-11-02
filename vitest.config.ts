import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['source'] },
  test: {
    projects: [
      { extends: true, test: { name: 'engine', include: ['packages/engine/test/**/*.test.ts'] } },
      { extends: true, test: { name: 'crawler', include: ['apps/crawler/test/**/*.test.ts'] } },
      { extends: true, test: { name: 'api', include: ['apps/api/test/**/*.test.ts'] } },
      {
        extends: true,
        test: {
          name: 'web',
          include: ['apps/web/test/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['apps/web/test/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**', 'apps/*/src/**'],
      exclude: ['**/*.d.ts', 'apps/web/src/main.tsx'],
    },
  },
});
