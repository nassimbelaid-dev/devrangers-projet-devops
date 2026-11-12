import type { Metadata } from "next"
import { CommitteeShell } from "@/components/committee-ui/committee-shell"

import { AgendaClient } from "@/features/agenda/agenda-client"

export const metadata: Metadata = {
  title: "Ordres du jour | Gestion du comité scientifique",
  description: "Propositions et validation des points à inscrire à l'ordre du jour",
}

export default function AgendaPage() {
  return <CommitteeShell module="agenda"><AgendaClient /></CommitteeShell>
}
