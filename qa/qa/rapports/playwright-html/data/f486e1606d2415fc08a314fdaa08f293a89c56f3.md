# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: committee.spec.ts >> réunions : ouverture du formulaire de création
- Location: qa\e2e\committee.spec.ts:70:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Nouvelle réunion/i })

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
  46 |   await page.locator("#profile-first-name").fill("Test")
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
> 72 |   await page.getByRole("button", { name: /Nouvelle réunion/i }).click()
     |                                                                 ^ Error: locator.click: Test timeout of 45000ms exceeded.
  73 |   const dialog = page.getByRole("dialog")
  74 |   await expect(dialog).toBeVisible()
  75 |   const width = await dialog.evaluate((el) => el.getBoundingClientRect().width)
  76 |   expect(width, "La fenêtre doit tenir dans le viewport").toBeLessThanOrEqual(page.viewportSize()!.width - 12)
  77 |   await expect(dialog.getByRole("tab", { name: /Participants/i })).toBeVisible()
  78 |   await expect(dialog.getByRole("tab", { name: /Ordre du jour/i })).toBeVisible()
  79 | })
  80 | 
```