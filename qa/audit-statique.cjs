/**
 * DevRangers — Audit statique frontend, lecture seule.
 * Node >= 20, sans dépendance supplémentaire.
 * Exécuter à la racine du dépôt: node qa/audit-statique.cjs
 * Code de sortie 1 : points bloquants détectés.
 */
const fs = require("node:fs")
const path = require("node:path")
const { execFileSync } = require("node:child_process")

const root = process.cwd()
const resolve = (...parts) => path.join(root, ...parts)
const file = (p) => fs.existsSync(resolve(p))
const issues = []
const add = (severity, subject, detail) =>
  issues.push({ severity, subject, detail })
const requiredRoutes = [
  ["Tableau de bord", "dashboards/analytics"],
  ["Réunions", "meetings"],
  ["Membres", "members"],
  ["Décisions et actions", "actions"],
  ["Votes", "votes"],
  ["Documents et PV", "documents"],
  ["Ordres du jour", "agenda"],
  ["Notifications", "notifications"],
  ["Mon profil", "profile"],
  ["Journal d’audit", "audit"],
]
const routeBase = "src/app/[lang]/(dashboard-layout)"
const sourceExtensions = [
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]

console.log("DevRangers — audit statique frontend (lecture seule)")
console.log(`Dossier : ${root}`)
try {
  const branch = execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
    cwd: root,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
  if (branch) console.log(`Branche actuelle (non modifiée) : ${branch}`)
} catch {
  /* dépôt non initialisé : ne bloque pas l'audit */
}

if (!file("package.json")) {
  console.error(
    "ERREUR : exécute le script depuis la racine du projet (package.json manquant)."
  )
  process.exit(2)
}
for (const [label, subdir] of requiredRoutes) {
  const dest = `${routeBase}/${subdir}/page.tsx`
  if (!file(dest)) add("ERREUR", label, `Page manquante : ${dest}`)
}
for (const f of [
  "src/lib/demo-store.ts",
  "src/lib/demo-business.ts",
  "src/components/layout/notification-dropdown.tsx",
  "src/features/profile/profile-client.tsx",
  "src/components/committee-ui/committee-shell.tsx",
  "src/components/committee-ui/committee-ui.css",
  "src/data/navigations.ts",
])
  if (!file(f)) add("ERREUR", "Structure", `Fichier attendu manquant : ${f}`)
for (const lang of ["fr", "en", "ar"]) {
  const f = `src/data/dictionaries/${lang}.json`
  if (!file(f)) {
    add("ERREUR", "Dictionnaire", `${f} absent`)
    continue
  }
  try {
    JSON.parse(fs.readFileSync(resolve(f), "utf8"))
  } catch (e) {
    add("ERREUR", "Dictionnaire", `${f} non valide : ${e.message}`)
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ["node_modules", ".next", ".git", "dist", ".turbo"].includes(entry.name)
    )
      continue
    const dest = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(dest))
    else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name)) out.push(dest)
  }
  return out
}

function importPathExists(importer, specifier) {
  const clean = specifier.split("?")[0]
  const base = clean.startsWith("@/")
    ? resolve("src", clean.slice(2))
    : path.resolve(path.dirname(importer), clean)
  const candidates = [
    base,
    ...sourceExtensions.map((ext) => base + ext),
    ...sourceExtensions.map((ext) => path.join(base, "index" + ext)),
  ]
  return candidates.some((p) => {
    try {
      return fs.statSync(p).isFile()
    } catch {
      return false
    }
  })
}

