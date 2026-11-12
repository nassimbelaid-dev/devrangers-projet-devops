/**
 * Tableau de bord de démonstration, sans API ni base de données.
 * Les chiffres sont calculés UNE FOIS à partir des données fictives initiales des
 * modules 01/02/03/05/07 : ils ne suivent PAS les changements effectués sur
 * ces pages tant que leur état React n'est pas centralisé.
 * Date de référence constante pour rendre la démonstration reproductible.
 */
import { initialMeetings } from "@/features/meetings/mock-data"
import { initialMembers } from "@/features/members/mock-data"
import {
  initialActions,
  initialDecisions,
} from "@/features/decisions/mock-data"
import { initialNotifications } from "@/features/notifications/mock-data"

export const DEMO_REFERENCE_DATE = "2026-11-12"

export const dashboardMeetings = [...initialMeetings]
  .filter((meeting) => meeting.status === "Planifiée")
  .sort((a, b) =>
    `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)
  )
  .slice(0, 3)

export const dashboardMembers = initialMembers

export const dashboardActionCounts = {
  todo: initialActions.filter((action) => action.status === "À faire").length,
  inProgress: initialActions.filter((action) => action.status === "En cours")
    .length,
  done: initialActions.filter((action) => action.status === "Terminée").length,
}

export const dashboardDecisionCounts = {
  adopted: initialDecisions.filter((decision) => decision.status === "Adoptée")
    .length,
  pending: initialDecisions.filter((decision) => decision.status === "En attente")
    .length,
  rejected: initialDecisions.filter((decision) => decision.status === "Rejetée")
    .length,
}

export const dashboardActionTotal = initialActions.length
export const dashboardDecisionTotal = initialDecisions.length

export const dashboardPendingActions = [...initialActions]
  .filter((action) => action.status !== "Terminée")
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  .slice(0, 4)
  .map((action) => ({
    ...action,
    assignee:
      dashboardMembers.find((member) => member.id === action.assigneeId)
        ?.name ?? "Non attribuée",
    overdue: action.dueDate < DEMO_REFERENCE_DATE,
  }))

export const dashboardActiveMembers = initialMembers.filter(
  (member) =>
    member.mandateStart <= DEMO_REFERENCE_DATE &&
    member.mandateEnd >= DEMO_REFERENCE_DATE
).length

export const dashboardNotifications = [...initialNotifications]
  .filter((notification) => !notification.archived)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export const dashboardUnreadCount = dashboardNotifications.filter(
  (notification) => !notification.read
).length

export const dashboardRecentNotifications = dashboardNotifications.slice(0, 3)

export const dashboardMetrics = {
  scheduledMeetings: dashboardMeetings.length,
  openActions:
    dashboardActionCounts.todo + dashboardActionCounts.inProgress,
  adoptedDecisions: dashboardDecisionCounts.adopted,
  unreadNotifications: dashboardUnreadCount,
  activeMembers: dashboardActiveMembers,
}

export function frenchDate(isoDate: string, options?: Intl.DateTimeFormatOptions) {
  const timestamp = isoDate.includes("T")
    ? new Date(isoDate)
    : new Date(`${isoDate}T12:00:00Z`)

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    ...options,
  }).format(timestamp)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
}
