import type { CommitteeNotification, NotificationKind } from "./types"

/** Les messages reçus sont générés par les transitions métier ou le vérificateur de rappels. */
export const initialNotifications: CommitteeNotification[] = []

/** Exemples facultatifs pour le simulateur; ils sont toujours ajoutés à la boîte de l'utilisateur courant. */
export const notificationExamples: Partial<
  Record<
    NotificationKind,
    Omit<
      CommitteeNotification,
      "id" | "createdAt" | "read" | "archived" | "recipientId"
    >
  >
> = {
  convocation: {
    kind: "convocation",
    category: "meetings",
    priority: "importante",
    title: "Convocation de démonstration",
    preview: "Exemple local lié à une réunion existante.",
    detail:
      "Exemple de notification interne pour vérifier l'affichage et l'accès direct.",
    context: "Démonstration · réunion r2",
    target: "/meetings",
    entityType: "meeting",
    entityId: "r2",
  },
  "rappel-reunion": {
    kind: "rappel-reunion",
    category: "meetings",
    priority: "normale",
    title: "Rappel de réunion de démonstration",
    preview: "Exemple local lié à une réunion existante.",
    detail:
      "Exemple de rappel interne. Les rappels automatiques sont calculés à partir des données de réunion pendant que l'application est ouverte.",
    context: "Démonstration · réunion r2",
    target: "/meetings",
    entityType: "meeting",
    entityId: "r2",
  },
  "echeance-action": {
    kind: "echeance-action",
    category: "actions",
    priority: "importante",
    title: "Échéance d'action de démonstration",
    preview: "Exemple local lié à une action existante.",
    detail: "Exemple local à destination du compte courant.",
    context: "Démonstration · action ac1",
    target: "/actions",
    entityType: "action",
    entityId: "ac1",
  },
  "avis-decision": {
    kind: "avis-decision",
    category: "decisions",
    priority: "normale",
    title: "Avis de décision de démonstration",
    preview: "Exemple local lié à une décision existante.",
    detail: "Exemple local à destination du compte courant.",
    context: "Démonstration · décision d1",
    target: "/actions",
    entityType: "decision",
    entityId: "d1",
  },
}
