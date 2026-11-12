import type { Metadata } from "next"
import { CommitteeShell } from "@/components/committee-ui/committee-shell"
import { VotesClient } from "@/features/votes/votes-client"

export const metadata: Metadata = {
  title: "Votes et résultats | Gestion du comité scientifique",
  description: "Simulation des scrutins, du quorum et de la représentation du comité scientifique",
}

export default function VotesPage() {
  return <CommitteeShell module="votes"><VotesClient /></CommitteeShell>
}
