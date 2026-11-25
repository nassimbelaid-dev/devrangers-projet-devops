import { DecisionsActionsClient } from "@/features/decisions/decisions-actions-client"

import type { Metadata } from "next"

import { CommitteeShell } from "@/components/committee-ui/committee-shell"

export const metadata: Metadata = {
  title: "Décisions et actions | Gestion du comité scientifique",
  description: "Suivi des décisions et des actions du comité scientifique",
}

export default function ActionsPage() {
  return (
    <CommitteeShell module="actions">
      <DecisionsActionsClient />
    </CommitteeShell>
  )
}
