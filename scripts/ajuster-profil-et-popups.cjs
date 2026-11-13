/*
 * DevRangers — ajustements de navigation et largeur des formulaires.
 * Audit : node scripts/ajuster-profil-et-popups.cjs
 * Appliquer : node scripts/ajuster-profil-et-popups.cjs --appliquer
 * Conçu pour être relancé ; ne modifie aucune donnée, API ou auth.
 */
"use strict"

const fs = require("node:fs")
const path = require("node:path")

const root = process.cwd()
const apply = process.argv.includes("--appliquer")
const changes = new Map()
const warnings = []
const posix = (p) => p.split(path.sep).join("/")
const full = (p) => path.join(root, p)
const exists = (p) => fs.existsSync(full(p))
const read = (p) => fs.readFileSync(full(p), "utf8")
const put = (p, text) => {
  if (exists(p) && read(p) !== text) changes.set(p, text)
}

for (const required of [
  "package.json",
  "src/data/navigations.ts",
  "src/data/dictionaries/en.json",
  "src/data/dictionaries/ar.json",
  "src/components/committee-ui/committee-shell.tsx",
  "src/components/committee-ui/committee-ui.css",
  "src/app/[lang]/(dashboard-layout)/profile/page.tsx",
  "src/features/profile/profile-client.tsx",
]) {
  if (!exists(required)) {
    console.error(`Fichier requis manquant : ${required}. Extraire d'abord le ZIP à la racine du projet.`)
    process.exit(1)
  }
}

