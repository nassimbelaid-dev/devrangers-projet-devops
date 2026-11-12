/*
 * Nettoyage prudent Shadboard -> frontend DevRangers.
 * node scripts/nettoyer-shadboard.cjs                 : audit uniquement
 * node scripts/nettoyer-shadboard.cjs --appliquer     : sauvegarde puis nettoyage
 * Nécessite Node >=22. Ne modifie pas les features ni l'état partagé.
 */
"use strict"
const fs = require("node:fs")
const path = require("node:path")

const root = process.cwd()
const src = path.join(root, "src")
const apply = process.argv.includes("--appliquer")
const rel = (p) => path.relative(root, p).replaceAll(path.sep, "/")
const exists = (p) => fs.existsSync(path.join(root, p))
const read = (p) => fs.readFileSync(path.join(root, p), "utf8")
const toFull = (p) => path.join(root, p)
const essential = [
  "src/features/meetings/meetings-client.tsx",
  "src/features/members/members-client.tsx",
  "src/features/decisions/decisions-actions-client.tsx",
  "src/features/votes/votes-client.tsx",
  "src/features/documents/documents-client.tsx",
  "src/features/agenda/agenda-client.tsx",
  "src/features/notifications/notifications-client.tsx",
  "src/features/dashboard/dashboard-overview.tsx",
  "src/lib/demo-store.ts",
  "src/components/layout/notification-dropdown.tsx",
]
if (!exists("package.json") || !fs.existsSync(src)) {
  console.error("Erreur : exécuter ce script à la racine du projet Next.js.")
  process.exit(1)
}
const missing = essential.filter((p) => !exists(p))
if (missing.length) {
  console.error("Nettoyage refusé : fichiers attendus absents :\n  " + missing.join("\n  "))
  process.exit(1)
}
if (!read("src/components/layout/notification-dropdown.tsx").includes('useDemoCollection("notifications")')) {
  console.error("Installe d'abord le composant de notification de l'archive (il doit utiliser le store partagé).")
  process.exit(1)
}

