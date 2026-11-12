/**
 * Retire les bandeaux techniques des pages et relie les fiches Réunions à l'annuaire.
 * Script idempotent, sans dépendance. Ne touche ni à Prisma, ni aux API, ni à NextAuth.
 * Lancer depuis la racine du dépôt : node scripts/finaliser-interfaces.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const root = process.cwd()
const base = 'src/features/'
const files = [
  'meetings/meetings-client.tsx',
  'meetings/meeting-form.tsx',
  'meetings/meeting-details.tsx',
  'members/members-client.tsx',
  'members/member-details.tsx',
  'members/member-form.tsx',
  'decisions/decisions-actions-client.tsx',
  'agenda/agenda-client.tsx',
  'votes/votes-client.tsx',
  'votes/results-panel.tsx',
  'votes/create-ballot-dialog.tsx',
  'documents/documents-client.tsx',
  'documents/document-form.tsx',
  'documents/minutes-preview.tsx',
  'notifications/notifications-client.tsx',
  'dashboard/dashboard-overview.tsx',
]

function replaceOnce(s, before, after) {
  return s.includes(before) ? s.replace(before, after) : s
}

/** Supprime le paragraphe/div autonome portant exactement ce type d'avertissement. */
function removeNotice(s, text) {
  const pos = s.indexOf(text)
  if (pos === -1) return s
  const before = s.slice(0, pos)
  const p = before.lastIndexOf('<p ')
  const div = before.lastIndexOf('<div ')
  const start = Math.max(p, div)
  if (start === -1 || pos - start > 400) return s
  const tag = start === p ? 'p' : 'div'
  // Refuser d'effacer un gros composant conteneur ou imbriqué.
  if (before.slice(start, pos).includes('</') || before.slice(start, pos).includes('<span')) return s
  const end = s.indexOf(`</${tag}>`, pos)
  if (end === -1 || end - start > 900) return s
  return s.slice(0, start) + s.slice(end + tag.length + 3)
}

