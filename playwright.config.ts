import { defineConfig } from 'playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'responsive.spec.ts',
  timeout: 20 * 60 * 1000,
  workers: 1,
})
