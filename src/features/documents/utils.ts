import { initialDecisions } from "@/features/decisions/mock-data"
import {
  committeeMembers,
  initialMeetings,
} from "@/features/meetings/mock-data"
import { committeeSeats, initialMembers } from "@/features/members/mock-data"
import { calculateBallot } from "@/features/votes/utils"

import type { ActionRecord, DecisionRecord } from "@/features/decisions/types"
import type { Meeting } from "@/features/meetings/types"
import type { CommitteeMemberRecord } from "@/features/members/types"
import type { BallotSession } from "@/features/votes/types"
import type { MeetingMinutes, MinutesSnapshot } from "./types"

export function formatDate(date: string) {
  if (!date) return "—"
  const value = date.length === 10 ? `${date}T12:00:00` : date
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function meetingLabel(
  id: string,
  meetings: Meeting[] = initialMeetings
) {
  return meetings.find((meeting) => meeting.id === id)?.title ?? "Sans réunion"
}

export function memberName(id: string, members = committeeMembers) {
  return members.find((member) => member.id === id)?.name ?? "Membre inconnu"
}

export const today = () => new Date().toISOString().slice(0, 10)
export const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/** Encodage obligatoire avant insertion dans la fenêtre d'impression. */
export function escapeHTML(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char)
}

export function captureMinutes(
  pv: MeetingMinutes,
  meeting: Meeting,
  decisions: DecisionRecord[],
  members: CommitteeMemberRecord[],
  actions: ActionRecord[],
  ballots: BallotSession[]
): MinutesSnapshot {
  const related = decisions.filter((item) => item.meetingId === pv.meetingId)
  const decisionIds = new Set(related.map((item) => item.id))
  const linkedActions = actions.filter((action) =>
    decisionIds.has(action.decisionId)
  )
  const memberIds = new Set([
    ...meeting.participantIds,
    ...linkedActions.map((action) => action.assigneeId),
  ])
  return {
    meeting: {
      ...meeting,
      participantIds: [...meeting.participantIds],
      attendance: meeting.attendance ? { ...meeting.attendance } : undefined,
      agenda: meeting.agenda
        .filter((item) => item.status === "Validé")
        .map((item) => ({ ...item })),
    },
    decisions: related.map((item) => ({ ...item })),
    actions: linkedActions.map((item) => ({ ...item })),
    members: members
      .filter((item) => memberIds.has(item.id))
      .map(({ id, name, kind, role }) => ({ id, name, kind, role })),
    results: Object.fromEntries(
      ballots
        .filter((ballot) => decisionIds.has(ballot.decisionId))
        .map((ballot) => {
          const { seats: _seats, ...summary } = calculateBallot(
            ballot,
            members,
            committeeSeats,
            meeting.date
          )
          return [ballot.decisionId, summary]
        })
    ),
  }
}

export function resolveMinutesContent(
  pv: MeetingMinutes,
  meetings: Meeting[],
  decisions: DecisionRecord[],
  members: CommitteeMemberRecord[],
  actions: ActionRecord[],
  ballots: BallotSession[]
): MinutesSnapshot | undefined {
  if (pv.status !== "Brouillon") return pv.officialSnapshot
  const meeting = meetings.find((item) => item.id === pv.meetingId)
  return meeting
    ? captureMinutes(pv, meeting, decisions, members, actions, ballots)
    : undefined
}

