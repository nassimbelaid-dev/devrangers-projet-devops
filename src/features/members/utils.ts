import type { CommitteeMemberRecord, MandateStatus } from "./types"

/** Les dates ISO au format YYYY-MM-DD se comparent correctement par ordre lexicographique. */
export function mandateStatus(member: CommitteeMemberRecord, today: string): MandateStatus {
  if (member.mandateStart > today) return "À venir"
  if (member.mandateEnd < today) return "Terminé"
  return "En cours"
}

export function formatDate(date: string) {
  if (!date) return "—"
  const [year, month, day] = date.split("-")
  if (!year || !month || !day) return date
  return `${day}/${month}/${year}`
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function mandateIntervalsOverlap(a: CommitteeMemberRecord, b: CommitteeMemberRecord) {
  return a.mandateStart <= b.mandateEnd && b.mandateStart <= a.mandateEnd
}

/** Règle simplifiée de maquette : un titulaire et un suppléant maximum par siège et période. */
export function validateMemberSeat(
  member: CommitteeMemberRecord,
  others: CommitteeMemberRecord[]
): string | null {
  const conflict = others.find((other) =>
    other.id !== member.id && other.seatId === member.seatId &&
    other.kind === member.kind && mandateIntervalsOverlap(member, other)
  )
  if (conflict) {
    return `Ce siège possède déjà un membre « ${member.kind.toLowerCase()} » pour une période chevauchante (${conflict.name}).`
  }
  return null
}
