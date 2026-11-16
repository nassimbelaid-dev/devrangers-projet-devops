import { test, expect } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const lang = process.env.QA_LANG || "en"
const pages = [
  ["tableau-de-bord", "/dashboards/analytics"],
  ["reunions", "/meetings"],
  ["membres", "/members"],
  ["decisions-actions", "/actions"],
  ["votes", "/votes"],
  ["documents-pv", "/documents"],
  ["ordre-du-jour", "/agenda"],
  ["notifications", "/notifications"],
  ["profil", "/profile"],
] as const

for (const [name, route] of pages) {
  test(`${name} : chargement et responsive`, async ({ page }, testInfo) => {
    const crashes: string[] = []
    page.on("pageerror", (error) => crashes.push(error.message))
    const response = await page.goto(`/${lang}${route}`, { waitUntil: "domcontentloaded" })
    expect(response?.status(), `HTTP ${route}`).toBeLessThan(400)
    await expect(page.locator("h1").first(), `Titre principal de ${route}`).toBeVisible()

    // Attend la stabilisation des polices et du rendu client, sans dépendre du networkidle.
    await page.evaluate(() => document.fonts.ready.then(() => true))
    const overflow = await page.evaluate(() => Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ))
    expect(overflow, `Débordement horizontal sur ${route} : ${overflow}px`).toBeLessThanOrEqual(2)

    if (process.env.QA_CAPTURE === "1") {
      const dir = path.resolve("qa/rapports/captures")
      fs.mkdirSync(dir, { recursive: true })
      await page.screenshot({ path: path.join(dir, `${testInfo.project.name}-${name}.png`), fullPage: true, animations: "disabled" })
    }
    expect(crashes, `Erreurs JavaScript dans ${route}`).toEqual([])
  })
}

// Ces tests portent sur les contrôles existants, sans réécriture des modules.
test("profil : édition et conservation après rechargement", async ({ page }) => {
  await page.goto(`/${lang}/profile`)
  await page.locator("#profile-first-name").fill("Test")
  await page.locator("#profile-last-name").fill("Responsive")
  await page.locator("#profile-email").fill("qa@example.test")
  await page.getByRole("button", { name: /Enregistrer/i }).click()
  await expect(page.getByText(/informations ont été enregistrées/i)).toBeVisible()
  await page.reload()
  await expect(page.locator("#profile-first-name")).toHaveValue("Test")
  await expect(page.locator("#profile-last-name")).toHaveValue("Responsive")
})

test("notifications : compteur navbar lié au centre", async ({ page }) => {
  await page.goto(`/${lang}/notifications`)
  const bell = page.locator('button[aria-label^="Notifications,"]:visible').first()
  await expect(bell).toBeVisible()
  await bell.click()
  const popup = page.getByRole("dialog")
  const markRead = popup.getByRole("button", { name: /Tout marquer lu/i })
  await expect(markRead).toBeVisible()
  if (await markRead.isEnabled()) await markRead.click()
  await expect(bell).toHaveAttribute("aria-label", /Notifications, 0 non lues/)
  await popup.getByRole("link", { name: /Voir toutes les notifications/i }).click()
  await expect(page).toHaveURL(new RegExp(`/${lang}/notifications$`))
})

test("réunions : ouverture du formulaire de création", async ({ page }) => {
  await page.goto(`/${lang}/meetings`)
  await page.getByRole("button", { name: /Nouvelle réunion/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  const width = await dialog.evaluate((el) => el.getBoundingClientRect().width)
  expect(width, "La fenêtre doit tenir dans le viewport").toBeLessThanOrEqual(page.viewportSize()!.width - 12)
  await expect(dialog.getByRole("tab", { name: /Participants/i })).toBeVisible()
  await expect(dialog.getByRole("tab", { name: /Ordre du jour/i })).toBeVisible()
})