export function buildPrintableMinutes(
  pv: MeetingMinutes,
  meetings: Meeting[] = initialMeetings,
  decisionsSource: DecisionRecord[] = initialDecisions,
  members: CommitteeMemberRecord[] = initialMembers,
  actionsSource: ActionRecord[] = [],
  ballotsSource: BallotSession[] = []
) {
  const content = resolveMinutesContent(
    pv,
    meetings,
    decisionsSource,
    members,
    actionsSource,
    ballotsSource
  )
  const all = (value: string) => escapeHTML(value)
  if (!content) {
    if (pv.status === "Brouillon") return ""
    return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${all(pv.reference)}</title><h1>${all(pv.reference)}</h1><p>Instantané historique indisponible.</p><p>${all(pv.signedBy ?? "")} · ${all(pv.signedAt ?? "")}</p><p style="white-space:pre-wrap">${all(pv.summary)}</p></html>`
  }
  const {
    meeting,
    members: capturedMembers,
    decisions: meetingDecisions,
    actions: capturedActions,
    results,
  } = content
  const agenda = meeting.agenda
    .filter((item) => item.status === "Validé")
    .map((item) => `<li>${all(item.title)}</li>`)
    .join("")
  const decisions = meetingDecisions
    .map((decision) => {
      const result = results[decision.id]
      const summary = result
        ? ` · Scrutin ${result.outcome} — pour ${result.pour}, contre ${result.contre}, abstention ${result.abstention}; quorum ${result.representedSeatCount}/${result.activeSeatCount}`
        : ""
      return `<li><strong>${all(decision.reference)} — ${all(decision.title)}</strong><br/>${all(decision.description)}<br/><small>${all(decision.status)}${all(summary)}</small></li>`
    })
    .join("")
  const presentIds = meeting.attendance
    ? Object.entries(meeting.attendance)
        .filter(([, present]) => present)
        .map(([id]) => id)
    : pv.presentMemberIds
  const attendees =
    presentIds.map((id) => all(memberName(id, capturedMembers))).join(", ") ||
    "—"
  const absents = meeting.participantIds
    .filter((id) => meeting.attendance?.[id] === false)
    .map((id) => all(memberName(id, capturedMembers)))
    .join(", ")
  const unknown = meeting.participantIds
    .filter((id) => meeting.attendance?.[id] === undefined)
    .map((id) => all(memberName(id, capturedMembers)))
    .join(", ")
  const actions = capturedActions
    .map(
      (action) =>
        `<li>${all(action.title)} — ${all(capturedMembers.find((member) => member.id === action.assigneeId)?.name ?? "—")} — ${all(action.dueDate || "—")} — ${all(action.status)}</li>`
    )
    .join("")
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>${all(pv.reference)} — Procès-verbal</title>
  <style>body{font-family:Arial,sans-serif;color:#20242d;max-width:800px;margin:50px auto;line-height:1.65;padding:0 32px}h1{font-size:25px;margin-bottom:4px}h2{font-size:16px;margin-top:36px;border-bottom:1px solid #ddd;padding-bottom:8px}small{color:#666}li{margin:8px 0}.meta{margin:28px 0;padding:16px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd}.signatures{display:flex;justify-content:space-between;margin-top:70px}pre{font:inherit;white-space:pre-wrap}@media print{body{margin:20px auto;padding:0} @page{size:A4;margin:20mm}}</style></head><body>
  <small>Département d'informatique · Comité scientifique · Document de démonstration</small>
  <h1>Procès-verbal de réunion</h1><small>${all(pv.reference)} · ${all(pv.status)} · Version ${pv.version}</small>
  <div class="meta"><strong>${all(meeting.title)}</strong><br/>${all(formatDate(meeting.date))} · ${all(meeting.startTime)}–${all(meeting.endTime)}<br/>${all(meeting.location)}</div>
  <h2>Informations générales</h2><p><strong>${all(meeting.title)}</strong><br/>${all(formatDate(meeting.date))} · ${all(meeting.startTime)}–${all(meeting.endTime)}<br/>${all(meeting.location)}<br/>${all(meeting.status)}${meeting.closedAt ? ` · Clôturée le ${all(meeting.closedAt)}` : ""}</p>
  <h2>Présences</h2><p>Présents : ${attendees}<br/>Absents : ${absents || "—"}<br/>Non renseignés : ${unknown || "—"}</p>
  <h2>Ordre du jour</h2><ol>${agenda}</ol>
  <h2>Déroulement et échanges</h2><pre>${all(pv.summary || "Non renseigné")}</pre>
  <h2>Décisions et résultats des scrutins</h2>${decisions ? `<ul>${decisions}</ul>` : "<p>Aucune décision enregistrée dans les données fictives.</p>"}
  <h2>Actions attribuées</h2>${actions ? `<ul>${actions}</ul>` : "<p>—</p>"}
  ${pv.nextSteps ? `<h2>Notes complémentaires du secrétaire</h2><pre>${all(pv.nextSteps)}</pre>` : ""}
  <div class="signatures"><div>Secrétaire<br/><strong>${all(pv.secretary || "—")}</strong></div><div>Président<br/><strong>${all(pv.president || "—")}</strong></div></div>
  ${pv.signedBy ? `<p class="signature">Signature simulée du président : <strong>${all(pv.signedBy)}</strong> · ${all(pv.signedAt ?? "")}</p>` : ""}
  ${pv.archivedAt ? `<p class="signature">Archivé le ${all(pv.archivedAt)}</p>` : ""}
  <p style="margin-top:75px;font-size:11px;color:#777">Prototype non officiel — signature simulée, sans valeur administrative.</p>
  </body></html>`
}

export function printMinutes(
  pv: MeetingMinutes,
  meetings: Meeting[] = initialMeetings,
  decisions: DecisionRecord[] = initialDecisions,
  members: CommitteeMemberRecord[] = initialMembers,
  actions: ActionRecord[] = [],
  ballots: BallotSession[] = []
): boolean {
  const html = buildPrintableMinutes(
    pv,
    meetings,
    decisions,
    members,
    actions,
    ballots
  )
  if (!html) return false
  const popup = window.open("", "_blank", "width=950,height=1100")
  if (!popup) return false
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.focus()
  // L'impression est déclenchée par le navigateur ; « Enregistrer au format PDF » est proposé par celui-ci.
  popup.print()
  return true
}
