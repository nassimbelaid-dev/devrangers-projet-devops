import { strict as assert } from "node:assert"
import { createHash } from "node:crypto"

import { initialAgendaProposals } from "@/features/agenda/mock-data"
import {
  initialActions,
  initialDecisions,
} from "@/features/decisions/mock-data"
import {
  initialDocuments,
  initialMinutes,
} from "@/features/documents/mock-data"
import { initialMeetings } from "@/features/meetings/mock-data"
import { committeeSeats, initialMembers } from "@/features/members/mock-data"
import { initialNotifications } from "@/features/notifications/mock-data"
import { initialBallots } from "@/features/votes/mock-data"
import {
  activeOnDate,
  calculateBallot,
  seatRepresentations,
} from "@/features/votes/utils"

import { demoAccounts } from "@/lib/static-auth"

const accountRoles = {
  admin: "ADMIN",
  president: "PRESIDENT",
  secretary: "SECRETARY",
  archivist: "ARCHIVIST",
  member: "MEMBER",
} as const
const mandateFunctions = {
  Président: "PRESIDENT",
  Secrétaire: "SECRETARY",
  Membre: "MEMBER",
  "Responsable archives": "ARCHIVIST",
  Administrateur: "ADMIN",
} as const
const mandateKinds = { Titulaire: "TITULAR", Suppléant: "SUBSTITUTE" } as const
const meetingStatuses = {
  Planifiée: "PLANNED",
  "En cours": "IN_PROGRESS",
  Clôturée: "CLOSED",
  "PV signé": "MINUTES_SIGNED",
  Annulée: "CANCELLED",
} as const
const agendaStatuses = {
  Proposé: "PROPOSED",
  Validé: "APPROVED",
  Rejeté: "REJECTED",
} as const
const decisionStatuses = {
  "En attente": "PENDING",
  Adoptée: "ADOPTED",
  Rejetée: "REJECTED",
} as const
const voteChoices = {
  pour: "FOR",
  contre: "AGAINST",
  abstention: "ABSTAIN",
} as const
const outcomeStatuses = {
  Adoptée: "ADOPTED",
  Rejetée: "REJECTED",
  "Quorum non atteint": "QUORUM_NOT_REACHED",
} as const
const actionStatuses = {
  "À faire": "TODO",
  "En cours": "IN_PROGRESS",
  Terminée: "DONE",
} as const
const actionPriorities = {
  Basse: "LOW",
  Normale: "NORMAL",
  Haute: "HIGH",
} as const
const documentTypes = {
  "Ordre du jour": "AGENDA",
  "Procès-verbal": "MINUTES",
  Rapport: "REPORT",
  Convocation: "INVITATION",
  Autre: "OTHER",
} as const
const documentStatuses = {
  Brouillon: "DRAFT",
  Validé: "APPROVED",
  Archivé: "ARCHIVED",
} as const
const visibilities = {
  Comité: "COMMITTEE",
  Présidence: "PRESIDENCY",
  Archives: "ARCHIVES",
} as const

// RFC 9562 UUIDv5. Namespace and source keys are stable across executions.
const namespace = Buffer.from("319f15341f7f4fd4bc892d0aefda6ecb", "hex")
function id(entity: string, source: string) {
  const hash = createHash("sha1")
    .update(namespace)
    .update(`${entity}:${source}`)
    .digest()
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = hash.subarray(0, 16).toString("hex")
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-")
}

const civilDate = (value: string) => new Date(`${value}T00:00:00Z`)
const clockTime = (value: string) => new Date(`1970-01-01T${value}:00Z`)
const instant = (value?: string) =>
  value && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) ? new Date(value) : null

