# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: committee.spec.ts >> profil : édition et conservation après rechargement
- Location: qa\e2e\committee.spec.ts:44:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.fill: Test timeout of 45000ms exceeded.
Call log:
  - waiting for locator('#profile-first-name')
    14 × waiting for "http://127.0.0.1:3100/en/profile" navigation to finish...
       - navigated to "http://127.0.0.1:3100/en/profile"

```

# Page snapshot

```yaml
- generic [ref=f14e1]:
  - 'heading "Application error: a client-side exception has occurred while loading 127.0.0.1 (see the browser console for more information)." [level=2] [ref=f14e4]'
  - generic [active]:
    - generic [ref=f14e9] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=f14e10]
      - generic [ref=f14e14]:
        - button "Open issues overlay" [ref=f14e15]:
          - generic [ref=f14e16]:
            - generic [aria-hidden] [ref=f14e17]: "0"
            - generic [ref=f14e18]: "1"
          - generic [ref=f14e19]: Issue
        - button "Collapse issues badge" [ref=f14e20]
    - generic [ref=f14e25]:
      - dialog "Unhandled Runtime Error" [ref=f14e26]:
        - generic [ref=f14e28]:
          - generic [ref=f14e29]:
            - generic [ref=f14e30]:
              - generic [ref=f14e31]:
                - generic [ref=f14e32]: Unhandled Runtime Error
                - generic [ref=f14e34]:
                  - button "Copy Stack Trace" [ref=f14e35] [cursor=pointer]
                  - button "No related documentation found" [disabled] [ref=f14e38]
                  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools" [ref=f14e41] [cursor=pointer]:
                    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
              - paragraph [ref=f14e51]: "ChunkLoadError: Loading chunk app/[lang]/layout failed. (missing: http://127.0.0.1:3100/_next/static/chunks/app/%5Blang%5D/layout.js)"
            - generic [ref=f14e52]:
              - generic [ref=f14e53]:
                - paragraph [ref=f14e55]:
                  - generic [ref=f14e60]: src\providers\index.tsx (20:5) @ Providers
                  - button "Open in editor" [ref=f14e61] [cursor=pointer]
                - generic [ref=f14e65]: "18 | }>) { 19 | return ( > 20 | <SettingsProvider locale={locale}> | ^ 21 | <ModeProvider> 22 | <ThemeProvider> 23 | <DirectionProvider direction={direction}>"
              - generic [ref=f14e66]:
                - generic [ref=f14e67]:
                  - paragraph [ref=f14e68]:
                    - text: Call Stack
                    - generic [ref=f14e69]: "13"
                  - button "Show 6 ignore-listed frame(s)" [ref=f14e70] [cursor=pointer]
                - generic [ref=f14e73]:
                  - generic [ref=f14e74]: __webpack_require__.f.j
                  - text: .next\static\chunks\webpack.js (858:29)
                - generic [ref=f14e75]:
                  - generic [ref=f14e76]: <unknown>
                  - text: .next\static\chunks\webpack.js (153:40)
                - generic [ref=f14e77]:
                  - generic [ref=f14e78]: Array.reduce
                  - text: <anonymous> (0:0)
                - generic [ref=f14e79]:
                  - generic [ref=f14e80]: __webpack_require__.e
                  - text: .next\static\chunks\webpack.js (152:67)
                - generic [ref=f14e81]:
                  - generic [ref=f14e82]: fn.e
                  - text: .next\static\chunks\webpack.js (389:50)
                - generic [ref=f14e83]:
                  - generic [ref=f14e84]:
                    - text: Providers
                    - button [ref=f14e85] [cursor=pointer]
                  - text: src\providers\index.tsx (20:5)
                - generic [ref=f14e88]:
                  - generic [ref=f14e89]: RootLayout
                  - text: rsc:/Server/webpack-internal:///(rsc)/src/app/%5Blang%5D/layout.tsx (48:98)
          - contentinfo [ref=f14e91]:
            - region "Error feedback" [ref=f14e92]:
              - paragraph [ref=f14e93]:
                - link "Was this helpful?" [ref=f14e94] [cursor=pointer]:
                  - /url: https://nextjs.org/telemetry#error-feedback
              - button "Mark as helpful" [ref=f14e95] [cursor=pointer]
              - button "Mark as not helpful" [ref=f14e99] [cursor=pointer]
          - generic [ref=f14e102]:
            - generic [ref=f14e103]: "1"
            - generic [ref=f14e104]: "2"
      - generic [ref=f14e105]:
        - navigation [ref=f14e107]:
          - button [disabled] [ref=f14e108]:
            - img "previous" [ref=f14e109]
          - generic [ref=f14e111]:
            - generic [ref=f14e112]: 1/
            - text: "1"
          - button [disabled] [ref=f14e113]:
            - img "next" [ref=f14e114]
        - generic "No Next.js version data was found." [ref=f14e120]: Next.js 15.2.8 (unknown)
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test"
  2  | import fs from "node:fs"
  3  | import path from "node:path"
  4  | 
  5  | const lang = process.env.QA_LANG || "en"
  6  | const pages = [
  7  |   ["tableau-de-bord", "/dashboards/analytics"],
  8  |   ["reunions", "/meetings"],
  9  |   ["membres", "/members"],
  10 |   ["decisions-actions", "/actions"],
  11 |   ["votes", "/votes"],
  12 |   ["documents-pv", "/documents"],
  13 |   ["ordre-du-jour", "/agenda"],
  14 |   ["notifications", "/notifications"],
  15 |   ["profil", "/profile"],
  16 | ] as const
  17 | 
  18 | for (const [name, route] of pages) {
  19 |   test(`${name} : chargement et responsive`, async ({ page }, testInfo) => {
  20 |     const crashes: string[] = []
  21 |     page.on("pageerror", (error) => crashes.push(error.message))
  22 |     const response = await page.goto(`/${lang}${route}`, { waitUntil: "domcontentloaded" })
  23 |     expect(response?.status(), `HTTP ${route}`).toBeLessThan(400)
  24 |     await expect(page.locator("h1").first(), `Titre principal de ${route}`).toBeVisible()
  25 | 
  26 |     // Attend la stabilisation des polices et du rendu client, sans dépendre du networkidle.
  27 |     await page.evaluate(() => document.fonts.ready.then(() => true))
  28 |     const overflow = await page.evaluate(() => Math.max(
  29 |       0,
  30 |       document.documentElement.scrollWidth - document.documentElement.clientWidth,
  31 |     ))
  32 |     expect(overflow, `Débordement horizontal sur ${route} : ${overflow}px`).toBeLessThanOrEqual(2)
  33 | 
  34 |     if (process.env.QA_CAPTURE === "1") {
  35 |       const dir = path.resolve("qa/rapports/captures")
  36 |       fs.mkdirSync(dir, { recursive: true })
  37 |       await page.screenshot({ path: path.join(dir, `${testInfo.project.name}-${name}.png`), fullPage: true, animations: "disabled" })
  38 |     }
  39 |     expect(crashes, `Erreurs JavaScript dans ${route}`).toEqual([])
  40 |   })
  41 | }
  42 | 
  43 | // Ces tests portent sur les contrôles existants, sans réécriture des modules.
  44 | test("profil : édition et conservation après rechargement", async ({ page }) => {
  45 |   await page.goto(`/${lang}/profile`)
> 46 |   await page.locator("#profile-first-name").fill("Test")
     |                                             ^ Error: locator.fill: Test timeout of 45000ms exceeded.
  47 |   await page.locator("#profile-last-name").fill("Responsive")
  48 |   await page.locator("#profile-email").fill("qa@example.test")
  49 |   await page.getByRole("button", { name: /Enregistrer/i }).click()
  50 |   await expect(page.getByText(/informations ont été enregistrées/i)).toBeVisible()
  51 |   await page.reload()
  52 |   await expect(page.locator("#profile-first-name")).toHaveValue("Test")
  53 |   await expect(page.locator("#profile-last-name")).toHaveValue("Responsive")
  54 | })
  55 | 
  56 | test("notifications : compteur navbar lié au centre", async ({ page }) => {
  57 |   await page.goto(`/${lang}/notifications`)
  58 |   const bell = page.locator('button[aria-label^="Notifications,"]:visible').first()
  59 |   await expect(bell).toBeVisible()
  60 |   await bell.click()
  61 |   const popup = page.getByRole("dialog")
  62 |   const markRead = popup.getByRole("button", { name: /Tout marquer lu/i })
  63 |   await expect(markRead).toBeVisible()
  64 |   if (await markRead.isEnabled()) await markRead.click()
  65 |   await expect(bell).toHaveAttribute("aria-label", /Notifications, 0 non lues/)
  66 |   await popup.getByRole("link", { name: /Voir toutes les notifications/i }).click()
  67 |   await expect(page).toHaveURL(new RegExp(`/${lang}/notifications$`))
  68 | })
  69 | 
  70 | test("réunions : ouverture du formulaire de création", async ({ page }) => {
  71 |   await page.goto(`/${lang}/meetings`)
  72 |   await page.getByRole("button", { name: /Nouvelle réunion/i }).click()
  73 |   const dialog = page.getByRole("dialog")
  74 |   await expect(dialog).toBeVisible()
  75 |   const width = await dialog.evaluate((el) => el.getBoundingClientRect().width)
  76 |   expect(width, "La fenêtre doit tenir dans le viewport").toBeLessThanOrEqual(page.viewportSize()!.width - 12)
  77 |   await expect(dialog.getByRole("tab", { name: /Participants/i })).toBeVisible()
  78 |   await expect(dialog.getByRole("tab", { name: /Ordre du jour/i })).toBeVisible()
  79 | })
  80 | 
```