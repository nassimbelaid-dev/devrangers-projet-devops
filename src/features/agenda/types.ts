/** Modèles de démonstration UI uniquement, indépendants de Prisma et des API. */
export type AgendaStatus = "Proposé" | "Validé" | "Rejeté"

export interface AgendaAttachment {
  id: string
  name: string
  size: number
  /** Présent uniquement pour un fichier ajouté dans cette session navigateur. */
  file?: File
}

export interface AgendaProposal {
  id: string
  meetingId: string
  title: string
  description: string
  proposedById: string
  createdAt: string // ISO
  status: AgendaStatus
  /** Seuls les points validés ont un ordre. */
  order: number | null
  attachments: AgendaAttachment[]
  reviewedById?: string
  reviewNote?: string
}

export type AgendaTab = "proposals" | "validated" | "all"
