import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * Pruebas de extremo a extremo contra el servidor real: API + frontend compilado +
 * índice completo. Requiere `npm run build` y `npm run index` antes.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node apps/api/dist/server.js',
    url: `http://localhost:${PORT}/readyz`,
    env: { PORT: String(PORT), LOG_LEVEL: 'warn', RATE_LIMIT_PER_MINUTE: '10000' },
    reuseExistingServer: !process.env.CI,
  },
});
