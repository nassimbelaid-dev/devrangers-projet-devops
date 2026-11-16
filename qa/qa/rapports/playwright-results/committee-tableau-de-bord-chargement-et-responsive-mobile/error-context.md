# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: committee.spec.ts >> tableau-de-bord : chargement et responsive
- Location: qa\e2e\committee.spec.ts:19:3

# Error details

```
Error: Débordement horizontal sur /dashboards/analytics : 36px

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 2
Received:    36
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e12]:
    - button "Customizer" [ref=e13] [cursor=pointer]
    - generic [ref=e17]:
      - banner [ref=e18]:
        - generic [ref=e19]:
          - button "Toggle Sidebar" [ref=e20] [cursor=pointer]
          - generic [ref=e23]:
            - button "Notifications, 5 non lues" [ref=e24] [cursor=pointer]:
              - generic [ref=e28]: "5"
            - button "Mode" [ref=e29] [cursor=pointer]
            - button "Language" [ref=e36] [cursor=pointer]
            - link "Ouvrir mon profil" [ref=e42] [cursor=pointer]:
              - /url: /en/profile
      - main [ref=e46]:
        - main [ref=e49]:
          - generic [ref=e50]:
            - generic [ref=e51]:
              - paragraph [ref=e52]: Département d'informatique
              - heading "Tableau de bord" [level=1] [ref=e53]
              - paragraph [ref=e54]: Vue d'ensemble des réunions, décisions et actions du comité scientifique.
            - generic [ref=e55]: Activité du comité · novembre 2026
          - generic [ref=e59]:
            - generic [ref=e60]:
              - generic [ref=e61]: Espace du comité scientifique
              - heading "Pilotez les activités du comité en un seul endroit." [level=2] [ref=e65]
              - paragraph [ref=e66]: Consultez les réunions à venir, suivez les décisions et gardez un œil sur les actions prioritaires.
            - link "Gérer les réunions" [ref=e67] [cursor=pointer]:
              - /url: /en/meetings
          - region "Indicateurs principaux" [ref=e69]:
            - link "Réunions planifiées 2 Séances à venir dans la démo" [ref=e70] [cursor=pointer]:
              - /url: /en/meetings
              - generic [ref=e71]: Réunions planifiées
              - generic [ref=e76]:
                - paragraph [ref=e77]: "2"
                - generic [ref=e78]: Séances à venir dans la démo
            - link "Actions à suivre 5 À faire ou en cours" [ref=e83] [cursor=pointer]:
              - /url: /en/actions
              - generic [ref=e84]: Actions à suivre
              - generic [ref=e90]:
                - paragraph [ref=e91]: "5"
                - generic [ref=e92]: À faire ou en cours
            - link "Décisions adoptées 3 Parmi 5 décisions" [ref=e97] [cursor=pointer]:
              - /url: /en/votes
              - generic [ref=e98]: Décisions adoptées
              - generic [ref=e104]:
                - paragraph [ref=e105]: "3"
                - generic [ref=e106]: Parmi 5 décisions
            - link "Notifications non lues 5 8 notifications actives" [ref=e111] [cursor=pointer]:
              - /url: /en/notifications
              - generic [ref=e112]: Notifications non lues
              - generic [ref=e118]:
                - paragraph [ref=e119]: "5"
                - generic [ref=e120]: 8 notifications actives
          - generic [ref=e125]:
            - generic [ref=e127]:
              - generic [ref=e128]:
                - generic [ref=e129]:
                  - heading "Réunions planifiées" [level=2] [ref=e130]
                  - paragraph [ref=e131]: Les prochaines réunions planifiées
                - link "Voir tout" [ref=e132] [cursor=pointer]:
                  - /url: /en/meetings
              - generic [ref=e135]:
                - link "18 nov Réunion ordinaire du comité scientifique 09:00 – 11:00 Salle de conférences — Département d'informatique" [ref=e136] [cursor=pointer]:
                  - /url: /en/meetings
                  - generic [ref=e137]:
                    - generic [ref=e138]: "18"
                    - generic [ref=e139]: nov
                  - generic [ref=e140]:
                    - paragraph [ref=e141]: Réunion ordinaire du comité scientifique
                    - paragraph [ref=e142]:
                      - generic [ref=e143]: 09:00 – 11:00
                      - generic [ref=e147]: Salle de conférences — Département d'informatique
                - link "25 nov Suivi des projets de fin d'études 14:00 – 15:30 Salle B12" [ref=e152] [cursor=pointer]:
                  - /url: /en/meetings
                  - generic [ref=e153]:
                    - generic [ref=e154]: "25"
                    - generic [ref=e155]: nov
                  - generic [ref=e156]:
                    - paragraph [ref=e157]: Suivi des projets de fin d'études
                    - paragraph [ref=e158]:
                      - generic [ref=e159]: 14:00 – 15:30
                      - generic [ref=e163]: Salle B12
            - generic [ref=e169]:
              - generic [ref=e170]:
                - generic [ref=e171]:
                  - heading "Avancement des actions" [level=2] [ref=e172]
                  - paragraph [ref=e173]: Répartition par statut
                - link "Kanban" [ref=e174] [cursor=pointer]:
                  - /url: /en/actions
              - generic [ref=e177]:
                - generic [ref=e178]:
                  - paragraph [ref=e179]: "6"
                  - paragraph [ref=e180]: actions au total
                - generic [ref=e181]: 17 % terminées
              - 'img "Actions : 3 à faire, 2 en cours et 1 terminées" [ref=e185]'
              - generic [ref=e189]:
                - generic [ref=e190]:
                  - generic [ref=e191]: À faire
                  - generic [ref=e193]: "3"
                - generic [ref=e194]:
                  - generic [ref=e195]: En cours
                  - generic [ref=e197]: "2"
                - generic [ref=e198]:
                  - generic [ref=e199]: Terminées
                  - generic [ref=e201]: "1"
          - generic [ref=e202]:
            - generic [ref=e204]:
              - generic [ref=e205]:
                - generic [ref=e206]:
                  - heading "Actions à suivre" [level=2] [ref=e207]
                  - paragraph [ref=e208]: Les prochaines échéances à suivre
                - link "Voir tout" [ref=e209] [cursor=pointer]:
                  - /url: /en/actions
              - generic [ref=e212]:
                - link "Vérifier les dossiers de propositions PFE Karim Haddad · En cours 09 nov. En retard" [ref=e213] [cursor=pointer]:
                  - /url: /en/actions
                  - generic [ref=e219]:
                    - paragraph [ref=e220]: Vérifier les dossiers de propositions PFE
                    - paragraph [ref=e221]: Karim Haddad · En cours
                  - generic [ref=e222]:
                    - generic [ref=e223]: 09 nov.
                    - generic [ref=e224]: En retard
                - link "Recueillir les modalités par unité Yanis Aït Ali · En cours 13 nov. À suivre" [ref=e225] [cursor=pointer]:
                  - /url: /en/actions
                  - generic [ref=e231]:
                    - paragraph [ref=e232]: Recueillir les modalités par unité
                    - paragraph [ref=e233]: Yanis Aït Ali · En cours
                  - generic [ref=e234]:
                    - generic [ref=e235]: 13 nov.
                    - generic [ref=e236]: À suivre
                - link "Rédiger la grille d'évaluation commune Nadia Bouzid · À faire 19 nov. Priorité haute" [ref=e237] [cursor=pointer]:
                  - /url: /en/actions
                  - generic [ref=e243]:
                    - paragraph [ref=e244]: Rédiger la grille d'évaluation commune
                    - paragraph [ref=e245]: Nadia Bouzid · À faire
                  - generic [ref=e246]:
                    - generic [ref=e247]: 19 nov.
                    - generic [ref=e248]: Priorité haute
                - link "Rédiger la note sur les sujets de PFE Lina Amrane · À faire 24 nov. Priorité haute" [ref=e249] [cursor=pointer]:
                  - /url: /en/actions
                  - generic [ref=e255]:
                    - paragraph [ref=e256]: Rédiger la note sur les sujets de PFE
                    - paragraph [ref=e257]: Lina Amrane · À faire
                  - generic [ref=e258]:
                    - generic [ref=e259]: 24 nov.
                    - generic [ref=e260]: Priorité haute
            - generic [ref=e262]:
              - generic [ref=e263]:
                - generic [ref=e264]:
                  - heading "Décisions du comité" [level=2] [ref=e265]
                  - paragraph [ref=e266]: Bilan des décisions enregistrées
                - link "Votes" [ref=e267] [cursor=pointer]:
                  - /url: /en/votes
              - generic [ref=e270]:
                - img "3 décisions adoptées, 1 en attente, 1 rejetées" [ref=e271]:
                  - generic [ref=e272]:
                    - generic [ref=e273]: "5"
                    - generic [ref=e274]: décisions
                - generic [ref=e275]:
                  - generic [ref=e276]:
                    - generic [ref=e277]: Adoptées
                    - generic [ref=e279]: "3"
                  - generic [ref=e280]:
                    - generic [ref=e281]: En attente
                    - generic [ref=e283]: "1"
                  - generic [ref=e284]:
                    - generic [ref=e285]: Rejetées
                    - generic [ref=e287]: "1"
          - generic [ref=e288]:
            - generic [ref=e290]:
              - generic [ref=e291]:
                - generic [ref=e292]:
                  - heading "Activité récente" [level=2] [ref=e293]
                  - paragraph [ref=e294]: Dernières notifications
                - link "Voir tout" [ref=e295] [cursor=pointer]:
                  - /url: /en/notifications
              - generic [ref=e298]:
                - link "Convocation à la réunion ordinaire Mercredi 18 novembre à 09 h · Salle de conférences 12 nov." [ref=e299] [cursor=pointer]:
                  - /url: /en/notifications
                  - generic [ref=e303]:
                    - paragraph [ref=e304]: Convocation à la réunion ordinaire
                    - paragraph [ref=e305]: Mercredi 18 novembre à 09 h · Salle de conférences
                  - generic [ref=e306]: 12 nov.
                - link "Action à échéance proche Recueillir les modalités par unité · échéance le 13 novembre 12 nov." [ref=e307] [cursor=pointer]:
                  - /url: /en/notifications
                  - generic [ref=e312]:
                    - paragraph [ref=e313]: Action à échéance proche
                    - paragraph [ref=e314]: Recueillir les modalités par unité · échéance le 13 novembre
                  - generic [ref=e315]: 12 nov.
                - 'link "Rappel : réunion du 18 novembre Préparez les points de l''ordre du jour et les pièces utiles 11 nov." [ref=e316] [cursor=pointer]':
                  - /url: /en/notifications
                  - generic [ref=e321]:
                    - paragraph [ref=e322]: "Rappel : réunion du 18 novembre"
                    - paragraph [ref=e323]: Préparez les points de l'ordre du jour et les pièces utiles
                  - generic [ref=e324]: 11 nov.
            - generic [ref=e326]:
              - generic [ref=e328]:
                - heading "Accès rapides" [level=2] [ref=e329]
                - paragraph [ref=e330]: Retrouver les principaux espaces du comité
              - generic [ref=e331]:
                - link "Ordres du jour Propositions et validations" [ref=e332] [cursor=pointer]:
                  - /url: /en/agenda
                  - generic [ref=e337]:
                    - generic [ref=e338]: Ordres du jour
                    - generic [ref=e339]: Propositions et validations
                - link "Membres Annuaire et mandats" [ref=e343] [cursor=pointer]:
                  - /url: /en/members
                  - generic [ref=e349]:
                    - generic [ref=e350]: Membres
                    - generic [ref=e351]: Annuaire et mandats
                - link "Documents PV et rapports" [ref=e355] [cursor=pointer]:
                  - /url: /en/documents
                  - generic [ref=e359]:
                    - generic [ref=e360]: Documents
                    - generic [ref=e361]: PV et rapports
                - link "Votes Scrutins et résultats" [ref=e365] [cursor=pointer]:
                  - /url: /en/votes
                  - generic [ref=e370]:
                    - generic [ref=e371]: Votes
                    - generic [ref=e372]: Scrutins et résultats
          - generic [ref=e376]:
            - generic [ref=e377]: 6 membres avec mandat en cours · Données fictives au 12 novembre 2026
            - generic [ref=e378]: Les changements des autres modules ne sont pas encore synchronisés.
      - contentinfo [ref=e379]:
        - generic [ref=e380]:
          - generic [ref=e381]: © 2026 Gestion du comité scientifique
          - generic [ref=e382]: Projet universitaire · DevRangers
    - region "Notifications (F8)":
      - list
    - region "Notifications alt+T"
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
> 32 |     expect(overflow, `Débordement horizontal sur ${route} : ${overflow}px`).toBeLessThanOrEqual(2)
     |                                                                             ^ Error: Débordement horizontal sur /dashboards/analytics : 36px
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