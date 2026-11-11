import type { ActionRecord, ActionStatus, DecisionRecord } from "./types"
import { ACTION_STATUSES } from "./types"

export function formatDate(value: string): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`))
}

export function dateToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function isOverdue(action: ActionRecord, today: string): boolean {
  return Boolean(action.dueDate) && action.status !== "Terminée" && action.dueDate < today
}

export function nextDecisionReference(items: DecisionRecord[]): string {
  const year = new Date().getFullYear()
  const prefix = `DEC-${year}-`
  const max = items.reduce((result, item) => {
    if (!item.reference.startsWith(prefix)) return result
    return Math.max(result, Number(item.reference.slice(prefix.length)) || 0)
  }, 0)
  return `${prefix}${String(max + 1).padStart(3, "0")}`
}

export function normalizedOrder(items: ActionRecord[]): ActionRecord[] {
  const positions = new Map<string, number>()
  for (const status of ACTION_STATUSES) {
    items.filter((item) => item.status === status)
      .sort((a, b) => a.order - b.order)
      .forEach((item, index) => positions.set(item.id, index))
  }
  return items.map((item) => ({ ...item, order: positions.get(item.id) ?? 0 }))
}

/**
 * Repositionne une carte avec la même sémantique que @hello-pangea/dnd.
 * beforeId représente la première carte visible après la carte déplacée.
 * Dans une vue filtrée, les cartes masquées sont conservées.
 */
export function moveAction(
  items: ActionRecord[], id: string, toStatus: ActionStatus, beforeId: string | null,
): ActionRecord[] {
  const moved = items.find((item) => item.id === id)
  if (!moved) return items
  const without = items.filter((item) => item.id !== id)
  const dest = without.filter((item) => item.status === toStatus).sort((a, b) => a.order - b.order)
  const insertionIndex = beforeId ? dest.findIndex((item) => item.id === beforeId) : -1
  dest.splice(insertionIndex < 0 ? dest.length : insertionIndex, 0, { ...moved, status: toStatus })

  const keep = without.filter((item) => item.status !== toStatus)
  return normalizedOrder([...keep, ...dest.map((item, index) => ({ ...item, order: index }))])
}
