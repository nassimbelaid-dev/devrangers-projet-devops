import type { ReactNode } from "react"

import "./committee-ui.css"
import { CommitteeFeedback } from "./committee-feedback"

type CommitteeModule =
  | "dashboard"
  | "meetings"
  | "members"
  | "actions"
  | "votes"
  | "documents"
  | "agenda"
  | "notifications"
  | "profile"

/**
 * Enveloppe visuelle partagée par les modules du comité scientifique.
 * Aucun état ni donnée métier : les stores React existants restent intacts.
 */
export function CommitteeShell({
  children,
  module,
}: {
  children: ReactNode
  module: CommitteeModule
}) {
  return (
    <div className="committee-ui" data-module={module}>
      <div className="committee-ui__content">
        <CommitteeFeedback />
        {children}
      </div>
    </div>
  )
}
