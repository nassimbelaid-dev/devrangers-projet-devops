"use client"

import { useCallback, useSyncExternalStore } from "react"
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
import { categoryForKind } from "@/features/notifications/utils"
import { initialBallots } from "@/features/votes/mock-data"
import {
  calculateBallot,
  removeStaleVotes,
  seatRepresentations,
} from "@/features/votes/utils"

import type { CommitteeNotification } from "@/features/notifications/types"
import type { SetStateAction } from "react"
import type { DemoState, WorkflowAction } from "./demo-business"

import {
  getCurrentDemoUser,
  getDemoAccounts,
  hasPermission,
  syncDemoAccountSeats,
} from "@/lib/static-auth"

import {
  applyDemoChange,
  applyMeetingWorkflow,
  createReminderNotifications,
  isAgendaReviewOnly,
  sendMeetingInvitations,
} from "./demo-business"

// État commun à l'application pendant la navigation ; aucune persistance serveur.
const initial: DemoState = {
  meetings: initialMeetings,
  members: initialMembers,
  decisions: initialDecisions,
  actions: initialActions,
  ballots: initialBallots.map((ballot) => {
    if (ballot.state !== "Clôturé") return ballot
    const decision = initialDecisions.find(
      (item) => item.id === ballot.decisionId
    )
    const meetingDate =
      initialMeetings.find((item) => item.id === decision?.meetingId)?.date ??
      ""
    return {
      ...ballot,
      closedResult: calculateBallot(
        ballot,
        initialMembers,
        committeeSeats,
        meetingDate
      ),
    }
  }),
  documents: initialDocuments,
  minutes: initialMinutes,
  agenda: initialAgendaProposals,
  notifications: initialNotifications,
}

let current: DemoState = initial
let feedback = ""
const STORAGE_KEY = "comite-scientifique:demo-data:v1"
let initialized = false
const listeners = new Set<() => void>()

function migrateStoredNotifications(records: unknown): CommitteeNotification[] {
  if (!Array.isArray(records)) return initial.notifications
  const accounts = getDemoAccounts().filter(
    (account) => account.isActive !== false
  )
  return records.flatMap((raw) => {
    if (
      !raw ||
      typeof raw !== "object" ||
      typeof raw.id !== "string" ||
      typeof raw.kind !== "string"
    )
      return []
    const item = raw as Partial<CommitteeNotification> & {
      context?: string
      target?: string
    }
    const kind = item.kind
    if (!kind) return []
    const category = item.category ?? categoryForKind(kind)
    if (typeof item.recipientId === "string")
      return [{ ...item, category } as CommitteeNotification]
    const refs = item.context?.match(/\b(r\d+|ac\d+|d\d+)\b/g) ?? []
    let recipients: typeof accounts = []
    let entityType: CommitteeNotification["entityType"]
    let entityId: string | undefined
    if (kind.startsWith("pv-")) {
      const role =
        kind === "pv-signature"
          ? "president"
          : kind === "pv-archives"
            ? "archivist"
            : "secretary"
      const minutes = current.minutes.find((record) =>
        item.context?.includes(record.reference)
      )
      entityType = "minutes"
      entityId = minutes?.id
      recipients = accounts.filter((account) => account.role === role)
    } else if (kind === "echeance-action" || kind.startsWith("action-")) {
      entityId = refs.find((ref) => ref.startsWith("ac"))
      const action = current.actions.find((record) => record.id === entityId)
      if (action) {
        entityType = "action"
        recipients = accounts.filter(
          (account) => account.memberId === action.assigneeId
        )
      }
    } else if (kind === "avis-decision") {
      entityId = refs.find((ref) => ref.startsWith("d"))
      const decision = current.decisions.find(
        (record) => record.id === entityId
      )
      const meeting = current.meetings.find(
        (record) => record.id === decision?.meetingId
      )
      if (decision && meeting) {
        entityType = "decision"
        recipients = accounts.filter((account) =>
          meeting.participantIds.includes(account.memberId ?? "")
        )
      }
    } else {
      entityId = refs.find((ref) => ref.startsWith("r"))
      const meeting = current.meetings.find((record) => record.id === entityId)
      if (meeting) {
        entityType = "meeting"
        recipients = accounts.filter((account) =>
          meeting.participantIds.includes(account.memberId ?? "")
        )
      }
    }
    if (!recipients.length) return []
    return recipients.map(
      (recipient) =>
        ({
          ...item,
          id: `${item.id}:${recipient.id}`,
          recipientId: recipient.id,
          category,
          entityType:
            entityType ?? (kind.startsWith("pv-") ? "minutes" : undefined),
          entityId,
          dedupeKey: item.dedupeKey ?? `legacy:${item.id}:${recipient.id}`,
        }) as CommitteeNotification
    )
  })
}