const sources = walk(resolve("src")).filter((filename) => {
  const relative = path.relative(root, filename).replaceAll("\\", "/")
  return (
    relative !== "src/lib/prisma.ts" && !relative.startsWith("src/generated/")
  )
})
let examinedImports = 0
for (const filename of sources) {
  const rel = path.relative(root, filename).replaceAll("\\", "/")
  const content = fs.readFileSync(filename, "utf8")
  // Importations statiques depuis les alias du projet et les chemins relatifs.
  const importPattern =
    /(?:\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?|\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+|\brequire\s*\(\s*)['"]([^'"]+)['"]/g
  for (const match of content.matchAll(importPattern)) {
    const spec = match[1]
    const target = spec.startsWith("@/")
      ? resolve("src", spec.slice(2))
      : path.resolve(path.dirname(filename), spec)
    const relativeTarget = path.relative(root, target).replaceAll("\\", "/")
    if (
      spec.startsWith("@prisma/") ||
      /^src\/lib\/prisma(?:\.ts)?$|^src\/generated\/prisma\//.test(
        relativeTarget
      )
    ) {
      add("ERREUR", "Dépendance BDD dans le frontend", `${rel} → ${spec}`)
    }
    if (
      !spec.startsWith("@/") &&
      !spec.startsWith("./") &&
      !spec.startsWith("../")
    )
      continue
    examinedImports++
    if (!importPathExists(filename, spec)) {
      add("ERREUR", "Import introuvable", `${rel} → ${spec}`)
    }
  }
  if (
    rel.startsWith("src/features/") &&
    /démonstration frontend|aucun appel api|seront perdu(?:e)?s après actualisation|aucune sauvegarde en base de données/i.test(
      content
    )
  ) {
    add(
      "AVERTISSEMENT",
      "Bandeau technique",
      `Mention de démonstration potentiellement visible dans ${rel}`
    )
  }
}

const dashboardPath = resolve("src/features/dashboard/dashboard-overview.tsx")
if (fs.existsSync(dashboardPath)) {
  const text = fs.readFileSync(dashboardPath, "utf8")
  const count = (
    text.match(
      /\bconst\s*\{[^}]*\bdashboardMetrics\b[^}]*\}\s*=\s*useDashboardData\s*\(/g
    ) || []
  ).length
  if (count > 1)
    add(
      "ERREUR",
      "Dashboard",
      `${count} déclarations répétées de useDashboardData() dans dashboard-overview.tsx`
    )
}
const nav = resolve("src/data/navigations.ts")
if (fs.existsSync(nav)) {
  const source = fs.readFileSync(nav, "utf8")
  for (const match of source.matchAll(/\bhref\s*:\s*['"`]([^'"`]+)['"`]/g)) {
    const route = match[1].split("#")[0].split("?")[0]
    if (!route.startsWith("/") || route === "/") continue
    if (
      /^\/(apps|pages|extended-ui|charts|tables|forms|design-system)\b/.test(
        route
      )
    ) {
      add(
        "AVERTISSEMENT",
        "Menu ancien",
        `Lien héritage Shadboard encore présent : ${route}`
      )
    }
    if (route.startsWith("/dashboards/") && route !== "/dashboards/analytics") {
      add("AVERTISSEMENT", "Navigation", `Vérifier la route du menu : ${route}`)
    }
  }
  if (!source.includes("/profile"))
    add(
      "AVERTISSEMENT",
      "Sidebar",
      "Aucun chemin /profile trouvé dans navigations.ts"
    )
  if (!source.includes("/notifications"))
    add(
      "AVERTISSEMENT",
      "Sidebar",
      "Aucun chemin /notifications trouvé dans navigations.ts"
    )
}
for (const legacy of ["src/app/api", "src/configs/next-auth.ts"]) {
  if (file(legacy))
    add(
      "AVERTISSEMENT",
      "Ancien template",
      `À examiner (non supprimé automatiquement) : ${legacy}`
    )
}

const errors = issues.filter((x) => x.severity === "ERREUR")
const warnings = issues.filter((x) => x.severity === "AVERTISSEMENT")
console.log(
  `\nPages vérifiées : ${requiredRoutes.length} | Fichiers source : ${sources.length} | Imports locaux examinés : ${examinedImports}`
)
for (const issue of issues.slice(0, 80))
  console.log(`[${issue.severity}] ${issue.subject} — ${issue.detail}`)
if (issues.length > 80)
  console.log(`… ${issues.length - 80} autres points masqués dans la console`)
console.log(
  `\nBilan : ${errors.length} erreur(s), ${warnings.length} avertissement(s).`
)
console.log("Ce script ne supprime ni ne modifie aucun fichier du projet.")
const outputDir = resolve("qa/rapports")
fs.mkdirSync(outputDir, { recursive: true })
const report = {
  scannedAt: new Date().toISOString(),
  routesChecked: requiredRoutes.length,
  sourceFiles: sources.length,
  importsChecked: examinedImports,
  errors: errors.length,
  warnings: warnings.length,
  issues,
}
const reportPath = path.join(outputDir, "audit-statique.json")
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n")
console.log(
  `Rapport : ${path.relative(root, reportPath).replaceAll("\\", "/")}`
)
process.exit(errors.length ? 1 : 0)
