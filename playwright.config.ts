import { defineConfig } from 'playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'responsive.spec.ts',
  timeout: 20 * 60 * 1000,
  workers: 1,
  webServer: [
    {
      command: 'pnpm run dev:server',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm run dev:client',
      url: process.env.RESPONSIVE_BASE_URL || 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