export function buildSeedData() {
  assert.equal(
    initialNotifications.length,
    0,
    "Les fixtures de notifications doivent être revues avant import."
  )
  const membersById = new Map(
    initialMembers.map((member) => [member.id, member])
  )
  const meetingsById = new Map(
    initialMeetings.map((meeting) => [meeting.id, meeting])
  )
  const ballotsByDecision = new Map(
    initialBallots.map((ballot) => [ballot.decisionId, ballot])
  )
  // d3 is a draft topic for a planned meeting, not a decision made in session.
  const decisionFixtures = initialDecisions.filter(
    (decision) => decision.id !== "d3"
  )
  const decisionsById = new Map(
    decisionFixtures.map((decision) => [decision.id, decision])
  )
  const accounts = demoAccounts.map(
    ({ id: key, firstName, lastName, email, role, memberId, isActive }) => {
      assert(
        role === "admin" || (memberId && membersById.has(memberId)),
        "Compte non administrateur sans membre."
      )
      return {
        id: id("account", key),
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        role: accountRoles[role],
        isActive: isActive !== false,
        memberId: memberId ? id("member", memberId) : null,
      }
    }
  )
  assert(
    accounts.some((account) => account.role === "ADMIN" && account.isActive),
    "Aucun administrateur actif."
  )

  const seats = committeeSeats.map((seat) => ({
    id: id("seat", seat.id),
    label: seat.label,
  }))
  const members = initialMembers.map((member) => ({
    id: id("member", member.id),
    fullName: member.name,
    email: member.email.trim().toLowerCase(),
    phone: member.phone || null,
    notes: member.notes || null,
  }))
  const mandates = initialMembers.map((member) => ({
    id: id("mandate", member.id),
    memberId: id("member", member.id),
    seatId: id("seat", member.seatId),
    function: mandateFunctions[member.role],
    kind: mandateKinds[member.kind],
    startDate: civilDate(member.mandateStart),
    endDate: civilDate(member.mandateEnd),
  }))
  const meetings = initialMeetings.map((meeting) => ({
    id: id("meeting", meeting.id),
    title: meeting.title,
    location: meeting.location,
    description: meeting.description,
    meetingDate: civilDate(meeting.date),
    startTime: clockTime(meeting.startTime),
    endTime: clockTime(meeting.endTime),
    status: meetingStatuses[meeting.status],
    invitationsSentAt: instant(meeting.invitationsSentAt),
    startedAt: instant(meeting.startedAt),
    closedAt: instant(meeting.closedAt),
  }))
  const attendanceByMeeting = new Map<string, Set<string>>()
  for (const minutes of initialMinutes)
    attendanceByMeeting.set(
      minutes.meetingId,
      new Set(minutes.presentMemberIds)
    )
  for (const ballot of initialBallots) {
    const decision = decisionsById.get(ballot.decisionId)
    assert(decision, "Scrutin sans décision importable.")
    const known = attendanceByMeeting.get(decision.meetingId)
    if (known)
      assert.deepEqual(
        new Set(ballot.presentMemberIds),
        known,
        "Présences historiques contradictoires."
      )
    else
      attendanceByMeeting.set(
        decision.meetingId,
        new Set(ballot.presentMemberIds)
      )
  }
  const participations = initialMeetings.flatMap((meeting) => {
    const historicalPresence = attendanceByMeeting.get(meeting.id)
    assert(
      !historicalPresence ||
        [...historicalPresence].every((memberId) =>
          meeting.participantIds.includes(memberId)
        ),
      "Présence historique hors participants."
    )
    return meeting.participantIds.map((memberId) => {
      const member = membersById.get(memberId)
      assert(
        member && activeOnDate(member, meeting.date),
        "Participant hors mandat."
      )
      return {
        id: id("participation", `${meeting.id}:${memberId}`),
        meetingId: id("meeting", meeting.id),
        memberId: id("member", memberId),
        mandateId: id("mandate", memberId),
        attendance:
          meeting.attendance?.[memberId] ??
          historicalPresence?.has(memberId) ??
          null,
      }
    })
  })
  const proposals = initialAgendaProposals.map((proposal) => ({
    id: id("proposal", proposal.id),
    meetingId: id("meeting", proposal.meetingId),
    authorMemberId: id("member", proposal.proposedById),
    reviewerMemberId: proposal.reviewedById
      ? id("member", proposal.reviewedById)
      : null,
    title: proposal.title,
    description: proposal.description,
    createdAt: new Date(proposal.createdAt),
    status: agendaStatuses[proposal.status],
    sortOrder: proposal.order,
    reviewNote: proposal.reviewNote,
  }))
  const decisions = decisionFixtures.map((decision) => ({
    id: id("decision", decision.id),
    meetingId: id("meeting", decision.meetingId),
    reference: decision.reference,
    title: decision.title,
    description: decision.description,
    decisionDate: civilDate(decision.date),
    status: decisionStatuses[decision.status],
    finalSource:
      decision.status === "En attente"
        ? null
        : ballotsByDecision.has(decision.id)
          ? ("BALLOT" as const)
          : ("HISTORICAL_IMPORT" as const),
  }))
  const actions = initialActions.map((action) => {
    const decision = decisionsById.get(action.decisionId)
    assert(
      !action.decisionId ||
        (decision?.status === "Adoptée" && decision.date <= action.dueDate),
      "Action liée à une décision invalide."
    )
    assert(membersById.has(action.assigneeId), "Responsable inconnu.")
    return {
      id: id("action", action.id),
      decisionId: decision ? id("decision", decision.id) : null,
      assigneeMemberId: id("member", action.assigneeId),
      title: action.title,
      description: action.description,
      dueDate: civilDate(action.dueDate),
      priority: actionPriorities[action.priority],
      status: actionStatuses[action.status],
      sortOrder: action.order,
    }
  })
  const actorSnapshot = (key: string | null) => {
    if (!key) return null
    const member = membersById.get(key)
    assert(member, "Membre inconnu dans un instantané.")
    return {
      memberId: id("member", key),
      mandateId: id("mandate", key),
      name: member.name,
    }
  }
  const presenceSnapshot = (
    meetingKey: string,
    presentIds?: readonly string[]
  ) =>
    participations
      .filter((row) => row.meetingId === id("meeting", meetingKey))
      .map((row) => ({
        participationId: row.id,
        memberId: row.memberId,
        mandateId: row.mandateId,
        name: initialMembers.find(
          (member) => id("member", member.id) === row.memberId
        )!.name,
        attendance: presentIds
          ? presentIds.some((key) => id("member", key) === row.memberId)
          : row.attendance,
      }))

  const ballotImports = initialBallots.map((ballot) => {
    const decision = decisionsById.get(ballot.decisionId)!
    const meeting = meetingsById.get(decision.meetingId)
    assert(
      meeting && ballot.state === "Clôturé",
      "Scrutin non historique ou sans réunion."
    )
    const summary = calculateBallot(
      ballot,
      initialMembers,
      committeeSeats,
      meeting.date
    )
    const representation = seatRepresentations(
      initialMembers,
      committeeSeats,
      meeting.date,
      ballot.presentMemberIds
    )
    assert(summary.outcome !== "À voter", "Résultat de scrutin non définitif.")
    assert.equal(
      summary.outcome === "Quorum non atteint" ? "En attente" : summary.outcome,
      decision.status
    )
    assert.deepEqual(
      summary.seats,
      representation,
      "Représentation historique incohérente."
    )
    const ballotId = id("ballot", ballot.id)
    const thresholds = {
      quorumPercent: ballot.quorumPercent,
      majorityPercent: ballot.majorityPercent ?? 50,
    }
    const votes = Object.entries(ballot.votes).map(([seatKey, vote]) => {
      assert.equal(seatKey, vote.seatId, "Clé de siège incohérente.")
      assert.equal(
        representation.find((seat) => seat.seatId === seatKey)
          ?.representativeId,
        vote.memberId,
        "Vote historique inéligible."
      )
      return {
        id: id("vote", `${ballot.id}:${seatKey}`),
        ballotId,
        meetingId: id("meeting", meeting.id),
        seatId: id("seat", seatKey),
        mandateId: id("mandate", vote.memberId),
        participationId: id("participation", `${meeting.id}:${vote.memberId}`),
        choice: voteChoices[vote.choice],
      }
    })
    assert.equal(
      votes.length,
      summary.votesCast,
      "Décompte des votes incohérent."
    )
    return {
      ballot: {
        id: ballotId,
        decisionId: id("decision", decision.id),
        meetingId: id("meeting", meeting.id),
        state: "CLOSED" as const,
        ...thresholds,
      },
      votes,
      result: {
        id: id("result", ballot.id),
        ballotId,
        ...thresholds,
        ruleVersion: "committee-v1",
        snapshotVersion: 1,
        activeSeatCount: summary.activeSeatCount,
        representedSeatCount: summary.representedSeatCount,
        quorumMinSeats: summary.quorumMinSeats,
        participationPercent: summary.participationPercent,
        forCount: summary.pour,
        againstCount: summary.contre,
        abstainCount: summary.abstention,
        expressedCount: summary.expressedCount,
        votesCast: summary.votesCast,
        uncastCount: summary.uncastCount,
        quorumReached: summary.quorumReached,
        outcome: outcomeStatuses[summary.outcome],
        representationSnapshot: representation.map((seat) => ({
          seatId: id("seat", seat.seatId),
          seatLabel: seat.seatLabel,
          titular: actorSnapshot(seat.titularId),
          substitute: actorSnapshot(seat.substituteId),
          representative: actorSnapshot(seat.representativeId),
          representativeKind: seat.representativeKind
            ? mandateKinds[seat.representativeKind]
            : null,
        })),
        presenceSnapshot: presenceSnapshot(meeting.id, ballot.presentMemberIds),
      },
    }
  })
  const documentFixtures = initialDocuments.filter(
    (document) => document.status !== "Archivé" || instant(document.archivedAt)
  )
  const documents = documentFixtures.map((document) => ({
    id: id("document", document.id),
    reference: document.reference,
    title: document.title,
    description: document.description,
    type: documentTypes[document.type],
    status: documentStatuses[document.status],
    visibility: visibilities[document.visibility],
    meetingId: document.meetingId ? id("meeting", document.meetingId) : null,
    updatedAt: instant(document.updatedAt),
    archivedAt: instant(document.archivedAt),
    archivedByName: document.archivedBy,
  }))
  const versions = documentFixtures.flatMap((document) =>
    document.versions.map((version) => ({
      id: id("version", version.id),
      documentId: id("document", document.id),
      number: version.number,
      filename: version.filename,
      note: version.note,
      versionDate: civilDate(version.date),
      authorName: version.author,
      isHistorical: true,
    }))
  )
  const minutes = initialMinutes.map((pv) => {
    const meeting = meetingsById.get(pv.meetingId)
    assert(
      meeting?.status === "PV signé" &&
        pv.status === "Signé" &&
        pv.summary.trim() &&
        pv.presentMemberIds.length,
      "PV signé non reconstructible."
    )
    const meetingId = id("meeting", meeting.id)
    const meetingDecisions = decisions.filter(
      (decision) => decision.meetingId === meetingId
    )
    const linkedActions = actions.filter((action) =>
      meetingDecisions.some((decision) => decision.id === action.decisionId)
    )
    return {
      id: id("minutes", pv.id),
      meetingId,
      reference: pv.reference,
      status: "SIGNED" as const,
      summary: pv.summary,
      nextSteps: pv.nextSteps,
      version: pv.version,
      updatedAt: instant(pv.updatedAt),
      signedAt: instant(pv.signedAt),
      signedByName: pv.signedBy,
      secretaryName: pv.secretary,
      presidentName: pv.president,
      snapshotVersion: 1,
      officialSnapshot: {
        source: "historical_frontend_fixtures",
        limitations: [
          "Heures de signature et de modification, acteurs authentifiés et état exact des actions à la signature inconnus.",
        ],
        sourceDates: {
          signed: pv.signedAt ?? null,
          updated: pv.updatedAt,
          precision: "day",
        },
        meeting: {
          id: meetingId,
          title: meeting.title,
          date: meeting.date,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          location: meeting.location,
          description: meeting.description,
        },
        participants: presenceSnapshot(meeting.id, pv.presentMemberIds),
        agenda: proposals
          .filter(
            (proposal) =>
              proposal.meetingId === meetingId && proposal.status === "APPROVED"
          )
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(({ id, title, description, sortOrder }) => ({
            id,
            title,
            description,
            sortOrder,
          })),
        summary: pv.summary,
        nextSteps: pv.nextSteps,
        identities: {
          secretary: pv.secretary,
          president: pv.president,
          signedBy: pv.signedBy ?? null,
        },
        decisions: meetingDecisions.map((decision) => ({
          ...decision,
          decisionDate: decision.decisionDate.toISOString().slice(0, 10),
          result:
            ballotImports.find((item) => item.ballot.decisionId === decision.id)
              ?.result ?? null,
        })),
        actions: linkedActions.map(
          ({
            id,
            title,
            description,
            decisionId,
            assigneeMemberId,
            dueDate,
          }) => ({
            id,
            title,
            description,
            decisionId,
            assigneeMemberId,
            dueDate: dueDate.toISOString().slice(0, 10),
            assigneeName: members.find(
              (member) => member.id === assigneeMemberId
            )!.fullName,
          })
        ),
      },
    }
  })
  const audits = [
    ...decisions
      .filter((decision) => decision.finalSource === "HISTORICAL_IMPORT")
      .map((decision) => ({
        id: id("audit", decision.id),
        operation: "IMPORT_HISTORICAL_DECISION",
        entityType: "decision",
        entityId: decision.id,
        details: {
          source: "frontend_fixture",
          reference: decision.reference,
          reason: "Décision définitive sans scrutin historique.",
        },
      })),
    ...minutes.map((pv) => ({
      id: id("audit", pv.id),
      operation: "IMPORT_HISTORICAL_MINUTES",
      entityType: "minutes",
      entityId: pv.id,
      details: {
        source: "frontend_fixture",
        reference: pv.reference,
        reason: "Instantané reconstitué à partir des fixtures.",
      },
    })),
  ]
  return {
    accounts,
    seats,
    members,
    mandates,
    meetings,
    participations,
    proposals,
    decisions,
    actions,
    ballots: ballotImports.map((item) => item.ballot),
    votes: ballotImports.flatMap((item) => item.votes),
    results: ballotImports.map((item) => item.result),
    documents,
    versions,
    minutes,
    audits,
  }
}
