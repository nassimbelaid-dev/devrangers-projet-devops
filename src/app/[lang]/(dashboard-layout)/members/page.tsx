import type { Metadata } from "next"
import { CommitteeShell } from "@/components/committee-ui/committee-shell"
import { MembersClient } from "@/features/members/members-client"

export const metadata: Metadata = {
  title: "Membres et mandats | Gestion du comité scientifique",
  description: "Annuaire, rôles, mandats, sièges et suppléants du comité scientifique.",
}

export default function MembersPage() {
  return <CommitteeShell module="members"><MembersClient /></CommitteeShell>
}
