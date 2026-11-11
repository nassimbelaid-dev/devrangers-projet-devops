export const DECISION_STATUSES = ["En attente", "Adoptée", "Rejetée"] as const
export type DecisionStatus = (typeof DECISION_STATUSES)[number]

export const ACTION_STATUSES = ["À faire", "En cours", "Terminée"] as const
export type ActionStatus = (typeof ACTION_STATUSES)[number]

export const ACTION_PRIORITIES = ["Basse", "Normale", "Haute"] as const
export type ActionPriority = (typeof ACTION_PRIORITIES)[number]

export interface DecisionRecord {
  id: string
  reference: string
  title: string
  description: string
  meetingId: string
  date: string // YYYY-MM-DD
  status: DecisionStatus
}

export interface ActionRecord {
  id: string
  title: string
  description: string
  decisionId: string // "" si l'action n'est pas encore rattachée
  assigneeId: string
  dueDate: string // YYYY-MM-DD
  priority: ActionPriority
  status: ActionStatus
  order: number
}

export type BoardView = "decisions" | "kanban" | "list"