function initialize() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null"
    ) as Partial<DemoState> | null
    if (stored && typeof stored === "object") {
      current = {
        meetings: Array.isArray(stored.meetings)
          ? stored.meetings
          : initial.meetings,
        members: Array.isArray(stored.members)
          ? stored.members
          : initial.members,
        decisions: Array.isArray(stored.decisions)
          ? stored.decisions
          : initial.decisions,
        actions: Array.isArray(stored.actions)
          ? stored.actions
          : initial.actions,
        ballots: Array.isArray(stored.ballots)
          ? stored.ballots
          : initial.ballots,
        documents: Array.isArray(stored.documents)
          ? stored.documents
          : initial.documents,
        minutes: Array.isArray(stored.minutes)
          ? stored.minutes
          : initial.minutes,
        agenda: Array.isArray(stored.agenda) ? stored.agenda : initial.agenda,
        // Les anciennes notifications anonymes sont reciblées depuis leur référence métier; les autres sont rejetées pour éviter les fuites entre comptes.
        notifications: initial.notifications,
      }
      current = {
        ...current,
        notifications: migrateStoredNotifications(stored.notifications),
      }
      current = {
        ...current,
        ballots: current.ballots.map((ballot) => {
          if (ballot.state !== "Clôturé" || ballot.closedResult) return ballot
          const decision = current.decisions.find(
            (item) => item.id === ballot.decisionId
          )
          const meetingDate =
            current.meetings.find((item) => item.id === decision?.meetingId)
              ?.date ?? ""
          return {
            ...ballot,
            closedResult: calculateBallot(
              ballot,
              current.members,
              committeeSeats,
              meetingDate
            ),
          }
        }),
      }
      current = {
        ...current,
        ballots: current.ballots.map((ballot) => {
          if (ballot.state === "Clôturé") return ballot
          const decision = current.decisions.find(
            (item) => item.id === ballot.decisionId
          )
          const meeting = current.meetings.find(
            (item) => item.id === decision?.meetingId
          )
          if (!meeting) return ballot
          const presentMemberIds = meeting.participantIds.filter(
            (id) => meeting.attendance?.[id] === true
          )
          const seats = seatRepresentations(
            current.members,
            committeeSeats,
            meeting.date,
            presentMemberIds
          )
          return {
            ...ballot,
            presentMemberIds,
            votes: removeStaleVotes(ballot.votes, seats),
          }
        }),
        minutes: current.minutes.map((minutes) => {
          if (minutes.status !== "Brouillon") return minutes
          const meeting = current.meetings.find(
            (item) => item.id === minutes.meetingId
          )
          return meeting
            ? {
                ...minutes,
                presentMemberIds: meeting.participantIds.filter(
                  (id) => meeting.attendance?.[id] === true
                ),
              }
            : minutes
        }),
      }
    }
  } catch {
    current = initial
  }
}

function persist() {
  if (typeof window === "undefined") return
  try {
    // Les métadonnées des fichiers sont conservées ; les objets File ne sont pas sérialisables.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(current, (key, value) =>
        key === "file" ? undefined : value
      )
    )
  } catch {
    feedback =
      "Le stockage local est indisponible. Les modifications ne survivront pas au rechargement."
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  initialize()
  listener()
  return () => {
    listeners.delete(listener)
  }
}
function notify() {
  listeners.forEach((listener) => listener())
}
function snapshot() {
  return current
}
function serverSnapshot() {
  return initial
}

