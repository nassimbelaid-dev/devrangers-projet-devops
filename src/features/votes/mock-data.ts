import type { BallotSession } from "./types"

/** Scrutins historiques cohérents avec les décisions d1/d5 et les participants de r3. */
export const initialBallots: BallotSession[] = [
  {
    id: "vote-2",
    decisionId: "d1",
    state: "Clôturé",
    quorumPercent: 60,
    presentMemberIds: ["m1", "m2", "m3", "m5"],
    votes: {
      s1: { seatId: "s1", memberId: "m1", choice: "pour" },
      s2: { seatId: "s2", memberId: "m2", choice: "pour" },
      s3: { seatId: "s3", memberId: "m3", choice: "pour" },
      s5: { seatId: "s5", memberId: "m5", choice: "abstention" },
    },
  },
  {
    id: "vote-3",
    decisionId: "d5",
    state: "Clôturé",
    quorumPercent: 60,
    presentMemberIds: ["m1", "m2", "m3", "m5"],
    votes: {
      s1: { seatId: "s1", memberId: "m1", choice: "pour" },
      s2: { seatId: "s2", memberId: "m2", choice: "contre" },
      s3: { seatId: "s3", memberId: "m3", choice: "contre" },
      s5: { seatId: "s5", memberId: "m5", choice: "abstention" },
    },
  },
]
