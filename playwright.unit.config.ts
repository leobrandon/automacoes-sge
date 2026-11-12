import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/estudos/**'],
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
    headless: process.env.HEADLESS !== 'false',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'unit', testMatch: ['**/*factory.spec.ts'] }],
});
