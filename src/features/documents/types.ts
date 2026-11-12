/** Modèles purement UI : aucune donnée n'est transmise à un serveur. */
export const DOCUMENT_TYPES = ["Ordre du jour", "Procès-verbal", "Rapport", "Convocation", "Autre"] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export const DOCUMENT_STATUSES = ["Brouillon", "Validé", "Archivé"] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]
export const VISIBILITIES = ["Comité", "Présidence", "Archives"] as const
export type DocumentVisibility = (typeof VISIBILITIES)[number]

export interface DocumentVersion {
  id: string
  number: number
  date: string // YYYY-MM-DD
  author: string
  filename: string
  note: string
  /** Démo : seulement les fichiers choisis pendant cette session sont ouvrables. */
  file?: File | null
}

export interface CommitteeDocument {
  id: string
  reference: string
  title: string
  type: DocumentType
  status: DocumentStatus
  visibility: DocumentVisibility
  meetingId: string // '' si aucun lien
  description: string
  updatedAt: string
  versions: DocumentVersion[]
}

export type MinutesStatus = "Brouillon" | "Validé"
export interface MeetingMinutes {
  id: string
  reference: string
  meetingId: string
  status: MinutesStatus
  presentMemberIds: string[]
  summary: string
  nextSteps: string
  secretary: string
  president: string
  updatedAt: string
  version: number
}
