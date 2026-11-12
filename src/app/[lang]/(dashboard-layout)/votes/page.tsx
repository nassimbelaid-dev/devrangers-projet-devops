import type { Metadata } from "next"
import { VotesClient } from "@/features/votes/votes-client"

export const metadata: Metadata = {
  title: "Votes et résultats | Gestion du comité scientifique",
  description: "Simulation des scrutins, du quorum et de la représentation du comité scientifique",
}

export default function VotesPage() {
  return <VotesClient />
}
