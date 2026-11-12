import type { BallotSession } from "./types"

/** Jeux de démonstration cohérents avec les décisions d1, d3, d5 et les membres m1…m6. */
export const initialBallots: BallotSession[] = [
  {
    id: "vote-1",
    decisionId: "d3",
    state: "Ouvert",
    quorumPercent: 60,
    // m3 absente, m6 présente : le siège s3 est représenté par sa suppléante.
    presentMemberIds: ["m1", "m2", "m4", "m5", "m6"],
    votes: {
      s1: { seatId: "s1", memberId: "m1", choice: "pour" },
      s2: { seatId: "s2", memberId: "m2", choice: "pour" },
      s3: { seatId: "s3", memberId: "m6", choice: "abstention" },
      s4: { seatId: "s4", memberId: "m4", choice: "contre" },
    },
  },
  {
    id: "vote-2",
    decisionId: "d1",
    state: "Clôturé",
    quorumPercent: 60,
    presentMemberIds: ["m1", "m2", "m3", "m4", "m5"],
    votes: {
      s1: { seatId: "s1", memberId: "m1", choice: "pour" },
      s2: { seatId: "s2", memberId: "m2", choice: "pour" },
      s3: { seatId: "s3", memberId: "m3", choice: "pour" },
      s4: { seatId: "s4", memberId: "m4", choice: "pour" },
      s5: { seatId: "s5", memberId: "m5", choice: "abstention" },
    },
  },
  {
    id: "vote-3",
    decisionId: "d5",
    state: "Clôturé",
    quorumPercent: 60,
    presentMemberIds: ["m1", "m2", "m3", "m4", "m5"],
    votes: {
      s1: { seatId: "s1", memberId: "m1", choice: "pour" },
      s2: { seatId: "s2", memberId: "m2", choice: "contre" },
      s3: { seatId: "s3", memberId: "m3", choice: "contre" },
      s4: { seatId: "s4", memberId: "m4", choice: "contre" },
      s5: { seatId: "s5", memberId: "m5", choice: "abstention" },
    },
  },
]
