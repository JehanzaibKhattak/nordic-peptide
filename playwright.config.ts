import { defineConfig, devices } from "@playwright/test";
import { databaseUrl, sessionSecret } from "./tests/e2e/setup";

export default defineConfig({
  testDir: "./tests/e2e", globalSetup: "./tests/e2e/setup.ts",
  timeout: 60_000, fullyParallel: false, workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL } }],
  webServer: {
    command: "npm run dev -- --port 3100", url: "http://localhost:3100/api/dev/echo", reuseExistingServer: false, timeout: 120_000,
    env: { ADMIN_PASSWORD: "e2e-admin-only", RESEND_API_KEY: "", NEXT_TEST_DIST_DIR: ".next-e2e", DATABASE_URL: databaseUrl, SESSION_SECRET: sessionSecret, NEXT_PUBLIC_BROWSE_ONLY: "false", NEXT_PUBLIC_DEMO_CHECKOUT: "false", STRIPE_CHECKOUT_ENABLED: "true", LIVE_PAYMENTS_ENABLED: "false", STRIPE_SECRET_KEY: "sk_test_e2e_no_network", STORE_BASE_URL: "http://localhost:3100" },
  },
});
