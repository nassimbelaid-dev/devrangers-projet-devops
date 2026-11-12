import type { Metadata } from "next"
import { CommitteeShell } from "@/components/committee-ui/committee-shell"
import { MeetingsClient } from "@/features/meetings/meetings-client"

export const metadata: Metadata = {
  title: "Réunions | Gestion du comité scientifique",
  description: "Gestion des réunions, participants et ordres du jour",
}

export default function MeetingsPage() {
  return <CommitteeShell module="meetings"><MeetingsClient /></CommitteeShell>
}