export function useDemoData() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

/** Les composants existants conservent leur interface [valeur, setter]. */
export function useDemoCollection<K extends keyof DemoState>(key: K) {
  const value = useSyncExternalStore(
    subscribe,
    () => current[key],
    () => initial[key]
  )
  const setValue = useCallback(
    (next: SetStateAction<DemoState[K]>) => {
      const previous = current[key]
      const updated =
        typeof next === "function"
          ? (next as (previous: DemoState[K]) => DemoState[K])(previous)
          : next
      const actor = getCurrentDemoUser()
      const denial = authorizeDemoWrite(actor, key, previous, updated)
      if (denial) {
        feedback = denial
        notify()
        return
      }
      const recipients = getDemoAccounts()
      const result = applyDemoChange(current, key, updated, recipients)
      if (
        !result.error &&
        key === "members" &&
        !syncDemoAccountSeats(updated as DemoState["members"])
      ) {
        feedback =
          "Les correspondances entre les comptes et les membres n'ont pas pu être synchronisées."
        notify()
        return
      }
      feedback = result.error ?? ""
      if (!Object.is(current, result.state) || result.error) {
        current = result.state
        if (!result.error) persist()
        notify()
      }
    },
    [key]
  )
  return [value, setValue] as const
}

function authorizeDemoWrite<K extends keyof DemoState>(
  actor: ReturnType<typeof getCurrentDemoUser>,
  key: K,
  before: DemoState[K],
  after: DemoState[K]
): string | null {
  if (!actor)
    return "Connectez-vous pour modifier les données de démonstration."
  const allowed = (
    module: string,
    permission: Parameters<typeof hasPermission>[2]
  ) => hasPermission(actor, module, permission)
  if (Object.is(before, after)) return null

  if (key === "members")
    return allowed("members", "manageMembers")
      ? null
      : "Votre rôle ne permet pas de gérer l'annuaire des membres."
  if (key === "meetings") {
    const oldItems = before as DemoState["meetings"]
    const newItems = after as DemoState["meetings"]
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (!old) {
        if (!allowed("meetings", "create") || item.status !== "Planifiée")
          return "Votre rôle ne permet pas de planifier cette réunion."
        continue
      }
      const beforeAttendance = JSON.stringify(old.attendance ?? {})
      const afterAttendance = JSON.stringify(item.attendance ?? {})
      const withoutAttendance = (value: typeof item) =>
        JSON.stringify({ ...value, attendance: undefined })
      const attendanceChanged = beforeAttendance !== afterAttendance
      const attendanceOnly =
        attendanceChanged && withoutAttendance(old) === withoutAttendance(item)
      if (attendanceChanged) {
        if (!allowed("meetings", "managePresence") || old.status !== "En cours")
          return "Seuls le président et le secrétaire peuvent gérer les présences d'une réunion en cours."
      }
      if (attendanceOnly) {
        continue
      }
      if (JSON.stringify(old.agenda) !== JSON.stringify(item.agenda)) {
        for (const point of item.agenda) {
          const previousPoint = old.agenda.find(
            (entry) => entry.id === point.id
          )
          if (!previousPoint) {
            if (
              point.status !== "Proposé" ||
              !allowed("agenda", "create") ||
              point.proposedById !== actor.memberId
            )
              return "Une proposition doit être déposée en son nom et rester en attente de validation."
          } else if (previousPoint.status !== point.status) {
            if (!allowed("agenda", "approve"))
              return "Seul le président peut valider ou rejeter un point de l'ordre du jour."
          } else if (JSON.stringify(previousPoint) !== JSON.stringify(point)) {
            if (
              !allowed("agenda", "edit") ||
              previousPoint.proposedById !== actor.memberId ||
              !["Proposé", "Rejeté"].includes(previousPoint.status)
            )
              return "Vous ne pouvez modifier que votre propre proposition non examinée."
          }
        }
        if (
          old.agenda.some(
            (point) =>
              !item.agenda.some((nextPoint) => nextPoint.id === point.id)
          ) &&
          !allowed("agenda", "approve")
        )
          return "Seul le président peut retirer un point de l'ordre du jour."
        if (
          JSON.stringify({ ...old, agenda: undefined }) ===
          JSON.stringify({ ...item, agenda: undefined })
        )
          continue
      }
      if (
        JSON.stringify(old) !== JSON.stringify(item) &&
        (!allowed("meetings", "edit") || old.status !== "Planifiée")
      )
        return "Votre rôle ne permet pas de modifier les informations de cette réunion."
    }
    if (
      oldItems.some(
        (item) => !newItems.some((nextItem) => nextItem.id === item.id)
      )
    )
      return "La suppression d'une réunion doit respecter les règles de conservation."
    return null
  }
  if (key === "agenda") {
    const oldItems = before as DemoState["agenda"]
    const newItems = after as DemoState["agenda"]
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (!old) {
        if (
          !allowed("agenda", "create") ||
          item.proposedById !== actor.memberId
        )
          return "Seuls les membres autorisés peuvent proposer un point en leur nom."
      } else if (JSON.stringify(old) !== JSON.stringify(item)) {
        const reviewOnly =
          actor.role === "president" &&
          allowed("agenda", "approve") &&
          isAgendaReviewOnly(old, item)
        if (reviewOnly) continue
        if (
          !allowed("agenda", "edit") ||
          old.proposedById !== actor.memberId ||
          !["Proposé", "Rejeté"].includes(old.status)
        )
          return "Vous ne pouvez modifier que vos propres propositions non examinées."
      }
    }
    if (
      oldItems.some(
        (item) => !newItems.some((nextItem) => nextItem.id === item.id)
      ) &&
      !allowed("agenda", "approve")
    )
      return "Votre rôle ne permet pas de retirer ce point de l'ordre du jour."
    return null
  }
  if (key === "ballots") {
    const oldItems = before as DemoState["ballots"]
    const newItems = after as DemoState["ballots"]
    for (const ballot of newItems) {
      const old = oldItems.find((entry) => entry.id === ballot.id)
      if (!old) {
        if (!allowed("votes", "approve"))
          return "Seul le président peut organiser un scrutin."
        continue
      }
      if (JSON.stringify(old) === JSON.stringify(ballot)) continue
      if (old.state === "Clôturé")
        return "Un scrutin clôturé est entièrement immuable."
      if (
        ballot.id !== old.id ||
        ballot.decisionId !== old.decisionId ||
        JSON.stringify(ballot.closedResult) !== JSON.stringify(old.closedResult)
      )
        return "L'identité, la décision liée et le résultat figé d'un scrutin ne sont pas modifiables directement."
      const decision = current.decisions.find(
        (entry) => entry.id === ballot.decisionId
      )
      const meeting = current.meetings.find(
        (entry) => entry.id === decision?.meetingId
      )
      if (
        ballot.state === "Clôturé" ||
        old.state !== ballot.state ||
        old.quorumPercent !== ballot.quorumPercent ||
        old.majorityPercent !== ballot.majorityPercent
      ) {
        if (!allowed("votes", "approve"))
          return "Seul le président peut gérer les paramètres ou l'état du scrutin."
      }
      const presenceChanged =
        JSON.stringify(old.presentMemberIds) !==
        JSON.stringify(ballot.presentMemberIds)
      if (presenceChanged)
        return "Les présences des scrutins sont gérées depuis la feuille de présence de la réunion."
      const votesChanged =
        JSON.stringify(old.votes) !== JSON.stringify(ballot.votes)
      if (votesChanged) {
        if (
          !allowed("votes", "vote") ||
          !actor.memberId ||
          meeting?.status !== "En cours" ||
          ballot.state === "Clôturé"
        )
          return "Votre rôle ne permet pas de voter dans ce scrutin."
        const eligible = seatRepresentations(
          current.members,
          committeeSeats,
          meeting.date,
          old.presentMemberIds
        )
        const changedSeats = new Set(
          [...Object.keys(old.votes), ...Object.keys(ballot.votes)].filter(
            (seatId) =>
              JSON.stringify(old.votes[seatId]) !==
              JSON.stringify(ballot.votes[seatId])
          )
        )
        if (
          [...changedSeats].some((seatId) => {
            const oldVote = old.votes[seatId]
            const nextVote = ballot.votes[seatId]
            return (
              (oldVote && oldVote.memberId !== actor.memberId) ||
              (nextVote && nextVote.memberId !== actor.memberId) ||
              !eligible.some(
                (seat) =>
                  seat.seatId === seatId &&
                  seat.representativeId === actor.memberId
              )
            )
          })
        )
          return "Vous ne pouvez voter que pour un siège que vous représentez actuellement."
      }
    }
    if (
      oldItems.some(
        (ballot) => !newItems.some((nextBallot) => nextBallot.id === ballot.id)
      )
    )
      return "Un scrutin ne peut pas être supprimé directement."
    return null
  }
  if (key === "decisions") {
    const oldItems = before as DemoState["decisions"]
    const newItems = after as DemoState["decisions"]
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (!old) {
        if (!allowed("decisions", "create"))
          return "Seul le président peut créer une décision."
        continue
      }
      if (JSON.stringify(old) === JSON.stringify(item)) continue
      const archiveOnly =
        allowed("documents", "archive") &&
        (old.status === "Adoptée" || old.status === "Rejetée") &&
        !old.archivedAt &&
        Boolean(
          item.archivedAt &&
            Number.isFinite(Date.parse(item.archivedAt)) &&
            item.archivedBy === `${actor.firstName} ${actor.lastName}`
        ) &&
        JSON.stringify({
          ...old,
          archivedAt: undefined,
          archivedBy: undefined,
        }) ===
          JSON.stringify({
            ...item,
            archivedAt: undefined,
            archivedBy: undefined,
          })
      if (!archiveOnly)
        return "Les décisions évoluent par le scrutin ; seul le responsable des archives peut les archiver."
    }
    if (
      oldItems.some((item) => !newItems.some((entry) => entry.id === item.id))
    )
      return "Une décision ne peut pas être supprimée du magasin de données."
    return null
  }
  if (key === "actions") {
    const oldItems = before as DemoState["actions"]
    const newItems = after as DemoState["actions"]
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (!old) {
        if (!allowed("actions", "create"))
          return "Votre rôle ne permet pas de créer une action."
        continue
      }
      if (JSON.stringify(old) === JSON.stringify(item)) continue
      if (actor.role === "secretary" && allowed("actions", "edit")) continue
      const presidentMoveOnly =
        actor.role === "president" &&
        JSON.stringify({ ...old, status: undefined, order: undefined }) ===
          JSON.stringify({ ...item, status: undefined, order: undefined })
      const ownStatusOnly =
        actor.role === "member" &&
        item.assigneeId === actor.memberId &&
        old.assigneeId === actor.memberId &&
        old.status !== item.status &&
        JSON.stringify({ ...old, status: undefined }) ===
          JSON.stringify({ ...item, status: undefined })
      if (!presidentMoveOnly && !ownStatusOnly)
        return "Vous ne pouvez modifier que l'état des actions qui vous sont attribuées."
    }
    if (
      oldItems.some(
        (item) => !newItems.some((entry) => entry.id === item.id)
      ) &&
      actor.role !== "secretary"
    )
      return "Votre rôle ne permet pas de supprimer cette action."
    return null
  }
  if (key === "documents") {
    const oldItems = before as DemoState["documents"]
    const newItems = after as DemoState["documents"]
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (!old) {
        if (!allowed("documents", "create"))
          return "Votre rôle ne permet pas de déposer un document."
        continue
      }
      if (JSON.stringify(old) === JSON.stringify(item)) continue
      const archiveOnly =
        actor.role === "archivist" &&
        item.status === "Archivé" &&
        old.status !== "Archivé" &&
        Boolean(item.archivedAt && item.archivedBy) &&
        JSON.stringify({
          ...old,
          status: undefined,
          archivedAt: undefined,
          archivedBy: undefined,
          updatedAt: undefined,
        }) ===
          JSON.stringify({
            ...item,
            status: undefined,
            archivedAt: undefined,
            archivedBy: undefined,
            updatedAt: undefined,
          })
      if (
        !archiveOnly &&
        (!allowed("documents", "edit") || old.status === "Archivé")
      )
        return "Votre rôle ne permet pas de modifier ce document."
    }
    if (
      oldItems.some(
        (item) => !newItems.some((nextItem) => nextItem.id === item.id)
      )
    )
      return "Votre rôle ne permet pas de supprimer ce document."
    return null
  }
  if (key === "minutes") {
    const oldItems = before as DemoState["minutes"]
    const newItems = after as DemoState["minutes"]
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (!old) {
        if (!allowed("minutes", "create"))
          return "Votre rôle ne permet pas de créer un brouillon de PV."
        continue
      }
      if (JSON.stringify(old) === JSON.stringify(item)) continue
      const archiveOnly =
        allowed("minutes", "archive") &&
        old.status === "Signé" &&
        item.status === "Archivé" &&
        Boolean(
          item.archivedAt &&
            Number.isFinite(Date.parse(item.archivedAt)) &&
            item.archivedBy === `${actor.firstName} ${actor.lastName}` &&
            item.version === old.version + 1
        ) &&
        JSON.stringify({
          ...old,
          status: undefined,
          archivedAt: undefined,
          archivedBy: undefined,
          updatedAt: undefined,
          version: undefined,
        }) ===
          JSON.stringify({
            ...item,
            status: undefined,
            archivedAt: undefined,
            archivedBy: undefined,
            updatedAt: undefined,
            version: undefined,
          })
      const draftFieldsOnly =
        actor.role === "secretary" &&
        allowed("minutes", "edit") &&
        old.status === "Brouillon" &&
        item.status === "Brouillon" &&
        old.id === item.id &&
        old.reference === item.reference &&
        old.meetingId === item.meetingId &&
        old.signedAt === item.signedAt &&
        old.signedBy === item.signedBy &&
        old.archivedAt === item.archivedAt &&
        old.archivedBy === item.archivedBy
      if (
        old.status === "Archivé" &&
        JSON.stringify(old) !== JSON.stringify(item)
      )
        return "Un procès-verbal archivé est immuable."
      if (!archiveOnly && !draftFieldsOnly)
        return "Votre rôle ne permet pas de modifier ce procès-verbal."
    }
    if (
      oldItems.some(
        (item) => !newItems.some((nextItem) => nextItem.id === item.id)
      )
    )
      return "Un procès-verbal ne peut pas être supprimé du magasin de données."
    return null
  }
  if (key === "notifications") {
    const oldItems = before as DemoState["notifications"]
    const newItems = after as DemoState["notifications"]
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (!old) {
        if (item.recipientId !== actor.id)
          return "Une notification ne peut être créée que pour son destinataire."
        continue
      }
      const ownStatusOnly =
        old.recipientId === actor.id &&
        JSON.stringify({ ...old, read: undefined, archived: undefined }) ===
          JSON.stringify({ ...item, read: undefined, archived: undefined })
      if (JSON.stringify(old) !== JSON.stringify(item) && !ownStatusOnly)
        return "Vous ne pouvez modifier que vos propres notifications."
    }
    if (
      oldItems.some(
        (item) =>
          !newItems.some((nextItem) => nextItem.id === item.id) &&
          item.recipientId !== actor.id
      )
    )
      return "Vous ne pouvez pas supprimer la notification d'un autre compte."
    return null
  }
  return null
}

