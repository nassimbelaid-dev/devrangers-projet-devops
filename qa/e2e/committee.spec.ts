import fs from "node:fs"
import path from "node:path"

import { expect, test } from "@playwright/test"

import type { Page } from "@playwright/test"

const lang = "fr"

async function signIn(
  page: Page,
  account: string,
  locale = lang,
  route = "/dashboards/analytics"
) {
  await page.goto(
    `/${locale}/sign-in?next=${encodeURIComponent(`/${locale}${route}`)}`
  )
  await page.locator("#demo-account").selectOption(account + "@comite.test")
  await expect(page.locator("#email")).toHaveValue(account + "@comite.test")
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(
    new RegExp(`/${locale}${route.split("?")[0]}(?:\\?|$)`),
    { timeout: 40000 }
  )
}
test.beforeEach(async ({ page }) => {
  await signIn(page, "secretaire")
})
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
    const response = await page.goto(`/${lang}${route}`, {
      waitUntil: "domcontentloaded",
    })
    expect(response?.status(), `HTTP ${route}`).toBeLessThan(400)
    await expect(
      page.locator("h1").first(),
      `Titre principal de ${route}`
    ).toBeVisible()

    // Attend la stabilisation des polices et du rendu client, sans dépendre du networkidle.
    await page.evaluate(() => document.fonts.ready.then(() => true))
    const overflow = await page.evaluate(() =>
      Math.max(
        0,
        document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    )
    expect(
      overflow,
      `Débordement horizontal sur ${route} : ${overflow}px`
    ).toBeLessThanOrEqual(2)

    if (process.env.QA_CAPTURE === "1") {
      const dir = path.resolve("qa/rapports/captures")
      fs.mkdirSync(dir, { recursive: true })
      await page.screenshot({
        path: path.join(dir, `${testInfo.project.name}-${name}.png`),
        fullPage: true,
        animations: "disabled",
      })
    }
    expect(crashes, `Erreurs JavaScript dans ${route}`).toEqual([])
  })
}

// Ces tests portent sur les contrôles existants, sans réécriture des modules.
test("profil : édition et conservation après rechargement", async ({
  page,
}) => {
  await page.goto(`/${lang}/profile`)
  await page.locator("#profile-first-name").fill("Test")
  await page.locator("#profile-last-name").fill("Responsive")
  await page.locator("#profile-email").fill("qa@example.test")
  await page.getByRole("button", { name: /Enregistrer/i }).click()
  await expect(
    page.getByText(/informations ont été enregistrées/i)
  ).toBeVisible()
  await page.reload()
  await expect(page.locator("#profile-first-name")).toHaveValue("Test")
  await expect(page.locator("#profile-last-name")).toHaveValue("Responsive")
})

test("notifications : compteur navbar lié au centre", async ({ page }) => {
  await page.goto(`/${lang}/meetings?meeting=r2`)
  page.once("dialog", (confirmation) => confirmation.accept())
  await page.getByRole("button", { name: "Envoyer les convocations" }).click()
  await expect(
    page.getByRole("button", { name: "Renvoyer les convocations" })
  ).toBeVisible()
  await page.goto(`/${lang}/notifications`)
  const bell = page
    .locator('button[aria-label^="Notifications,"]:visible')
    .first()
  await expect(bell).toBeVisible()
  await bell.click()
  const popup = page.getByRole("dialog")
  const markRead = popup.getByRole("button", { name: "Tout marquer comme lu" })
  await expect(markRead).toBeVisible()
  if (await markRead.isEnabled()) await markRead.click()
  await expect(bell).toHaveAttribute("aria-label", /Notifications, 0 non lue/)
  await popup
    .getByRole("link", { name: /Voir toutes les notifications/i })
    .click()
  await expect(page).toHaveURL(new RegExp(`/${lang}/notifications$`))
})

