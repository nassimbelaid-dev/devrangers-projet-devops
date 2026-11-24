import type { DemoState } from "@/lib/demo-business"
import { hasPermission, moduleForPath } from "@/lib/static-auth"
import type { DemoUser } from "@/lib/static-auth"
import type {
  CommitteeNotification, NotificationCategory, NotificationKind, NotificationKindFilter,
  NotificationTab,
} from "./types"
import { notificationExamples } from "./mock-data"

export const kindLabels: Record<NotificationKind, string> = {
  convocation: "Convocation",
  "reunion-modifiee": "Réunion modifiée",
  "reunion-annulee": "Réunion annulée",
  "rappel-reunion": "Rappel de réunion",
  "proposition-agenda": "Proposition d'ordre du jour",
  "revue-agenda": "Décision sur une proposition",
  "echeance-action": "Échéance d'action",
  "action-attribuee": "Nouvelle action attribuée",
  "action-reattribuee": "Action réattribuée",
  "action-echeance-modifiee": "Échéance d'action modifiée",
  "rappel-action": "Rappel d'action",
  "action-en-retard": "Action en retard",
  "avis-decision": "Avis de décision",
  "pv-signature": "Procès-verbal à signer",
  "pv-correction": "Correction du procès-verbal",
  "pv-signe": "Procès-verbal signé",
  "pv-archives": "Procès-verbal à archiver",
}

export const categoryLabels: Record<NotificationCategory, string> = {
  meetings: "Réunions",
  agenda: "Ordre du jour",
  decisions: "Décisions",
  actions: "Actions",
  minutes: "Procès-verbaux",
}

export function categoryForKind(kind: NotificationKind): NotificationCategory {
  if (kind === "convocation" || kind === "reunion-modifiee" || kind === "reunion-annulee" || kind === "rappel-reunion") return "meetings"
  if (kind === "proposition-agenda" || kind === "revue-agenda") return "agenda"
  if (kind === "avis-decision") return "decisions"
  if (kind.startsWith("pv-")) return "minutes"
  return "actions"
}

export function formatNotificationDate(value: string, locale = "fr"): string {
  const intlLocale = locale === "ar" ? "ar" : locale === "en" ? "en-GB" : "fr-FR"
  return new Intl.DateTimeFormat(intlLocale, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Africa/Algiers",
  }).format(new Date(value))
}

export function filterNotifications(
  notifications: CommitteeNotification[],
  tab: NotificationTab,
  category: NotificationKindFilter,
  search: string,
): CommitteeNotification[] {
  const query = search.trim().toLocaleLowerCase()
  return notifications
    .filter((item) => {
      if (tab === "archivees" ? !item.archived : item.archived) return false
      if (tab === "non-lues" && item.read) return false
      if (category !== "tous" && (item.category ?? categoryForKind(item.kind)) !== category) return false
      if (!query) return true
      const values = Object.values(item.templateValues ?? {}).join(" ")
      return `${item.title} ${item.preview} ${item.detail} ${item.context} ${values}`
        .toLocaleLowerCase().includes(query)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadTotal(notifications: CommitteeNotification[]): number {
  return notifications.filter((item) => !item.archived && !item.read).length
}

export function notificationTitle(item: CommitteeNotification, t: (key: string, values?: Record<string, string | number>) => string) {
  if (item.titleKey) return t(item.titleKey, item.templateValues)
  const separator = item.title.indexOf(": ")
  if (separator > 0) {
    const prefix = item.title.slice(0, separator)
    const translatedPrefix = t(prefix)
    if (translatedPrefix !== prefix) return `${translatedPrefix}: ${item.title.slice(separator + 2)}`
  }
  return t(item.title, item.templateValues)
}

export function notificationMessage(item: CommitteeNotification, t: (key: string, values?: Record<string, string | number>) => string) {
  if (!item.messageKey) return t(item.detail, item.templateValues)
  if (item.messageKey.startsWith("notification-message-")) {
    const kind = item.messageKey.slice("notification-message-".length) as NotificationKind
    return `${t(kindLabels[kind])}: ${item.detail}`
  }
  const prefix = t(item.messageKey, item.templateValues)
  return item.detail ? `${prefix} ${item.detail}` : prefix
}

/** Resolves a notification only while its recipient can still view the linked record. */
export function notificationHref(
  item: CommitteeNotification,
  locale: string,
  user: DemoUser | null,
  state: DemoState,
): string | null {
  if (!user || item.recipientId !== user.id) return null
  const base = item.target.split("?")[0] as CommitteeNotification["target"]
  const module = moduleForPath(base)
  if (!hasPermission(user, module)) return null

  if (!item.entityType || !item.entityId) return `/${locale}${base}`
  const id = encodeURIComponent(item.entityId)
  if (item.entityType === "meeting") return state.meetings.some((entry) => entry.id === item.entityId) ? `/${locale}/meetings?meeting=${id}` : null
  if (item.entityType === "agenda") {
    const proposal = state.agenda.find((entry) => entry.id === item.entityId)
    return proposal && state.meetings.some((entry) => entry.id === proposal.meetingId) ? `/${locale}/agenda?meeting=${encodeURIComponent(proposal.meetingId)}&proposal=${id}` : null
  }
  if (item.entityType === "action") {
    const action = state.actions.find((entry) => entry.id === item.entityId)
    if (!action || (user.role === "member" && action.assigneeId !== user.memberId)) return null
    return `/${locale}/actions?action=${id}`
  }
  if (item.entityType === "decision") {
    const decision = state.decisions.find((entry) => entry.id === item.entityId)
    if (!decision || (user.role === "member" && decision.status !== "Adoptée")) return null
    return `/${locale}/actions?decision=${id}`
  }
  if (item.entityType === "ballot") {
    return state.ballots.some((entry) => entry.id === item.entityId) ? `/${locale}/votes?ballot=${id}` : null
  }
  const minutes = state.minutes.find((entry) => entry.id === item.entityId)
  const mayViewMinutes = user.role === "president" || user.role === "secretary" || minutes?.status === "Signé" || minutes?.status === "Archivé"
  return minutes && mayViewMinutes ? `/${locale}/documents?minutes=${id}#pv` : null
}

export function createDemoNotification(kind: NotificationKind, ordinal: number, recipientId: string): CommitteeNotification {
  const example = notificationExamples[kind]
  if (!example) throw new Error(`Aucun exemple de notification pour ${kind}`)
  return {
    ...example,
    id: `demo-${Date.now()}-${ordinal}`,
    category: example.category ?? categoryForKind(kind),
    recipientId,
    createdAt: new Date().toISOString(),
    senderName: "Système de démonstration",
    read: false,
    archived: false,
  }
}
