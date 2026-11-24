/** Types du centre de notifications de démonstration (frontend uniquement). */
export type NotificationKind =
  | "convocation"
  | "reunion-modifiee"
  | "reunion-annulee"
  | "rappel-reunion"
  | "proposition-agenda"
  | "revue-agenda"
  | "echeance-action"
  | "action-attribuee"
  | "action-reattribuee"
  | "action-echeance-modifiee"
  | "rappel-action"
  | "action-en-retard"
  | "avis-decision"
  | "pv-signature"
  | "pv-correction"
  | "pv-signe"
  | "pv-archives"

export type NotificationPriority = "normale" | "importante"
export type NotificationCategory = "meetings" | "agenda" | "decisions" | "actions" | "minutes"
export type NotificationEntityType = "meeting" | "agenda" | "decision" | "action" | "ballot" | "minutes"
export type NotificationTab = "toutes" | "non-lues" | "archivees"
export type NotificationKindFilter = NotificationCategory | "tous"
export type NotificationTarget = "/meetings" | "/agenda" | "/actions" | "/votes" | "/documents"

export type NotificationTemplateValues = Record<string, string | number>

export type CommitteeNotification = {
  id: string
  kind: NotificationKind
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  preview: string
  detail: string
  context: string
  target: NotificationTarget
  createdAt: string
  read: boolean
  archived: boolean
  recipientId?: string
  senderId?: string
  senderName?: string
  entityType?: NotificationEntityType
  entityId?: string
  /** Stable idempotency token for automatic events and scheduled reminders. */
  dedupeKey?: string
  /** UI template keys are translated at display time; template values remain user data. */
  titleKey?: string
  messageKey?: string
  templateValues?: NotificationTemplateValues
}
