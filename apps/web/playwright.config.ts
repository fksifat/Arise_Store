import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 45000,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000', headless: true, trace: 'retain-on-failure' },
  outputDir: 'test-results', reporter: 'list',
});
