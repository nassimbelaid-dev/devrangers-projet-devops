/** Un seul vote par siège et par scrutin. Données locales sans persistance. */
export type VoteChoice = "pour" | "contre" | "abstention"
export type BallotState = "Ouvert" | "Clôturé"

export interface SeatVote {
  seatId: string
  memberId: string // Membre titulaire ou suppléant habilité au moment du vote.
  choice: VoteChoice
}

export interface BallotSession {
  id: string
  decisionId: string
  state: BallotState
  quorumPercent: number
  /** IDs de tous les membres physiquement présents : un suppléant peut être présent sans voter. */
  presentMemberIds: string[]
  /** Clé = identifiant de siège. Empêche un second vote pour le même siège. */
  votes: Record<string, SeatVote>
}

export type BallotOutcome = "À voter" | "Quorum non atteint" | "Adoptée" | "Rejetée"

export interface SeatRepresentation {
  seatId: string
  seatLabel: string
  titularId: string | null
  substituteId: string | null
  representativeId: string | null
  representativeKind: "Titulaire" | "Suppléant" | null
}

export interface BallotSummary {
  seats: SeatRepresentation[]
  activeSeatCount: number
  representedSeatCount: number
  quorumMinSeats: number
  quorumReached: boolean
  participationPercent: number
  pour: number
  contre: number
  abstention: number
  votesCast: number
  uncastCount: number
  expressedCount: number
  outcome: BallotOutcome
}
