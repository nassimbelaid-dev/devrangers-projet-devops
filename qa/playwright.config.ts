import { defineConfig } from "@playwright/test"

// QA_URL permet d'utiliser un serveur déjà démarré, par exemple :
// $env:QA_URL = "http://127.0.0.1:3000"
const externalUrl = process.env.QA_URL
const baseURL = externalUrl || "http://127.0.0.1:3100"

export default defineConfig({
  testDir: "./e2e",
  timeout: 75_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "rapports/playwright-html", open: "never" }],
  ],
  outputDir: "./rapports/playwright-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablette",
      use: {
        browserName: "chromium",
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: externalUrl
    ? undefined
    : {
        command: "pnpm exec next dev -p 3100",
        url: `${baseURL}/en/dashboards/analytics`,
        timeout: 150_000,
        reuseExistingServer: false,
      },
})
