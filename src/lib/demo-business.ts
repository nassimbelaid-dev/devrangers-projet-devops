/**
 * Règles métier du prototype local. Fonctions pures : aucun appel réseau,
 * aucune manipulation de l'authentification ni écriture sur disque.
 */
import type { Meeting, AgendaItem } from "@/features/meetings/types"
import type { CommitteeMemberRecord } from "@/features/members/types"
import type { DecisionRecord, ActionRecord } from "@/features/decisions/types"
import type { BallotSession } from "@/features/votes/types"
import type { CommitteeDocument, MeetingMinutes } from "@/features/documents/types"
import type { AgendaProposal } from "@/features/agenda/types"
import type { CommitteeNotification, NotificationKind, NotificationTarget } from "@/features/notifications/types"
import { committeeSeats } from "@/features/members/mock-data"
import { calculateBallot, removeStaleVotes, seatRepresentations } from "@/features/votes/utils"

export interface DemoState {
  meetings: Meeting[]
  members: CommitteeMemberRecord[]
  decisions: DecisionRecord[]
  actions: ActionRecord[]
  ballots: BallotSession[]
  documents: CommitteeDocument[]
  minutes: MeetingMinutes[]
  agenda: AgendaProposal[]
  notifications: CommitteeNotification[]
}

export type CollectionKey = keyof DemoState
export type TransitionResult = { state: DemoState; error?: string }
let notificationSequence = 0

function notification(kind: NotificationKind, title: string, detail: string, context: string, target: NotificationTarget): CommitteeNotification {
  notificationSequence += 1
  return {
    id: `notification-activite-${Date.now()}-${notificationSequence}`,
    kind, priority: kind === "echeance-action" ? "importante" : "normale",
    title, preview: detail, detail, context, target,
    createdAt: new Date().toISOString(), read: false, archived: false,
  }
}

function withNotifications(state: DemoState, events: CommitteeNotification[]): DemoState {
  return events.length ? { ...state, notifications: [...events, ...state.notifications] } : state
}

function agendaView(proposals: AgendaProposal[], meetingId: string): AgendaItem[] {
  return proposals
    .filter((p) => p.meetingId === meetingId && p.status !== "Rejeté")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "Validé" ? -1 : 1
      return (a.order ?? 9999) - (b.order ?? 9999) || a.createdAt.localeCompare(b.createdAt)
    })
    .map(({ id, title, proposedById, status }) => ({ id, title, proposedById, status }))
}