const dashboardBase = "src/app/[lang]/(dashboard-layout)"
const remove = []
const addRemove = (p) => { if (exists(p) && !remove.includes(p)) remove.push(p) }
const appFolder = toFull(dashboardBase)
const keepRoutes = new Set(["layout.tsx", "template.tsx", "loading.tsx", "error.tsx", "not-found.tsx", "meetings", "members", "actions", "votes", "documents", "agenda", "notifications", "dashboards"])
if (!fs.existsSync(appFolder)) {
  console.error(`Le dossier ${dashboardBase} est introuvable ; aucun nettoyage exécuté.`)
  process.exit(1)
}
const knownDemoRoutes = new Set([
  "(design-system)", "apps", "pages", "charts", "forms", "tables", "extended-ui", "ui", "components",
  "widgets", "icons", "dashboard", "layouts", "authentication", "ecommerce", "crm",
])
const unknownRoutes = []
for (const entry of fs.readdirSync(appFolder, {withFileTypes: true})) {
  if (keepRoutes.has(entry.name)) continue
  if (knownDemoRoutes.has(entry.name)) addRemove(`${dashboardBase}/${entry.name}`)
  else unknownRoutes.push(`${dashboardBase}/${entry.name}`)
}
const dash = `${dashboardBase}/dashboards`
if (exists(dash)) {
  const knownDemoDashboards = new Set([
    "crm", "ecommerce", "e-commerce", "finance", "education", "sales", "projects",
    "project", "logistics", "marketing", "jobs", "job", "medical", "social", "saas",
  ])
  for (const entry of fs.readdirSync(toFull(dash), {withFileTypes: true})) {
    if (entry.name === "analytics") continue
    if (knownDemoDashboards.has(entry.name)) addRemove(`${dash}/${entry.name}`)
    else unknownRoutes.push(`${dash}/${entry.name}`)
  }
  const analyticsPage = `${dash}/analytics/page.tsx`
  // Anciennes cartes Analytics à supprimer UNIQUEMENT si la page personnalisée n'y fait plus référence.
  if (exists(`${dash}/analytics/_components`) && exists(analyticsPage) && !/from\s+[\"']\.\/_components\//.test(read(analyticsPage))) {
    addRemove(`${dash}/analytics/_components`)
  }
}
for (const p of [
  "src/app/[lang]/[...not-found]",
  "src/lib/auth.ts",
  "src/app/[lang]/(plain-layout)",
  "src/app/(unlocalized)",
  "src/app/api",
  "prisma",
  "src/configs/next-auth.ts",
  "src/lib/prisma.ts",
  "src/providers/next-auth-provider.tsx",
  "src/lib/auth-routes.ts",
  "src/data/notifications.ts",
  "src/mdx-components.tsx",
  "mdx.d.ts",
  "src/types/next-auth.d.ts",
]) addRemove(p)
// Certains dossiers de composants ne servent qu'aux pages du template.
// Ne jamais supprimer ui, layout, committee-ui ou les features métier.
const demoComponentDirs = ["auth", "apps", "dashboards", "pages", "extended-ui", "forms", "charts", "ecommerce", "chat", "email", "kanban", "calendar", "authentication", "mdx"]
for (const dir of demoComponentDirs) {
  const candidate = `src/components/${dir}`
  if (exists(candidate)) addRemove(candidate)
}

// Transformations minimales qui suppriment les branchements Auth/Prisma du layout.
const updates = new Map()
const rootLayout = "src/app/[lang]/layout.tsx"
const providers = "src/providers/index.tsx"
if (!exists(rootLayout) || !exists(providers) || !exists("src/middleware.ts")) {
  console.error("Layout/provideurs/middleware inattendus : abandon pour éviter de casser l'authentification.")
  process.exit(1)
}
let l = read(rootLayout)
if (l.includes("getServerSession")) {
  l = l.replace(/^import\s*\{\s*getServerSession\s*\}\s*from\s*["']next-auth["']\s*\r?\n/m, "")
    .replace(/^import\s*\{\s*authOptions\s*\}\s*from\s*["']@\/configs\/next-auth["']\s*\r?\n/m, "")
    .replace(/^\s*const session = await getServerSession\(authOptions\)\s*\r?\n/m, "\n")
    .replace(/\s+session=\{session\}/g, "")
}
if (/getServerSession|authOptions|session=\{session\}/.test(l)) {
  console.error(`Le layout ${rootLayout} contient une utilisation Auth non reconnue : retrait de Prisma interdit.`)
  process.exit(1)
}
l = l.replaceAll("Shadboard", "Gestion du comité scientifique")
updates.set(rootLayout, l)
let p = read(providers)
if (p.includes("NextAuthProvider")) {
  p = p.replace(/^import type \{ Session \} from ["']next-auth["']\s*\r?\n/m, "")
    .replace(/^import \{ NextAuthProvider \} from ["']\.\/next-auth-provider["']\s*\r?\n/m, "")
    .replace(/^\s*session,\s*\r?\n/m, "")
    .replace(/^\s*session:\s*Session\s*\|\s*null\s*\r?\n/m, "")
    .replace(/^\s*<NextAuthProvider session=\{session\}>\s*\r?\n/m, "")
    .replace(/^\s*<\/NextAuthProvider>\s*\r?\n/m, "")
}
if (/NextAuthProvider|session:\s*Session|session,/.test(p)) {
  console.error(`Le fichier ${providers} a été personnalisé et nécessite une inspection manuelle.`)
  process.exit(1)
}
updates.set(providers, p)
updates.set("src/middleware.ts", `import { NextResponse } from "next/server"\nimport type { NextRequest } from "next/server"\nimport { ensureLocalizedPathname, getLocaleFromPathname, getPreferredLocale } from "@/lib/i18n"\n\n// L'application est consultable en mode frontend ; l'authentification sera réintroduite ultérieurement.\nexport function middleware(request: NextRequest) {\n  const pathname = request.nextUrl.pathname\n  if (!getLocaleFromPathname(pathname)) {\n    const locale = getPreferredLocale(request)\n    const destination = ensureLocalizedPathname(pathname, locale)\n    return NextResponse.redirect(new URL(destination + request.nextUrl.search, request.url))\n  }\n  return NextResponse.next()\n}\n\nexport const config = {\n  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images|docs).*)"],\n}\n`)
// Le dropdown de profil de Shadboard déclenchait signOut() ; il devient un accès simple à l'annuaire.
updates.set("src/components/layout/user-dropdown.tsx", `import Link from "next/link"\nimport { UsersRound } from "lucide-react"\nimport type { DictionaryType } from "@/lib/get-dictionary"\nimport type { LocaleType } from "@/types"\nimport { ensureLocalizedPathname } from "@/lib/i18n"\nimport { Button } from "@/components/ui/button"\n\nexport function UserDropdown({ locale }: { dictionary: DictionaryType; locale: LocaleType }) {\n  return (\n    <Button variant="ghost" asChild className="gap-2 rounded-xl" title="Annuaire du comité">\n      <Link href={ensureLocalizedPathname("/members", locale)} aria-label="Ouvrir l'annuaire des membres">\n        <UsersRound className="size-4" aria-hidden="true" />\n        <span className="hidden text-sm sm:inline">Membres</span>\n      </Link>\n    </Button>\n  )\n}\n`)
if (exists("src/components/layout/footer.tsx")) {
  const f = read("src/components/layout/footer.tsx")
  if (f.includes("Shadboard") && f.includes("Designed & Developed")) {
    updates.set("src/components/layout/footer.tsx", `export function Footer() {\n  return (\n    <footer className="border-t border-border/60 bg-background/70 px-5 py-4 text-xs text-muted-foreground">\n      <div className="container flex flex-col gap-2 sm:flex-row sm:justify-between">\n        <span>© {new Date().getFullYear()} Gestion du comité scientifique</span>\n        <span>Projet universitaire · DevRangers</span>\n      </div>\n    </footer>\n  )\n}\n`)
  }
}
const nextConfigFile = "next.config.mjs"
if (exists(nextConfigFile)) {
  const n = read(nextConfigFile)
  if (n.includes("createMDX") && n.includes("async redirects()") && n.includes("export default withMDX(nextConfig)")) {
    updates.set(nextConfigFile, `/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  transpilePackages: ["lucide-react"],\n  async redirects() {\n    return [{\n      source: "/:lang",\n      destination: "/:lang/dashboards/analytics",\n      permanent: false,\n    }]\n  },\n}\nexport default nextConfig\n`)
  } else if (n.includes("next-auth.session-token") || n.includes("createMDX")) {
    console.error("next.config.mjs est personnalisé : impossible de retirer automatiquement les redirections d'authentification / MDX.")
    process.exit(1)
  }
}
// Menu métier unique. Les titres techniques sont mappés sur les dictionnaires existants/ajoutés.
updates.set("src/data/navigations.ts", `import type { NavigationType } from "@/types"

export const navigationsData: NavigationType[] = [
  {
    title: "Comité scientifique",
    items: [
      { title: "Tableau de bord", href: "/dashboards/analytics", iconName: "ChartPie" },
      { title: "Réunions", href: "/meetings", iconName: "CalendarDays" },
      { title: "Membres", href: "/members", iconName: "Users" },
      { title: "Ordre du jour", href: "/agenda", iconName: "ListOrdered" },
      { title: "Votes et résultats", href: "/votes", iconName: "CheckCircle" },
      { title: "Décisions et actions", href: "/actions", iconName: "Grid2x2" },
      { title: "Documents", href: "/documents", iconName: "FolderOpen" },
      { title: "Centre de notifications", href: "/notifications", iconName: "Bell" },
    ],
  },
]
`)
for (const language of ["en", "ar"]) {
  const filename = `src/data/dictionaries/${language}.json`
  if (!exists(filename)) continue
  const json = JSON.parse(read(filename))
  if (!json.navigation || typeof json.navigation !== "object") {
    console.error(`Dictionnaire ${filename} invalide`)
    process.exit(1)
  }
  Object.assign(json.navigation, {
    "comitéScientifique": "Comité scientifique",
    "tableauDeBord": "Tableau de bord",
    "réunions": "Réunions",
    "membres": "Membres",
    "ordreDuJour": "Ordre du jour",
    "votesEtRésultats": "Votes et résultats",
    "décisionsEtActions": "Décisions et actions",
    "documents": "Documents",
    "centreDeNotifications": "Notifications",
  })
  updates.set(filename, JSON.stringify(json, null, 2) + "\n")
}
// Supprimer les scripts et dépendances d'authentification de démonstration.
// La régénération de pnpm-lock.yaml est laissée au gestionnaire pnpm.
const pkg = JSON.parse(read("package.json"))
if (pkg.scripts) {
  delete pkg.scripts.migrate
  if (typeof pkg.scripts.postinstall === "string" && /prisma\s+generate/.test(pkg.scripts.postinstall)) delete pkg.scripts.postinstall
}
for (const dependency of ["next-auth", "@auth/prisma-adapter", "@prisma/client", "@next/mdx", "@mdx-js/loader", "@mdx-js/react"]) {
  if (pkg.dependencies) delete pkg.dependencies[dependency]
  if (pkg.devDependencies) delete pkg.devDependencies[dependency]
}
if (pkg.devDependencies) delete pkg.devDependencies.prisma
if (pkg.dependencies) delete pkg.dependencies.prisma
pkg.name = "devrangers-comite-scientifique"
updates.set("package.json", JSON.stringify(pkg, null, 2) + "\n")
const envSample = ".env.example"
if (exists(envSample)) {
  const filtered = read(envSample).split(/\r?\n/).filter((line) => !/^\s*(DATABASE_URL|NEXTAUTH_URL|NEXTAUTH_SECRET|HOME_PATHNAME)\s*=/.test(line)).join("\n")
  updates.set(envSample, filtered.trimEnd() + "\n")
}

const sidebarFile = "src/components/layout/sidebar.tsx"
if (exists(sidebarFile)) {
  let s = read(sidebarFile)
  if (s.includes('src="/images/icons/shadboard.svg"')) {
    s = s.replace(/<Image\s+src="\/images\/icons\/shadboard\.svg"[\s\S]*?\/>/, '<Landmark className="me-2 size-5 text-indigo-600" aria-hidden="true" />')
    s = s.replace(/^import Image from "next\/image"\s*\r?\n/m, "")
    s = s.replace(/import \{ ChevronDown \} from "lucide-react"/, 'import { ChevronDown, Landmark } from "lucide-react"')
  }
  if (s.includes("Shadboard")) s = s.replaceAll("Shadboard", "Comité scientifique")
  if (s !== read(sidebarFile)) updates.set(sidebarFile, s)
}
const horizontalHeader = "src/components/layout/horizontal-layout/bottom-bar-header.tsx"
if (exists(horizontalHeader)) {
  let h = read(horizontalHeader)
  if (h.includes('src="/images/icons/shadboard.svg"')) {
    h = h.replace(/<Image\s+src="\/images\/icons\/shadboard\.svg"[\s\S]*?\/>/, '<Landmark className="me-2 size-5 text-indigo-600" aria-hidden="true" />')
    h = h.replace(/^import Image from "next\/image"\s*\r?\n/m, "")
    if (!h.includes('from "lucide-react"')) h = h.replace('import Link from "next/link"', 'import Link from "next/link"\nimport { Landmark } from "lucide-react"')
  }
  h = h.replaceAll("Shadboard", "Comité scientifique")
  if (h !== read(horizontalHeader)) updates.set(horizontalHeader, h)
}

// Liste des sources qui resteront après nettoyage, pour repérer les dépendances critiques.
function filesUnder(dir) {
  if (!fs.existsSync(dir)) return []
  const stat = fs.statSync(dir)
  if (stat.isFile()) return [dir]
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => filesUnder(path.join(dir, e.name)))
}
const removedFull = remove.map(toFull)
const isRemoved = (file) => removedFull.some((target) => file === target || file.startsWith(target + path.sep))
const remaining = filesUnder(src).filter((f) => /\.(tsx?|jsx?|mdx)$/.test(f) && !isRemoved(f))
const importBlocks = []
const patterns = [/(?:from\s*|import\s*\(|require\s*\()\s*["'](?:next-auth(?:\/[^"']*)?|@auth\/prisma-adapter|@prisma\/client|@\/lib\/prisma|@\/configs\/next-auth|@\/data\/notifications|@next\/mdx|@mdx-js\/(?:react|loader))["']/g,
  /(?:from\s*|import\s*\()\s*["']@\/components\/(?:auth|apps|dashboards|pages|extended-ui|forms|charts|ecommerce|chat|email|kanban|calendar|authentication)\//g,
]
for (const full of remaining) {
  const filename = rel(full)
  const contents = updates.get(filename) ?? fs.readFileSync(full, "utf8")
  if (patterns.some((re) => { re.lastIndex = 0; return re.test(contents) })) importBlocks.push(filename)
  // Contrôle des imports relatifs et des alias qui cibleraient un fichier supprimé.
  const importSpec = /(?:from\s*|import\s*\(|require\s*\()\s*["']([^"']+)["']/g
  for (const match of contents.matchAll(importSpec)) {
    const spec = match[1]
    let resolved
    if (spec.startsWith("@/")) resolved = path.join(src, spec.slice(2))
    else if (spec.startsWith(".")) resolved = path.resolve(path.dirname(full), spec)
    else continue
    if (isRemoved(resolved)) importBlocks.push(`${filename} → ${spec}`)
  }
}

console.log("\n===== Audit DevRangers — nettoyage Shadboard =====")
console.log("Composants métier conservés : 8 modules + shared store + composants UI/layout")
console.log(`Suppression proposée : ${remove.length} chemins\n`)
remove.forEach((item) => console.log("  - " + item))
if (unknownRoutes.length) {
  console.log("\nRoutes non reconnues CONSERVÉES par prudence (à contrôler manuellement) :")
  unknownRoutes.forEach((item) => console.log("  ? " + item))
}
console.log(`\nFichiers source mis à jour : ${updates.size}`)
updates.forEach((value, filename) => { if (!exists(filename) || read(filename) !== value) console.log("  ~ " + filename) })
if (importBlocks.length) {
  console.error("\nATTENTION — références résiduelles détectées ; aucun retrait de backend ou des composants associés n'est sûr :")
  importBlocks.slice(0, 35).forEach((f) => console.error("  ! " + f))
  console.error("Supprime/convertis d'abord ces imports, puis relance l'audit.")
  if (apply) process.exit(2)
}
if (!apply) {
  console.log("\nAucune modification effectuée. Pour appliquer : node scripts/nettoyer-shadboard.cjs --appliquer")
  process.exit(0)
}

const dateCode = new Date().toISOString().replace(/[:.]/g, "-")
const backup = path.join(path.dirname(root), `devrangers-sauvegarde-nettoyage-${dateCode}`)
fs.mkdirSync(backup, {recursive: true})
function backupPath(item) {
  const original = toFull(item)
  if (!fs.existsSync(original)) return
  const target = path.join(backup, item)
  fs.mkdirSync(path.dirname(target), {recursive: true})
  fs.cpSync(original, target, {recursive: true})
}
const modified = [...updates.entries()].filter(([filename, value]) => !exists(filename) || read(filename) !== value)
for (const item of [...new Set([...remove, ...modified.map(([filename]) => filename)])]) backupPath(item)
for (const [filename, content] of modified) {
  const dest = toFull(filename)
  fs.mkdirSync(path.dirname(dest), {recursive: true})
  fs.writeFileSync(dest, content, "utf8")
}
for (const item of remove) fs.rmSync(toFull(item), {recursive: true, force: true})
// Dossiers de démonstration supprimés, mais aucun composant partagé n'est supprimé à l'aveugle.
console.log(`\nNettoyage effectué. Sauvegarde complète : ${backup}`)
console.log("Dépendances supprimées de package.json : exécuter `pnpm install --ignore-scripts` pour actualiser pnpm-lock.yaml et node_modules.")
console.log("Vérifier pnpm exec tsc --noEmit, pnpm build, puis git status.")