export function useDemoFeedback() {
  return useSyncExternalStore(
    subscribe,
    () => feedback,
    () => ""
  )
}

export function clearDemoFeedback() {
  if (!feedback) return
  feedback = ""
  notify()
}

export function resetDemoData() {
  if (getCurrentDemoUser()?.role !== "admin") return false
  current = initial
  feedback = ""
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY)
  notify()
  return true
}

export function runMeetingWorkflow(
  action: WorkflowAction,
  meetingId: string,
  actor: { id: string; firstName: string; lastName: string; role: string },
  minutesId?: string
) {
  initialize()
  const authenticated = getCurrentDemoUser()
  if (
    !authenticated ||
    authenticated.id !== actor.id ||
    authenticated.role !== actor.role ||
    authenticated.firstName !== actor.firstName ||
    authenticated.lastName !== actor.lastName
  )
    return {
      error: "Le compte connecté n'est pas autorisé à exécuter cette action.",
    }
  const recipients = getDemoAccounts().filter(
    (account) => account.isActive !== false
  )
  const result = applyMeetingWorkflow(
    current,
    action,
    meetingId,
    actor,
    minutesId,
    recipients
  )
  feedback = result.error ?? ""
  if (!result.error && result.state !== current) {
    current = result.state
    persist()
    notify()
  } else if (result.error) notify()
  return result
}