function sameAgenda(a: AgendaItem[], b: AgendaItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Le module collaboratif est la source de vérité des points, statuts et ordres. */
function attachAgenda(meetings: Meeting[], proposals: AgendaProposal[]): Meeting[] {
  return meetings.map((meeting) => {
    const agenda = agendaView(proposals, meeting.id)
    return sameAgenda(meeting.agenda, agenda) ? meeting : { ...meeting, agenda }
  })
}

/** Fusionne les points modifiés dans le formulaire Réunions, en gardant leurs pièces jointes. */
function mergeMeetingAgenda(previous: DemoState, meeting: Meeting, existing?: Meeting): AgendaProposal[] {
  if (existing && sameAgenda(existing.agenda, meeting.agenda)) return previous.agenda
  const now = new Date().toISOString()
  const keepOthers = previous.agenda.filter((p) => p.meetingId !== meeting.id)
  const old = previous.agenda.filter((p) => p.meetingId === meeting.id)
  const ordered = meeting.agenda.map((item, index) => {
    const oldItem = old.find((p) => p.id === item.id)
    return {
      ...oldItem,
      id: item.id,
      meetingId: meeting.id,
      title: item.title,
      description: oldItem?.description ?? "",
      proposedById: item.proposedById,
      createdAt: oldItem?.createdAt ?? now,
      status: item.status,
      order: item.status === "Validé" ? index : null,
      attachments: oldItem?.attachments ?? [],
      reviewedById: item.status === "Validé" ? (oldItem?.reviewedById ?? "m1") : oldItem?.reviewedById,
      reviewNote: oldItem?.reviewNote,
    } satisfies AgendaProposal
  })
  // Un point rejeté reste dans l'historique même s'il n'apparaît pas dans le formulaire Réunions.
  const rejected = old.filter((p) => p.status === "Rejeté" && !meeting.agenda.some((item) => item.id === p.id))
  return [...keepOthers, ...ordered, ...rejected]
}

/** Explique pourquoi une suppression ne peut pas être faite sans casser les liens existants. */
export function deletionIssue(state: DemoState, key: "meetings" | "members" | "decisions", id: string): string | null {
  if (key === "meetings") {
    if (state.decisions.some((d) => d.meetingId === id) || state.documents.some((d) => d.meetingId === id) || state.minutes.some((p) => p.meetingId === id)) {
      return "Cette réunion possède des décisions, documents ou procès-verbaux associés. Dissociez ces éléments avant de la supprimer."
    }
  }
  if (key === "members") {
    if (state.meetings.some((m) => m.participantIds.includes(id)) ||
      state.agenda.some((a) => a.proposedById === id || a.reviewedById === id) ||
      state.actions.some((a) => a.assigneeId === id) ||
      state.minutes.some((m) => m.presentMemberIds.includes(id)) ||
      state.ballots.some((b) => b.presentMemberIds.includes(id) || Object.values(b.votes).some((v) => v.memberId === id))) {
      return "Ce membre participe à des réunions, actions, ordres du jour, PV ou votes. Réattribuez ses éléments avant sa suppression."
    }
  }
  if (key === "decisions") {
    if (state.actions.some((a) => a.decisionId === id) || state.ballots.some((b) => b.decisionId === id)) {
      return "Cette décision est liée à des actions ou à un scrutin. Supprimez ou dissociez d’abord ces éléments."
    }
  }
  return null
}

export function applyDemoChange<K extends CollectionKey>(state: DemoState, key: K, value: DemoState[K]): TransitionResult {
  // Les collections doivent être remplacées par de nouvelles références immuables.
  if (Object.is(state[key], value)) return { state }
  const next = { ...state, [key]: value } as DemoState
  const events: CommitteeNotification[] = []

  if (key === "members") {
    for (const member of state.members) {
      if (!next.members.some((m) => m.id === member.id)) {
        const issue = deletionIssue(state, "members", member.id)
        if (issue) return { state, error: issue }
      }
    }
    // Une modification de mandat/siège peut invalider un vote enregistré.
    next.ballots = next.ballots.map((b) => {
      if (b.state === "Clôturé") return b
      const decision = state.decisions.find((d) => d.id === b.decisionId)
      const date = state.meetings.find((m) => m.id === decision?.meetingId)?.date ?? ""
      const seats = seatRepresentations(next.members, committeeSeats, date, b.presentMemberIds)
      const votes = removeStaleVotes(b.votes, seats)
      return Object.keys(votes).length === Object.keys(b.votes).length ? b : { ...b, votes }
    })
  }

  if (key === "meetings") {
    for (const meeting of state.meetings) {
      if (!next.meetings.some((m) => m.id === meeting.id)) {
        const issue = deletionIssue(state, "meetings", meeting.id)
        if (issue) return { state, error: issue }
        next.agenda = next.agenda.filter((p) => p.meetingId !== meeting.id)
      }
    }
    for (const meeting of next.meetings) {
      const old = state.meetings.find((m) => m.id === meeting.id)
      if (!old || !sameAgenda(old.agenda, meeting.agenda)) {
        next.agenda = mergeMeetingAgenda({ ...state, agenda: next.agenda }, meeting, old)
      }
      if (!old && meeting.status === "Planifiée") {
        events.push(notification("convocation", `Nouvelle réunion : ${meeting.title}`,
          `Réunion prévue le ${meeting.date} à ${meeting.startTime}, ${meeting.location}.`, `Réunion ${meeting.id}`, "/meetings"))
      } else if (old && (old.date !== meeting.date || old.startTime !== meeting.startTime || old.location !== meeting.location) && meeting.status === "Planifiée") {
        events.push(notification("rappel-reunion", `Réunion actualisée : ${meeting.title}`,
          `Date ou lieu modifié : ${meeting.date} à ${meeting.startTime}, ${meeting.location}.`, `Réunion ${meeting.id}`, "/meetings"))
      }
    }
    next.meetings = attachAgenda(next.meetings, next.agenda)
  }

  if (key === "agenda") {
    if (next.agenda.some((p) => !state.meetings.some((m) => m.id === p.meetingId))) {
      return { state, error: "Un point d'ordre du jour doit être associé à une réunion existante." }
    }
    next.meetings = attachAgenda(next.meetings, next.agenda)
  }

  if (key === "decisions") {
    for (const decision of state.decisions) {
      if (!next.decisions.some((d) => d.id === decision.id)) {
        const issue = deletionIssue(state, "decisions", decision.id)
        if (issue) return { state, error: issue }
      }
    }
    for (const decision of next.decisions) {
      const old = state.decisions.find((d) => d.id === decision.id)
      if (!next.meetings.some((m) => m.id === decision.meetingId)) {
        return { state, error: "Cette décision doit être associée à une réunion existante." }
      }
      if (old && old.status === "Adoptée" && decision.status !== "Adoptée" && next.actions.some((a) => a.decisionId === decision.id)) {
        return { state, error: "Une décision avec des actions associées ne peut pas perdre son statut Adoptée." }
      }
      if (old && old.status !== decision.status) {
        const closedBallot = next.ballots.find((b) => b.decisionId === decision.id && b.state === "Clôturé")
        if (closedBallot) {
          const date = next.meetings.find((m) => m.id === decision.meetingId)?.date ?? ""
          const result = calculateBallot(closedBallot, next.members, committeeSeats, date).outcome
          const expected = result === "Adoptée" ? "Adoptée" : result === "Rejetée" ? "Rejetée" : "En attente"
          if (decision.status !== expected) {
            return { state, error: "Cette décision possède un scrutin clôturé. Rouvrez le scrutin pour modifier son résultat." }
          }
        }
      }
      if (!old || old.status !== decision.status) {
        events.push(notification("avis-decision", `Décision : ${decision.title}`,
          `Statut : ${decision.status}. Référence ${decision.reference}.`, `Décision ${decision.reference}`, "/actions"))
      }
    }
  }

  if (key === "actions") {
    for (const action of next.actions) {
      const old = state.actions.find((a) => a.id === action.id)
      if (action.decisionId && !next.decisions.some((d) => d.id === action.decisionId && d.status === "Adoptée")) {
        return { state, error: "L'action doit être liée à une décision adoptée (ou rester sans décision)." }
      }
      if (!next.members.some((m) => m.id === action.assigneeId)) {
        return { state, error: "Le responsable sélectionné n'existe plus dans l'annuaire." }
      }
      if ((!old || old.dueDate !== action.dueDate || old.assigneeId !== action.assigneeId) && action.status !== "Terminée") {
        events.push(notification("echeance-action", `Action à suivre : ${action.title}`,
          `Échéance : ${action.dueDate}. Responsable : ${next.members.find((m) => m.id === action.assigneeId)?.name ?? "À définir"}.`,
          `Action ${action.id}`, "/actions"))
      }
    }
  }

  if (key === "ballots") {
    const seenDecisionIds = new Set<string>()
    for (const ballot of next.ballots) {
      if (seenDecisionIds.has(ballot.decisionId)) {
        return { state, error: "Un seul scrutin peut être associé à une même décision." }
      }
      seenDecisionIds.add(ballot.decisionId)
    }
    const decisions = [...next.decisions]
    for (const ballot of next.ballots) {
      const old = state.ballots.find((b) => b.id === ballot.id)
      if (!next.decisions.some((d) => d.id === ballot.decisionId)) {
        return { state, error: "Le scrutin doit être associé à une décision existante." }
      }
      if (!old || old.state === ballot.state) continue
      const index = decisions.findIndex((d) => d.id === ballot.decisionId)
      if (index < 0) continue
      const decision = decisions[index]
      let newStatus: DecisionRecord["status"] = "En attente"
      if (ballot.state === "Clôturé") {
        const meetingDate = next.meetings.find((m) => m.id === decision.meetingId)?.date ?? ""
        const summary = calculateBallot(ballot, next.members, committeeSeats, meetingDate)
        newStatus = summary.outcome === "Adoptée" ? "Adoptée" : summary.outcome === "Rejetée" ? "Rejetée" : "En attente"
      }
      if (newStatus !== "Adoptée" && next.actions.some((a) => a.decisionId === decision.id)) {
        return { state, error: "Ce scrutin est lié à une décision ayant des actions. Dissociez-les avant de changer son résultat." }
      }
      if (decision.status !== newStatus) {
        decisions[index] = { ...decision, status: newStatus }
        events.push(notification("avis-decision", `Résultat du scrutin : ${decision.title}`,
          `Décision ${decision.reference} : ${newStatus}.`, `Décision ${decision.reference}`, "/votes"))
      }
    }
    next.decisions = decisions
  }

  if (key === "documents") {
    if (next.documents.some((d) => d.meetingId && !next.meetings.some((m) => m.id === d.meetingId))) {
      return { state, error: "Le document doit être rattaché à une réunion existante." }
    }
  }
  if (key === "minutes") {
    if (next.minutes.some((m) => !next.meetings.some((meeting) => meeting.id === m.meetingId))) {
      return { state, error: "Le procès-verbal doit être associé à une réunion existante." }
    }
  }

  return { state: withNotifications(next, events) }
}
