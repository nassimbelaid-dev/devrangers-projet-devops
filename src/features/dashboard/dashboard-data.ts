"use client"

import { useDemoData } from "@/lib/demo-store"

export const DEMO_REFERENCE_DATE = "2026-11-12"

export function useDashboardData() {
  const { meetings, members, decisions, actions, notifications } = useDemoData()
  const dashboardMeetings = [...meetings]
    .filter((meeting) => meeting.status === "Planifiée")
    .sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)
    )
    .slice(0, 3)

  const dashboardMembers = members

  const dashboardActionCounts = {
    todo: actions.filter((action) => action.status === "À faire").length,
    inProgress: actions.filter((action) => action.status === "En cours")
      .length,
    done: actions.filter((action) => action.status === "Terminée").length,
  }

  const dashboardDecisionCounts = {
    adopted: decisions.filter((decision) => decision.status === "Adoptée")
      .length,
    pending: decisions.filter((decision) => decision.status === "En attente")
      .length,
    rejected: decisions.filter((decision) => decision.status === "Rejetée")
      .length,
  }

  const dashboardActionTotal = actions.length
  const dashboardDecisionTotal = decisions.length

  const dashboardPendingActions = [...actions]
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

  const dashboardActiveMembers = members.filter(
    (member) =>
      member.mandateStart <= DEMO_REFERENCE_DATE &&
      member.mandateEnd >= DEMO_REFERENCE_DATE
  ).length

  const dashboardNotifications = [...notifications]
    .filter((notification) => !notification.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const dashboardUnreadCount = dashboardNotifications.filter(
    (notification) => !notification.read
  ).length

  const dashboardRecentNotifications = dashboardNotifications.slice(0, 3)

  const dashboardMetrics = {
    scheduledMeetings: dashboardMeetings.length,
    openActions:
      dashboardActionCounts.todo + dashboardActionCounts.inProgress,
    adoptedDecisions: dashboardDecisionCounts.adopted,
    unreadNotifications: dashboardUnreadCount,
    activeMembers: dashboardActiveMembers,
  }


  return { dashboardMeetings, dashboardMembers, dashboardActionCounts, dashboardDecisionCounts, dashboardActionTotal, dashboardDecisionTotal, dashboardPendingActions, dashboardActiveMembers, dashboardNotifications, dashboardUnreadCount, dashboardRecentNotifications, dashboardMetrics }
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
