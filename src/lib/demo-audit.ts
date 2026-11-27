import { useSyncExternalStore } from "react"

import type { DemoState } from "./demo-business"
import type { DemoRole, DemoUser } from "./static-auth"

export type AuditEvent = {
  id: string
  actorAccountId: string | null
  operation: string
  occurredAt: string
  entityType: string
  entityId: string
  details: {
    actorName?: string
    actorRole?: DemoRole
    reference?: string
    previousStatus?: string
    status?: string
    demonstration?: boolean
    changes?: string[]
  } | null
}

const key = "comite-scientifique:audit:v1"
const demoEvents: AuditEvent[] = [
  {
    id: "audit-demo-1",
    actorAccountId: null,
    operation: "Planifier",
    occurredAt: "2026-10-19T09:00:00+01:00",
    entityType: "Réunions",
    entityId: "audit-meeting-example",
    details: {
      actorName: "Camille Exemple",
      actorRole: "secretary",
      status: "Planifiée",
      demonstration: true,
    },
  },
  {
    id: "audit-demo-2",
    actorAccountId: null,
    operation: "Valider",
    occurredAt: "2026-10-20T11:30:00+01:00",
    entityType: "Ordre du jour",
    entityId: "audit-agenda-example",
    details: {
      actorName: "Samir Exemple",
      actorRole: "president",
      status: "Validé",
      demonstration: true,
    },
  },
]

let events = demoEvents
let serialized: string | null | undefined
const listeners = new Set<() => void>()

function readEvents() {
  if (typeof window === "undefined") return demoEvents
  try {
    const next = window.localStorage.getItem(key)
    if (next !== serialized) {
      const parsed: unknown = JSON.parse(next ?? "null")
      events = Array.isArray(parsed) ? parsed : demoEvents
      serialized = next
    }
  } catch {
    // Retain the last usable snapshot if storage is temporarily unavailable.
  }
  return events
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const sync = (event: StorageEvent) => {
    if (event.key === key) listener()
  }
  window.addEventListener("storage", sync)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", sync)
  }
}

const emptyEvents: AuditEvent[] = []
export function useAuditEvents(user: DemoUser | null) {
  return useSyncExternalStore(
    subscribe,
    () =>
      user?.role === "admin" && user.isActive !== false
        ? readEvents()
        : emptyEvents,
    () => emptyEvents
  )
}

type AuditRecord = {
  id: string
  reference?: string
  status?: string
  state?: string
  archivedAt?: string
  role?: string
  isActive?: boolean
  assigneeId?: string
  dueDate?: string
  visibility?: string
  versions?: readonly unknown[]
  votes?: unknown
}

export function logAuditChanges(
  actor: DemoUser,
  entityType: string,
  before: readonly AuditRecord[],
  after: readonly AuditRecord[],
  command?: string
) {
  if (typeof window === "undefined") return
  const previous = new Map(before.map((record) => [record.id, record]))
  const updated = new Map(after.map((record) => [record.id, record]))
  const occurredAt = new Date().toISOString()
  const nextEvents: AuditEvent[] = []
  for (const id of new Set([...previous.keys(), ...updated.keys()])) {
    const old = previous.get(id)
    const record = updated.get(id)
    if (JSON.stringify(old) === JSON.stringify(record)) continue
    const previousStatus = old?.status ?? old?.state
    const status = record?.status ?? record?.state
    const changes: string[] = []
    if (old && record) {
      if (old.role !== record.role) changes.push("Changement de rôle")
      if (old.isActive !== record.isActive) changes.push("Activation du compte")
      if (old.assigneeId !== record.assigneeId) changes.push("Réattribution")
      if (old.dueDate !== record.dueDate)
        changes.push("Modification de l’échéance")
      if (old.visibility !== record.visibility)
        changes.push("Modification de la visibilité")
      if (old.versions?.length !== record.versions?.length)
        changes.push("Nouvelle version")
      if (JSON.stringify(old.votes) !== JSON.stringify(record.votes))
        changes.push("Bulletin mis à jour")
    }
    const operation =
      command ??
      (!old
        ? "Créer"
        : !record
          ? "Supprimer"
          : (!old.archivedAt && record.archivedAt) ||
              (status === "Archivé" && status !== previousStatus)
            ? "Archiver"
            : status === "Validé" && status !== previousStatus
              ? "Valider"
              : status === "Rejeté" && status !== previousStatus
                ? "Rejeter"
                : status === "Clôturé" && status !== previousStatus
                  ? "Clôturer"
                  : "Modifier")
    nextEvents.push({
      id:
        globalThis.crypto?.randomUUID?.() ??
        `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      actorAccountId: actor.id,
      operation,
      occurredAt,
      entityType,
      entityId: id,
      details: {
        actorName: `${actor.firstName} ${actor.lastName}`,
        actorRole: actor.role,
        reference: record?.reference ?? old?.reference,
        previousStatus,
        status,
        changes: changes.length ? changes : undefined,
      },
    })
  }
  if (!nextEvents.length) return
  events = [...nextEvents, ...readEvents()]
  try {
    serialized = JSON.stringify(events)
    window.localStorage.setItem(key, serialized)
  } catch {
    // Keep the in-memory log usable for the current session.
  }
  listeners.forEach((listener) => listener())
}

const auditedCollections = {
  members: "Membres",
  meetings: "Réunions",
  agenda: "Ordre du jour",
  decisions: "Décisions",
  actions: "Actions",
  ballots: "Scrutins",
  documents: "Documents",
  minutes: "Procès-verbaux",
} as const

export function auditBusinessChange(
  actor: DemoUser,
  before: DemoState,
  after: DemoState,
  keys: readonly (keyof DemoState)[],
  command?: string
) {
  for (const key of keys) {
    if (key === "notifications") continue
    logAuditChanges(
      actor,
      auditedCollections[key],
      before[key],
      after[key],
      command
    )
  }
}
