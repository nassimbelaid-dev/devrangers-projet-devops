import type { DemoUser } from "@/lib/static-auth"
import type { CommitteeDocument } from "./types"

import { hasPermission } from "@/lib/static-auth"

/** Keep the document visibility policy identical for lists, archives, and details. */
export function canViewDocument(
  user: DemoUser | null,
  document: Pick<CommitteeDocument, "visibility">
): boolean {
  if (!user) return false

  const canOpenDocuments =
    hasPermission(user, "documents", "view") ||
    hasPermission(user, "documents", "create") ||
    hasPermission(user, "documents", "edit") ||
    hasPermission(user, "documents", "archive")

  if (!canOpenDocuments) return false

  if (document.visibility === "Comité") return true
  if (document.visibility === "Présidence") return user.role !== "member"

  return (
    user.role === "admin" ||
    user.role === "president" ||
    user.role === "archivist"
  )
}
