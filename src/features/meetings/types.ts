export type MeetingStatus = "Planifiée" | "Terminée" | "Annulée"
export type AgendaStatus = "Proposé" | "Validé" | "Rejeté"

export interface CommitteeMember {
  id: string
  name: string
  role: string
}

export interface AgendaItem {
  id: string
  title: string
  proposedById: string
  status: AgendaStatus
}

export interface Meeting {
  id: string
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  location: string
  description: string
  status: MeetingStatus
  participantIds: string[]
  agenda: AgendaItem[]
}
