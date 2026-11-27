import assert from "node:assert/strict"
import test from "node:test"

import type { MeetingMinutes } from "../src/features/documents/types"
import type { DemoState, WorkflowAction } from "../src/lib/demo-business"

import {
  archiveDemoRecord,
  createMeetingMinutes,
  mutateDemoCollection,
  resetDemoData,
  runMeetingWorkflow,
  sendMeetingInvitationsFromStore,
} from "../src/lib/demo-store"
import { projectDemoState } from "../src/lib/demo-visibility"
import {
  demoAccounts,
  getCurrentDemoUser,
  signInStatic,
} from "../src/lib/static-auth"

import { buildSeedData } from "../prisma/seed/data"
import { buildPrintableMinutes } from "../src/features/documents/utils"

const storage = new Map<string, string>()
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  },
})
const dataKey = "comite-scientifique:demo-data:v1"
const auditKey = "comite-scientifique:audit:v1"
function state(): DemoState {
  return JSON.parse(storage.get(dataKey)!)
}
function login(name: string) {
  const account = demoAccounts.find((item) =>
    item.email.startsWith(name + "@")
  )!
  assert.equal(signInStatic(account.email, account.password), true)
  return getCurrentDemoUser()!
}
const change = <K extends keyof DemoState>(
  key: K,
  id: string,
  values: Partial<DemoState[K][number]>
) =>
  mutateDemoCollection(
    key,
    (items) =>
      items.map((item) =>
        item.id === id ? { ...item, ...values } : item
      ) as DemoState[K]
  )
const workflow = (
  action: WorkflowAction,
  meetingId: string,
  minutesId?: string
) => runMeetingWorkflow(action, meetingId, getCurrentDemoUser()!, minutesId)
const proposed = {
  id: "local-proposal",
  meetingId: "local-meeting",
  proposedById: "m2",
  title: "Point proposé",
  description: "",
  status: "Proposé" as const,
  order: null,
  createdAt: "2026-11-20T12:00:00Z",
  attachments: [],
}

test("Les fixtures produisent toujours les données de reprise du seed", () => {
  const fixtures = buildSeedData()
  assert.equal(fixtures.meetings.length, 3)
  assert.ok(fixtures.proposals.length > 0)
  assert.ok(fixtures.minutes.length > 0)
})