// 1. Navigation : conserver la structure existante, ajouter seulement "Mon profil".
const navPath = "src/data/navigations.ts"
let nav = read(navPath)
if (!nav.includes("export const navigationsData")) {
  console.error("Navigation non reconnue ; aucune modification appliquée.")
  process.exit(1)
}
if (/title:\s*["']Mon profil["']/.test(nav)) {
  nav = nav.replace(/(title:\s*["']Mon profil["'][\s\S]*?href:\s*)["'][^"']*["']/, '$1"/profile"')
} else if (!/href:\s*["']\/profile["']/.test(nav)) {
  // Dernier ] du tableau navigationsData, après le dernier objet.
  const end = nav.lastIndexOf("]")
  if (end < 0 || !nav.slice(0, end).includes("items:")) {
    console.error("Impossible de localiser le tableau de navigation ; aucune modification appliquée.")
    process.exit(1)
  }
  const before = nav.slice(0, end).trimEnd()
  const trailingComma = /,\s*$/.test(before) ? "" : ","
  nav = `${before}${trailingComma}\n  {\n    title: "Compte",\n    items: [\n      { title: "Mon profil", href: "/profile", iconName: "User" },\n    ],\n  },\n${nav.slice(end)}`
}
put(navPath, nav)

// 2. Dictionnaires : éviter les erreurs de traduction de la sidebar Shadboard.
for (const language of ["en", "ar"]) {
  const filename = `src/data/dictionaries/${language}.json`
  const data = JSON.parse(read(filename))
  if (!data.navigation || typeof data.navigation !== "object" || Array.isArray(data.navigation)) {
    console.error(`Dictionnaire invalide : ${filename}`)
    process.exit(1)
  }
  data.navigation.compte = "Compte"
  data.navigation.monProfil = "Mon profil"
  put(filename, JSON.stringify(data, null, 2) + "\n")
}

// 3. Ajouter "profile" aux modules visuels existants sans changer les autres.
const shellFile = "src/components/committee-ui/committee-shell.tsx"
let shell = read(shellFile)
if (!shell.includes('"profile"')) {
  if (!shell.includes('| "notifications"')) {
    console.error("Type CommitteeModule non reconnu : impossible de prendre en charge le profil.")
    process.exit(1)
  }
  shell = shell.replace('| "notifications"', '| "notifications"\n  | "profile"')
}
put(shellFile, shell)

const cssFile = "src/components/committee-ui/committee-ui.css"
const css = read(cssFile)
if (!css.includes('data-module="profile"')) {
  put(cssFile, css.trimEnd() + '\n\n/* Profil — accent indigo cohérent avec le dashboard. */\n.committee-ui[data-module="profile"] { --committee-accent: #6366f1; }\n')
}

// 4. Ajuster UNIQUEMENT les fenêtres de nos fonctionnalités, sans toucher à ui/dialog.tsx.
// Certaines cibles peuvent avoir été personnalisées : on n'écrase jamais le composant.
const widthTargets = [
  ["src/features/meetings/meeting-form.tsx", "sm:max-w-xl"],
  ["src/features/members/member-form.tsx", "sm:max-w-lg"],
  ["src/features/agenda/agenda-form.tsx", "sm:max-w-lg"],
  ["src/features/decisions/action-form.tsx", "sm:max-w-md"],
  ["src/features/decisions/decision-form.tsx", "sm:max-w-md"],
  ["src/features/documents/document-form.tsx", "sm:max-w-lg"],
  ["src/features/votes/create-ballot-dialog.tsx", "sm:max-w-md"],
  ["src/features/meetings/meeting-details.tsx", "sm:max-w-xl"],
  ["src/features/members/member-details.tsx", "sm:max-w-lg"],
  ["src/features/agenda/agenda-details.tsx", "sm:max-w-lg"],
  ["src/features/documents/document-details.tsx", "sm:max-w-xl"],
  ["src/features/notifications/notification-details.tsx", "sm:max-w-md"],
]
let modalsProcessed = 0
for (const [filename, targetWidth] of widthTargets) {
  if (!exists(filename)) {
    warnings.push(`Formulaire absent, ignoré : ${filename}`)
    continue
  }
  let count = 0
  let source = read(filename)
  source = source.replace(/<DialogContent\b[^>]*>/g, (tag) => {
    if (!tag.includes('className="')) {
      warnings.push(`Fenêtre personnalisée sans className, ignorée : ${filename}`)
      return tag
    }
    if (tag.includes('className={')) {
      warnings.push(`Fenêtre à classes dynamiques, ignorée : ${filename}`)
      return tag
    }
    count += 1
    return tag.replace(/className="([^"]*)"/, (_, current) => {
      let classes = current.replace(/\bsm:max-w-(?:\[[^\]]*\]|[^\s]+)/g, "").replace(/\s{2,}/g, " ").trim()
      classes = classes.replace(/\bmax-h-\[90vh\]/g, "max-h-[85dvh]")
      if (!classes.includes("max-h-")) classes += " max-h-[85dvh]"
      if (!classes.includes("overflow-y-auto")) classes += " overflow-y-auto"
      if (!classes.includes("w-[calc(100vw-2rem)]")) classes += " w-[calc(100vw-2rem)]"
      classes += ` ${targetWidth}`
      return `className="${classes.trim()}"`
    })
  })
  if (!count) {
    warnings.push(`Aucun DialogContent standard reconnu : ${filename}`)
    continue
  }
  if (filename === "src/features/meetings/meeting-form.tsx") {
    // Trois champs date/heure sont trop serrés dans une modale plus compacte.
    source = source.replace("grid gap-4 sm:grid-cols-3", "grid gap-4 sm:grid-cols-2")
  }
  if (source !== read(filename)) {
    modalsProcessed += count
    put(filename, source)
  }
}

// 5. L'ancien accès profil de la barre du haut (après nettoyage V2) peut être réutilisé.
// Seulement si on reconnaît précisément la version nettoyée.
const userDropdownPath = "src/components/layout/user-dropdown.tsx"
if (exists(userDropdownPath)) {
  const original = read(userDropdownPath)
  if (original.includes('ensureLocalizedPathname("/members", locale)') && original.includes("Annuaire du comité")) {
    let updated = original
      .replace('ensureLocalizedPathname("/members", locale)', 'ensureLocalizedPathname("/profile", locale)')
      .replaceAll("Annuaire du comité", "Mon profil")
      .replaceAll("Ouvrir l'annuaire des membres", "Ouvrir mon profil")
      .replace('>Membres</span>', '>Mon profil</span>')
      .replaceAll("UsersRound", "UserRound")
    put(userDropdownPath, updated)
  }
}

console.log("\n===== Ajustement DevRangers : profil et fenêtres =====")
console.log(`Mode : ${apply ? "APPLICATION" : "APERÇU (aucun fichier modifié)"}`)
console.log(`Fichiers à adapter : ${changes.size}; fenêtres ciblées à ajuster : ${modalsProcessed}`)
for (const filename of changes.keys()) console.log(`  ~ ${posix(filename)}`)
for (const warning of warnings) console.warn("  ! " + warning)

if (!apply) {
  console.log("\nAprès vérification : node .\\scripts\\ajuster-profil-et-popups.cjs --appliquer")
  process.exit(0)
}
if (changes.size === 0) {
  console.log("Aucune modification nécessaire. Le script est déjà appliqué.")
  process.exit(0)
}

const stamp = new Date().toISOString().replace(/[.:]/g, "-")
const backup = path.join(path.dirname(root), `devrangers-backup-profil-${stamp}`)
for (const filename of changes.keys()) {
  const backupFile = path.join(backup, filename)
  fs.mkdirSync(path.dirname(backupFile), {recursive: true})
  fs.copyFileSync(full(filename), backupFile)
}
for (const [filename, text] of changes) fs.writeFileSync(full(filename), text, "utf8")
console.log(`\nModifications appliquées. Sauvegarde : ${backup}`)
console.log("Vérifier : pnpm exec tsc --noEmit ; pnpm build ; git diff --stat")
