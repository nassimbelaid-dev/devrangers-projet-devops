"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { initialAgendaProposals } from "@/features/agenda/mock-data"
import {
  initialActions,
  initialDecisions,
} from "@/features/decisions/mock-data"
import { canViewDocument } from "@/features/documents/access"
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
  useStaticAuth,
} from "@/lib/static-auth"

import { auditBusinessChange } from "./demo-audit"
import {
  applyDemoChange,
  applyMeetingWorkflow,
  attachAgenda,
  createReminderNotifications,
  isAgendaReviewOnly,
  sendMeetingInvitations,
} from "./demo-business"
import { canViewMeeting, projectDemoState } from "./demo-visibility"

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

initial.meetings = attachAgenda(initial.meetings, initial.agenda)
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
        meetings: attachAgenda(current.meetings, current.agenda),
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
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const { user } = useStaticAuth()
  return useMemo(() => projectDemoState(state, user), [state, user])
}

/** Les composants existants conservent leur interface [valeur, setter]. */
export function useDemoCollection<K extends keyof DemoState>(key: K) {
  const value = useDemoData()[key]
  const setValue = useCallback(
    (next: SetStateAction<DemoState[K]>) => mutateDemoCollection(key, next),
    [key]
  )
  return [value, setValue] as const
}