let changed = 0
for (const rel of files) {
  const file = path.join(root, base, rel)
  if (!fs.existsSync(file)) { console.warn('Absent :', rel); continue }
  let s = fs.readFileSync(file, 'utf8')
  const prev = s
  const bannerMarkers = {
    'meetings/meetings-client.tsx': ['Démonstration frontend : les changements restent en mémoire'],
    'decisions/decisions-actions-client.tsx': ['Prototype frontend : données fictives, formulaires'],
    'agenda/agenda-client.tsx': ['Démonstration locale : choisissez un profil'],
    'notifications/notifications-client.tsx': ["Environnement de démonstration : aucune notification n'est envoyée"],
    'votes/votes-client.tsx': ['Mode démonstration · Données fictives · Aucune sauvegarde'],
    'documents/documents-client.tsx': ['Mode démonstration · Données fictives · Aucune sauvegarde', 'La visibilité « Comité / Présidence / Archives » est uniquement illustrative.'],
    'documents/minutes-preview.tsx': ['membres dans le jeu de démonstration. Aucun document officiel'],
    'documents/documents-client.tsx': ['Mode démonstration · Données fictives · Aucune sauvegarde', 'La visibilité « Comité / Présidence / Archives » est uniquement illustrative.'],
    'members/members-client.tsx': ['Prototype frontend : ajouts, modifications et suppressions'],
  }
  for (const marker of bannerMarkers[rel] ?? []) s = removeNotice(s, marker)

  if (rel === 'agenda/agenda-client.tsx') {
    s = s.replace('Profil de démonstration', 'Profil actif')
    s = s.replace('dans cette démonstration.', 'dans son état actuel.')
    s = s.replace('Cet aperçu ne modifie pas le module Réunions.', 'Cet ordre est repris dans la fiche de la réunion.')
  }
  if (rel === 'meetings/meeting-form.tsx') {
    s = replaceOnce(s, 'import { committeeMembers } from "./mock-data"', 'import { useDemoData } from "@/lib/demo-store"')
    if (!s.includes('const { members: committeeMembers } = useDemoData()')) {
      s = replaceOnce(s, '  // Le composant est remonté avec une clé différente lors d\'une ouverture.', '  const { members: committeeMembers } = useDemoData()\n  // Le composant est remonté avec une clé différente lors d\'une ouverture.')
    }
    s = s.replace('Informations, participants et ordre du jour — démonstration locale.', 'Informations, participants et ordre du jour.')
  }
  if (rel === 'meetings/meeting-details.tsx') {
    s = replaceOnce(s, 'import { committeeMembers } from "./mock-data"', 'import { useDemoData } from "@/lib/demo-store"')
    // Le composant reçoit un objet meeting et retourne directement un JSX.
    // Insérer le hook dans le corps du composant, pas en dehors.
    if (!s.includes('const { members: committeeMembers } = useDemoData()')) {
      s = s.replace(/(export function MeetingDetails\([\s\S]*?\) \{)/, '$1\n  const { members: committeeMembers } = useDemoData()')
    }
    s = s.replace('Fiche de la réunion — données fictives.', 'Informations et participants de la réunion.')
  }
  if (rel === 'members/member-details.tsx') s = s.replace('Fiche du membre — informations de démonstration.', 'Informations sur le membre et son mandat.')
  if (rel === 'members/member-form.tsx') s = s.replace('Coordonnées, rôle et affectation d\'un siège — données fictives en mémoire.', 'Coordonnées, rôle et affectation d\'un siège.')
  if (rel === 'members/members-client.tsx') {
    s = s.replace('sera retiré uniquement de la liste en mémoire.\n              Cette action n\'affecte pas les réunions existantes ni les comptes utilisateurs.', 'sera retiré de l\'annuaire, à condition de ne pas être référencé par une réunion, un scrutin ou une action.')
    s = removeNotice(s, 'Démonstration frontend : les modifications sont locales')
  }
  if (rel === 'documents/document-form.tsx') {
    s = s.replace('Taille maximale pour cette démonstration : 10 Mo.', 'Taille maximale : 10 Mo.')
    s = s.replace('Aucun envoi sur un serveur. 10 Mo maximum ; le fichier disparaît après rechargement.', 'Taille maximale du fichier : 10 Mo.')
  }
  if (rel === 'documents/documents-client.tsx') {
    s = s.replace('Sélectionnez une réunion fictive sans PV associé.', 'Sélectionnez une réunion sans procès-verbal associé.')
    s = s.replace('useState<string>(initialMinutes[0]?.id ?? "")', 'useState<string>("")')
    s = removeNotice(s, 'Cette création ne synchronise pas la page Réunions.')
  }
  if (rel === 'documents/minutes-preview.tsx') {
    s = s.replace('Comité scientifique · Aperçu non officiel', 'Comité scientifique · Procès-verbal')
    s = s.replace('meeting.agenda.map((item)', 'meeting.agenda.filter((item) => item.status === "Validé").map((item)')
    s = s.replace('Aucune décision fictive associée.', 'Aucune décision associée.')
  }
  if (rel === 'notifications/notifications-client.tsx') {
    s = s.replace('Simuler une notification', 'Créer une notification')
    s = s.replace('Réinitialiser les données de démonstration', 'Réinitialiser les notifications')
    s = s.replace('Consultez et classez les événements simulés.', 'Consultez et classez les dernières notifications.')
  }
  if (rel === 'votes/votes-client.tsx') {
    s = s.replace('Gérez les simulations de vote et consultez leurs résultats.', 'Organisez les scrutins et consultez leurs résultats.')
    s = s.replace('useState(initialBallots[0]?.id ?? "")', 'useState("")')
    s = s.replace('Rouvrir la simulation', 'Rouvrir le scrutin')
  }
  if (rel === 'votes/results-panel.tsx') s = s.replace('Règles de démonstration :', 'Mode de calcul :')
  if (rel === 'votes/create-ballot-dialog.tsx') s = s.replace('Toutes les décisions de démonstration possèdent déjà un scrutin.', 'Toutes les décisions possèdent déjà un scrutin.')
  if (rel === 'dashboard/dashboard-overview.tsx') {
    s = s.replace('Les prochaines séances prévues dans les données de démonstration', 'Les prochaines réunions planifiées')
    s = s.replace('Les échéances les plus proches dans la démonstration', 'Les prochaines échéances à suivre')
    s = s.replace('Dernières notifications de démonstration', 'Dernières notifications')
    s = s.replace('Démonstration · novembre 2026', 'Activité du comité · novembre 2026')
    s = s.replace(' · Données fictives au 12 novembre 2026', '')
  }
  if (s !== prev) {
    fs.writeFileSync(file, s)
    changed += 1
    console.log('Mis à jour :', rel)
  }
}
console.log(`Terminé : ${changed} fichier(s) modifié(s).`)
