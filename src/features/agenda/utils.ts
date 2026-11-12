import type { AgendaProposal } from "./types"

export function formatAgendaDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(iso))
}

export function memberLabel(id: string, members: { id: string; name: string }[]): string {
  return members.find((member) => member.id === id)?.name ?? "Membre inconnu"
}

export function sortAgenda(items: AgendaProposal[]): AgendaProposal[] {
  const rank = { "Validé": 0, "Proposé": 1, "Rejeté": 2 }
  return [...items].sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
    if (a.status === "Validé" && b.status === "Validé") return (a.order ?? 9999) - (b.order ?? 9999)
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/** Classe les points validés sans modifier les autres réunions. */
export function moveValidatedPoint(
  items: AgendaProposal[], meetingId: string, itemId: string, direction: -1 | 1
): AgendaProposal[] {
  const approved = items
    .filter((item) => item.meetingId === meetingId && item.status === "Validé")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const index = approved.findIndex((item) => item.id === itemId)
  const destination = index + direction
  if (index < 0 || destination < 0 || destination >= approved.length) return items
  const reordered = [...approved]
  ;[reordered[index], reordered[destination]] = [reordered[destination], reordered[index]]
  const positions = new Map(reordered.map((item, order) => [item.id, order]))
  return items.map((item) => positions.has(item.id) ? { ...item, order: positions.get(item.id)! } : item)
}

export function makeAgendaId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `agenda-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Un fichier ajouté dans la session peut être téléchargé localement sans serveur. */
export function downloadAttachment(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement("a")
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}
