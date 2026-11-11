import type { Metadata } from "next"
import { MeetingsClient } from "@/features/meetings/meetings-client"

export const metadata: Metadata = {
  title: "Réunions | Gestion du comité scientifique",
  description: "Gestion des réunions, participants et ordres du jour",
}

export default function MeetingsPage() {
  return <MeetingsClient />
}
