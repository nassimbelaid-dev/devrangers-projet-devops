import type { BallotOutcome, BallotSession, BallotSummary, SeatRepresentation, SeatVote } from "./types"

/** Contrat minimal avec le module Membres : l'algorithme reste facile à tester seul. */
export interface MemberForVote {
  id: string
  seatId: string
  kind: "Titulaire" | "Suppléant"
  mandateStart: string // YYYY-MM-DD
  mandateEnd: string // YYYY-MM-DD
}
export interface SeatForVote { id: string; label: string }

export function activeOnDate(member: MemberForVote, date: string): boolean {
  return Boolean(date) && member.mandateStart <= date && member.mandateEnd >= date
}

/**
 * Siège actif : au moins un titulaire ou suppléant avec un mandat en cours à la date
 * de la réunion. Un siège vacant/hors mandat ne gonfle pas artificiellement le quorum.
 * Priorité au titulaire présent, même si son suppléant est également présent.
 */
export function seatRepresentations(
  members: readonly MemberForVote[],
  seats: readonly SeatForVote[],
  date: string,
  presentMemberIds: readonly string[],
): SeatRepresentation[] {
  const present = new Set(presentMemberIds)
  return seats.flatMap((seat) => {
    const active = members.filter((member) => member.seatId === seat.id && activeOnDate(member, date))
    if (!active.length) return []
    const titular = active.find((member) => member.kind === "Titulaire")
    const substitute = active.find((member) => member.kind === "Suppléant")
    const representative = titular && present.has(titular.id)
      ? titular
      : substitute && present.has(substitute.id) ? substitute : null
    return [{
      seatId: seat.id,
      seatLabel: seat.label,
      titularId: titular?.id ?? null,
      substituteId: substitute?.id ?? null,
      representativeId: representative?.id ?? null,
      representativeKind: representative?.kind ?? null,
    }]
  })
}

export function calculateBallot(
  ballot: BallotSession,
  members: readonly MemberForVote[],
  seats: readonly SeatForVote[],
  meetingDate: string,
): BallotSummary {
  const activeSeats = seatRepresentations(members, seats, meetingDate, ballot.presentMemberIds)
  const activeSeatCount = activeSeats.length
  const representedSeatCount = activeSeats.filter((seat) => Boolean(seat.representativeId)).length
  const quorumMinSeats = activeSeatCount ? Math.ceil(activeSeatCount * ballot.quorumPercent / 100) : 0
  const quorumReached = activeSeatCount > 0 && representedSeatCount >= quorumMinSeats
  // Un vote est compté uniquement si son auteur reste le représentant habilité du siège.
  const validVotes = activeSeats.flatMap((seat) => {
    const vote = ballot.votes[seat.seatId]
    return vote && seat.representativeId === vote.memberId ? [vote] : []
  })
  const pour = validVotes.filter((vote) => vote.choice === "pour").length
  const contre = validVotes.filter((vote) => vote.choice === "contre").length
  const abstention = validVotes.filter((vote) => vote.choice === "abstention").length
  const votesCast = validVotes.length
  const expressedCount = pour + contre
  const uncastCount = representedSeatCount - votesCast
  const participationPercent = activeSeatCount
    ? Math.round((representedSeatCount / activeSeatCount) * 100)
    : 0

  // Règle simplifiée de démonstration : majorité simple des suffrages exprimés.
  // L'abstention compte pour la présence au quorum, pas pour la majorité.
  let outcome: BallotOutcome = "À voter"
  if (ballot.state === "Clôturé") {
    if (!quorumReached) outcome = "Quorum non atteint"
    else outcome = expressedCount > 0 && pour > contre ? "Adoptée" : "Rejetée"
  }
  return {
    seats: activeSeats, activeSeatCount, representedSeatCount, quorumMinSeats,
    quorumReached, participationPercent, pour, contre, abstention,
    votesCast, uncastCount, expressedCount, outcome,
  }
}

/** Efface tous les bulletins devenus invalides après une modification de présence. */
export function removeStaleVotes(
  votes: Record<string, SeatVote>,
  seats: readonly SeatRepresentation[],
): Record<string, SeatVote> {
  const next: Record<string, SeatVote> = {}
  for (const seat of seats) {
    const existing = votes[seat.seatId]
    if (existing && seat.representativeId === existing.memberId) {
      next[seat.seatId] = existing
    }
  }
  return next
}

export function outcomeLabel(outcome: BallotOutcome): string {
  switch (outcome) {
    case "À voter": return "Scrutin en cours"
    case "Quorum non atteint": return "Quorum non atteint"
    case "Adoptée": return "Décision adoptée"
    case "Rejetée": return "Décision rejetée"
  }
}