test("réunions : ouverture du formulaire de création", async ({ page }) => {
  await page.goto(`/${lang}/meetings`)
  await page.getByRole("button", { name: /Nouvelle réunion/i }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  const width = await dialog.evaluate((el) => el.getBoundingClientRect().width)
  expect(width, "La fenêtre doit tenir dans le viewport").toBeLessThanOrEqual(
    page.viewportSize()!.width - 12
  )
  await expect(dialog.getByRole("tab", { name: /Participants/i })).toBeVisible()
  await expect(dialog.getByRole("tab", { name: /Ordre du jour/i })).toHaveCount(
    0
  )
})

test("sièges : la simulation conserve le représentant après rechargement", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-05-20T12:00:00Z"))
  await page.goto("/fr/members")
  const openSeats = () =>
    page.getByRole("button", { name: "Sièges et suppléances" }).click()
  const seat = page.locator('[data-slot="card"]').filter({
    has: page.getByRole("heading", { name: "Siège 06" }),
  })
  const presence = seat.getByRole("checkbox", {
    name: "Présence de Fares Mezi",
  })
  await openSeats()
  await expect(presence).toBeChecked()
  await presence.click()
  await expect(seat.getByText("Non représenté", { exact: true })).toBeVisible()
  await page.reload()
  await openSeats()
  await expect(presence).not.toBeChecked()
  await presence.click()
  await page.reload()
  await openSeats()
  await expect(presence).toBeChecked()
  await expect(seat.getByText("Représenté", { exact: true })).toBeVisible()

  await page.clock.setFixedTime(new Date("2026-11-27T12:00:00Z"))
  await page.reload()
  await openSeats()
  await expect(
    seat.getByText("Aucun mandat en cours pour ce siège.")
  ).toBeVisible()
})

test("agenda : les membres invités lisent les propositions de leurs collègues", async ({
  page,
}) => {
  const title = "Répartition des encadrants"
  const route = "/agenda?meeting=r2"
  await signIn(page, "sara", "fr", route)
  const proposal = page.locator("article").filter({
    has: page.getByRole("heading", { name: title }),
  })
  await expect(proposal.getByRole("button")).toHaveCount(1)
  await proposal.getByRole("button", { name: "Voir" }).click()
  await expect(page.getByRole("dialog", { name: title })).toBeVisible()
  await signIn(page, "yanis", "fr", route)
  await expect(
    page.getByRole("heading", { name: "Ordres du jour" })
  ).toBeVisible()
  await expect(proposal).toHaveCount(0)
})

test("audit : contrôle direct pour les cinq rôles et les deux qualités de membre", async ({
  page,
}) => {
  for (const account of [
    "president",
    "secretaire",
    "archives",
    "membre",
    "sara",
  ]) {
    await signIn(page, account, "fr", "/audit")
    await expect(page.getByText("Accès non autorisé")).toBeVisible()
    await expect(page.locator('a[href="/fr/audit"]')).toHaveCount(0)
  }
  await signIn(page, "admin", "ar", "/audit")
  await expect(page.getByRole("heading", { name: "سجل التدقيق" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(
    page.getByRole("cell", { name: "Camille Exemple" })
  ).toBeVisible()
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(2)
  await signIn(page, "admin", "en", "/audit")
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Date and time" })
  ).toBeVisible()
})

test("annulation avec confirmation, audit et persistance", async ({ page }) => {
  await page.goto("/fr/meetings?meeting=r2")
  const meeting = page.getByRole("dialog")
  await expect(meeting).toBeVisible()
  page.once("dialog", (confirmation) => confirmation.dismiss())
  await meeting.getByRole("button", { name: "Annuler la réunion" }).click()
  await expect(
    meeting.getByRole("button", { name: "Annuler la réunion" })
  ).toBeVisible()
  page.once("dialog", (confirmation) => confirmation.accept())
  await meeting
    .getByRole("button", { name: "Envoyer les convocations" })
    .click()
  await expect(
    meeting.getByRole("button", { name: "Renvoyer les convocations" })
  ).toBeVisible()
  page.once("dialog", (confirmation) => confirmation.accept())
  await meeting.getByRole("button", { name: "Annuler la réunion" }).click()
  await expect(meeting.getByText("La réunion est annulée.")).toBeVisible()
  await expect(
    meeting.getByRole("button", { name: "Renvoyer les convocations" })
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole("dialog").getByText("Annulée", { exact: true })
  ).toBeVisible()
  await signIn(page, "sara", "fr", "/notifications")
  await expect(page.getByText("Réunion annulée", { exact: true })).toBeVisible()
  await signIn(page, "admin", "fr", "/audit")
  await expect(
    page.getByRole("heading", { name: "Journal d’audit" })
  ).toBeVisible()
  await page.locator("#audit-query").fill("r2")
  await expect(
    page.getByRole("row").filter({ hasText: "Annuler" })
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole("row").filter({ hasText: "Annuler" })
  ).toBeVisible()
})