export function sendMeetingInvitationsFromStore(
  meetingId: string,
  actor: { role: string }
) {
  initialize()
  const authenticated = getCurrentDemoUser()
  if (!authenticated || authenticated.role !== actor.role)
    return {
      error:
        "Le compte connecté n'est pas autorisé à envoyer les convocations.",
    }
  const accounts = getDemoAccounts().filter(
    (account) => account.isActive !== false
  )
  const result = sendMeetingInvitations(
    current,
    meetingId,
    authenticated,
    accounts
  )
  feedback = result.error ?? ""
  if (!result.error) {
    current = result.state
    persist()
    notify()
  } else notify()
  return result
}

/** Vérifie et persiste les rappels pour les comptes actifs. Appelé au montage et périodiquement. */
export function checkDemoNotificationReminders(actorId: string) {
  initialize()
  const authenticated = getCurrentDemoUser()
  if (
    !authenticated ||
    authenticated.id !== actorId ||
    authenticated.isActive === false
  )
    return
  const recipients = getDemoAccounts().filter(
    (account) => account.isActive !== false
  )
  const next = createReminderNotifications(current, recipients)
  if (next !== current) {
    current = next
    persist()
    notify()
  }
}

export function createMeetingMinutes(
  meetingId: string,
  actor: { id: string; firstName: string; lastName: string; role: string }
) {
  initialize()
  const authenticated = getCurrentDemoUser()
  if (
    !authenticated ||
    authenticated.id !== actor.id ||
    authenticated.role !== actor.role ||
    authenticated.firstName !== actor.firstName ||
    authenticated.lastName !== actor.lastName
  )
    return {
      error: "Le compte connecté n'est pas autorisé à créer ce procès-verbal.",
    }
  const meeting = current.meetings.find((item) => item.id === meetingId)
  if (
    actor.role !== "secretary" ||
    (meeting?.status !== "En cours" && meeting?.status !== "Clôturée")
  )
    return {
      error:
        "Seul le secrétaire peut créer le PV pendant ou après une réunion démarrée.",
    }
  if (current.minutes.some((item) => item.meetingId === meetingId))
    return { error: "Un PV existe déjà pour cette réunion." }
  const id = `pv-${Date.now()}`
  const presentMemberIds = meeting.participantIds.filter(
    (memberId) => meeting.attendance?.[memberId] === true
  )
  const next = {
    id,
    reference: `PV-2026-${String(current.minutes.length + 1).padStart(3, "0")}`,
    meetingId,
    status: "Brouillon" as const,
    presentMemberIds,
    summary: "",
    nextSteps: "",
    secretary: `${actor.firstName} ${actor.lastName}`,
    president: "Karim Haddad",
    version: 1,
    updatedAt: new Date().toISOString().slice(0, 10),
  }
  const result = applyDemoChange(current, "minutes", [next, ...current.minutes])
  if (result.error) return { error: result.error }
  current = result.state
  persist()
  notify()
  return { id }
}
