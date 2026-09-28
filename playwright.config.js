const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // The data-driven city/category sweep covers 5 cities × 4 states and can
  // legitimately exceed 30s on a cold Windows/CI browser; assertions keep
  // their normal 7s polling timeout.
  timeout: 60000,
  expect: { timeout: 7000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'mobile-375', use: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-430', use: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } }
  ]
});
