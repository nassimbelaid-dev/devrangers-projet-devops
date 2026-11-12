import type {
  CommitteeNotification, NotificationKind, NotificationKindFilter, NotificationTab,
} from "./types"
import { notificationExamples } from "./mock-data"

export const kindLabels: Record<NotificationKind, string> = {
  convocation: "Convocation",
  "rappel-reunion": "Rappel de réunion",
  "echeance-action": "Échéance d'action",
  "avis-decision": "Avis de décision",
}

export function formatNotificationDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers",
  }).format(new Date(value))
}

export function filterNotifications(
  notifications: CommitteeNotification[],
  tab: NotificationTab,
  kind: NotificationKindFilter,
  search: string
): CommitteeNotification[] {
  const query = search.trim().toLocaleLowerCase("fr")
  return notifications
    .filter((item) => {
      if (tab === "archivees" ? !item.archived : item.archived) return false
      if (tab === "non-lues" && item.read) return false
      if (kind !== "tous" && item.kind !== kind) return false
      if (!query) return true
      return `${item.title} ${item.preview} ${item.detail} ${item.context}`
        .toLocaleLowerCase("fr").includes(query)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadTotal(notifications: CommitteeNotification[]): number {
  return notifications.filter((item) => !item.archived && !item.read).length
}

export function createDemoNotification(kind: NotificationKind, ordinal: number): CommitteeNotification {
  return {
    ...notificationExamples[kind],
    id: `demo-${Date.now()}-${ordinal}`,
    createdAt: new Date().toISOString(),
    read: false,
    archived: false,
  }
}
