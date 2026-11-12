/** Types du centre de notifications de démonstration (frontend uniquement). */
export type NotificationKind =
  | "convocation"
  | "rappel-reunion"
  | "echeance-action"
  | "avis-decision"

export type NotificationPriority = "normale" | "importante"
export type NotificationTab = "toutes" | "non-lues" | "archivees"
export type NotificationKindFilter = NotificationKind | "tous"
export type NotificationTarget = "/meetings" | "/actions" | "/votes" | "/documents"

export type CommitteeNotification = {
  id: string
  kind: NotificationKind
  priority: NotificationPriority
  title: string
  preview: string
  detail: string
  context: string
  target: NotificationTarget
  createdAt: string
  read: boolean
  archived: boolean
}