test("Transitions, permissions, projections et historique du frontend statique", () => {
  login("admin")
  assert.equal(resetDemoData(), true)
  assert.match(
    change("members", "m6", { mandateEnd: "2026-11-24" }) ?? "",
    /réunion planifiée/
  )
  login("secretaire")
  assert.equal(
    mutateDemoCollection("meetings", (items) => [
      ...items,
      {
        id: "local-meeting",
        title: "Séance de recette",
        date: "2026-11-25",
        startTime: "09:00",
        endTime: "10:00",
        location: "Salle du comité",
        description: "",
        status: "Planifiée",
        participantIds: ["m1", "m2", "m3", "m6"],
        agenda: [],
      },
    ]),
    null
  )
  assert.equal(
    mutateDemoCollection("agenda", (items) => [...items, proposed]),
    null
  )
  assert.deepEqual(
    state().meetings.find((item) => item.id === "local-meeting")?.agenda,
    []
  )
  assert.ok(
    change("agenda", proposed.id, {
      status: "Validé",
      reviewedById: "m2",
      order: 0,
    })
  )
  assert.ok(
    change("meetings", "local-meeting", {
      agenda: [
        {
          id: proposed.id,
          title: proposed.title,
          status: "Validé",
          proposedById: "m2",
        },
      ],
    })
  )
  login("membre")
  assert.ok(
    mutateDemoCollection("agenda", (items) =>
      items.filter((item) => item.id !== proposed.id)
    )
  )
  login("sara")
  assert.equal(
    mutateDemoCollection("agenda", (items) => [
      ...items,
      { ...proposed, id: "alternate", proposedById: "m6" },
    ]),
    null
  )
  login("president")
  assert.equal(
    change("agenda", "alternate", {
      status: "Rejeté",
      reviewedById: "m1",
      reviewNote: "Sujet reporté",
    }),
    null
  )
  login("sara")
  assert.equal(
    mutateDemoCollection("agenda", (items) =>
      items.filter((item) => item.id !== "alternate")
    ),
    null
  )
  login("president")
  assert.ok(
    change("agenda", proposed.id, {
      status: "Rejeté",
      reviewedById: "m1",
      reviewNote: "  ",
    })
  )
  assert.equal(
    change("agenda", proposed.id, {
      status: "Validé",
      reviewedById: "m1",
      order: 0,
    }),
    null
  )
  assert.ok(workflow("cancel", "local-meeting").error)
  assert.equal(workflow("start", "local-meeting").error, undefined)
  assert.ok(
    mutateDemoCollection("agenda", (items) =>
      items.filter((item) => item.id !== proposed.id)
    )
  )
  assert.equal(
    change("meetings", "local-meeting", {
      attendance: { m1: true, m2: true, m3: false, m6: true },
    }),
    null
  )
  const decision = {
    id: "local-decision",
    reference: "DEC-TEST",
    title: "Décision à voter",
    description: "",
    status: "En attente" as const,
    meetingId: "local-meeting",
    agendaProposalId: proposed.id,
    date: "2026-11-25",
  }
  login("secretaire")
  assert.ok(mutateDemoCollection("decisions", (items) => [...items, decision]))
  login("president")
  assert.equal(
    mutateDemoCollection("decisions", (items) => [...items, decision]),
    null
  )
  assert.equal(
    mutateDemoCollection("ballots", (items) => [
      ...items,
      {
        id: "local-ballot",
        decisionId: decision.id,
        state: "Ouvert",
        quorumPercent: 1,
        majorityPercent: 50,
        presentMemberIds: ["m1", "m2", "m6"],
        votes: {},
      },
    ]),
    null
  )
  const president = getCurrentDemoUser()!
  assert.equal(
    change("ballots", "local-ballot", {
      votes: {
        [president.seatId!]: {
          seatId: president.seatId!,
          memberId: "m1",
          choice: "pour",
        },
      },
    }),
    null
  )
  for (const account of ["secretaire", "membre", "sara", "archives", "admin"]) {
    const visible = projectDemoState(state(), login(account))
    const ballot = visible.ballots.find((item) => item.id === "local-ballot")
    assert.equal(
      Object.values(ballot?.votes ?? {}).some((item) => item.memberId === "m1"),
      false
    )
    if (account === "admin" || account === "archives")
      assert.equal(ballot, undefined)
    if (account === "secretaire") assert.equal(ballot?.displaySummary?.pour, 1)
  }
  login("president")
  assert.equal(change("ballots", "local-ballot", { state: "Clôturé" }), null)
  assert.ok(change("ballots", "local-ballot", { state: "Ouvert" }))
  const action = {
    id: "local-action",
    title: "Action inscrite",
    description: "",
    decisionId: decision.id,
    assigneeId: "m3",
    dueDate: "2026-11-26",
    priority: "Haute" as const,
    status: "À faire" as const,
    order: 0,
  }
  assert.ok(
    mutateDemoCollection("actions", (items) => [
      ...items,
      { ...action, dueDate: "2026-11-24" },
    ])
  )
  assert.equal(
    mutateDemoCollection("actions", (items) => [...items, action]),
    null
  )
  login("membre")
  assert.ok(change("actions", action.id, { priority: "Basse" }))
  assert.equal(change("actions", action.id, { status: "En cours" }), null)
  login("sara")
  assert.ok(change("actions", action.id, { status: "Terminée" }))
  login("president")
  assert.equal(
    change("actions", action.id, {
      assigneeId: "m6",
      title: "Action avant signature",
    }),
    null
  )
  assert.equal(workflow("close", "local-meeting").error, undefined)
  const secretary = login("secretaire")
  const minutes = createMeetingMinutes("local-meeting", secretary)
  assert.ok(minutes.id)
  assert.equal(
    change("minutes", minutes.id!, { summary: "Compte rendu de recette" }),
    null
  )
  assert.equal(
    workflow("submit-minutes", "local-meeting", minutes.id).error,
    undefined
  )
  const submitted = state().minutes.find(
    (item) => item.id === minutes.id
  ) as MeetingMinutes
  assert.equal(
    submitted.officialSnapshot?.actions[0]?.title,
    "Action avant signature"
  )
  login("president")
  assert.equal(
    change("actions", action.id, { title: "Action modifiée après soumission" }),
    null
  )
  assert.equal(
    workflow("sign-minutes", "local-meeting", minutes.id).error,
    undefined
  )
  assert.ok(
    mutateDemoCollection("actions", (items) =>
      items.filter((item) => item.id !== action.id)
    )
  )
  login("archives")
  assert.equal(archiveDemoRecord("minutes", minutes.id!), null)
  assert.equal(archiveDemoRecord("decisions", decision.id), null)
  assert.deepEqual(
    state().minutes.find((item) => item.id === minutes.id)?.officialSnapshot,
    submitted.officialSnapshot
  )
  const archive = state().minutes.find((item) => item.id === minutes.id)!
  assert.match(buildPrintableMinutes(archive), /Action avant signature/)
  assert.doesNotMatch(
    buildPrintableMinutes(archive),
    /modifiée après soumission/
  )
  login("secretaire")
  assert.ok(
    mutateDemoCollection("actions", (items) =>
      items.filter((item) => item.id !== action.id)
    )
  )

  assert.equal(
    mutateDemoCollection("meetings", (items) => [
      ...items,
      {
        id: "sans-convocation",
        title: "Sans convocation",
        date: "2026-11-25",
        startTime: "12:00",
        endTime: "13:00",
        location: "Salle du comité",
        description: "",
        status: "Planifiée",
        participantIds: ["m6"],
        agenda: [],
      },
    ]),
    null
  )
  assert.equal(workflow("cancel", "sans-convocation").error, undefined)
  assert.equal(
    state().notifications.some((item) => item.kind === "reunion-annulee"),
    false
  )

  assert.equal(
    sendMeetingInvitationsFromStore("r2", { role: "secretary" }).error,
    undefined
  )
  assert.equal(
    sendMeetingInvitationsFromStore("r2", { role: "secretary" }).error,
    undefined
  )
  assert.equal(workflow("cancel", "r2").error, undefined)
  assert.equal(
    state().meetings.find((item) => item.id === "r2")?.status,
    "Annulée"
  )
  const cancellations = state().notifications.filter(
    (item) => item.kind === "reunion-annulee"
  )
  assert.equal(cancellations.length, 4)
  assert.equal(
    new Set(cancellations.map((item) => item.recipientId)).size,
    cancellations.length
  )
  assert.ok(workflow("cancel", "r2").error)
  assert.ok(sendMeetingInvitationsFromStore("r2", { role: "secretary" }).error)
  const draft = {
    id: "local-document",
    title: "Document métier",
    reference: "DOC-TEST",
    description: "",
    status: "Brouillon" as const,
    type: "Rapport" as const,
    visibility: "Comité" as const,
    meetingId: "",
    updatedAt: "2026-11-25",
    versions: [],
  }
  assert.equal(
    mutateDemoCollection("documents", (items) => [...items, draft]),
    null
  )
  assert.equal(change("documents", draft.id, { status: "Validé" }), null)
  assert.equal(change("documents", draft.id, { visibility: "Archives" }), null)
  assert.equal(
    projectDemoState(state(), secretary).documents.some(
      (item) => item.id === draft.id
    ),
    false
  )
  assert.ok(
    mutateDemoCollection("documents", (items) =>
      items.filter((item) => item.id !== draft.id)
    )
  )
  login("archives")
  assert.equal(archiveDemoRecord("documents", draft.id), null)
  login("secretaire")
  assert.ok(change("documents", draft.id, { visibility: "Comité" }))
  const audit = storage.get(auditKey)!
  for (const operation of ["Signer", "Archiver", "Annuler", "Convoquer"])
    assert.match(audit, new RegExp(operation))
  assert.doesNotMatch(audit, /password|choice|closedResult/)
})
