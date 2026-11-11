import type { Metadata } from "next"
import { DecisionsActionsClient } from "@/features/decisions/decisions-actions-client"

export const metadata: Metadata = {
  title: "Décisions et actions | Gestion du comité scientifique",
  description: "Suivi des décisions et des actions du comité scientifique",
}

export default function ActionsPage() {
  return <DecisionsActionsClient />
}