export function mutateDemoCollection<K extends keyof DemoState>(
  key: K,
  next: SetStateAction<DemoState[K]>
) {
  initialize()
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
    return denial
  }
  const recipients = getDemoAccounts()
  const preservedNotifications =
    key === "notifications"
      ? (previous as DemoState["notifications"])
          .filter(
            (item) =>
              !(updated as DemoState["notifications"]).some(
                (next) => next.id === item.id
              )
          )
          .map((item) => ({
            ...item,
            deletedAt: item.deletedAt ?? new Date().toISOString(),
          }))
      : []
  const proposed =
    key === "notifications"
      ? ([
          ...preservedNotifications,
          ...(updated as DemoState["notifications"]),
        ] as DemoState[K])
      : updated
  const result = applyDemoChange(current, key, proposed, recipients)
  if (
    !result.error &&
    key === "members" &&
    !syncDemoAccountSeats(updated as DemoState["members"])
  ) {
    feedback =
      "Les correspondances entre les comptes et les membres n'ont pas pu être synchronisées."
    notify()
    return feedback
  }
  feedback = result.error ?? ""
  if (!Object.is(current, result.state) || result.error) {
    const before = current
    current = result.state
    if (!result.error) {
      persist()
      auditBusinessChange(
        actor!,
        before,
        current,
        key === "ballots" ? ["ballots", "decisions"] : [key]
      )
    }
    notify()
  }
  return result.error ?? null
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
      if (JSON.stringify(old?.agenda ?? []) !== JSON.stringify(item.agenda))
        return "Gérez les propositions depuis le module Ordre du jour."
      if (
        old?.invitationsSentAt !== item.invitationsSentAt ||
        old?.startedAt !== item.startedAt ||
        old?.closedAt !== item.closedAt
      )
        return "Utilisez les commandes de la réunion pour cette opération."
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
    const pending = (status: string) =>
      status === "Proposé" || status === "Rejeté"
    const review = (item: DemoState["agenda"][number]) => [
      item.status,
      item.order,
      item.reviewedById,
      item.reviewNote,
    ]
    const canWrite = (meetingId: string) => {
      const meeting = current.meetings.find((item) => item.id === meetingId)
      return meeting?.status === "Planifiée" && canViewMeeting(actor, meeting)
    }
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (JSON.stringify(old) === JSON.stringify(item)) continue
      if (!canWrite(item.meetingId))
        return "L’ordre du jour est verrouillé ou la réunion est inaccessible."
      if (!old) {
        if (
          !allowed("agenda", "create") ||
          !actor.memberId ||
          item.proposedById !== actor.memberId ||
          item.status !== "Proposé" ||
          item.order !== null ||
          item.reviewedById ||
          item.reviewNote
        )
          return "Seuls les membres autorisés peuvent proposer un point en leur nom."
        continue
      }
      if (
        item.meetingId !== old.meetingId ||
        item.proposedById !== old.proposedById ||
        item.createdAt !== old.createdAt
      )
        return "La réunion et l’auteur d’une proposition sont immuables."
      const reviewOnly = isAgendaReviewOnly(old, item)
      if (reviewOnly && allowed("agenda", "approve")) {
        if (
          old.status === "Proposé" &&
          (item.status === "Validé" || item.status === "Rejeté") &&
          item.reviewedById === actor.memberId &&
          (item.status === "Validé"
            ? Number.isInteger(item.order) &&
              item.order! >= 0 &&
              !item.reviewNote
            : item.order === null &&
              Boolean(item.reviewNote?.trim()) &&
              item.reviewNote === item.reviewNote?.trim())
        )
          continue
        if (
          old.status === "Validé" &&
          item.status === "Validé" &&
          Number.isInteger(item.order) &&
          item.order! >= 0 &&
          item.reviewedById === old.reviewedById &&
          item.reviewNote === old.reviewNote
        )
          continue
      }
      const author =
        allowed("agenda", "edit") && actor.memberId === item.proposedById
      if (
        author &&
        pending(old.status) &&
        JSON.stringify(review(old)) === JSON.stringify(review(item))
      )
        continue
      const resubmit = old.status === "Rejeté" && author
      const returnToPending =
        old.status !== "Proposé" && allowed("agenda", "approve")
      if (
        reviewOnly &&
        (resubmit || returnToPending) &&
        item.status === "Proposé" &&
        item.order === null &&
        !item.reviewedById &&
        !item.reviewNote &&
        !current.decisions.some(
          (decision) => decision.agendaProposalId === item.id
        )
      )
        continue
      return "Cette modification de proposition n’est pas autorisée."
    }
    if (
      oldItems.some(
        (item) =>
          !newItems.some((entry) => entry.id === item.id) &&
          (!allowed("agenda", "withdraw") ||
            item.proposedById !== actor.memberId ||
            !pending(item.status) ||
            !canWrite(item.meetingId) ||
            current.decisions.some(
              (decision) => decision.agendaProposalId === item.id
            ))
      )
    )
      return "Cette proposition ne peut pas être retirée."
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
    if (
      oldItems.some(
        (item) =>
          !newItems.some(
            (entry) =>
              entry.id === item.id &&
              JSON.stringify(entry) === JSON.stringify(item)
          )
      )
    )
      return "Les décisions évoluent par le scrutin ; seul le responsable des archives peut les archiver."
    if (
      newItems.some(
        (item) =>
          !oldItems.some((old) => old.id === item.id) &&
          (!allowed("decisions", "create") ||
            item.archivedAt ||
            item.archivedBy)
      )
    )
      return "Seul le président peut créer une décision."
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
      if (actor.role !== "member" && allowed("actions", "edit")) continue
      const ownStatusOnly =
        actor.role === "member" &&
        item.assigneeId === actor.memberId &&
        old.assigneeId === actor.memberId &&
        old.status !== item.status &&
        JSON.stringify({ ...old, status: undefined }) ===
          JSON.stringify({ ...item, status: undefined })
      if (!ownStatusOnly)
        return "Vous ne pouvez modifier que l'état des actions qui vous sont attribuées."
    }
    if (
      oldItems.some(
        (item) => !newItems.some((entry) => entry.id === item.id)
      ) &&
      !allowed("actions", "delete")
    )
      return "Votre rôle ne permet pas de supprimer cette action."
    return null
  }
  if (key === "documents") {
    const oldItems = before as DemoState["documents"]
    const newItems = after as DemoState["documents"]
    for (const item of newItems) {
      const old = oldItems.find((entry) => entry.id === item.id)
      if (JSON.stringify(old) === JSON.stringify(item)) continue
      const priorVersions = old?.versions ?? []
      const latestNumber = Math.max(
        0,
        ...priorVersions.map((version) => version.number)
      )
      const added = item.versions.slice(priorVersions.length)
      if (
        item.versions.length < priorVersions.length ||
        priorVersions.some(
          (version, index) =>
            JSON.stringify(version) !== JSON.stringify(item.versions[index])
        ) ||
        added.length > 1 ||
        added.some(
          (version) =>
            version.number !== latestNumber + 1 ||
            version.author !== `${actor.firstName} ${actor.lastName}` ||
            !(version.file instanceof File) ||
            version.file.size > 10 * 1024 * 1024
        )
      )
        return "Le dépôt doit ajouter une version numérotée et un fichier valide."
      if (!old) {
        if (
          !allowed("documents", "create") ||
          item.status !== "Brouillon" ||
          item.archivedAt ||
          item.archivedBy
        )
          return "Votre rôle ne permet pas de déposer un document."
        continue
      }
      const approveOnly =
        allowed("documents", "approve") &&
        old.status === "Brouillon" &&
        item.status === "Validé" &&
        JSON.stringify({ ...old, status: undefined, updatedAt: undefined }) ===
          JSON.stringify({ ...item, status: undefined, updatedAt: undefined })
      if (approveOnly) continue
      if (
        !allowed("documents", "edit") ||
        old.status === "Archivé" ||
        old.status !== item.status ||
        old.archivedAt !== item.archivedAt ||
        old.archivedBy !== item.archivedBy
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
        if (
          !allowed("minutes", "create") ||
          item.status !== "Brouillon" ||
          item.officialSnapshot ||
          item.signedAt ||
          item.archivedAt
        )
          return "Votre rôle ne permet pas de créer un brouillon de PV."
        continue
      }
      if (JSON.stringify(old) === JSON.stringify(item)) continue
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
        old.archivedBy === item.archivedBy &&
        old.officialSnapshot === item.officialSnapshot &&
        old.snapshotVersion === item.snapshotVersion
      if (
        old.status === "Archivé" &&
        JSON.stringify(old) !== JSON.stringify(item)
      )
        return "Un procès-verbal archivé est immuable."
      if (!draftFieldsOnly)
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
        !old.deletedAt &&
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
  current = {
    ...initial,
    meetings: attachAgenda(initial.meetings, initial.agenda),
  }
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
    const before = current
    current = result.state
    persist()
    const operation = {
      start: "Démarrer",
      close: "Clôturer",
      cancel: "Annuler",
      "submit-minutes": "Soumettre",
      "return-minutes": "Demander une correction",
      "sign-minutes": "Signer",
    }[action]
    auditBusinessChange(
      authenticated,
      before,
      current,
      action.endsWith("-minutes") ? ["minutes"] : ["meetings"],
      operation
    )
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
    const before = current
    current = result.state
    persist()
    auditBusinessChange(
      authenticated,
      before,
      current,
      ["meetings"],
      "Convoquer"
    )
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

export function archiveDemoRecord(
  entity: "documents" | "decisions" | "minutes",
  id: string
): string | null {
  initialize()
  const actor = getCurrentDemoUser()
  if (actor?.role !== "archivist")
    return "Seul l’archiviste peut archiver cet élément."
  const item = current[entity].find((entry) => entry.id === id)
  if (!item || item.archivedAt) return "Cet élément ne peut pas être archivé."
  const meeting = current.meetings.find((entry) => entry.id === item.meetingId)
  const archivedAt = new Date().toISOString()
  const archivedBy = `${actor.firstName} ${actor.lastName}`
  const before = current
  if (entity === "documents") {
    const document = current.documents.find((entry) => entry.id === id)!
    if (
      !canViewDocument(actor, document) ||
      document.status === "Archivé" ||
      (document.meetingId &&
        (!meeting ||
          meeting.status === "En cours" ||
          meeting.status === "Annulée"))
    )
      return "Ce document ne peut pas être archivé."
    current = {
      ...current,
      documents: current.documents.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: "Archivé",
              archivedAt,
              archivedBy,
              updatedAt: archivedAt,
            }
          : entry
      ),
    }
  } else if (entity === "decisions") {
    const decision = current.decisions.find((entry) => entry.id === id)!
    if (
      decision.status === "En attente" ||
      (meeting?.status !== "Clôturée" && meeting?.status !== "PV signé")
    )
      return "Seule une décision définitive d’une réunion clôturée peut être archivée."
    current = {
      ...current,
      decisions: current.decisions.map((entry) =>
        entry.id === id ? { ...entry, archivedAt, archivedBy } : entry
      ),
    }
  } else {
    const minutes = current.minutes.find((entry) => entry.id === id)!
    if (minutes.status !== "Signé" || meeting?.status === "Annulée")
      return "Seul un PV signé peut être archivé."
    current = {
      ...current,
      minutes: current.minutes.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: "Archivé",
              archivedAt,
              archivedBy,
              updatedAt: archivedAt,
              version: entry.version + 1,
            }
          : entry
      ),
    }
  }
  persist()
  auditBusinessChange(actor, before, current, [entity], "Archiver")
  notify()
  return null
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
  const id = `pv-${crypto.randomUUID()}`
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
    president:
      current.members.find((item) => item.role === "Président")?.name ?? "",
    version: 1,
    updatedAt: new Date().toISOString().slice(0, 10),
  }
  const result = applyDemoChange(current, "minutes", [next, ...current.minutes])
  if (result.error) return { error: result.error }
  const before = current
  current = result.state
  persist()
  auditBusinessChange(authenticated, before, current, ["minutes"])
  notify()
  return { id }
}
