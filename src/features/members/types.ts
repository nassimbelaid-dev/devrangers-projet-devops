export const MEMBER_ROLES = [
  "Président", "Secrétaire", "Membre", "Responsable archives", "Administrateur",
] as const

export type MemberRole = (typeof MEMBER_ROLES)[number]
export type MemberKind = "Titulaire" | "Suppléant"
export type MandateStatus = "À venir" | "En cours" | "Terminé"

export interface CommitteeSeat {
  id: string
  label: string
}

export interface CommitteeMemberRecord {
  id: string
  name: string
  email: string
  phone: string
  role: MemberRole
  kind: MemberKind
  seatId: string
  mandateStart: string // YYYY-MM-DD
  mandateEnd: string // YYYY-MM-DD
  notes: string
}
