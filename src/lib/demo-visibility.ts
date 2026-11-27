import { canViewDocument } from "@/features/documents/access"
import { committeeSeats } from "@/features/members/mock-data"
import { calculateBallot, seatRepresentations } from "@/features/votes/utils"

import type { Meeting } from "@/features/meetings/types"
import type { DemoState } from "./demo-business"
import type { DemoUser } from "./static-auth"

export function canViewMeeting(user: DemoUser | null, meeting: Meeting) {
  if (!user || user.isActive === false) return false
  return (
    user.role === "president" ||
    user.role === "secretary" ||
    Boolean(user.memberId && meeting.participantIds.includes(user.memberId)) ||
    (user.role === "archivist" &&
      (meeting.status === "Clôturée" || meeting.status === "PV signé"))
  )
}

export function projectDemoState(
  state: DemoState,
  user: DemoUser | null
): DemoState {
  const meetings = state.meetings.filter((meeting) =>
    canViewMeeting(user, meeting)
  )
  const meetingById = new Map(meetings.map((item) => [item.id, item]))
  const decisionsById = new Map(state.decisions.map((item) => [item.id, item]))
  const actions = state.actions.filter((action) => {
    if (!user) return false
    if (user.role === "member") return action.assigneeId === user.memberId
    return (
      !action.decisionId ||
      meetingById.has(decisionsById.get(action.decisionId)?.meetingId ?? "")
    )
  })
  const linkedActions = new Set(actions.map((action) => action.decisionId))
  const decisions = state.decisions.filter(
    (decision) =>
      meetingById.has(decision.meetingId) ||
      (user?.role === "member" && linkedActions.has(decision.id))
  )
  return {
    ...state,
    meetings,
    actions,
    decisions,
    agenda: state.agenda.filter(
      (item) =>
        meetingById.has(item.meetingId) &&
        (item.status === "Validé" ||
          item.proposedById === user?.memberId ||
          user?.role === "member" ||
          user?.role === "president" ||
          user?.role === "secretary")
    ),
    minutes: state.minutes.filter(
      (item) =>
        meetingById.has(item.meetingId) &&
        (item.status === "Signé" ||
          item.status === "Archivé" ||
          user?.role === "president" ||
          user?.role === "secretary")
    ),
    documents: state.documents.filter((item) => canViewDocument(user, item)),
    notifications: state.notifications.filter(
      (item) => user && item.recipientId === user.id && !item.deletedAt
    ),
    ballots: state.ballots.flatMap((ballot) => {
      const meeting = meetingById.get(
        decisionsById.get(ballot.decisionId)?.meetingId ?? ""
      )
      if (!meeting) return []
      const representativeIds = new Set(
        seatRepresentations(
          state.members,
          committeeSeats,
          meeting.date,
          ballot.presentMemberIds
        )
          .filter((seat) => seat.representativeId === user?.memberId)
          .map((seat) => seat.seatId)
      )
      return [
        {
          ...ballot,
          displaySummary: calculateBallot(
            ballot,
            state.members,
            committeeSeats,
            meeting.date
          ),
          votes: Object.fromEntries(
            Object.entries(ballot.votes).filter(
              ([id, vote]) =>
                vote.memberId === user?.memberId &&
                (ballot.state === "Clôturé" || representativeIds.has(id))
            )
          ),
        },
      ]
    }),
  }
}
